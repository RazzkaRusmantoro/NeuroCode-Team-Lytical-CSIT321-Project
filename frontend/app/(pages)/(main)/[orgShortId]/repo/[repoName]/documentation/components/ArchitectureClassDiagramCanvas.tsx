'use client';
import React, { useMemo, useEffect } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, useNodesState, type Node, type Edge, type NodeProps, type EdgeProps, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Dagre from '@dagrejs/dagre';
import { CompositionDiamond, AggregationDiamond, GeneralizationArrow, DirectedAssociationArrow, diamondBase, arrowBase, DEFAULT_DIAMOND_LENGTH, DEFAULT_ARROW_LENGTH, } from '../uml/components/UmlRelationshipMarkers';
interface ApiUmlAttribute {
    name: string;
    type: string;
    visibility: '+' | '-' | '#' | '~';
    description?: string;
}
interface ApiUmlMethod {
    name: string;
    params: string;
    returnType: string;
    visibility: '+' | '-' | '#' | '~';
    description?: string;
}
export interface ApiUmlClass {
    id: string;
    className: string;
    explanation?: string;
    stereotype?: string;
    abstract?: boolean;
    isInterface?: boolean;
    isEnum?: boolean;
    enumValues?: string[];
    attributes: ApiUmlAttribute[];
    methods: ApiUmlMethod[];
}
export interface ApiUmlRelationship {
    source: string;
    target: string;
    relationship: 'composition' | 'aggregation' | 'association' | 'directed_association' | 'generalization' | 'dependency';
    sourceMultiplicity?: string;
    targetMultiplicity?: string;
}
interface UMLClassData {
    className: string;
    explanation?: string;
    stereotype?: string;
    abstract?: boolean;
    isInterface?: boolean;
    isEnum?: boolean;
    enumValues?: string[];
    attributes: (ApiUmlAttribute & {
        description?: string;
    })[];
    methods: (ApiUmlMethod & {
        description?: string;
    })[];
}
const NODE_WIDTH = 240;
const NODE_HEIGHT = 220;
const LAYOUT_BOX_WIDTH = 300;
const LAYOUT_BOX_HEIGHT = 320;
const LAYOUT_NODESEP = 120;
const LAYOUT_RANKSEP = 200;
const LAYOUT_MARGIN = 50;
const LAYOUT_MIN_GAP = 24;
const MULT_ALONG = 12;
const MULT_PERP = 10;
function formatStereotype(s: string) {
    return `<<${s}>>`;
}
function borderPoint(cx: number, cy: number, w: number, h: number, tx: number, ty: number): [
    number,
    number
] {
    const dx = tx - cx;
    const dy = ty - cy;
    if (dx === 0 && dy === 0)
        return [cx, cy - h / 2];
    const sx = dx !== 0 ? (w / 2) / Math.abs(dx) : Infinity;
    const sy = dy !== 0 ? (h / 2) / Math.abs(dy) : Infinity;
    const t = Math.min(sx, sy);
    return [cx + dx * t, cy + dy * t];
}
function UMLClassNodeInner({ data, selected }: NodeProps) {
    const d = data as unknown as UMLClassData;
    const visColor = (v: string) => (v === '+' ? '#6ee7b7' : v === '-' ? '#f87171' : v === '#' ? '#fbbf24' : '#94a3b8');
    const hiddenHandle = { opacity: 0, pointerEvents: 'none' as const, width: 1, height: 1 };
    return (<>
      <Handle type="target" position={Position.Top} style={hiddenHandle}/>
      <div style={{
            position: 'relative',
            minWidth: 200,
            maxWidth: 280,
            background: '#1a1a1e',
            border: selected ? '1px solid rgba(var(--color-primary-rgb), 0.5)' : '1px solid #333',
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: selected ? '0 0 25px rgba(var(--color-primary-rgb), 0.3)' : '0 4px 20px rgba(0,0,0,0.35)',
            transform: selected ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'all 0.3s ease',
            fontFamily: 'ui-monospace, monospace',
            cursor: 'grab',
        }}>
        <div style={{ padding: '10px 14px', background: 'linear-gradient(180deg, #252528 0%, #1e1e22 100%)', borderBottom: '1px solid #333', textAlign: 'center' }}>
          {d.stereotype && <div style={{ fontSize: 10, color: '#888', marginBottom: 2, fontStyle: 'italic' }}>{formatStereotype(d.stereotype)}</div>}
          <div style={{ fontSize: 15, fontWeight: 700, color: '#fff', letterSpacing: '0.02em', fontStyle: d.abstract ? 'italic' : undefined }}>{d.className}</div>
        </div>
        {d.attributes.length > 0 && (<div style={{ padding: '8px 14px', borderBottom: '1px solid #2a2a2e', background: '#1e1e22' }}>
            {d.attributes.map((a, i) => (<div key={i} style={{ fontSize: 11, color: '#b4b4b8', display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: i < d.attributes.length - 1 ? 4 : 0 }}>
                <span style={{ color: visColor(a.visibility), fontWeight: 600, minWidth: 12 }}>{a.visibility}</span>
                <span style={{ color: '#e4e4e7' }}>{a.name}</span>
                <span style={{ color: '#71717a' }}>: {a.type}</span>
              </div>))}
          </div>)}
        {d.isEnum && d.enumValues?.length ? (<div style={{ padding: '8px 14px', background: '#1a1a1e' }}>
            {d.enumValues.map((val, i) => (<div key={i} style={{ fontSize: 11, color: '#b4b4b8', marginBottom: i < d.enumValues!.length - 1 ? 2 : 0 }}>{val}</div>))}
          </div>) : d.methods.length > 0 ? (<div style={{ padding: '8px 14px', background: '#1a1a1e' }}>
            {d.methods.map((m, i) => (<div key={i} style={{ fontSize: 11, color: '#b4b4b8', display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: i < d.methods.length - 1 ? 4 : 0 }}>
                <span style={{ color: visColor(m.visibility), fontWeight: 600, minWidth: 12 }}>{m.visibility}</span>
                <span style={{ color: '#e4e4e7' }}>{m.name}(<span style={{ color: '#71717a' }}>{m.params}</span>)</span>
                <span style={{ color: '#71717a' }}>: {m.returnType}</span>
              </div>))}
          </div>) : null}
        {selected && <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent pointer-events-none rounded-[10px]"/>}
      </div>
      <Handle type="source" position={Position.Bottom} style={hiddenHandle}/>
    </>);
}
const UMLClassNode = React.memo(UMLClassNodeInner);
interface BorderEdgeData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    sourceMultiplicity?: string;
    targetMultiplicity?: string;
    relationship?: 'composition' | 'aggregation' | 'association' | 'directed_association' | 'generalization' | 'dependency';
}
function BorderEdgeInner({ id, data, style }: EdgeProps) {
    const d = data as BorderEdgeData | undefined;
    if (!d)
        return null;
    const dx = d.x2 - d.x1;
    const dy = d.y2 - d.y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const stroke = (style as {
        stroke?: string;
    })?.stroke ?? '#e4e4e7';
    const rel = d.relationship;
    let lineX1 = d.x1, lineY1 = d.y1;
    let diamondSvg = null;
    if (rel === 'composition') {
        const base = diamondBase(d.x1, d.y1, ux, uy, DEFAULT_DIAMOND_LENGTH);
        lineX1 = base.x;
        lineY1 = base.y;
        diamondSvg = <CompositionDiamond tipX={d.x1} tipY={d.y1} dirX={ux} dirY={uy} stroke={stroke}/>;
    }
    else if (rel === 'aggregation') {
        const base = diamondBase(d.x1, d.y1, ux, uy, DEFAULT_DIAMOND_LENGTH);
        lineX1 = base.x;
        lineY1 = base.y;
        diamondSvg = <AggregationDiamond tipX={d.x1} tipY={d.y1} dirX={ux} dirY={uy} stroke={stroke}/>;
    }
    let lineX2 = d.x2, lineY2 = d.y2;
    let arrowSvg = null;
    if (rel === 'generalization') {
        const base = arrowBase(d.x2, d.y2, ux, uy, DEFAULT_ARROW_LENGTH);
        lineX2 = base.x;
        lineY2 = base.y;
        arrowSvg = <GeneralizationArrow tipX={d.x2} tipY={d.y2} dirX={ux} dirY={uy} stroke={stroke}/>;
    }
    else if (rel === 'directed_association' || rel === 'dependency') {
        arrowSvg = <DirectedAssociationArrow tipX={d.x2} tipY={d.y2} dirX={ux} dirY={uy} stroke={stroke}/>;
    }
    const px = -uy, py = ux;
    const sx = d.x1 + ux * MULT_ALONG + px * MULT_PERP, sy = d.y1 + uy * MULT_ALONG + py * MULT_PERP;
    const tx = d.x2 - ux * (rel === 'generalization' ? MULT_ALONG + DEFAULT_ARROW_LENGTH : MULT_ALONG + 10) - px * MULT_PERP;
    const ty = d.y2 - uy * (rel === 'generalization' ? MULT_ALONG + DEFAULT_ARROW_LENGTH : MULT_ALONG + 10) - py * MULT_PERP;
    const edgeStyle = { ...style, strokeDasharray: rel === 'dependency' ? '6, 6' : undefined };
    return (<g>
      <BaseEdge id={id} path={`M ${lineX1} ${lineY1} L ${lineX2} ${lineY2}`} style={edgeStyle}/>
      {diamondSvg}
      {arrowSvg}
      {d.sourceMultiplicity != null && <text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace">{d.sourceMultiplicity}</text>}
      {d.targetMultiplicity != null && <text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace">{d.targetMultiplicity}</text>}
    </g>);
}
type EdgeDef = {
    id: string;
    source: string;
    target: string;
    stroke?: string;
    sourceMultiplicity?: string;
    targetMultiplicity?: string;
    relationship: BorderEdgeData['relationship'];
};
function sortClassesForLayout(classes: ApiUmlClass[], relationships: ApiUmlRelationship[]): ApiUmlClass[] {
    const targetsOfGen = new Set(relationships.filter((r) => r.relationship === 'generalization').map((r) => r.target));
    const idToIndex = new Map(classes.map((c, i) => [c.id, i]));
    const order = [...classes];
    order.sort((a, b) => {
        const aIsBase = targetsOfGen.has(a.id) ? 1 : 0;
        const bIsBase = targetsOfGen.has(b.id) ? 1 : 0;
        if (aIsBase !== bIsBase)
            return aIsBase - bIsBase;
        return idToIndex.get(a.id)! - idToIndex.get(b.id)!;
    });
    return order;
}
function buildNodesFromGeneratedClasses(classes: ApiUmlClass[], _relationships: ApiUmlRelationship[]): Node[] {
    const sorted = sortClassesForLayout(classes, _relationships);
    return sorted.map((c) => ({
        id: c.id,
        type: 'umlClass',
        position: { x: 0, y: 0 },
        data: {
            className: c.className,
            explanation: c.explanation,
            stereotype: c.stereotype,
            abstract: c.abstract,
            isInterface: c.isInterface,
            isEnum: c.isEnum,
            enumValues: c.enumValues,
            attributes: c.attributes || [],
            methods: c.methods || [],
        } as unknown as Record<string, unknown>,
    }));
}
function buildEdgeDefsFromGeneratedRels(relationships: ApiUmlRelationship[]): EdgeDef[] {
    return relationships.map((r, i) => ({
        id: `e-${r.source}-${r.target}-${i}`,
        source: r.source,
        target: r.target,
        stroke: '#e4e4e7',
        sourceMultiplicity: r.sourceMultiplicity,
        targetMultiplicity: r.targetMultiplicity,
        relationship: r.relationship,
    }));
}
function resolveOverlaps(nodes: Node[], boxW: number, boxH: number): Node[] {
    let current = nodes.map((n) => ({ ...n, position: { ...n.position } }));
    for (let pass = 0; pass < 25; pass++) {
        let moved = false;
        for (let i = 0; i < current.length; i++) {
            for (let j = i + 1; j < current.length; j++) {
                const a = current[i], b = current[j];
                const overlapX = Math.min(a.position.x + boxW, b.position.x + boxW) - Math.max(a.position.x, b.position.x);
                const overlapY = Math.min(a.position.y + boxH, b.position.y + boxH) - Math.max(a.position.y, b.position.y);
                if (overlapX <= 0 || overlapY <= 0)
                    continue;
                const shiftX = overlapX + LAYOUT_MIN_GAP, shiftY = overlapY + LAYOUT_MIN_GAP;
                const dx = b.position.x >= a.position.x ? shiftX : -shiftX;
                const dy = b.position.y >= a.position.y ? shiftY : -shiftY;
                if (overlapX >= overlapY)
                    current[j] = { ...b, position: { x: b.position.x + dx, y: b.position.y } };
                else
                    current[j] = { ...b, position: { x: b.position.x, y: b.position.y + dy } };
                moved = true;
            }
        }
        if (!moved)
            break;
    }
    return current;
}
function runDagreLayout(nodes: Node[], edgeDefs: EdgeDef[], boxW: number, boxH: number, rankdir: 'TB' | 'LR'): {
    nodes: Node[];
    width: number;
    height: number;
} {
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir, nodesep: LAYOUT_NODESEP, ranksep: LAYOUT_RANKSEP, marginx: LAYOUT_MARGIN, marginy: LAYOUT_MARGIN });
    nodes.forEach((n) => g.setNode(n.id, { width: boxW, height: boxH }));
    edgeDefs.forEach((e) => {
        if (g.hasNode(e.source) && g.hasNode(e.target))
            g.setEdge(e.source, e.target);
    });
    Dagre.layout(g);
    const result = nodes.map((n) => {
        const pos = g.node(n.id);
        if (!pos)
            return n;
        return { ...n, position: { x: pos.x - boxW / 2, y: pos.y - boxH / 2 } };
    });
    const resolved = resolveOverlaps(result, boxW, boxH);
    const minX = Math.min(...resolved.map((n) => n.position.x));
    const minY = Math.min(...resolved.map((n) => n.position.y));
    const maxX = Math.max(...resolved.map((n) => n.position.x + boxW));
    const maxY = Math.max(...resolved.map((n) => n.position.y + boxH));
    return { nodes: resolved, width: maxX - minX, height: maxY - minY };
}
function getLayoutedClassNodes(nodes: Node[], edgeDefs: EdgeDef[]): Node[] {
    if (nodes.length === 0)
        return [];
    const hasEdges = edgeDefs.length > 0 && edgeDefs.some((e) => nodes.some((n) => n.id === e.source) && nodes.some((n) => n.id === e.target));
    if (!hasEdges) {
        const COLS = Math.ceil(Math.sqrt(nodes.length)) || 1;
        return nodes.map((n, i) => ({
            ...n,
            position: {
                x: LAYOUT_MARGIN + (i % COLS) * (LAYOUT_BOX_WIDTH + LAYOUT_NODESEP),
                y: LAYOUT_MARGIN + Math.floor(i / COLS) * (LAYOUT_BOX_HEIGHT + LAYOUT_RANKSEP),
            },
        }));
    }
    const tb = runDagreLayout(nodes, edgeDefs, LAYOUT_BOX_WIDTH, LAYOUT_BOX_HEIGHT, 'TB');
    const lr = runDagreLayout(nodes, edgeDefs, LAYOUT_BOX_WIDTH, LAYOUT_BOX_HEIGHT, 'LR');
    const aspect = (w: number, h: number) => (w > h ? w / h : h / w);
    return aspect(tb.width, tb.height) <= aspect(lr.width, lr.height) ? tb.nodes : lr.nodes;
}
function computeSmartEdges(nodes: Node[], edgeDefs: EdgeDef[]): Edge[] {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return edgeDefs.map((e) => {
        const sn = map.get(e.source);
        const tn = map.get(e.target);
        if (!sn || !tn)
            return { id: e.id, source: e.source, target: e.target, type: 'border' as const };
        const sw = NODE_WIDTH, sh = NODE_HEIGHT, tw = NODE_WIDTH, th = NODE_HEIGHT;
        const scx = sn.position.x + sw / 2, scy = sn.position.y + sh / 2;
        const tcx = tn.position.x + tw / 2, tcy = tn.position.y + th / 2;
        const [x1, y1] = borderPoint(scx, scy, sw, sh, tcx, tcy);
        const [x2, y2] = borderPoint(tcx, tcy, tw, th, scx, scy);
        return {
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'border' as const,
            style: { stroke: e.stroke ?? '#e4e4e7' },
            data: { x1, y1, x2, y2, sourceMultiplicity: e.sourceMultiplicity, targetMultiplicity: e.targetMultiplicity, relationship: e.relationship },
        };
    });
}
const nodeTypes = { umlClass: UMLClassNode };
const edgeTypes = { border: BorderEdgeInner };
const FIT_VIEW_OPTS = { padding: 0.2, maxZoom: 0.9, duration: 300 };
export interface ArchitectureClassDiagramCanvasProps {
    sectionId: string;
    classes: ApiUmlClass[];
    relationships: ApiUmlRelationship[];
}
export default function ArchitectureClassDiagramCanvas({ sectionId, classes, relationships }: ArchitectureClassDiagramCanvasProps) {
    const displayNodes = useMemo(() => buildNodesFromGeneratedClasses(classes, relationships), [classes, relationships]);
    const displayEdgeDefs = useMemo(() => buildEdgeDefsFromGeneratedRels(relationships), [relationships]);
    const layoutedNodes = useMemo(() => getLayoutedClassNodes(displayNodes, displayEdgeDefs), [displayNodes, displayEdgeDefs]);
    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const edges = useMemo(() => computeSmartEdges(nodes, displayEdgeDefs), [nodes, displayEdgeDefs]);
    useEffect(() => {
        setNodes(layoutedNodes);
    }, [sectionId, layoutedNodes, setNodes]);
    if (classes.length === 0)
        return null;
    return (<div className="rounded-lg overflow-hidden border border-white/10 bg-[#1a1a1d]" style={{ height: 420, minHeight: 420 }}>
      <style>{`
        .arch-class-canvas .react-flow__attribution { display: none !important; }
        .arch-class-canvas .react-flow__controls { background: #1e1e21 !important; border: 1px solid #333 !important; border-radius: 6px !important; }
        .arch-class-canvas .react-flow__controls-button { background: #1e1e21 !important; border-bottom: 1px solid #333 !important; color: #ccc !important; }
        .arch-class-canvas .react-flow__controls-button:hover { background: #262626 !important; color: #fff !important; }
      `}</style>
      <div className="arch-class-canvas w-full h-full">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={FIT_VIEW_OPTS} minZoom={0.1} maxZoom={2} proOptions={{ hideAttribution: true }} nodesDraggable nodesConnectable={false} elementsSelectable panOnDrag zoomOnScroll zoomOnPinch>
          <Background gap={20} size={1} color="#333338"/>
          <Controls showInteractive={false}/>
        </ReactFlow>
      </div>
    </div>);
}
