import asyncio
import hashlib
import json
import os
import re
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from openai import OpenAI
from pydantic import BaseModel

from neurocode.config import mongodb_service
from neurocode.services.analysis.parser import TreeSitterParser
from neurocode.services.neo4j_service import Neo4jService

router = APIRouter(tags=["knowledge-graph"])


_KG_AGENT_MODEL = os.getenv("KG_AGENT_MODEL", "gpt-4o-mini")
_MAX_ITER = 8
_MAX_ROWS = 40

_SAFE_RE = re.compile(r"^\s*(MATCH|WITH|CALL|RETURN|UNWIND)\b", re.IGNORECASE)
_DANGEROUS = [
    "CREATE ",
    "DELETE ",
    "DETACH DELETE",
    "MERGE ",
    "SET ",
    "REMOVE ",
    "DROP ",
]


def _get_kg_openai_client() -> Optional[OpenAI]:
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    return OpenAI(api_key=api_key) if api_key else None


def _is_safe_cypher(query: str) -> bool:
    upper = query.upper()
    for kw in _DANGEROUS:
        if kw in upper:
            return False
    return bool(_SAFE_RE.match(query))


async def _run_cypher_tool(neo4j: Neo4jService, repo_id: str, query: str) -> str:
    if not _is_safe_cypher(query):
        return (
            "Error: Only read-only queries are allowed (MATCH, WITH, RETURN, UNWIND). "
            "Dangerous keywords (CREATE, DELETE, MERGE, SET, DROP…) are blocked."
        )
    try:
        results = await neo4j.run_read_query(query)
        if not results:
            return "Query returned no results."
        truncated = results[:_MAX_ROWS]
        suffix = f" (showing first {_MAX_ROWS})" if len(results) > _MAX_ROWS else ""
        lines = [f"{len(results)} result(s){suffix}:"]
        for i, row in enumerate(truncated):
            parts = []
            for k, v in row.items():
                v_str = (
                    json.dumps(v, default=str)
                    if isinstance(v, (dict, list))
                    else str(v)
                )

                if len(v_str) > 300:
                    v_str = v_str[:297] + "..."
                parts.append(f"{k}={v_str}")
            lines.append(f"  [{i + 1}] {', '.join(parts)}")
        return "\n".join(lines)
    except Exception as exc:
        return f"Cypher error: {exc}"


def _parse_node_info(info: Any) -> Dict[str, Any]:
    if isinstance(info, dict):
        return info
    if isinstance(info, str):
        try:
            return json.loads(info)
        except Exception:
            pass
    return {}


def _node_display_name(info: Any) -> str:
    d = _parse_node_info(info)
    return d.get("name") or d.get("filePath") or "?"


async def _tool_codebase_overview(neo4j: Neo4jService, repo_id: str) -> str:
    try:
        counts = await neo4j.run_read_query(
            "MATCH (n:CodeNode {repoId: $repoId}) "
            "RETURN n.nodeLabel AS label, count(n) AS total ORDER BY total DESC",
            {"repoId": repo_id},
        )
        hotspots = await neo4j.run_read_query(
            """
            MATCH (n:CodeNode {repoId: $repoId})
            WHERE n.nodeLabel IN ['File', 'Function', 'Class']
            WITH n
            MATCH (n)-[r]-(other:CodeNode {repoId: $repoId})
            WITH n, count(r) AS connections
            WHERE connections > 0
            ORDER BY connections DESC LIMIT 10
            RETURN n.nodeLabel AS label, n.data AS info, connections
            """,
            {"repoId": repo_id},
        )
        folders = await neo4j.run_read_query(
            "MATCH (n:CodeNode {repoId: $repoId, nodeLabel: 'Folder'}) "
            "RETURN n.data AS info ORDER BY info LIMIT 30",
            {"repoId": repo_id},
        )
    except Exception as exc:
        return f"Overview error: {exc}"

    lines: List[str] = ["## Codebase Map\n"]

    lines.append("### Node counts")
    for row in counts:
        lines.append(f"  {row.get('label')}: {row.get('total')}")

    lines.append("\n### Hotspots (most connected nodes)")
    for row in hotspots:
        name = _node_display_name(row.get("info"))
        lines.append(
            f"  {row.get('label')}: {name}  ({row.get('connections')} connections)"
        )

    lines.append("\n### Folders")
    seen: set = set()
    for row in folders:
        fp = _parse_node_info(row.get("info")).get("filePath", "")
        if fp and fp not in seen:
            seen.add(fp)
            lines.append(f"  {fp}/")

    return "\n".join(lines)


async def _tool_inspect(neo4j: Neo4jService, repo_id: str, target: str) -> str:
    by_name = f'"name": "{target}"'
    try:
        matches = await neo4j.run_read_query(
            """
            MATCH (n:CodeNode {repoId: $repoId})
            WHERE n.data CONTAINS $byName OR n.data CONTAINS $byPath
            RETURN n.nodeLabel AS label, n.nodeId AS nid, n.data AS info
            LIMIT 5
            """,
            {"repoId": repo_id, "byName": by_name, "byPath": target},
        )
    except Exception as exc:
        return f"Inspect error: {exc}"

    if not matches:
        return (
            f'No nodes found matching "{target}". '
            "Try find_symbols to locate the exact name first."
        )

    lines: List[str] = [f'## Inspection: "{target}"\n']

    for match in matches[:3]:
        label = match.get("label", "?")
        nid = match.get("nid", "")
        info = _parse_node_info(match.get("info"))
        name = info.get("name") or info.get("filePath") or "?"
        fp = info.get("filePath", "")

        lines.append(f"### {label}: {name}")
        if fp and fp != name:
            lines.append(f"  Path: {fp}")
        start, end = info.get("startLine"), info.get("endLine")
        if start:
            lines.append(f"  Lines: {start}–{end or start}")

        if not nid:
            lines.append("")
            continue

        try:
            if label == "Folder":

                contained = await neo4j.run_read_query(
                    """
                    MATCH (folder:CodeNode {repoId: $repoId, nodeId: $nid})
                          -[:CONTAINS]->(file:CodeNode {repoId: $repoId})
                    OPTIONAL MATCH (file)-[:IMPORTS]->(dep:CodeNode {repoId: $repoId})
                    RETURN file.data AS fileInfo, dep.data AS depInfo
                    ORDER BY file.data LIMIT 60
                    """,
                    {"repoId": repo_id, "nid": nid},
                )
                by_file: Dict[str, List[str]] = {}
                for row in contained:
                    fname = _parse_node_info(row.get("fileInfo")).get("filePath", "?")
                    if fname not in by_file:
                        by_file[fname] = []
                    dep_info = _parse_node_info(row.get("depInfo"))
                    dep_path = dep_info.get("filePath") or dep_info.get("name")
                    if dep_path:
                        by_file[fname].append(dep_path)

                lines.append(f"\n  Contains {len(by_file)} file(s):")
                for fname, imports in list(by_file.items())[:20]:
                    lines.append(f"    {fname}")
                    for imp in imports[:6]:
                        lines.append(f"      → imports {imp}")
            else:
                outgoing = await neo4j.run_read_query(
                    """
                    MATCH (n:CodeNode {repoId: $repoId, nodeId: $nid})
                          -[r]->(t:CodeNode {repoId: $repoId})
                    RETURN type(r) AS rel, t.nodeLabel AS tLabel, t.data AS tInfo
                    LIMIT 20
                    """,
                    {"repoId": repo_id, "nid": nid},
                )
                incoming = await neo4j.run_read_query(
                    """
                    MATCH (s:CodeNode {repoId: $repoId})
                          -[r]->(n:CodeNode {repoId: $repoId, nodeId: $nid})
                    RETURN type(r) AS rel, s.nodeLabel AS sLabel, s.data AS sInfo
                    LIMIT 20
                    """,
                    {"repoId": repo_id, "nid": nid},
                )
                if outgoing:
                    lines.append(f"\n  Outgoing ({len(outgoing)}):")
                    for r in outgoing[:12]:
                        tname = _node_display_name(r.get("tInfo"))
                        lines.append(
                            f"    –{r.get('rel')}→  {r.get('tLabel')}: {tname}"
                        )
                else:
                    lines.append("\n  No outgoing relationships.")
                if incoming:
                    lines.append(f"\n  Incoming ({len(incoming)}):")
                    for r in incoming[:12]:
                        sname = _node_display_name(r.get("sInfo"))
                        lines.append(
                            f"    ←{r.get('rel')}–  {r.get('sLabel')}: {sname}"
                        )
                else:
                    lines.append("\n  No incoming relationships.")
        except Exception as exc:
            lines.append(f"\n  (relationship query failed: {exc})")

        lines.append("")

    return "\n".join(lines)


async def _tool_dependency_trace(
    neo4j: Neo4jService, repo_id: str, target: str, direction: str
) -> str:
    direction = direction.lower().strip()
    if direction not in ("upstream", "downstream"):
        direction = "downstream"

    search = (
        f'"name": "{target}"' if ("/" not in target and "." not in target) else target
    )
    try:
        target_nodes = await neo4j.run_read_query(
            """
            MATCH (n:CodeNode {repoId: $repoId})
            WHERE n.data CONTAINS $search
            RETURN n.nodeLabel AS label, n.nodeId AS nid, n.data AS info
            LIMIT 3
            """,
            {"repoId": repo_id, "search": search},
        )
    except Exception as exc:
        return f"Dependency trace error: {exc}"

    if not target_nodes:
        return (
            f'No nodes found matching "{target}". '
            "Use find_symbols first to locate the exact name."
        )

    lines: List[str] = [f"## Dependency trace: {target}  [{direction}]\n"]

    for tnode in target_nodes[:2]:
        label = tnode.get("label", "?")
        nid = tnode.get("nid", "")
        name = _node_display_name(tnode.get("info"))
        lines.append(f"### {label}: {name}")
        if not nid:
            continue

        try:
            if direction == "downstream":
                d1_q = """
                MATCH (n:CodeNode {repoId: $repoId, nodeId: $nid})
                      -[r:IMPORTS|CALLS|INHERITS]->(dep:CodeNode {repoId: $repoId})
                RETURN type(r) AS rel, dep.nodeLabel AS label, dep.data AS info
                LIMIT 30
                """
                d2_q = """
                MATCH (n:CodeNode {repoId: $repoId, nodeId: $nid})
                      -[:IMPORTS|CALLS|INHERITS]->(mid:CodeNode {repoId: $repoId})
                      -[r:IMPORTS|CALLS]->(dep:CodeNode {repoId: $repoId})
                WHERE dep.nodeId <> $nid AND mid.nodeId <> $nid
                RETURN type(r) AS rel, dep.nodeLabel AS label, dep.data AS info
                LIMIT 25
                """
            else:
                d1_q = """
                MATCH (dep:CodeNode {repoId: $repoId})
                      -[r:IMPORTS|CALLS|INHERITS]->(n:CodeNode {repoId: $repoId, nodeId: $nid})
                RETURN type(r) AS rel, dep.nodeLabel AS label, dep.data AS info
                LIMIT 30
                """
                d2_q = """
                MATCH (dep:CodeNode {repoId: $repoId})
                      -[r:IMPORTS|CALLS]->(mid:CodeNode {repoId: $repoId})
                      -[:IMPORTS|CALLS|INHERITS]->(n:CodeNode {repoId: $repoId, nodeId: $nid})
                WHERE dep.nodeId <> $nid AND mid.nodeId <> $nid
                RETURN type(r) AS rel, dep.nodeLabel AS label, dep.data AS info
                LIMIT 25
                """

            params = {"repoId": repo_id, "nid": nid}
            d1 = await neo4j.run_read_query(d1_q, params)
            d2 = await neo4j.run_read_query(d2_q, params)
        except Exception as exc:
            lines.append(f"  (query failed: {exc})")
            continue

        if not d1 and not d2:
            verb = (
                "depends on nothing"
                if direction == "downstream"
                else "nothing depends on it"
            )
            lines.append(f"  This node {verb} in the graph.")
        else:
            seen: set = set()
            label_verb = "depends on" if direction == "downstream" else "depended on by"

            def _emit(rows: List[Dict], depth_label: str) -> None:
                entries = []
                for row in rows:
                    rname = _node_display_name(row.get("info"))
                    key = f"{row.get('label')}:{rname}"
                    if key not in seen:
                        seen.add(key)
                        entries.append((row.get("rel"), row.get("label"), rname))
                if entries:
                    lines.append(f"\n  {depth_label} — {label_verb} ({len(entries)}):")
                    for rel, elabel, ename in entries[:15]:
                        lines.append(f"    {rel}: {elabel} {ename}")
                    if len(entries) > 15:
                        lines.append(f"    … +{len(entries) - 15} more")

            _emit(d1, "Direct (d=1)")
            _emit(d2, "Indirect (d=2)")
            lines.append(f"\n  Total unique nodes: {len(seen)}")

        lines.append("")

    return "\n".join(lines)


async def _tool_find_symbols(neo4j: Neo4jService, repo_id: str, query: str) -> str:
    try:
        results = await neo4j.run_read_query(
            """
            MATCH (n:CodeNode {repoId: $repoId})
            WHERE n.nodeLabel IN ['File', 'Folder', 'Function', 'Class', 'Method']
              AND n.data CONTAINS $query
            RETURN n.nodeLabel AS label, n.data AS info
            ORDER BY n.nodeLabel LIMIT 30
            """,
            {"repoId": repo_id, "query": query},
        )
    except Exception as exc:
        return f"Symbol search error: {exc}"

    if not results:
        return f'No symbols found matching "{query}". Try a shorter keyword or partial path.'

    lines: List[str] = [f'## Symbols matching "{query}" ({len(results)} result(s))\n']
    by_type: Dict[str, List[str]] = {}
    for row in results:
        lbl = row.get("label", "?")
        info = _parse_node_info(row.get("info"))
        name = info.get("name") or "?"
        fp = info.get("filePath", "")
        start = info.get("startLine")
        loc = f"  {fp}" + (f":{start}" if start else "") if fp else ""
        by_type.setdefault(lbl, []).append(f"  {name}{loc}")

    for lbl, entries in by_type.items():
        lines.append(f"### {lbl}s ({len(entries)})")
        lines.extend(entries[:10])
        if len(entries) > 10:
            lines.append(f"  … +{len(entries) - 10} more")
        lines.append("")

    return "\n".join(lines)


def _build_kg_system_prompt(repo_id: str, selected_node_context: str) -> str:
    return f"""You are a code analysis assistant for repository ID: {repo_id}

You have access to a Neo4j knowledge graph and four specialist tools plus a raw Cypher tool.

## Tool Usage — always prefer in this order:
1. **codebase_overview** — start here for any broad question ("architecture?", "main modules?")
2. **find_symbols(query)** — locate a specific name or path fragment before inspecting it
3. **inspect(target)** — full relationship context for a file, folder, function, or class
4. **dependency_trace(target, direction)** — "what does X depend on?" (downstream) or "what depends on X?" (upstream)
5. **cypher** — only for custom questions the above tools cannot answer

## Graph Schema (for cypher queries)
All nodes: `:CodeNode {{repoId, nodeId, nodeLabel, data}}`
- `nodeLabel`: File | Folder | Function | Class | Method
- `data`: JSON with `name`, `filePath`, `startLine`, `endLine`, plus label-specific fields

Relationships: `:IMPORTS` (File→File), `:CALLS` (Function/Method→Function/Method),
`:CONTAINS` (Folder→File, File→Function/Class, Class→Method), `:INHERITS` (Class→Class), `:HAS_METHOD` (Class→Method)

Always filter by `repoId: "{repo_id}"` in every cypher query.
Use `n.data CONTAINS '"name": "X"'` to filter by name.
Use `n.data CONTAINS '"filePath": "folder/'` to filter by folder prefix.

## Rules
- Call codebase_overview first when you have no prior context
- Run follow-up calls if the first result is incomplete
- Cite file paths and line numbers in your answers
- Be concise — bullets and short paragraphs, not essays
- If something is not in the graph, say so
{("## Selected Node\n" + selected_node_context) if selected_node_context else ""}"""


class KGAgentChatRequest(BaseModel):
    message: str
    history: Optional[List[Dict[str, Any]]] = []
    selected_node_context: Optional[str] = None
    chat_id: Optional[str] = None
    user_id: Optional[str] = None


async def _agent_stream(
    repo_id: str,
    message: str,
    history: List[Dict[str, Any]],
    selected_node_context: str,
    neo4j: Neo4jService,
    client: OpenAI,
    chat_id: Optional[str],
    user_id: Optional[str],
) -> AsyncGenerator[str, None]:
    def sse(event: dict) -> str:
        return f"data: {json.dumps(event)}\n\n"

    tools = [
        {
            "type": "function",
            "function": {
                "name": "codebase_overview",
                "description": (
                    "Get node counts by type, the most-connected hotspot nodes, and the full folder "
                    "structure. Call this first for any broad architecture or 'what is this repo' question."
                ),
                "parameters": {"type": "object", "properties": {}, "required": []},
            },
        },
        {
            "type": "function",
            "function": {
                "name": "find_symbols",
                "description": (
                    "Search for files, folders, functions, classes, or methods by keyword or partial path. "
                    "Use this to locate a symbol before inspecting it."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "Keyword or partial name/path to search for.",
                        }
                    },
                    "required": ["query"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "inspect",
                "description": (
                    "Deep dive on a specific file, folder, function, or class. Returns all relationships "
                    "(imports, calls, contains, etc.). For folders, expands contained files and their imports."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target": {
                            "type": "string",
                            "description": "Name or path fragment of the node to inspect (e.g. 'chunker', 'BaseChunker', 'services/neo4j_service.py').",
                        }
                    },
                    "required": ["target"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "dependency_trace",
                "description": (
                    "Trace the dependency graph from a node. "
                    "Use 'downstream' to see what a node depends on, "
                    "'upstream' to see what would break if the node changed."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "target": {
                            "type": "string",
                            "description": "Name or path of the starting node.",
                        },
                        "direction": {
                            "type": "string",
                            "enum": ["upstream", "downstream"],
                            "description": "upstream = what depends on target; downstream = what target depends on.",
                        },
                    },
                    "required": ["target", "direction"],
                },
            },
        },
        {
            "type": "function",
            "function": {
                "name": "cypher",
                "description": (
                    f"Run a read-only Cypher MATCH query against the knowledge graph "
                    f"for repository '{repo_id}'. Use only when the specialist tools above cannot answer the question. "
                    f"Always include {{repoId: '{repo_id}'}} in every query."
                ),
                "parameters": {
                    "type": "object",
                    "properties": {
                        "query": {
                            "type": "string",
                            "description": "A Cypher MATCH query starting with MATCH.",
                        }
                    },
                    "required": ["query"],
                },
            },
        },
    ]

    system_prompt = _build_kg_system_prompt(repo_id, selected_node_context or "")
    messages: List[Dict[str, Any]] = [{"role": "system", "content": system_prompt}]

    for h in history or []:
        role = h.get("role", "user")
        content = (h.get("content") or "").strip()
        if role in ("user", "assistant") and content:
            messages.append({"role": role, "content": content})
    messages.append({"role": "user", "content": message})

    full_reply = ""

    try:
        for _iteration in range(_MAX_ITER):
            response = client.chat.completions.create(
                model=_KG_AGENT_MODEL,
                messages=messages,
                tools=tools,
                tool_choice="auto",
            )
            choice = response.choices[0]
            msg = choice.message

            if msg.tool_calls:
                messages.append(
                    {
                        "role": "assistant",
                        "content": msg.content or "",
                        "tool_calls": [
                            {
                                "id": tc.id,
                                "type": "function",
                                "function": {
                                    "name": tc.function.name,
                                    "arguments": tc.function.arguments,
                                },
                            }
                            for tc in msg.tool_calls
                        ],
                    }
                )

                for tc in msg.tool_calls:
                    fn_name = tc.function.name
                    try:
                        args = json.loads(tc.function.arguments)
                    except Exception:
                        args = {}

                    yield sse({"type": "tool_call", "name": fn_name, "args": args})

                    try:
                        if fn_name == "codebase_overview":
                            result = await _tool_codebase_overview(neo4j, repo_id)
                        elif fn_name == "find_symbols":
                            result = await _tool_find_symbols(
                                neo4j, repo_id, args.get("query", "")
                            )
                        elif fn_name == "inspect":
                            result = await _tool_inspect(
                                neo4j, repo_id, args.get("target", "")
                            )
                        elif fn_name == "dependency_trace":
                            result = await _tool_dependency_trace(
                                neo4j,
                                repo_id,
                                args.get("target", ""),
                                args.get("direction", "downstream"),
                            )
                        elif fn_name == "cypher":
                            result = await _run_cypher_tool(
                                neo4j, repo_id, args.get("query", "")
                            )
                        else:
                            result = f"Unknown tool: {fn_name}"
                    except Exception as tool_exc:
                        result = f"Tool error ({fn_name}): {tool_exc}"

                    preview = result[:200] + ("…" if len(result) > 200 else "")
                    yield sse(
                        {"type": "tool_result", "name": fn_name, "preview": preview}
                    )

                    messages.append(
                        {
                            "role": "tool",
                            "tool_call_id": tc.id,
                            "content": result,
                        }
                    )

                await asyncio.sleep(0)
                continue

            full_reply = (msg.content or "").strip()
            break

        if not full_reply:
            try:
                summary_messages = messages + [
                    {
                        "role": "user",
                        "content": (
                            "Based on the tool results above, write a clear and concise answer "
                            "to the original question. Do not call any more tools."
                        ),
                    }
                ]
                forced = client.chat.completions.create(
                    model=_KG_AGENT_MODEL,
                    messages=summary_messages,
                )
                full_reply = (forced.choices[0].message.content or "").strip()
            except Exception as exc:
                full_reply = (
                    f"The agent collected graph data but failed to summarize it: {exc}"
                )

        if chat_id and user_id and mongodb_service and full_reply:
            try:
                title_if_first = message[:36].strip() + (
                    "…" if len(message) > 36 else ""
                )
                mongodb_service.append_chat_messages(
                    chat_id,
                    user_id,
                    user_content=message,
                    assistant_content=full_reply,
                    title_if_first_user=title_if_first,
                )
            except Exception:
                pass

        yield sse({"type": "done", "reply": full_reply})

    except Exception as exc:
        yield sse({"type": "error", "message": str(exc)})
    finally:
        await neo4j.close()


@router.get("/api/knowledge-graph/{repo_id}")
async def get_knowledge_graph(repo_id: str):

    try:
        neo4j = Neo4jService()
        try:
            graph = await neo4j.read_graph(repo_id)
        finally:
            await neo4j.close()

        if graph is None:
            return {"status": "not_built"}

        return {"status": "ready", **graph}
    except ValueError as e:

        raise HTTPException(status_code=503, detail=f"Neo4j not configured: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class FileInput(BaseModel):
    path: str
    content: str
    language: Optional[str] = None


class KnowledgeGraphRequest(BaseModel):
    files: List[FileInput]


def _id(*parts: str) -> str:

    return hashlib.sha1(":".join(parts).encode()).hexdigest()[:16]


@router.post("/api/knowledge-graph")
async def build_knowledge_graph(request: KnowledgeGraphRequest):

    raw_files = [
        {"path": f.path, "content": f.content, "language": f.language}
        for f in request.files
    ]

    parser = TreeSitterParser()
    result = await parser.parse_files(raw_files)
    structure = result.structure

    nodes: list = []
    edges: list = []
    node_ids: set = set()

    def add_node(node_id: str, label: str, props: dict) -> None:
        if node_id not in node_ids:
            node_ids.add(node_id)
            nodes.append({"id": node_id, "label": label, "properties": props})

    def add_edge(edge_id: str, edge_type: str, src: str, tgt: str) -> None:
        if src in node_ids and tgt in node_ids:
            edges.append(
                {"id": edge_id, "type": edge_type, "sourceId": src, "targetId": tgt}
            )

    for parsed_file in structure.files:
        parts = [p for p in parsed_file.path.split("/") if p]
        parent_id: Optional[str] = None
        current_path = ""

        for i, part in enumerate(parts):
            current_path = f"{current_path}/{part}" if current_path else part
            is_file = i == len(parts) - 1
            label = "File" if is_file else "Folder"
            node_id = _id(label, current_path)

            props: dict = {"name": part, "filePath": current_path}
            if is_file:
                props["language"] = parsed_file.language

            add_node(node_id, label, props)

            if parent_id:
                add_edge(
                    _id("CONTAINS", parent_id, node_id), "CONTAINS", parent_id, node_id
                )

            parent_id = node_id

        file_id = _id("File", parsed_file.path)

        for func in parsed_file.functions:
            func_id = _id("Function", parsed_file.path, func.name, str(func.startLine))
            add_node(
                func_id,
                "Function",
                {
                    "name": func.name,
                    "filePath": parsed_file.path,
                    "startLine": func.startLine,
                    "endLine": func.endLine,
                    "language": parsed_file.language,
                    "isAsync": func.isAsync,
                    "isExported": func.isExported,
                },
            )
            add_edge(_id("CONTAINS", file_id, func_id), "CONTAINS", file_id, func_id)

        for cls in parsed_file.classes:
            cls_id = _id("Class", parsed_file.path, cls.name, str(cls.startLine))
            add_node(
                cls_id,
                "Class",
                {
                    "name": cls.name,
                    "filePath": parsed_file.path,
                    "startLine": cls.startLine,
                    "endLine": cls.endLine,
                    "language": parsed_file.language,
                    "isExported": cls.isExported,
                    "extends": cls.extends,
                },
            )
            add_edge(_id("CONTAINS", file_id, cls_id), "CONTAINS", file_id, cls_id)

            for method in cls.methods:
                method_id = _id(
                    "Method",
                    parsed_file.path,
                    cls.name,
                    method.name,
                    str(method.startLine),
                )
                add_node(
                    method_id,
                    "Method",
                    {
                        "name": method.name,
                        "filePath": parsed_file.path,
                        "startLine": method.startLine,
                        "endLine": method.endLine,
                        "language": parsed_file.language,
                        "isAsync": method.isAsync,
                        "isStatic": method.isStatic,
                    },
                )
                add_edge(
                    _id("HAS_METHOD", cls_id, method_id),
                    "HAS_METHOD",
                    cls_id,
                    method_id,
                )

    TYPE_MAP = {
        "import": "IMPORTS",
        "call": "CALLS",
        "extends": "INHERITS",
        "implements": "IMPLEMENTS",
    }

    for dep in structure.dependencies:
        edge_type = TYPE_MAP.get(dep.type)
        if not edge_type:
            continue

        src = _id("File", dep.from_path)
        tgt = _id("File", dep.to_path)
        edge_id = _id(edge_type, dep.from_path, dep.to_path, dep.relationship)
        add_edge(edge_id, edge_type, src, tgt)

    return {
        "nodes": nodes,
        "edges": edges,
        "metadata": {
            **result.metadata,
            "totalNodes": len(nodes),
            "totalEdges": len(edges),
        },
    }


@router.post("/api/knowledge-graph/{repo_id}/agent-chat")
async def kg_agent_chat(repo_id: str, body: KGAgentChatRequest):
    client = _get_kg_openai_client()
    if not client:
        raise HTTPException(
            status_code=503, detail="OpenAI not configured (OPENAI_API_KEY not set)"
        )

    try:
        neo4j = Neo4jService()
    except ValueError as exc:
        raise HTTPException(status_code=503, detail=f"Neo4j not configured: {exc}")

    return StreamingResponse(
        _agent_stream(
            repo_id=repo_id,
            message=body.message,
            history=body.history or [],
            selected_node_context=body.selected_node_context or "",
            neo4j=neo4j,
            client=client,
            chat_id=body.chat_id,
            user_id=body.user_id,
        ),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
