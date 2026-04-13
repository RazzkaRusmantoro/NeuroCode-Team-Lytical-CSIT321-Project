# AI-Agent .md schema

When generating **Custom** AI-Agent documentation, the LLM should output a **bundle** of .md files: one main **guide** and one or more **rule/playbook** .mds. This directory holds the JSON schema and the code validates against it.

## Bundle shape

```json
{
  "guide": { ... },
  "rules": [ { ... }, { ... } ]
}
```

## Guide (main .md, e.g. GUIDE.md)

- **name** – Slug for filename (e.g. `"guide"` → `guide.md`)
- **description** – Short description (frontmatter)
- **metadata.tags** – Optional list of strings
- **when_to_use** – Body text for the "When to use" section (1–2 paragraphs)
- **topic_pointers** – Optional array of `{ title, body, rule_path }` for sections that point to a rule file
- **how_to_use** – **Required** array of `{ path, description }` (index of all rule .mds)

Example: see `.agents/skills/remotion-best-practices/SKILL.md` in the NeuroCode repo.

## Rule (each playbook .md, e.g. rules/timing.md)

- **name** – Slug for filename (e.g. `"timing"` → `timing.md`)
- **description** – Short description (frontmatter)
- **metadata.tags** – Optional list of strings
- **role** – Optional: when to load this .md, what it governs
- **prerequisites** – Optional list of strings (other rules or concepts)
- **body** – **Required** main markdown content (sections, code blocks, steps)
- **input** – Optional: expected inputs/format
- **output** – Optional: what the rule produces/returns

## Validation

- **JSON schemas:** `agent_guide_schema.json`, `agent_rule_schema.json`, `agent_docs_bundle_schema.json`
- **Pydantic models:** `neurocode.models.agent_docs` (`AgentGuide`, `AgentRule`, `AgentDocsBundle`)
- **Validator:** `neurocode.services.agent_docs_validation`
  - `load_agent_bundle_schema()` – load bundle schema for LLM prompt
  - `validate_agent_docs_bundle(data)` – returns `(ok, bundle_or_none, error_message)`
  - `validate_and_parse_agent_docs_bundle(data)` – returns `AgentDocsBundle` or raises `ValueError`

Use the validator on parsed LLM JSON before rendering to .md so each file conforms to the expected structure.
