'use client';
import { useMemo, useRef, useEffect, useState, createContext, useContext, memo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ReactFlow, Background, Controls, useNodesState, BaseEdge, Handle, Position, type Node, type NodeProps, type EdgeProps, type ReactFlowInstance, type Edge, } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import Dagre from '@dagrejs/dagre';
import { CompositionDiamond, AggregationDiamond, GeneralizationArrow, DirectedAssociationArrow, diamondBase, arrowBase, DEFAULT_DIAMOND_LENGTH, DEFAULT_ARROW_LENGTH, } from '../components/UmlRelationshipMarkers';
import { UMLLifelineNode, SequenceMessageEdge, SequenceSelfMessageEdge, SequenceFragmentNode, SequenceStepLabelNode, UseCaseSystemBoundaryNode, UseCaseActorNode, UseCaseNode, CommunicationLinkEdge, UseCaseExtendEdge, UseCaseIncludeEdge, UseCaseGeneralizationEdge, InitialStateNode, FinalStateNode, StateNode, CompositeStateNode, StateTransitionEdge } from '../components/UmlSequenceNodes';
const FIT_VIEW_OPTS = { padding: 0.2, maxZoom: 0.9, duration: 300 };
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
interface ApiUmlClass {
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
interface ApiUmlRelationship {
    source: string;
    target: string;
    relationship: 'composition' | 'aggregation' | 'association' | 'directed_association' | 'generalization' | 'dependency';
    sourceMultiplicity?: string;
    targetMultiplicity?: string;
}
interface ApiSequenceLifeline {
    id: string;
    label: string;
    isActor?: boolean;
    isDestroyed?: boolean;
}
interface ApiSequenceMessage {
    fromLifeline: string;
    toLifeline: string;
    label: string;
    isReturn?: boolean;
    opensNewActivation?: boolean;
}
interface ApiSequenceFragment {
    operator: string;
    condition?: string;
    messageIndices?: number[];
}
interface ApiSequenceStep {
    title: string;
    messageIndices: number[];
}
interface ApiUseCaseSystemBoundary {
    label: string;
}
interface ApiUseCaseActor {
    id: string;
    label: string;
    placement?: 'left' | 'right';
}
interface ApiUseCase {
    id: string;
    label: string;
}
interface ApiUseCaseRelationship {
    source: string;
    target: string;
    relationship: 'communication' | 'include' | 'extend' | 'generalization';
}
interface ApiStateInitial {
    id: string;
}
interface ApiStateFinal {
    id: string;
}
interface ApiStateState {
    id: string;
    label: string;
}
interface ApiStateComposite {
    id: string;
    label: string;
    childIds?: string[];
}
interface ApiStateTransition {
    source: string;
    target: string;
    label?: string;
    eventParameter?: string;
}
interface UMLAttribute {
    name: string;
    type: string;
    visibility: '+' | '-' | '#' | '~';
}
interface UMLMethod {
    name: string;
    params: string;
    returnType: string;
    visibility: '+' | '-' | '#' | '~';
}
interface UMLClassData {
    className: string;
    explanation?: string;
    stereotype?: string;
    abstract?: boolean;
    isInterface?: boolean;
    isEnum?: boolean;
    enumValues?: string[];
    attributes: (UMLAttribute & {
        description?: string;
    })[];
    methods: (UMLMethod & {
        description?: string;
    })[];
}
function formatStereotype(s: string) {
    return `<<${s}>>`;
}
const UmlDetailsContext = createContext<boolean>(false);
function UMLClassNodeInner({ data, selected }: NodeProps) {
    const d = data as unknown as UMLClassData;
    const hideDetails = useContext(UmlDetailsContext);
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
            cursor: 'pointer',
        }}>
        <div style={{
            padding: '10px 14px',
            background: 'linear-gradient(180deg, #252528 0%, #1e1e22 100%)',
            borderBottom: '1px solid #333',
            textAlign: 'center',
        }}>
          {d.stereotype && (<div style={{ fontSize: 10, color: '#888', marginBottom: 2, fontStyle: 'italic' }}>
              {formatStereotype(d.stereotype)}
            </div>)}
          <div style={{
            fontSize: 15,
            fontWeight: 700,
            color: '#fff',
            letterSpacing: '0.02em',
            fontStyle: d.abstract ? 'italic' : undefined,
        }}>
            {d.className}
          </div>
        </div>
        {d.attributes.length > 0 && (<div style={{
                padding: '8px 14px',
                borderBottom: '1px solid #2a2a2e',
                background: '#1e1e22',
            }}>
            {d.attributes.map((a, i) => (<div key={i} style={{
                    fontSize: 11,
                    color: '#b4b4b8',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    marginBottom: i < d.attributes.length - 1 ? 4 : 0,
                }}>
                <span style={{ color: visColor(a.visibility), fontWeight: 600, minWidth: 12 }}>{a.visibility}</span>
                <span style={{ color: '#e4e4e7' }}>{a.name}</span>
                {!hideDetails && <span style={{ color: '#71717a' }}>: {a.type}</span>}
              </div>))}
          </div>)}
        {d.isEnum && d.enumValues && d.enumValues.length > 0 ? (<div style={{ padding: '8px 14px', background: '#1a1a1e' }}>
            {d.enumValues.map((val, i) => (<div key={i} style={{ fontSize: 11, color: '#b4b4b8', marginBottom: i < d.enumValues!.length - 1 ? 2 : 0 }}>
                {val}
              </div>))}
          </div>) : d.methods.length > 0 ? (<div style={{ padding: '8px 14px', background: '#1a1a1e' }}>
            {d.methods.map((m, i) => (<div key={i} style={{
                    fontSize: 11,
                    color: '#b4b4b8',
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    marginBottom: i < d.methods.length - 1 ? 4 : 0,
                }}>
                <span style={{ color: visColor(m.visibility), fontWeight: 600, minWidth: 12 }}>{m.visibility}</span>
                <span style={{ color: '#e4e4e7' }}>
                  {hideDetails ? (`${m.name}()`) : (<>{m.name}(<span style={{ color: '#71717a' }}>{m.params}</span>)</>)}
                </span>
                {!hideDetails && <span style={{ color: '#71717a' }}>: {m.returnType}</span>}
              </div>))}
          </div>) : null}
        {selected && (<div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/5 to-transparent pointer-events-none rounded-[10px]"/>)}
      </div>
      <Handle type="source" position={Position.Bottom} style={hiddenHandle}/>
    </>);
}
const UMLClassNode = memo(UMLClassNodeInner, (prev, next) => prev.id === next.id &&
    prev.data === next.data &&
    prev.selected === next.selected &&
    (prev as NodeProps & {
        dragging?: boolean;
    }).dragging === (next as NodeProps & {
        dragging?: boolean;
    }).dragging);
const nodeTypes = { umlClass: UMLClassNode, lifeline: UMLLifelineNode, sequenceFragment: SequenceFragmentNode, sequenceStepLabel: SequenceStepLabelNode, useCaseSystemBoundary: UseCaseSystemBoundaryNode, useCaseActor: UseCaseActorNode, useCase: UseCaseNode, initialState: InitialStateNode, finalState: FinalStateNode, state: StateNode, compositeState: CompositeStateNode };
const SYSTEM_BOUNDARY_ID = 'system-boundary-1';
const SYSTEM_BOUNDARY_NODE: Node = {
    id: SYSTEM_BOUNDARY_ID,
    type: 'useCaseSystemBoundary',
    position: { x: 0, y: 0 },
    data: { label: 'System', width: 920, height: 800 },
    zIndex: -3,
};
const USE_CASE_EDGE_DEFS = [
    { id: 'comm-actor-usecase1', source: 'actor-1', target: 'usecase-1', type: 'communicationLink' as const },
    { id: 'comm-usecase1-usecase2', source: 'usecase-1', target: 'usecase-2', type: 'communicationLink' as const },
    { id: 'extend-usecase3-usecase1', source: 'usecase-3', target: 'usecase-1', type: 'useCaseExtend' as const },
    { id: 'include-usecase2-usecase4', source: 'usecase-2', target: 'usecase-4', type: 'useCaseInclude' as const },
    { id: 'gen-actor2-actor1', source: 'actor-2', target: 'actor-1', type: 'useCaseGeneralization' as const },
    { id: 'gen-usecase3-usecase2', source: 'usecase-3', target: 'usecase-2', type: 'useCaseGeneralization' as const },
];
type UseCaseEdgeDef = {
    id: string;
    source: string;
    target: string;
    type: 'communicationLink' | 'useCaseExtend' | 'useCaseInclude' | 'useCaseGeneralization';
};
function buildUseCaseEdgeDefsFromGenerated(relationships: ApiUseCaseRelationship[]): UseCaseEdgeDef[] {
    return relationships.map((r, i) => {
        const typeMap = {
            communication: 'communicationLink' as const,
            include: 'useCaseInclude' as const,
            extend: 'useCaseExtend' as const,
            generalization: 'useCaseGeneralization' as const,
        };
        return {
            id: `uc-${r.source}-${r.target}-${i}`,
            source: r.source,
            target: r.target,
            type: typeMap[r.relationship] ?? 'communicationLink',
        };
    });
}
function buildUseCaseNodesFromGenerated(systemBoundary: ApiUseCaseSystemBoundary, actors: ApiUseCaseActor[], useCases: ApiUseCase[]): Node[] {
    const boundaryWidth = 920;
    const boundaryHeight = 800;
    const boundaryNode: Node = {
        ...SYSTEM_BOUNDARY_NODE,
        data: {
            ...SYSTEM_BOUNDARY_NODE.data,
            label: systemBoundary?.label ?? 'System',
            width: boundaryWidth,
            height: boundaryHeight,
        },
    };
    const leftActors = actors.filter((a) => (a.placement ?? 'left') === 'left');
    const rightActors = actors.filter((a) => a.placement === 'right');
    const actorSpacingY = 140;
    const actorStartY = 100;
    const leftActorX = -200;
    const rightActorX = boundaryWidth + 80;
    const actorNodes: Node[] = [
        ...leftActors.map((a, i) => ({
            id: a.id,
            type: 'useCaseActor' as const,
            parentId: SYSTEM_BOUNDARY_ID,
            position: { x: leftActorX, y: actorStartY + i * actorSpacingY },
            data: { label: a.label },
        })),
        ...rightActors.map((a, i) => ({
            id: a.id,
            type: 'useCaseActor' as const,
            parentId: SYSTEM_BOUNDARY_ID,
            position: { x: rightActorX, y: actorStartY + i * actorSpacingY },
            data: { label: a.label },
        })),
    ];
    const ucCols = 2;
    const ucStartX = 160;
    const ucStartY = 140;
    const ucSpacingX = 280;
    const ucSpacingY = 160;
    const useCaseNodes: Node[] = useCases.map((u, i) => {
        const col = i % ucCols;
        const row = Math.floor(i / ucCols);
        return {
            id: u.id,
            type: 'useCase',
            parentId: SYSTEM_BOUNDARY_ID,
            position: { x: ucStartX + col * ucSpacingX, y: ucStartY + row * ucSpacingY },
            data: { label: u.label, width: 140, height: 72 },
        };
    });
    return [boundaryNode, ...actorNodes, ...useCaseNodes];
}
const USE_CASE_ACTOR_WIDTH = 80;
const USE_CASE_ACTOR_HEIGHT = 80;
const USE_CASE_DEFAULT_WIDTH = 140;
const USE_CASE_DEFAULT_HEIGHT = 72;
function getOverlayNodeSize(n: Node): [
    number,
    number
] {
    if (n.measured && typeof n.measured.width === 'number' && typeof n.measured.height === 'number') {
        return [n.measured.width, n.measured.height];
    }
    if (n.type === 'useCaseActor')
        return [USE_CASE_ACTOR_WIDTH, USE_CASE_ACTOR_HEIGHT];
    if (n.type === 'useCase') {
        const w = (n.data?.width as number) ?? USE_CASE_DEFAULT_WIDTH;
        const h = (n.data?.height as number) ?? USE_CASE_DEFAULT_HEIGHT;
        return [w, h];
    }
    return [USE_CASE_DEFAULT_WIDTH, USE_CASE_DEFAULT_HEIGHT];
}
function getAbsolutePosition(node: Node, map: Map<string, Node>): {
    x: number;
    y: number;
} {
    let x = 0;
    let y = 0;
    let n: Node | undefined = node;
    while (n) {
        x += n.position.x;
        y += n.position.y;
        n = n.parentId ? map.get(n.parentId) : undefined;
    }
    return { x, y };
}
function computeUseCaseEdges(nodes: Node[], edgeDefs?: UseCaseEdgeDef[]): Edge[] {
    const defs = edgeDefs ?? USE_CASE_EDGE_DEFS;
    const map = new Map(nodes.map((n) => [n.id, n]));
    return defs.map((e) => {
        const sn = map.get(e.source);
        const tn = map.get(e.target);
        if (!sn || !tn)
            return { id: e.id, source: e.source, target: e.target, type: e.type };
        const [sw, sh] = getOverlayNodeSize(sn);
        const [tw, th] = getOverlayNodeSize(tn);
        const spos = getAbsolutePosition(sn, map);
        const tpos = getAbsolutePosition(tn, map);
        const scx = spos.x + sw / 2;
        const scy = spos.y + sh / 2;
        const tcx = tpos.x + tw / 2;
        const tcy = tpos.y + th / 2;
        const USE_CASE_ELLIPSE_INSET = 4;
        const srx = Math.max(1, sw / 2 - USE_CASE_ELLIPSE_INSET);
        const sry = Math.max(1, sh / 2 - USE_CASE_ELLIPSE_INSET);
        const trx = Math.max(1, tw / 2 - USE_CASE_ELLIPSE_INSET);
        const try_ = Math.max(1, th / 2 - USE_CASE_ELLIPSE_INSET);
        const [x1, y1] = sn.type === 'useCase'
            ? ellipseBorderPoint(scx, scy, srx, sry, tcx, tcy)
            : borderPoint(scx, scy, sw, sh, tcx, tcy);
        const [x2, y2] = tn.type === 'useCase'
            ? ellipseBorderPoint(tcx, tcy, trx, try_, scx, scy)
            : borderPoint(tcx, tcy, tw, th, scx, scy);
        const markerEnd = e.type === 'useCaseExtend' || e.type === 'useCaseInclude'
            ? { type: 'arrow' as const, color: '#e4e4e7', width: 20, height: 20 }
            : undefined;
        return {
            id: e.id,
            source: e.source,
            target: e.target,
            type: e.type,
            data: { x1, y1, x2, y2 },
            markerEnd,
        };
    });
}
function capTransitions(transitions: ApiStateTransition[], max = 2): ApiStateTransition[] {
    const outCount = new Map<string, number>();
    return transitions.filter((t) => {
        const count = outCount.get(t.source) ?? 0;
        if (count >= max)
            return false;
        outCount.set(t.source, count + 1);
        return true;
    });
}
const STATE_NODE_W = 180;
const STATE_NODE_H = 70;
const STATE_CIRCLE_SIZE = 30;
const COMP_PAD_X = 40;
const COMP_PAD_TOP = 50;
const COMP_PAD_BOTTOM = 30;
const COMP_CHILD_NODESEP = 60;
const COMP_CHILD_RANKSEP = 60;
interface CompositeInfo {
    width: number;
    height: number;
    children: ApiStateState[];
    childPositions: {
        id: string;
        label: string;
        x: number;
        y: number;
    }[];
}
function buildStateDiagramNodes(initialStates: ApiStateInitial[], finalStates: ApiStateFinal[], states: ApiStateState[], compositeStates: ApiStateComposite[], transitions: ApiStateTransition[] = []): Node[] {
    const childIdsSet = new Set<string>();
    compositeStates.forEach((c) => (c.childIds ?? []).forEach((id) => childIdsSet.add(id)));
    const topLevelStates = states.filter((s) => !childIdsSet.has(s.id));
    const compositeInfoMap = new Map<string, CompositeInfo>();
    for (const comp of compositeStates) {
        const childIds = new Set(comp.childIds ?? []);
        const children = (comp.childIds ?? [])
            .map((id) => states.find((s) => s.id === id))
            .filter(Boolean) as ApiStateState[];
        if (children.length === 0) {
            compositeInfoMap.set(comp.id, {
                width: 400, height: 200, children, childPositions: [],
            });
            continue;
        }
        const internalTransitions = transitions.filter((t) => childIds.has(t.source) && childIds.has(t.target));
        let order: ApiStateState[] = [];
        if (internalTransitions.length > 0) {
            const inDegree = new Map<string, number>();
            const adj = new Map<string, string[]>();
            children.forEach(c => { inDegree.set(c.id, 0); adj.set(c.id, []); });
            internalTransitions.forEach(t => {
                if (adj.has(t.source) && adj.has(t.target)) {
                    adj.get(t.source)!.push(t.target);
                    inDegree.set(t.target, inDegree.get(t.target)! + 1);
                }
            });
            const q: string[] = [];
            inDegree.forEach((deg, id) => {
                if (deg === 0)
                    q.push(id);
            });
            if (q.length === 0 && children.length > 0)
                q.push(children[0].id);
            const visited = new Set<string>();
            while (q.length > 0) {
                const u = q.shift()!;
                if (!visited.has(u)) {
                    visited.add(u);
                    order.push(children.find(c => c.id === u)!);
                    const neighbors = adj.get(u) || [];
                    for (const v of neighbors) {
                        const d = inDegree.get(v)! - 1;
                        inDegree.set(v, d);
                        if (d === 0)
                            q.push(v);
                    }
                }
            }
            children.forEach(c => {
                if (!visited.has(c.id)) {
                    order.push(c);
                    visited.add(c.id);
                }
            });
        }
        else {
            order = children;
        }
        const cols = Math.max(1, Math.ceil(Math.sqrt(order.length)));
        const rows = Math.ceil(order.length / cols);
        const contentW = cols * STATE_NODE_W + (cols > 1 ? (cols - 1) * COMP_CHILD_NODESEP : 0);
        const contentH = rows * STATE_NODE_H + (rows > 1 ? (rows - 1) * COMP_CHILD_RANKSEP : 0);
        const compW = Math.max(200, contentW + COMP_PAD_X * 2);
        const compH = Math.max(120, contentH + COMP_PAD_TOP + COMP_PAD_BOTTOM);
        const childPositions = order.map((c, i) => {
            const row = Math.floor(i / cols);
            const isEven = row % 2 === 0;
            const col = isEven ? (i % cols) : (cols - 1 - (i % cols));
            return {
                id: c.id,
                label: c.label,
                x: COMP_PAD_X + col * (STATE_NODE_W + COMP_CHILD_NODESEP),
                y: COMP_PAD_TOP + row * (STATE_NODE_H + COMP_CHILD_RANKSEP),
            };
        });
        compositeInfoMap.set(comp.id, { width: compW, height: compH, children, childPositions });
    }
    const g = new Dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));
    g.setGraph({ rankdir: 'TB', nodesep: 60, ranksep: 80, marginx: 50, marginy: 50 });
    const topLevelIds = new Set<string>([
        ...initialStates.map((i) => i.id),
        ...topLevelStates.map((s) => s.id),
        ...finalStates.map((f) => f.id),
        ...compositeStates.map((c) => c.id),
    ]);
    for (const init of initialStates) {
        g.setNode(init.id, { width: STATE_CIRCLE_SIZE, height: STATE_CIRCLE_SIZE });
    }
    for (const s of topLevelStates) {
        g.setNode(s.id, { width: STATE_NODE_W, height: STATE_NODE_H });
    }
    for (const f of finalStates) {
        g.setNode(f.id, { width: STATE_CIRCLE_SIZE, height: STATE_CIRCLE_SIZE });
    }
    for (const comp of compositeStates) {
        const info = compositeInfoMap.get(comp.id)!;
        g.setNode(comp.id, { width: info.width, height: info.height });
    }
    const resolveTopLevel = (id: string): string => childIdsSet.has(id)
        ? (compositeStates.find((c) => (c.childIds ?? []).includes(id))?.id ?? id)
        : id;
    const seenEdges = new Set<string>();
    for (const t of transitions) {
        const src = resolveTopLevel(t.source);
        const tgt = resolveTopLevel(t.target);
        const key = `${src}->${tgt}`;
        if (!seenEdges.has(key) && src !== tgt && topLevelIds.has(src) && topLevelIds.has(tgt) && g.hasNode(src) && g.hasNode(tgt)) {
            g.setEdge(src, tgt);
            seenEdges.add(key);
        }
    }
    Dagre.layout(g);
    const nodes: Node[] = [];
    function pullCloser(x: number, y: number, refX: number, refY: number, refW: number, refH: number, gap: number) {
        const dx = x - refX;
        const dy = y - refY;
        const dist = Math.hypot(dx, dy);
        if (dist < 1)
            return { x, y };
        const tX = (refW / 2) / (Math.abs(dx) || 0.001);
        const tY = (refH / 2) / (Math.abs(dy) || 0.001);
        const tBorder = Math.min(tX, tY);
        const borderDist = dist * tBorder;
        const targetDist = borderDist + gap;
        if (dist > targetDist) {
            return {
                x: refX + (dx / dist) * targetDist,
                y: refY + (dy / dist) * targetDist,
            };
        }
        return { x, y };
    }
    const initialStateTarget = new Map<string, string>();
    const finalStateSource = new Map<string, string>();
    for (const t of transitions) {
        const src = resolveTopLevel(t.source);
        const tgt = resolveTopLevel(t.target);
        if (initialStates.some(i => i.id === src))
            initialStateTarget.set(src, tgt);
        if (finalStates.some(f => f.id === tgt))
            finalStateSource.set(tgt, src);
    }
    for (const init of initialStates) {
        const pos = g.node(init.id);
        let ix = pos ? pos.x : 0;
        let iy = pos ? pos.y : 0;
        const tgtId = initialStateTarget.get(init.id);
        if (tgtId) {
            const tgtPos = g.node(tgtId);
            if (tgtPos) {
                const adjusted = pullCloser(ix, iy, tgtPos.x, tgtPos.y, tgtPos.width, tgtPos.height, 30);
                ix = adjusted.x;
                iy = adjusted.y;
            }
        }
        nodes.push({
            id: init.id,
            type: 'initialState',
            position: { x: ix - STATE_CIRCLE_SIZE / 2, y: iy - STATE_CIRCLE_SIZE / 2 },
            data: {},
        });
    }
    for (const s of topLevelStates) {
        const pos = g.node(s.id);
        nodes.push({
            id: s.id,
            type: 'state',
            position: { x: pos ? pos.x - STATE_NODE_W / 2 : 0, y: pos ? pos.y - STATE_NODE_H / 2 : 0 },
            data: { label: s.label },
        });
    }
    for (const f of finalStates) {
        const pos = g.node(f.id);
        let fx = pos ? pos.x : 0;
        let fy = pos ? pos.y : 0;
        const srcId = finalStateSource.get(f.id);
        if (srcId) {
            const srcPos = g.node(srcId);
            if (srcPos) {
                const adjusted = pullCloser(fx, fy, srcPos.x, srcPos.y, srcPos.width, srcPos.height, 30);
                fx = adjusted.x;
                fy = adjusted.y;
            }
        }
        nodes.push({
            id: f.id,
            type: 'finalState',
            position: { x: fx - STATE_CIRCLE_SIZE / 2, y: fy - STATE_CIRCLE_SIZE / 2 },
            data: {},
        });
    }
    for (const comp of compositeStates) {
        const info = compositeInfoMap.get(comp.id)!;
        const pos = g.node(comp.id);
        nodes.push({
            id: comp.id,
            type: 'compositeState',
            position: { x: pos ? pos.x - info.width / 2 : 0, y: pos ? pos.y - info.height / 2 : 0 },
            data: { label: comp.label, width: info.width, height: info.height },
        });
        for (const cp of info.childPositions) {
            nodes.push({
                id: cp.id,
                type: 'state',
                parentId: comp.id,
                position: { x: cp.x, y: cp.y },
                data: { label: cp.label },
            });
        }
    }
    return nodes;
}
function getStateNodeSide(cx: number, cy: number, w: number, h: number, px: number, py: number): Position {
    const dx = px - cx;
    const dy = py - cy;
    if (Math.abs(dx) * h > Math.abs(dy) * w) {
        return dx > 0 ? Position.Right : Position.Left;
    }
    else {
        return dy > 0 ? Position.Bottom : Position.Top;
    }
}
function computeStateEdges(nodes: Node[], edgeDefs: {
    id: string;
    source: string;
    target: string;
    label?: string;
}[]): Edge[] {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return edgeDefs.map((e) => {
        const sn = map.get(e.source);
        const tn = map.get(e.target);
        if (!sn || !tn)
            return { id: e.id, source: e.source, target: e.target, type: 'stateTransition' as const };
        const getShape = (n: Node) => {
            if (n.type === 'initialState' || n.type === 'finalState') {
                return { type: 'circle' as const, r: 15 };
            }
            const measuredW = (n as Node & {
                measured?: {
                    width?: number;
                    height?: number;
                };
            }).measured?.width;
            const measuredH = (n as Node & {
                measured?: {
                    width?: number;
                    height?: number;
                };
            }).measured?.height;
            const w = measuredW ?? (n.data?.width as number) ?? 120;
            const h = measuredH ?? (n.data?.height as number) ?? 50;
            return { type: 'rect' as const, w, h };
        };
        const sShape = getShape(sn);
        const tShape = getShape(tn);
        const sw = sShape.type === 'rect' ? sShape.w : sShape.r * 2;
        const sh = sShape.type === 'rect' ? sShape.h : sShape.r * 2;
        const tw = tShape.type === 'rect' ? tShape.w : tShape.r * 2;
        const th = tShape.type === 'rect' ? tShape.h : tShape.r * 2;
        const spos = getAbsolutePosition(sn, map);
        const tpos = getAbsolutePosition(tn, map);
        const scx = spos.x + sw / 2;
        const scy = spos.y + sh / 2;
        const tcx = tpos.x + tw / 2;
        const tcy = tpos.y + th / 2;
        const [x1, y1] = sShape.type === 'circle'
            ? ellipseBorderPoint(scx, scy, sShape.r, sShape.r, tcx, tcy)
            : borderPoint(scx, scy, sw, sh, tcx, tcy);
        const [x2, y2] = tShape.type === 'circle'
            ? ellipseBorderPoint(tcx, tcy, tShape.r, tShape.r, scx, scy)
            : borderPoint(tcx, tcy, tw, th, scx, scy);
        const sourcePos = getStateNodeSide(scx, scy, sw, sh, x1, y1);
        const targetPos = getStateNodeSide(tcx, tcy, tw, th, x2, y2);
        return {
            id: e.id,
            source: e.source,
            target: e.target,
            type: 'stateTransition',
            data: { x1, y1, x2, y2, sourcePos, targetPos, label: e.label },
            markerEnd: { type: 'arrowclosed', color: '#e4e4e7', width: 20, height: 20 },
        };
    });
}
const NODE_WIDTH = 240;
const NODE_HEIGHT = 220;
const LAYOUT_BOX_WIDTH = 300;
const LAYOUT_BOX_HEIGHT = 320;
const LAYOUT_NODESEP = 120;
const LAYOUT_RANKSEP = 200;
const LAYOUT_MARGIN = 50;
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
function ellipseBorderPoint(cx: number, cy: number, rx: number, ry: number, tx: number, ty: number): [
    number,
    number
] {
    const dx = tx - cx;
    const dy = ty - cy;
    if (dx === 0 && dy === 0)
        return [cx, cy - ry];
    if (rx <= 0 || ry <= 0)
        return [cx, cy];
    const t = 1 / Math.sqrt((dx * dx) / (rx * rx) + (dy * dy) / (ry * ry));
    return [cx + dx * t, cy + dy * t];
}
interface BorderEdgeData {
    x1: number;
    y1: number;
    x2: number;
    y2: number;
    sourceMultiplicity?: string;
    targetMultiplicity?: string;
    relationship?: 'composition' | 'aggregation' | 'association' | 'directed_association' | 'generalization' | 'dependency';
    [k: string]: unknown;
}
const MULT_ALONG = 12;
const MULT_PERP = 10;
function BorderEdgeInner({ id, data, style }: EdgeProps) {
    const d = data as BorderEdgeData | undefined;
    if (!d)
        return null;
    const dx = d.x2 - d.x1;
    const dy = d.y2 - d.y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const stroke = (style as {
        stroke?: string;
    })?.stroke ?? '#e4e4e7';
    const rel = d.relationship;
    const isDiamond = rel === 'composition' || rel === 'aggregation';
    const isArrow = rel === 'generalization' || rel === 'directed_association' || rel === 'dependency';
    let lineX1 = d.x1;
    let lineY1 = d.y1;
    let diamondSvg = null;
    if (rel === 'composition') {
        const base = diamondBase(d.x1, d.y1, ux, uy, DEFAULT_DIAMOND_LENGTH);
        lineX1 = base.x;
        lineY1 = base.y;
        diamondSvg = (<CompositionDiamond tipX={d.x1} tipY={d.y1} dirX={ux} dirY={uy} stroke={stroke}/>);
    }
    else if (rel === 'aggregation') {
        const base = diamondBase(d.x1, d.y1, ux, uy, DEFAULT_DIAMOND_LENGTH);
        lineX1 = base.x;
        lineY1 = base.y;
        diamondSvg = (<AggregationDiamond tipX={d.x1} tipY={d.y1} dirX={ux} dirY={uy} stroke={stroke}/>);
    }
    let lineX2 = d.x2;
    let lineY2 = d.y2;
    let arrowSvg = null;
    if (rel === 'generalization') {
        const base = arrowBase(d.x2, d.y2, ux, uy, DEFAULT_ARROW_LENGTH);
        lineX2 = base.x;
        lineY2 = base.y;
        arrowSvg = (<GeneralizationArrow tipX={d.x2} tipY={d.y2} dirX={ux} dirY={uy} stroke={stroke}/>);
    }
    else if (rel === 'directed_association' || rel === 'dependency') {
        arrowSvg = (<DirectedAssociationArrow tipX={d.x2} tipY={d.y2} dirX={ux} dirY={uy} stroke={stroke}/>);
    }
    const srcOffset = isDiamond ? MULT_ALONG + DEFAULT_DIAMOND_LENGTH : MULT_ALONG;
    const tgtOffset = rel === 'generalization' ? MULT_ALONG + DEFAULT_ARROW_LENGTH : ((rel === 'directed_association' || rel === 'dependency') ? MULT_ALONG + 10 : MULT_ALONG);
    const sx = d.x1 + ux * srcOffset + px * MULT_PERP;
    const sy = d.y1 + uy * srcOffset + py * MULT_PERP;
    const tx = d.x2 - ux * tgtOffset - px * MULT_PERP;
    const ty = d.y2 - uy * tgtOffset - py * MULT_PERP;
    const isDotted = rel === 'dependency';
    const edgeStyle = { ...style, strokeDasharray: isDotted ? '6, 6' : undefined };
    return (<g>
      <BaseEdge id={id} path={`M ${lineX1} ${lineY1} L ${lineX2} ${lineY2}`} style={edgeStyle}/>
      {diamondSvg}
      {arrowSvg}
      {d.sourceMultiplicity != null && (<text x={sx} y={sy} textAnchor="middle" dominantBaseline="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace">
          {d.sourceMultiplicity}
        </text>)}
      {d.targetMultiplicity != null && (<text x={tx} y={ty} textAnchor="middle" dominantBaseline="middle" fill={stroke} fontSize={11} fontFamily="ui-monospace, monospace">
          {d.targetMultiplicity}
        </text>)}
    </g>);
}
const BorderEdge = memo(BorderEdgeInner, (prev, next) => {
    if (prev.id !== next.id)
        return false;
    const pd = prev.data as BorderEdgeData | undefined;
    const nd = next.data as BorderEdgeData | undefined;
    if (!pd || !nd)
        return pd === nd;
    return pd.x1 === nd.x1 && pd.y1 === nd.y1 && pd.x2 === nd.x2 && pd.y2 === nd.y2 &&
        pd.relationship === nd.relationship && (prev.style as {
        stroke?: string;
    })?.stroke === (next.style as {
        stroke?: string;
    })?.stroke;
});
const edgeTypes = { border: BorderEdge, sequenceMessage: SequenceMessageEdge, sequenceSelfMessage: SequenceSelfMessageEdge, communicationLink: CommunicationLinkEdge, useCaseExtend: UseCaseExtendEdge, useCaseInclude: UseCaseIncludeEdge, useCaseGeneralization: UseCaseGeneralizationEdge, stateTransition: StateTransitionEdge };
function sortClassesForLayout(classes: ApiUmlClass[], relationships: ApiUmlRelationship[]): ApiUmlClass[] {
    const targetsOfGen = new Set(relationships
        .filter((r) => r.relationship === 'generalization')
        .map((r) => r.target));
    const idToIndex = new Map(classes.map((c, i) => [c.id, i]));
    const order = [...classes];
    order.sort((a, b) => {
        const aIsBase = !targetsOfGen.has(a.id) ? 0 : 1;
        const bIsBase = !targetsOfGen.has(b.id) ? 0 : 1;
        if (aIsBase !== bIsBase)
            return aIsBase - bIsBase;
        return idToIndex.get(a.id)! - idToIndex.get(b.id)!;
    });
    return order;
}
function buildNodesFromGeneratedClasses(classes: ApiUmlClass[], _relationships: ApiUmlRelationship[] = []): Node[] {
    const sorted = sortClassesForLayout(classes, _relationships);
    return sorted.map((c) => {
        const data: UMLClassData = {
            className: c.className,
            explanation: c.explanation,
            stereotype: c.stereotype,
            abstract: c.abstract,
            isInterface: c.isInterface,
            isEnum: c.isEnum,
            enumValues: c.enumValues,
            attributes: c.attributes || [],
            methods: c.methods || [],
        };
        return {
            id: c.id,
            type: 'umlClass',
            position: { x: 0, y: 0 },
            data: data as unknown as Record<string, unknown>,
        };
    });
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
const SEQ_MSG_Y_BASE = 60;
const SEQ_MSG_SPACING = 70;
const SEQ_LIFELINE_Y = 50;
const SEQ_LIFELINE_START_X = 50;
const SEQ_LIFELINE_SPACING = 300;
const SEQ_NESTED_X_OFFSET = 8;
const SEQ_SELF_MSG_LOOP_HEIGHT = 30;
interface SequenceActivation {
    startY: number;
    height: number;
    xOffset?: number;
}
interface SequenceLayoutResult {
    lifelineNodes: Node[];
    messageEdges: Edge[];
    activationsByLifeline: Map<string, SequenceActivation[]>;
    messageY: number[];
}
function buildSequenceLayout(lifelines: ApiSequenceLifeline[], messages: ApiSequenceMessage[]): SequenceLayoutResult {
    const lifelineIds = new Set(lifelines.map((ll) => ll.id));
    const messageY = messages.map((_, i) => SEQ_MSG_Y_BASE + i * SEQ_MSG_SPACING);
    const endY = messages.length > 0 ? messageY[messages.length - 1] + SEQ_MSG_SPACING * 2 : SEQ_MSG_Y_BASE + 80;
    const stacks = new Map<string, {
        startY: number;
        activationIndex: number;
        isNested: boolean;
    }[]>();
    const activationsByLifeline = new Map<string, SequenceActivation[]>();
    function ensureActivation(lifelineId: string, y: number): number {
        let stack = stacks.get(lifelineId);
        if (!stack) {
            stack = [];
            stacks.set(lifelineId, stack);
        }
        if (stack.length === 0) {
            const acts = activationsByLifeline.get(lifelineId) || [];
            const activationIndex = acts.length;
            acts.push({ startY: y, height: 0 });
            activationsByLifeline.set(lifelineId, acts);
            stack.push({ startY: y, activationIndex, isNested: false });
        }
        return stack[stack.length - 1].activationIndex;
    }
    function pushActivation(lifelineId: string, y: number, isNested: boolean): number {
        let stack = stacks.get(lifelineId);
        if (!stack) {
            stack = [];
            stacks.set(lifelineId, stack);
        }
        const acts = activationsByLifeline.get(lifelineId) || [];
        const activationIndex = acts.length;
        acts.push({ startY: y, height: 0, xOffset: isNested ? SEQ_NESTED_X_OFFSET : undefined });
        activationsByLifeline.set(lifelineId, acts);
        stack.push({ startY: y, activationIndex, isNested });
        return activationIndex;
    }
    function popActivation(lifelineId: string, y: number): void {
        const stack = stacks.get(lifelineId);
        if (!stack || stack.length === 0)
            return;
        const top = stack.pop()!;
        const acts = activationsByLifeline.get(lifelineId)!;
        const raw = y - top.startY;
        acts[top.activationIndex].height = Math.max(raw + 10, 20);
    }
    function topActivationIndex(lifelineId: string): number | null {
        const stack = stacks.get(lifelineId);
        if (!stack || stack.length === 0)
            return null;
        return stack[stack.length - 1].activationIndex;
    }
    const edgeHandles: {
        fromAct: number;
        toAct: number;
        fromL: string;
        toL: string;
        label: string;
        isReturn: boolean;
        isSelf: boolean;
        yOffset: number;
    }[] = [];
    for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const y = messageY[i];
        if (!lifelineIds.has(m.fromLifeline) || !lifelineIds.has(m.toLifeline))
            continue;
        if (m.isReturn) {
            ensureActivation(m.fromLifeline, y);
            ensureActivation(m.toLifeline, y);
            const fromAct = topActivationIndex(m.fromLifeline)!;
            const toAct = topActivationIndex(m.toLifeline)!;
            const fromActs = activationsByLifeline.get(m.fromLifeline) || [];
            const yOffset = y - (fromActs[fromAct]?.startY || 0);
            edgeHandles.push({
                fromAct,
                toAct,
                fromL: m.fromLifeline,
                toL: m.toLifeline,
                label: m.label,
                isReturn: true,
                isSelf: m.fromLifeline === m.toLifeline,
                yOffset,
            });
            popActivation(m.fromLifeline, y);
            if (m.fromLifeline !== m.toLifeline) {
                popActivation(m.toLifeline, y);
            }
        }
        else {
            ensureActivation(m.fromLifeline, y);
            const fromAct = topActivationIndex(m.fromLifeline)!;
            const fromActs = activationsByLifeline.get(m.fromLifeline) || [];
            const yOffset = y - (fromActs[fromAct]?.startY || 0);
            const isSelf = m.fromLifeline === m.toLifeline;
            const opensNew = !!m.opensNewActivation;
            let toAct: number;
            if (isSelf) {
                if (opensNew) {
                    toAct = pushActivation(m.toLifeline, y, true);
                    popActivation(m.toLifeline, y + SEQ_SELF_MSG_LOOP_HEIGHT);
                }
                else {
                    toAct = ensureActivation(m.toLifeline, y);
                }
            }
            else {
                toAct = pushActivation(m.toLifeline, y, false);
            }
            edgeHandles.push({
                fromAct,
                toAct,
                fromL: m.fromLifeline,
                toL: m.toLifeline,
                label: m.label,
                isReturn: false,
                isSelf,
                yOffset,
            });
        }
    }
    for (const lid of lifelineIds) {
        let stack = stacks.get(lid);
        while (stack && stack.length > 0)
            popActivation(lid, endY);
    }
    const lifelineTotalHeight = endY + 60;
    const lifelineNodes: Node[] = lifelines.map((ll, i) => ({
        id: ll.id,
        type: 'lifeline',
        position: { x: SEQ_LIFELINE_START_X + i * SEQ_LIFELINE_SPACING, y: SEQ_LIFELINE_Y },
        data: {
            label: ll.label,
            isActor: !!ll.isActor,
            isDestroyed: !!ll.isDestroyed,
            activations: activationsByLifeline.get(ll.id) || [],
            lifelineHeight: lifelineTotalHeight,
        },
        zIndex: -1,
    }));
    const markerEnd = { type: 'arrowclosed' as const, color: '#e4e4e7', width: 20, height: 20 };
    const markerEndReturn = { type: 'arrow' as const, color: '#e4e4e7', width: 20, height: 20 };
    const messageEdges: Edge[] = edgeHandles.map((h, i) => {
        const isSelf = h.fromL === h.toL;
        const sourceHandle = `act-${h.fromAct}-source-right`;
        const targetHandle = isSelf ? `act-${h.toAct}-target-right` : `act-${h.toAct}-target-left`;
        const sourceHandleReturn = `act-${h.fromAct}-source-left`;
        const targetHandleReturn = `act-${h.toAct}-target-right`;
        return {
            id: `msg-${i}`,
            source: h.fromL,
            target: h.toL,
            sourceHandle: h.isReturn ? sourceHandleReturn : sourceHandle,
            targetHandle: h.isReturn ? targetHandleReturn : targetHandle,
            type: isSelf ? 'sequenceSelfMessage' : 'sequenceMessage',
            data: { label: h.label, isReturn: h.isReturn },
            markerEnd: h.isReturn ? markerEndReturn : markerEnd,
            style: h.yOffset > 0 ? { transform: `translateY(${h.yOffset}px)` } : undefined,
            zIndex: 10,
        };
    });
    return { lifelineNodes, messageEdges, activationsByLifeline, messageY };
}
function buildSequenceStepLabelNodes(steps: ApiSequenceStep[], messageY: number[]): Node[] {
    if (!steps.length)
        return [];
    return steps.map((step, si) => {
        const indices = (step.messageIndices || []).filter((idx) => idx >= 0 && idx < messageY.length);
        const minI = indices.length > 0 ? Math.min(...indices) : 0;
        const y = messageY[minI] !== undefined ? messageY[minI] - 28 : SEQ_MSG_Y_BASE - 20;
        return {
            id: `step-${si}`,
            type: 'sequenceStepLabel',
            position: { x: SEQ_LIFELINE_START_X, y },
            data: { title: step.title, stepIndex: si },
            zIndex: 1,
        };
    });
}
function buildSequenceFragmentNodes(fragments: ApiSequenceFragment[], messageY: number[], lifelineCount: number): Node[] {
    const safeFragments = fragments.filter((f) => {
        const indices = (f.messageIndices || []).filter((idx) => idx >= 0 && idx < messageY.length);
        return indices.length > 0 && Math.min(...indices) >= 1;
    });
    if (!safeFragments.length)
        return [];
    const fragWidth = Math.max(lifelineCount * SEQ_LIFELINE_SPACING, 400);
    return safeFragments.map((f, fi) => {
        const indices = (f.messageIndices || []).filter((idx) => idx >= 0 && idx < messageY.length);
        const minI = indices.length > 0 ? Math.min(...indices) : 1;
        const maxI = indices.length > 0 ? Math.max(...indices) : 1;
        const startY = messageY[minI] !== undefined ? messageY[minI] - 10 : SEQ_MSG_Y_BASE;
        const endY = messageY[maxI] !== undefined ? messageY[maxI] + SEQ_MSG_SPACING + 10 : startY + 100;
        return {
            id: `fragment-${fi}`,
            type: 'sequenceFragment',
            position: { x: SEQ_LIFELINE_START_X - 20, y: startY },
            data: {
                operator: f.operator,
                condition: f.condition,
                width: fragWidth + 40,
                height: Math.max(endY - startY, 60),
            },
            zIndex: -2,
        };
    });
}
type EdgeDef = {
    id: string;
    source: string;
    target: string;
    stroke: string;
    sourceMultiplicity?: string;
    targetMultiplicity?: string;
    relationship?: 'composition' | 'aggregation' | 'association' | 'directed_association' | 'generalization' | 'dependency';
};
const LAYOUT_MIN_GAP = 24;
function resolveOverlaps(nodes: Node[], boxW: number, boxH: number): Node[] {
    let current = nodes.map((n) => ({ ...n, position: { x: n.position.x, y: n.position.y } }));
    const maxPasses = 25;
    for (let pass = 0; pass < maxPasses; pass++) {
        let moved = false;
        for (let i = 0; i < current.length; i++) {
            for (let j = i + 1; j < current.length; j++) {
                const a = current[i];
                const b = current[j];
                const ax1 = a.position.x;
                const ay1 = a.position.y;
                const ax2 = a.position.x + boxW;
                const ay2 = a.position.y + boxH;
                const bx1 = b.position.x;
                const by1 = b.position.y;
                const bx2 = b.position.x + boxW;
                const by2 = b.position.y + boxH;
                const overlapX = Math.min(ax2, bx2) - Math.max(ax1, bx1);
                const overlapY = Math.min(ay2, by2) - Math.max(ay1, by1);
                if (overlapX <= 0 || overlapY <= 0)
                    continue;
                const shiftX = overlapX + LAYOUT_MIN_GAP;
                const shiftY = overlapY + LAYOUT_MIN_GAP;
                const moveRight = b.position.x >= a.position.x;
                const moveDown = b.position.y >= a.position.y;
                const dx = moveRight ? shiftX : -shiftX;
                const dy = moveDown ? shiftY : -shiftY;
                if (overlapX >= overlapY) {
                    current[j] = { ...b, position: { x: b.position.x + dx, y: b.position.y } };
                }
                else {
                    current[j] = { ...b, position: { x: b.position.x, y: b.position.y + dy } };
                }
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
    g.setGraph({
        rankdir,
        nodesep: LAYOUT_NODESEP,
        ranksep: LAYOUT_RANKSEP,
        marginx: LAYOUT_MARGIN,
        marginy: LAYOUT_MARGIN,
    });
    nodes.forEach((n) => g.setNode(n.id, { width: boxW, height: boxH }));
    edgeDefs.forEach((e) => {
        if (g.hasNode(e.source) && g.hasNode(e.target))
            g.setEdge(e.source, e.target);
    });
    Dagre.layout(g);
    const positioned = new Set<string>();
    const result = nodes.map((n) => {
        const pos = g.node(n.id);
        if (!pos)
            return n;
        positioned.add(n.id);
        return { ...n, position: { x: pos.x - boxW / 2, y: pos.y - boxH / 2 } };
    });
    const unpositioned = result.filter((n) => !positioned.has(n.id));
    if (unpositioned.length > 0) {
        const maxX = Math.max(0, ...result.map((n) => n.position.x + boxW));
        const maxY = Math.max(0, ...result.map((n) => n.position.y + boxH));
        const COLS = Math.ceil(Math.sqrt(unpositioned.length)) || 1;
        unpositioned.forEach((n, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            const idx = result.findIndex((r) => r.id === n.id);
            if (idx !== -1) {
                result[idx] = {
                    ...result[idx],
                    position: {
                        x: LAYOUT_MARGIN + col * (boxW + LAYOUT_NODESEP),
                        y: maxY + LAYOUT_MARGIN + row * (boxH + LAYOUT_RANKSEP),
                    },
                };
            }
        });
    }
    const minX = Math.min(...result.map((n) => n.position.x));
    const minY = Math.min(...result.map((n) => n.position.y));
    const maxX = Math.max(...result.map((n) => n.position.x + boxW));
    const maxY = Math.max(...result.map((n) => n.position.y + boxH));
    return { nodes: result, width: maxX - minX, height: maxY - minY };
}
function getLayoutedUmlNodes(nodes: Node[], edgeDefs: EdgeDef[]): Node[] {
    if (nodes.length === 0)
        return [];
    const overlayNodes = nodes.filter(n => n.type === 'useCaseSystemBoundary' || n.type === 'useCaseActor' || n.type === 'useCase' || n.type === 'initialState' || n.type === 'finalState' || n.type === 'state' || n.type === 'compositeState');
    const rest = nodes.filter(n => n.type !== 'useCaseSystemBoundary' && n.type !== 'useCaseActor' && n.type !== 'useCase' && n.type !== 'initialState' && n.type !== 'finalState' && n.type !== 'state' && n.type !== 'compositeState');
    const lifelineNodes = rest.filter(n => n.type === 'lifeline');
    const classNodes = rest.filter(n => n.type !== 'lifeline');
    const LIFELINE_Y = 50;
    const LIFELINE_START_X = 50;
    const LIFELINE_SPACING = 300;
    const positionedLifelines = lifelineNodes.map((n, i) => ({
        ...n,
        position: {
            x: LIFELINE_START_X + i * LIFELINE_SPACING,
            y: LIFELINE_Y,
        },
    }));
    if (classNodes.length === 0)
        return [...overlayNodes, ...positionedLifelines];
    const boxW = LAYOUT_BOX_WIDTH;
    const boxH = LAYOUT_BOX_HEIGHT;
    const hasEdges = edgeDefs.length > 0 && edgeDefs.some((e) => classNodes.some((n) => n.id === e.source) && classNodes.some((n) => n.id === e.target));
    let result: Node[];
    if (!hasEdges) {
        const COLS = Math.ceil(Math.sqrt(classNodes.length)) || 1;
        result = classNodes.map((n, i) => {
            const col = i % COLS;
            const row = Math.floor(i / COLS);
            return {
                ...n,
                position: {
                    x: LAYOUT_MARGIN + col * (boxW + LAYOUT_NODESEP),
                    y: LAYOUT_MARGIN + row * (boxH + LAYOUT_RANKSEP),
                },
            };
        });
    }
    else {
        const tb = runDagreLayout(classNodes, edgeDefs, boxW, boxH, 'TB');
        const lr = runDagreLayout(classNodes, edgeDefs, boxW, boxH, 'LR');
        const aspect = (w: number, h: number) => (w > h ? w / h : h / w);
        const tbAspect = aspect(tb.width, tb.height);
        const lrAspect = aspect(lr.width, lr.height);
        result = tbAspect <= lrAspect ? tb.nodes : lr.nodes;
    }
    const resolvedClassNodes = resolveOverlaps(result, boxW, boxH);
    const finalNodes: Node[] = lifelineNodes.length > 0
        ? [
            ...positionedLifelines,
            ...resolvedClassNodes.map(n => ({
                ...n,
                position: { ...n.position, y: n.position.y + (LIFELINE_Y + 700) }
            }))
        ]
        : [...positionedLifelines, ...resolvedClassNodes];
    return [...overlayNodes, ...finalNodes];
}
function computeSmartEdges(nodes: Node[], edgeDefs: EdgeDef[]): Edge[] {
    const map = new Map(nodes.map((n) => [n.id, n]));
    return edgeDefs.map((e) => {
        const sn = map.get(e.source);
        const tn = map.get(e.target);
        if (!sn || !tn)
            return { id: e.id, source: e.source, target: e.target, type: 'border' as const };
        const sw = sn.measured?.width ?? NODE_WIDTH;
        const sh = sn.measured?.height ?? NODE_HEIGHT;
        const tw = tn.measured?.width ?? NODE_WIDTH;
        const th = tn.measured?.height ?? NODE_HEIGHT;
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
            style: { stroke: e.stroke },
            data: {
                x1, y1, x2, y2,
                sourceMultiplicity: e.sourceMultiplicity,
                targetMultiplicity: e.targetMultiplicity,
                relationship: e.relationship,
            },
        };
    });
}
export default function DocumentationUmlPage() {
    const params = useParams<{
        orgShortId: string;
        repoName: string;
        name: string;
    }>();
    const name = Array.isArray(params?.name) ? params.name[0] : params?.name ?? '';
    const displayName = name ? decodeURIComponent(name) : '';
    const orgShortId = Array.isArray(params?.orgShortId) ? params.orgShortId[0] : params?.orgShortId ?? '';
    const repoName = Array.isArray(params?.repoName) ? params.repoName[0] : params?.repoName ?? '';
    const router = useRouter();
    const rfRef = useRef<ReactFlowInstance | null>(null);
    const [hideDetails, setHideDetails] = useState(false);
    type ClassDiagramData = {
        type: 'class';
        classes: ApiUmlClass[];
        relationships: ApiUmlRelationship[];
    };
    type SequenceDiagramData = {
        type: 'sequence';
        lifelines: ApiSequenceLifeline[];
        messages: ApiSequenceMessage[];
        steps: ApiSequenceStep[];
        fragments: ApiSequenceFragment[];
    };
    type UseCaseDiagramData = {
        type: 'useCase';
        systemBoundary: ApiUseCaseSystemBoundary;
        actors: ApiUseCaseActor[];
        useCases: ApiUseCase[];
        relationships: ApiUseCaseRelationship[];
    };
    type StateDiagramData = {
        type: 'state';
        initialStates: ApiStateInitial[];
        finalStates: ApiStateFinal[];
        states: ApiStateState[];
        compositeStates: ApiStateComposite[];
        transitions: ApiStateTransition[];
    };
    const [generatedDiagram, setGeneratedDiagram] = useState<ClassDiagramData | SequenceDiagramData | UseCaseDiagramData | StateDiagramData | null>(null);
    const [generatedLoading, setGeneratedLoading] = useState(false);
    const [generatedError, setGeneratedError] = useState<string | null>(null);
    const isSequenceDiagram = generatedDiagram?.type === 'sequence';
    const isUseCaseDiagram = generatedDiagram?.type === 'useCase';
    const isStateDiagram = generatedDiagram?.type === 'state';
    const stateDiagramNodes = useMemo(() => {
        if (!isStateDiagram || !generatedDiagram)
            return null;
        const sd = generatedDiagram as StateDiagramData;
        return buildStateDiagramNodes(sd.initialStates, sd.finalStates, sd.states, sd.compositeStates, capTransitions(sd.transitions));
    }, [isStateDiagram, generatedDiagram]);
    const sequenceLayout = useMemo(() => {
        if (!isSequenceDiagram || !generatedDiagram)
            return null;
        const { lifelines, messages } = generatedDiagram;
        if (lifelines.length < 2)
            return null;
        return buildSequenceLayout(lifelines, messages);
    }, [isSequenceDiagram, generatedDiagram]);
    const useCaseEdgeDefs = useMemo((): UseCaseEdgeDef[] | undefined => {
        if (isUseCaseDiagram && generatedDiagram) {
            const uc = generatedDiagram as UseCaseDiagramData;
            return buildUseCaseEdgeDefsFromGenerated(uc.relationships);
        }
        return undefined;
    }, [isUseCaseDiagram, generatedDiagram]);
    const displayNodes = useMemo(() => {
        if (isStateDiagram && stateDiagramNodes) {
            return stateDiagramNodes;
        }
        if (isUseCaseDiagram && generatedDiagram) {
            const uc = generatedDiagram as UseCaseDiagramData;
            return buildUseCaseNodesFromGenerated(uc.systemBoundary, uc.actors, uc.useCases);
        }
        if (isSequenceDiagram && sequenceLayout) {
            const seq = generatedDiagram as SequenceDiagramData;
            const fragNodes = buildSequenceFragmentNodes(seq.fragments, sequenceLayout.messageY, seq.lifelines.length);
            return [...sequenceLayout.lifelineNodes, ...fragNodes];
        }
        if (generatedDiagram?.type === 'class' && generatedDiagram.classes.length > 0) {
            return buildNodesFromGeneratedClasses(generatedDiagram.classes, generatedDiagram.relationships);
        }
        return [];
    }, [generatedDiagram, isSequenceDiagram, isUseCaseDiagram, isStateDiagram, sequenceLayout, stateDiagramNodes]);
    const displayEdgeDefs = useMemo(() => generatedDiagram?.type === 'class' && generatedDiagram.classes.length > 0
        ? buildEdgeDefsFromGeneratedRels(generatedDiagram.relationships)
        : [], [generatedDiagram]);
    const layoutedNodes = useMemo(() => {
        if (isUseCaseDiagram || isStateDiagram || (isSequenceDiagram && sequenceLayout))
            return displayNodes;
        return getLayoutedUmlNodes(displayNodes, displayEdgeDefs);
    }, [isUseCaseDiagram, isStateDiagram, isSequenceDiagram, sequenceLayout, displayNodes, displayEdgeDefs]);
    const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
    const edges = useMemo(() => {
        if (!generatedDiagram)
            return [];
        if (isStateDiagram) {
            const sd = generatedDiagram as StateDiagramData;
            const stateEdgeDefs = capTransitions(sd.transitions).map((t, i) => ({
                id: `state-e-${i}`,
                source: t.source,
                target: t.target,
                label: t.label != null ? (t.eventParameter != null && t.eventParameter !== '' ? `${t.label} (${t.eventParameter})` : t.label) : undefined,
            }));
            return computeStateEdges(nodes, stateEdgeDefs);
        }
        if (isUseCaseDiagram) {
            return computeUseCaseEdges(nodes, useCaseEdgeDefs);
        }
        if (isSequenceDiagram && sequenceLayout) {
            return sequenceLayout.messageEdges;
        }
        if (generatedDiagram?.type === 'class' && generatedDiagram.classes.length > 0) {
            return computeSmartEdges(nodes, displayEdgeDefs);
        }
        return [];
    }, [isUseCaseDiagram, isStateDiagram, isSequenceDiagram, sequenceLayout, nodes, displayEdgeDefs, useCaseEdgeDefs, generatedDiagram]);
    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    const [panelData, setPanelData] = useState<ApiUmlClass | null>(null);
    const classesById = useMemo(() => {
        const map = new Map<string, ApiUmlClass>();
        if (generatedDiagram?.type === 'class') {
            generatedDiagram.classes.forEach((c) => map.set(c.id, c));
        }
        return map;
    }, [generatedDiagram]);
    const selectedClassForPanel = useMemo((): ApiUmlClass | null => {
        if (!selectedNodeId || isSequenceDiagram || isStateDiagram)
            return null;
        const fromApi = classesById.get(selectedNodeId);
        if (fromApi)
            return fromApi;
        const node = nodes.find((n) => n.id === selectedNodeId);
        if (!node || node.type !== 'umlClass')
            return null;
        const d = node.data as unknown as UMLClassData;
        return {
            id: selectedNodeId,
            className: d.className,
            explanation: d.explanation,
            attributes: (d.attributes || []).map((a) => ({
                name: a.name,
                type: a.type,
                visibility: a.visibility,
                description: a.description,
            })),
            methods: (d.methods || []).map((m) => ({
                name: m.name,
                params: m.params,
                returnType: m.returnType,
                visibility: m.visibility,
                description: m.description,
            })),
        };
    }, [selectedNodeId, classesById, nodes, isSequenceDiagram, isStateDiagram]);
    useEffect(() => {
        if (selectedClassForPanel) {
            setPanelData(selectedClassForPanel);
        }
    }, [selectedClassForPanel]);
    useEffect(() => {
        setNodes(layoutedNodes);
    }, [layoutedNodes, setNodes]);
    useEffect(() => {
        const t = setTimeout(() => rfRef.current?.fitView(FIT_VIEW_OPTS), 100);
        return () => clearTimeout(t);
    }, [layoutedNodes]);
    useEffect(() => {
        if (!name || !orgShortId || !repoName)
            return;
        const slug = decodeURIComponent(name);
        setGeneratedLoading(true);
        setGeneratedError(null);
        const base = orgShortId.startsWith('org-') ? orgShortId : `org-${orgShortId}`;
        fetch(`/api/documentation/uml/diagram?orgShortId=${encodeURIComponent(base)}&repoUrlName=${encodeURIComponent(repoName)}&slug=${encodeURIComponent(slug)}`)
            .then((res) => {
            if (!res.ok)
                throw new Error(res.status === 404 ? 'Diagram not found' : res.statusText);
            return res.json();
        })
            .then((data) => {
            const diagramData = data?.diagram?.diagramData ?? data?.diagramData;
            const lifelines = diagramData?.lifelines;
            const messages = diagramData?.messages;
            if (lifelines && Array.isArray(lifelines) && lifelines.length >= 2) {
                setGeneratedDiagram({
                    type: 'sequence',
                    lifelines,
                    messages: Array.isArray(messages) ? messages : [],
                    steps: Array.isArray(diagramData?.steps) ? diagramData.steps : [],
                    fragments: Array.isArray(diagramData?.fragments) ? diagramData.fragments : [],
                });
                return;
            }
            const actors = diagramData?.actors;
            const useCases = diagramData?.useCases;
            if (Array.isArray(actors) && Array.isArray(useCases)) {
                setGeneratedDiagram({
                    type: 'useCase',
                    systemBoundary: diagramData?.systemBoundary ?? { label: 'System' },
                    actors,
                    useCases,
                    relationships: Array.isArray(diagramData?.relationships) ? diagramData.relationships : [],
                });
                return;
            }
            const classes = diagramData?.classes;
            const relationships = diagramData?.relationships;
            if (classes && Array.isArray(classes)) {
                setGeneratedDiagram({
                    type: 'class',
                    classes,
                    relationships: Array.isArray(relationships) ? relationships : [],
                });
                return;
            }
            const transitions = diagramData?.transitions;
            const stateStates = diagramData?.states;
            const initialStates = diagramData?.initialStates;
            if (Array.isArray(transitions) && (Array.isArray(stateStates) || Array.isArray(initialStates))) {
                setGeneratedDiagram({
                    type: 'state',
                    initialStates: Array.isArray(diagramData?.initialStates) ? diagramData.initialStates : [{ id: 'initial' }],
                    finalStates: Array.isArray(diagramData?.finalStates) ? diagramData.finalStates : [{ id: 'final' }],
                    states: Array.isArray(diagramData?.states) ? diagramData.states : [],
                    compositeStates: Array.isArray(diagramData?.compositeStates) ? diagramData.compositeStates : [],
                    transitions,
                });
            }
            else {
                setGeneratedDiagram(null);
            }
        })
            .catch((err) => {
            setGeneratedError(err instanceof Error ? err.message : 'Failed to load diagram');
            setGeneratedDiagram(null);
        })
            .finally(() => setGeneratedLoading(false));
    }, [name, orgShortId, repoName]);
    return (<div className="h-full flex flex-col bg-[#1a1a1d] relative" style={{ borderRadius: 0, overflow: 'hidden', border: '1px solid #262626' }}>
      <div className="absolute top-4 left-4 z-10 flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="flex items-center gap-2 text-white/60 hover:text-white transition-colors cursor-pointer text-sm font-medium" aria-label="Go back">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
          </svg>
          <span>Back</span>
        </button>
        {!isUseCaseDiagram && !isStateDiagram && (<button type="button" onClick={() => setHideDetails((v) => !v)} className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer ${hideDetails
                ? 'bg-white/15 text-white'
                : 'text-white/60 hover:text-white hover:bg-white/10'}`} aria-label={hideDetails ? 'Show type and parameter details' : 'Hide type and parameter details'} title={hideDetails ? 'Show details (types, params, return types)' : 'Hide details (show only names)'}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.716 0 1.415-.078 2.073-.22M15 12a3 3 0 11-6 0 3 3 0 016 0zm6 2.25a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>{hideDetails ? 'Show details' : 'Hide details'}</span>
          </button>)}
      </div>

      <UmlDetailsContext.Provider value={hideDetails}>
      <div className={`flex-1 flex min-h-0 pr-6 transition-all duration-300 ${selectedNodeId ? 'gap-4' : 'gap-0'}`}>
        <div className="flex-1 min-h-0 relative flex flex-col min-w-0">
          {generatedLoading && (<div className="absolute inset-0 z-10 flex items-center justify-center bg-[#1a1a1d]/80 text-white/60 text-sm">
              Loading diagram…
            </div>)}
          {generatedError && !generatedLoading && (<div className="absolute top-14 left-4 right-4 z-10 py-2 px-4 rounded bg-red-500/20 border border-red-500/50 text-red-400 text-sm">
              {generatedError}
            </div>)}
          <style>{`
            .react-flow__attribution { display: none !important; }
            .react-flow__controls {
              background: #1e1e21 !important;
              border: 1px solid #333 !important;
              border-radius: 6px !important;
            }
            .react-flow__controls-button {
              background: #1e1e21 !important;
              border-bottom: 1px solid #333 !important;
              color: #ccc !important;
            }
            .react-flow__controls-button:hover {
              background: #262626 !important;
              color: #fff !important;
            }
            .react-flow__controls-button:first-child { border-top-left-radius: 6px !important; border-top-right-radius: 6px !important; }
            .react-flow__controls-button:last-child { border-bottom-left-radius: 6px !important; border-bottom-right-radius: 6px !important; border-bottom: none !important; }
          `}</style>
          <ReactFlow nodes={nodes} edges={edges} onNodesChange={onNodesChange} onNodeClick={(_ev, node) => setSelectedNodeId(node.id)} onPaneClick={() => setSelectedNodeId(null)} nodeTypes={nodeTypes} edgeTypes={edgeTypes} onInit={(inst) => { rfRef.current = inst as unknown as ReactFlowInstance; }} fitView fitViewOptions={FIT_VIEW_OPTS} minZoom={0.1} maxZoom={2} proOptions={{ hideAttribution: true }} nodesDraggable nodesConnectable={false} elementsSelectable>
            <Background gap={20} size={1} color="#333338"/>
            <Controls showInteractive={false} style={{ background: '#1e1e21', border: '1px solid #333', borderRadius: 6 }}/>
          </ReactFlow>
        </div>
        {panelData && (<aside className={`flex-shrink-0 max-h-[90%] rounded-xl border bg-[#161618]/95 backdrop-blur-xl shadow-2xl overflow-y-auto overflow-x-hidden custom-scrollbar my-auto z-10 transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] ${selectedNodeId
                ? 'w-96 opacity-100 translate-x-0 border-[#333]'
                : 'w-0 opacity-0 translate-x-12 border-transparent pointer-events-none'}`} style={{ minHeight: 0 }}>
            <div className="w-96 flex flex-col">
              <div className="sticky top-0 z-10 bg-[#161618]/95 backdrop-blur-xl border-b border-[#333] px-5 py-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2">
                  {panelData.className}
                </h2>
                <button type="button" onClick={() => setSelectedNodeId(null)} className="text-gray-500 hover:text-white hover:bg-white/10 p-1.5 rounded-md transition-all" aria-label="Close panel">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                  </svg>
                </button>
              </div>

              <div className="p-5 flex flex-col gap-6">
                
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2.5">Description</h3>
                  <div className="bg-[#1c1c1f] rounded-lg p-3.5 border border-[#2a2a2e]">
                    <p className="text-sm leading-relaxed text-gray-300">
                      {panelData.explanation ?? 'No description available for this class.'}
                    </p>
                  </div>
                </section>

                
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Attributes</h3>
                    <span className="bg-[#2a2a2e] text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      {(panelData.attributes ?? []).length}
                    </span>
                  </div>
                  {(panelData.attributes ?? []).length === 0 ? (<p className="text-sm text-gray-600 italic px-1">No attributes</p>) : (<div className="flex flex-col gap-2">
                      {(panelData.attributes ?? []).map((a, i) => (<div key={i} className="bg-[#1c1c1f] rounded-lg p-3 border border-[#2a2a2e] hover:border-[#3a3a3e] transition-colors">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5">
                              <span className={`text-xs font-black w-4 text-center ${a.visibility === '+' ? 'text-emerald-400' :
                        a.visibility === '-' ? 'text-red-400' :
                            a.visibility === '#' ? 'text-amber-400' : 'text-gray-400'}`}>
                                {a.visibility}
                              </span>
                              <span className="text-sm font-medium text-gray-200">{a.name}</span>
                            </div>
                            <span className="text-[11px] text-gray-400 font-mono bg-[#161618] px-1.5 py-0.5 rounded border border-[#2a2a2e] whitespace-nowrap">
                              {a.type}
                            </span>
                          </div>
                          {a.description != null && a.description !== '' && (<p className="text-xs text-gray-400 mt-2 leading-relaxed">{a.description}</p>)}
                        </div>))}
                    </div>)}
                </section>

                
                <section>
                  <div className="flex items-center justify-between mb-2.5">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Methods</h3>
                    <span className="bg-[#2a2a2e] text-gray-400 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                      {(panelData.methods ?? []).length}
                    </span>
                  </div>
                  {(panelData.methods ?? []).length === 0 ? (<p className="text-sm text-gray-600 italic px-1">No methods</p>) : (<div className="flex flex-col gap-2">
                      {(panelData.methods ?? []).map((m, i) => (<div key={i} className="bg-[#1c1c1f] rounded-lg p-3 border border-[#2a2a2e] hover:border-[#3a3a3e] transition-colors">
                          <div className="flex items-center gap-2.5 mb-2">
                            <span className={`text-xs font-black w-4 text-center ${m.visibility === '+' ? 'text-emerald-400' :
                        m.visibility === '-' ? 'text-red-400' :
                            m.visibility === '#' ? 'text-amber-400' : 'text-gray-400'}`}>
                              {m.visibility}
                            </span>
                            <span className="text-sm font-medium text-gray-200">{m.name}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-[11px]">
                            <span className="text-gray-500 font-mono bg-[#161618] px-1.5 py-0.5 rounded border border-[#2a2a2e]">
                              ({m.params})
                            </span>
                            {m.returnType && (<>
                                <span className="text-gray-600">→</span>
                                <span className="text-blue-400/80 font-mono">
                                  {m.returnType}
                                </span>
                              </>)}
                          </div>
                          {m.description != null && m.description !== '' && (<p className="text-xs text-gray-400 mt-2.5 pt-2.5 border-t border-[#2a2a2e] leading-relaxed">{m.description}</p>)}
                        </div>))}
                    </div>)}
                </section>
              </div>
            </div>
          </aside>)}
      </div>
      </UmlDetailsContext.Provider>
      <div className="text-center py-1.5 text-[11px] text-[#555] border-t border-[#262626] flex-shrink-0 leading-snug" style={{ background: '#1a1a1d' }}>
        UML: {displayName || '—'} — Use scroll wheel to zoom, drag to pan.
      </div>
    </div>);
}
