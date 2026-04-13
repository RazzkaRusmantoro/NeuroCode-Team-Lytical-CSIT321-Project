'use client';
import { useMemo, useEffect, useState, useCallback, useRef } from 'react';
import { ReactFlow, Background, Controls, Handle, Position, BaseEdge, useNodesState, type Node, type Edge, type NodeProps, type EdgeProps, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { DirectedAssociationArrow, arrowBase } from '../uml/components/UmlRelationshipMarkers';
const NODE_WIDTH = 240;
const NODE_HEIGHT = 100;
const NODE_GAP = 80;
const ROLE_COLORS: Record<string, string> = {
    input: '#22c55e',
    process: '#3b82f6',
    decision: '#f59e0b',
    output: '#8b5cf6',
};
function roleColor(role: string): string {
    return ROLE_COLORS[role] ?? '#6b7280';
}
interface SectionClassNodeData {
    className: string;
    description?: string;
    role?: string;
}
function SectionClassNode({ data, selected }: NodeProps) {
    const d = data as unknown as SectionClassNodeData;
    const hiddenHandle = { opacity: 0, pointerEvents: 'none' as const, width: 1, height: 1 };
    const role = (d.role || 'process').toLowerCase();
    const leftBorderColor = roleColor(role);
    return (<>
      <Handle type="target" position={Position.Top} style={hiddenHandle}/>
      <div style={{
            position: 'relative',
            width: NODE_WIDTH,
            height: NODE_HEIGHT,
            boxSizing: 'border-box',
            background: '#1a1a1e',
            borderTopWidth: 1,
            borderRightWidth: 1,
            borderBottomWidth: 1,
            borderLeftWidth: 4,
            borderStyle: 'solid',
            borderTopColor: selected ? 'rgba(var(--color-primary-rgb), 0.5)' : '#333',
            borderRightColor: selected ? 'rgba(var(--color-primary-rgb), 0.5)' : '#333',
            borderBottomColor: selected ? 'rgba(var(--color-primary-rgb), 0.5)' : '#333',
            borderLeftColor: leftBorderColor,
            borderRadius: 10,
            overflow: 'hidden',
            boxShadow: selected ? '0 0 25px rgba(var(--color-primary-rgb), 0.3)' : '0 4px 20px rgba(0,0,0,0.35)',
            transform: selected ? 'translateY(-2px)' : 'translateY(0)',
            transition: 'all 0.3s ease',
            fontFamily: 'ui-monospace, monospace',
            cursor: 'pointer',
        }}>
        <div style={{
            padding: '12px 14px 8px',
            background: 'linear-gradient(180deg, #252528 0%, #1e1e22 100%)',
            textAlign: 'center',
            minHeight: 80,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
          <span style={{
            fontSize: 10,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: leftBorderColor,
            marginBottom: 4,
        }}>
            {role}
          </span>
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.02em',
        }}>
            {d.className}
          </div>
        </div>
        {selected && (<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent pointer-events-none rounded-[10px]"/>)}
      </div>
      <Handle type="source" position={Position.Bottom} style={hiddenHandle}/>
    </>);
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
const ARROW_LENGTH = 10;
interface BorderEdgeData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    relationship?: 'directed_association';
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
    const base = arrowBase(d.x2, d.y2, ux, uy, ARROW_LENGTH);
    return (<g>
      <BaseEdge id={id} path={`M ${d.x1} ${d.y1} L ${base.x} ${base.y}`} style={{ stroke, strokeWidth: 1.5 }}/>
      <DirectedAssociationArrow tipX={d.x2} tipY={d.y2} dirX={ux} dirY={uy} stroke={stroke} length={ARROW_LENGTH}/>
    </g>);
}
const nodeTypes = { sectionClass: SectionClassNode };
const edgeTypes = { border: BorderEdgeInner };
const FIT_VIEW_OPTS = { padding: 0.3, maxZoom: 1, duration: 200 };
type EdgeDef = {
    id: string;
    source: string;
    target: string;
    relationship: 'directed_association';
};
function computeSmartEdges(nodes: Node[], edgeDefs: EdgeDef[]): Edge[] {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return edgeDefs.map((e) => {
        const sn = map.get(e.source);
        const tn = map.get(e.target);
        if (!sn || !tn)
            return { id: e.id, source: e.source, target: e.target, type: 'border' as const };
        const sw = NODE_WIDTH;
        const sh = NODE_HEIGHT;
        const tw = NODE_WIDTH;
        const th = NODE_HEIGHT;
        const scx = sn.position.x + sw / 2;
        const scy = sn.position.y + sh / 2;
        const tcx = tn.position.x + tw / 2;
        const tcy = tn.position.y + th / 2;
        const [x1, y1] = borderPoint(scx, scy, sw, sh, tcx, tcy);
        const [x2, y2] = borderPoint(tcx, tcy, tw, th, scx, scy);
        return {
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'border' as const,
            style: { stroke: '#e4e4e7' },
            data: { x1, y1, x2, y2, relationship: 'directed_association' as const },
        };
    });
}
export interface SectionDiagramSpec {
    nodes: {
        id: string;
        label: string;
        description?: string;
        role?: string;
    }[];
    edges: {
        source: string;
        target: string;
    }[];
}
export interface ArchitectureSectionCanvasProps {
    sectionId: string;
    sectionTitle: string;
    diagram?: SectionDiagramSpec | null;
}
function buildNodesAndEdgesFromDiagram(sectionId: string, diagram: SectionDiagramSpec): {
    initialNodes: Node[];
    edgeDefs: EdgeDef[];
} {
    const prefix = `section-${sectionId}-`;
    const idMap = new Map<string, string>();
    diagram.nodes.forEach((n, i) => idMap.set(n.id, `${prefix}${n.id}`));
    const initialNodes: Node[] = diagram.nodes.map((n, i) => ({
        id: idMap.get(n.id) ?? `${prefix}${i}`,
        type: 'sectionClass',
        position: { x: i * (NODE_WIDTH + NODE_GAP), y: 0 },
        data: {
            className: typeof n.label === 'string' ? n.label : String(n.label ?? ''),
            description: typeof n.description === 'string' ? n.description.trim() : '',
            role: n.role ?? 'process',
        },
    }));
    const edgeDefs: EdgeDef[] = diagram.edges
        .filter((e) => idMap.has(e.source) && idMap.has(e.target))
        .map((e, i) => ({
        id: `${prefix}edge-${i}`,
        source: idMap.get(e.source)!,
        target: idMap.get(e.target)!,
        relationship: 'directed_association' as const,
    }));
    return { initialNodes, edgeDefs };
}
export default function ArchitectureSectionCanvas({ sectionId, sectionTitle, diagram, }: ArchitectureSectionCanvasProps) {
    const useDiagram = diagram?.nodes?.length;
    const { initialNodes: diagramNodes, edgeDefs: diagramEdgeDefs } = useMemo(() => {
        if (!useDiagram || !diagram)
            return { initialNodes: [], edgeDefs: [] };
        return buildNodesAndEdgesFromDiagram(sectionId, diagram);
    }, [sectionId, diagram, useDiagram]);
    const [nodes, setNodes, onNodesChange] = useNodesState(diagramNodes);
    const [selectedNode, setSelectedNode] = useState<{
        label: string;
        description: string;
    } | null>(null);
    const [panelVisible, setPanelVisible] = useState(false);
    const clearSelectedNodeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        setNodes(diagramNodes);
    }, [sectionId, diagramNodes, setNodes]);
    const edgeDefs = diagramEdgeDefs;
    const handleNodeClick = useCallback((_ev: React.MouseEvent, node: Node) => {
        if (clearSelectedNodeTimeoutRef.current) {
            clearTimeout(clearSelectedNodeTimeoutRef.current);
            clearSelectedNodeTimeoutRef.current = null;
        }
        const d = node.data as unknown as SectionClassNodeData;
        const desc = typeof d.description === 'string' ? d.description.trim() : String(d.description ?? '').trim();
        const label = typeof d.className === 'string' ? d.className : String(d.className ?? '');
        setSelectedNode({ label, description: desc || '' });
        setPanelVisible(true);
    }, []);
    const closePanel = useCallback(() => {
        setPanelVisible(false);
        if (clearSelectedNodeTimeoutRef.current)
            clearTimeout(clearSelectedNodeTimeoutRef.current);
        clearSelectedNodeTimeoutRef.current = setTimeout(() => setSelectedNode(null), 300);
    }, []);
    if (!useDiagram || diagramNodes.length === 0) {
        return null;
    }
    const edges: Edge[] = useMemo(() => computeSmartEdges(nodes, edgeDefs), [nodes, edgeDefs]);
    return (<div className="rounded-lg overflow-hidden border border-white/10 bg-[#1a1a1d] relative" style={{ height: 350, minHeight: 350 }}>
      <style>{`
        .arch-section-canvas .react-flow__attribution { display: none !important; }
        .arch-section-canvas .react-flow__controls {
          background: #1e1e21 !important;
          border: 1px solid #333 !important;
          border-radius: 6px !important;
        }
        .arch-section-canvas .react-flow__controls-button {
          background: #1e1e21 !important;
          border-bottom: 1px solid #333 !important;
          color: #ccc !important;
        }
        .arch-section-canvas .react-flow__controls-button:hover {
          background: #262626 !important;
          color: #fff !important;
        }
      `}</style>
      <div className="arch-section-canvas w-full h-full">
        <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onNodeClick={handleNodeClick} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={FIT_VIEW_OPTS} minZoom={0.25} maxZoom={1.5} proOptions={{ hideAttribution: true }} nodesDraggable nodesConnectable={false} elementsSelectable panOnDrag zoomOnScroll zoomOnPinch>
          <Background gap={20} size={1} color="#333338"/>
          <Controls showInteractive={false}/>
        </ReactFlow>
      </div>

      
      <div className="absolute inset-0 pointer-events-none flex justify-end items-stretch" style={{ zIndex: 20 }}>
        <div className="pointer-events-auto overflow-hidden flex flex-col bg-[#1e1e21] border-l border-white/15 shadow-xl custom-scrollbar" style={{
            width: 320,
            maxWidth: '90%',
            transform: panelVisible ? 'translateX(0)' : 'translateX(100%)',
            opacity: panelVisible ? 1 : 0,
            transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.25s ease',
        }}>
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 flex-shrink-0">
            <h3 className="text-base font-semibold text-white truncate pr-2">
              {(selectedNode?.label ?? '').trim() || 'Step'}
            </h3>
            <button type="button" onClick={closePanel} className="flex-shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-colors" aria-label="Close">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6L6 18M6 6l12 12"/>
              </svg>
            </button>
          </div>
          <div className="flex-1 overflow-y-auto px-4 py-4 min-h-0">
            <p className="text-sm text-white/85 leading-relaxed whitespace-pre-wrap">
              {(selectedNode?.description ?? '').trim() || 'No description available for this step.'}
            </p>
          </div>
        </div>
      </div>
      {panelVisible && (<button type="button" className="absolute inset-0 bg-black/40 pointer-events-auto z-10 transition-opacity duration-200" onClick={closePanel} aria-label="Close panel" style={{ zIndex: 15 }}/>)}
    </div>);
}
