'use client';
import { useEffect, useCallback, useMemo, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Focus, RotateCcw, Sparkles } from 'lucide-react';
import { useSigma } from '../../../../../_lib/useSigma';
import { useKGState } from '../../../../../_lib/useKGState';
import { knowledgeGraphToGraphology, filterGraphByDepth, applyRiskColors, applySemanticColors, captureNodePositions, animateNodesToPositions, buildUmapTargets, hexWithAlpha, SigmaNodeAttributes, SigmaEdgeAttributes, } from '../../../../../_lib/graph-adapter';
import Graph from 'graphology';
import { KnowledgeGraph } from '../../../../../_lib/types';
import { getSemanticClusterColor } from '../../../../../_lib/constants';
interface SemanticPanelProps {
    isEnabled: boolean;
    isAnimating: boolean;
    onToggle: () => void;
    graph: KnowledgeGraph | null;
}
function SemanticPanel({ isEnabled, isAnimating, onToggle, graph }: SemanticPanelProps) {
    const clusters = useMemo(() => {
        if (!graph)
            return [] as {
                id: number;
                label: string;
                color: string;
                count: number;
            }[];
        const map = new Map<number, {
            label: string;
            count: number;
        }>();
        graph.nodes.forEach(n => {
            const cid = n.properties.semanticClusterId as number | undefined;
            const lbl = n.properties.semanticClusterLabel as string | undefined;
            if (cid === undefined || cid < 0)
                return;
            const existing = map.get(cid);
            if (existing)
                existing.count++;
            else
                map.set(cid, { label: lbl ?? `Cluster ${cid}`, count: 1 });
        });
        return Array.from(map.entries())
            .sort((a, b) => b[1].count - a[1].count)
            .map(([id, { label, count }]) => ({ id, label, color: getSemanticClusterColor(id), count }));
    }, [graph]);
    const hasSemanticData = clusters.length > 0;
    return (<div className="flex flex-col gap-1.5">
      <button onClick={onToggle} disabled={!hasSemanticData || isAnimating} title={!hasSemanticData ? 'No semantic data — rebuild the graph to enable' : undefined} className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all self-start ${!hasSemanticData
            ? 'bg-[#1a1a1a] border-[#262626] text-white/20 cursor-not-allowed'
            : isAnimating
                ? 'bg-[#1a1a1a] border-[#06b6d4]/30 text-[#06b6d4]/50 cursor-wait'
                : isEnabled
                    ? 'bg-[#1a1a1a] border-[#06b6d4]/50 text-[#06b6d4]'
                    : 'bg-[#1a1a1a] border-[#262626] text-white/40 hover:text-white/70'}`}>
        <Sparkles className="w-3.5 h-3.5"/>
        {isAnimating ? (isEnabled ? 'Restoring…' : 'Grouping…') : 'Semantic View'}
        <span className={`w-1.5 h-1.5 rounded-full transition-colors ${isEnabled && hasSemanticData ? 'bg-[#06b6d4]' : 'bg-[#3a3a3a]'}`}/>
      </button>

      {isEnabled && hasSemanticData && (<div className="bg-[#121215]/95 border border-[#262626] rounded-lg backdrop-blur-sm overflow-hidden w-52">
          <div className="px-3 py-2 border-b border-[#262626]">
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-widest">Semantic Clusters</span>
          </div>
          <div className="flex flex-col divide-y divide-[#1e1e1e] max-h-52 overflow-y-auto">
            {clusters.map(({ id, label, color, count }) => (<div key={id} className="flex items-center gap-2 px-3 py-1.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }}/>
                <span className="flex-1 text-[11px] text-white/65 truncate">{label}</span>
                <span className="text-[10px] text-white/25 font-mono shrink-0">{count}</span>
              </div>))}
          </div>
        </div>)}
    </div>);
}
export interface GraphCanvasHandle {
    focusNode: (nodeId: string) => void;
}
function computeConvexHull(pts: {
    x: number;
    y: number;
}[]) {
    if (pts.length <= 2)
        return pts;
    const sorted = [...pts].sort((a, b) => a.x - b.x || a.y - b.y);
    const cross = (o: typeof pts[0], a: typeof pts[0], b: typeof pts[0]) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
    const lower: typeof pts = [];
    for (const p of sorted) {
        while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], p) <= 0)
            lower.pop();
        lower.push(p);
    }
    const upper: typeof pts = [];
    for (const p of [...sorted].reverse()) {
        while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], p) <= 0)
            upper.pop();
        upper.push(p);
    }
    lower.pop();
    upper.pop();
    return [...lower, ...upper];
}
function drawClusterHull(ctx: CanvasRenderingContext2D, pts: {
    x: number;
    y: number;
}[], color: string, pad: number) {
    if (pts.length === 0)
        return;
    const hull = computeConvexHull(pts);
    const cx = hull.reduce((s, p) => s + p.x, 0) / hull.length;
    const cy = hull.reduce((s, p) => s + p.y, 0) / hull.length;
    const exp = hull.map(p => {
        const dx = p.x - cx, dy = p.y - cy;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        return { x: p.x + (dx / d) * pad, y: p.y + (dy / d) * pad };
    });
    ctx.beginPath();
    if (exp.length === 1) {
        ctx.arc(exp[0].x, exp[0].y, pad, 0, Math.PI * 2);
    }
    else if (exp.length === 2) {
        const [a, b] = exp;
        const dx = b.x - a.x, dy = b.y - a.y;
        const d = Math.sqrt(dx * dx + dy * dy) || 1;
        const nx = (-dy / d) * pad, ny = (dx / d) * pad;
        ctx.moveTo(a.x + nx, a.y + ny);
        ctx.lineTo(b.x + nx, b.y + ny);
        ctx.arc(b.x, b.y, pad, Math.atan2(ny, nx), Math.atan2(-ny, -nx));
        ctx.lineTo(a.x - nx, a.y - ny);
        ctx.arc(a.x, a.y, pad, Math.atan2(-ny, -nx), Math.atan2(ny, nx));
    }
    else {
        const n = exp.length;
        ctx.moveTo((exp[n - 1].x + exp[0].x) / 2, (exp[n - 1].y + exp[0].y) / 2);
        for (let i = 0; i < n; i++) {
            const c = exp[i], nx2 = exp[(i + 1) % n];
            ctx.quadraticCurveTo(c.x, c.y, (c.x + nx2.x) / 2, (c.y + nx2.y) / 2);
        }
    }
    ctx.closePath();
    ctx.fillStyle = hexWithAlpha(color, 0.09);
    ctx.strokeStyle = hexWithAlpha(color, 0.28);
    ctx.lineWidth = 1.5;
    ctx.fill();
    ctx.stroke();
}
export const GraphCanvas = forwardRef<GraphCanvasHandle>((_, ref) => {
    const { graph, setSelectedNode, selectedNode, visibleLabels, visibleEdgeTypes, openCodePanel, depthFilter, highlightedNodeIds, isSemanticModeEnabled, setSemanticModeEnabled, } = useKGState();
    const [hoveredNodeName, setHoveredNodeName] = useState<string | null>(null);
    const [isSemanticAnimating, setIsSemanticAnimating] = useState(false);
    const cancelSemanticAnim = useRef<(() => void) | null>(null);
    const originalPositionsRef = useRef<Map<string, {
        x: number;
        y: number;
    }> | null>(null);
    const hullCanvasRef = useRef<HTMLCanvasElement>(null);
    const hasSource = (label: string) => label === 'File' || label === 'Function' || label === 'Class' || label === 'Method' || label === 'Interface';
    const handleNodeClick = useCallback((nodeId: string) => {
        if (!graph)
            return;
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node) {
            setSelectedNode(node);
            if (hasSource(node.label))
                openCodePanel();
        }
    }, [graph, setSelectedNode, openCodePanel]);
    const handleNodeHover = useCallback((nodeId: string | null) => {
        if (!nodeId || !graph) {
            setHoveredNodeName(null);
            return;
        }
        const node = graph.nodes.find(n => n.id === nodeId);
        if (node)
            setHoveredNodeName(node.properties.name);
    }, [graph]);
    const handleStageClick = useCallback(() => setSelectedNode(null), [setSelectedNode]);
    const { containerRef, sigmaRef, setGraph: setSigmaGraph, zoomIn, zoomOut, resetZoom, focusNode, selectedNode: sigmaSelectedNode, setSelectedNode: setSigmaSelectedNode, forceAtlas2, setForceAtlas2, } = useSigma({
        onNodeClick: handleNodeClick,
        onNodeHover: handleNodeHover,
        onStageClick: handleStageClick,
        highlightedNodeIds,
        visibleEdgeTypes,
    });
    useImperativeHandle(ref, () => ({
        focusNode: (nodeId: string) => {
            if (graph) {
                const node = graph.nodes.find(n => n.id === nodeId);
                if (node) {
                    setSelectedNode(node);
                    if (hasSource(node.label))
                        openCodePanel();
                }
            }
            focusNode(nodeId);
        },
    }), [focusNode, graph, setSelectedNode, openCodePanel]);
    const communityMemberships = useMemo(() => {
        const map = new Map<string, number>();
        if (!graph)
            return map;
        graph.relationships.forEach(rel => {
            if (rel.type === 'MEMBER_OF') {
                const communityIdx = parseInt(rel.targetId.replace('comm_', ''), 10) || 0;
                map.set(rel.sourceId, communityIdx);
            }
        });
        return map;
    }, [graph]);
    useEffect(() => {
        if (!graph)
            return;
        const sigmaGraph = knowledgeGraphToGraphology(graph, communityMemberships);
        setSigmaGraph(sigmaGraph);
    }, [graph, communityMemberships, setSigmaGraph]);
    useEffect(() => {
        const sigma = sigmaRef.current;
        if (!sigma)
            return;
        const sigmaGraph = sigma.getGraph() as Graph<SigmaNodeAttributes, SigmaEdgeAttributes>;
        if (sigmaGraph.order === 0)
            return;
        filterGraphByDepth(sigmaGraph, selectedNode?.id || null, depthFilter, visibleLabels);
        sigma.refresh();
    }, [visibleLabels, depthFilter, selectedNode, sigmaRef]);
    useEffect(() => {
        if (selectedNode)
            setSigmaSelectedNode(selectedNode.id);
        else
            setSigmaSelectedNode(null);
    }, [selectedNode, setSigmaSelectedNode]);
    useEffect(() => {
        const sigma = sigmaRef.current;
        if (!sigma)
            return;
        const sigmaGraph = sigma.getGraph() as Graph<SigmaNodeAttributes, SigmaEdgeAttributes>;
        if (sigmaGraph.order === 0)
            return;
        applyRiskColors(sigmaGraph, false);
        sigma.refresh();
    }, [sigmaRef, graph]);
    useEffect(() => {
        const sigma = sigmaRef.current;
        if (!sigma)
            return;
        const sigmaGraph = sigma.getGraph() as Graph<SigmaNodeAttributes, SigmaEdgeAttributes>;
        if (sigmaGraph.order === 0)
            return;
        cancelSemanticAnim.current?.();
        if (isSemanticModeEnabled) {
            originalPositionsRef.current = captureNodePositions(sigmaGraph);
            applySemanticColors(sigmaGraph, true);
            sigmaGraph.forEachEdge((edgeId) => sigmaGraph.setEdgeAttribute(edgeId, 'hidden', true));
            const targets = buildUmapTargets(sigmaGraph);
            setIsSemanticAnimating(true);
            cancelSemanticAnim.current = animateNodesToPositions(sigmaGraph, targets, () => sigma.refresh(), () => setIsSemanticAnimating(false));
        }
        else {
            applySemanticColors(sigmaGraph, false);
            sigmaGraph.forEachEdge((edgeId) => sigmaGraph.setEdgeAttribute(edgeId, 'hidden', false));
            const restore = originalPositionsRef.current;
            if (restore && restore.size > 0) {
                setIsSemanticAnimating(true);
                cancelSemanticAnim.current = animateNodesToPositions(sigmaGraph, restore, () => sigma.refresh(), () => {
                    setIsSemanticAnimating(false);
                    originalPositionsRef.current = null;
                });
            }
            else {
                const canvas = hullCanvasRef.current;
                if (canvas) {
                    const ctx = canvas.getContext('2d');
                    ctx?.clearRect(0, 0, canvas.width, canvas.height);
                }
            }
            sigma.refresh();
        }
        return () => { cancelSemanticAnim.current?.(); };
    }, [isSemanticModeEnabled, sigmaRef, graph]);
    useEffect(() => {
        const sigma = sigmaRef.current;
        if (!sigma)
            return;
        const drawHulls = () => {
            const canvas = hullCanvasRef.current;
            if (!canvas)
                return;
            const rect = canvas.getBoundingClientRect();
            if (canvas.width !== rect.width || canvas.height !== rect.height) {
                canvas.width = rect.width;
                canvas.height = rect.height;
            }
            const ctx = canvas.getContext('2d');
            if (!ctx)
                return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            if (!isSemanticModeEnabled)
                return;
            const sigmaGraph = sigma.getGraph() as Graph<SigmaNodeAttributes, SigmaEdgeAttributes>;
            const clusterPts = new Map<number, {
                x: number;
                y: number;
            }[]>();
            sigmaGraph.forEachNode((_, attrs) => {
                if (attrs.hidden || attrs.semanticClusterId === undefined || attrs.semanticClusterId < 0)
                    return;
                const vp = sigma.graphToViewport({ x: attrs.x, y: attrs.y });
                const arr = clusterPts.get(attrs.semanticClusterId) ?? [];
                arr.push(vp);
                clusterPts.set(attrs.semanticClusterId, arr);
            });
            clusterPts.forEach((pts, cid) => {
                drawClusterHull(ctx, pts, getSemanticClusterColor(cid), 36);
            });
        };
        sigma.on('afterRender', drawHulls);
        drawHulls();
        return () => { sigma.removeAllListeners('afterRender'); };
    }, [isSemanticModeEnabled, sigmaRef, graph]);
    const handleFocusSelected = useCallback(() => {
        if (selectedNode)
            focusNode(selectedNode.id);
    }, [selectedNode, focusNode]);
    const handleClearSelection = useCallback(() => {
        setSelectedNode(null);
        setSigmaSelectedNode(null);
        resetZoom();
    }, [setSelectedNode, setSigmaSelectedNode, resetZoom]);
    return (<div className="relative w-full h-full" style={{
            backgroundColor: '#1e1e21',
            backgroundImage: 'radial-gradient(circle, #333338 1px, transparent 1px)',
            backgroundSize: '20px 20px',
        }}>
      
      <div className="absolute inset-0 pointer-events-none" style={{
            background: 'radial-gradient(ellipse at 50% 40%, rgba(213,103,7,0.04) 0%, transparent 65%)',
        }}/>

      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing"/>

      
      <canvas ref={hullCanvasRef} className="hidden"/>

      
      

      
      {hoveredNodeName && !sigmaSelectedNode && (<div className="absolute top-4 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-[#1a1a1a]/95 border border-[#262626] rounded-lg backdrop-blur-sm z-20 pointer-events-none">
          <span className="font-mono text-sm text-white/90">{hoveredNodeName}</span>
        </div>)}

      
      {sigmaSelectedNode && selectedNode && (<div className="absolute top-4 left-1/2 -translate-x-1/2 flex items-center gap-2 px-4 py-2 bg-[#1a1a1a] border border-[var(--color-primary)]/40 rounded-xl backdrop-blur-sm z-20 shadow-lg" style={{ boxShadow: '0 0 20px rgba(213,103,7,0.08)' }}>
          <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#d56707' }}/>
          <span className="font-mono text-sm text-white/90">{selectedNode.properties.name}</span>
          <span className="text-xs text-white/35">({selectedNode.label})</span>
          <button onClick={handleClearSelection} className="ml-2 px-2 py-0.5 text-xs text-white/40 hover:text-white/80 hover:bg-white/[0.06] rounded transition-colors">
            Clear
          </button>
        </div>)}

      
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 z-10">
        {[
            { icon: ZoomIn, action: zoomIn, title: 'Zoom In' },
            { icon: ZoomOut, action: zoomOut, title: 'Zoom Out' },
            { icon: Maximize2, action: resetZoom, title: 'Fit to Screen' },
        ].map(({ icon: Icon, action, title }) => (<button key={title} onClick={action} title={title} className="w-9 h-9 flex items-center justify-center bg-[#1a1a1a] border border-[#262626] rounded text-white/35 hover:bg-[#262626] hover:text-white/80 transition-colors">
            <Icon className="w-4 h-4"/>
          </button>))}

        <div className="h-px bg-[#262626] my-1"/>

        <div className="w-[7.75rem] rounded-lg border border-[#262626] bg-[#1a1a1a] p-1.5 mb-0.5">
          <div className="text-[8px] font-medium text-white/35 uppercase tracking-wide mb-1 leading-tight">ForceAtlas2</div>
          <div className="flex rounded-md overflow-hidden border border-[#262626]" role="group" aria-label="ForceAtlas2 layout">
            <button type="button" disabled={!graph} title="Off: standard FA2 pass (default load)" onClick={() => setForceAtlas2(false)} className={`flex-1 py-1 text-[10px] font-medium transition-colors ${!forceAtlas2 ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]' : 'bg-transparent text-white/40 hover:text-white/65'} disabled:opacity-40 disabled:cursor-not-allowed`}>
              Off
            </button>
            <button type="button" disabled={!graph} title="On: extra FA2 iterations in one step (no motion)" onClick={() => setForceAtlas2(true)} className={`flex-1 py-1 text-[10px] font-medium transition-colors border-l border-[#262626] ${forceAtlas2 ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary-light)]' : 'bg-transparent text-white/40 hover:text-white/65'} disabled:opacity-40 disabled:cursor-not-allowed`}>
              On
            </button>
          </div>
        </div>

        {selectedNode && (<button onClick={handleFocusSelected} title="Focus Selected" className="w-9 h-9 flex items-center justify-center bg-[var(--color-primary)]/15 border border-[var(--color-primary)]/40 rounded text-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/25 transition-colors">
            <Focus className="w-4 h-4"/>
          </button>)}
        {sigmaSelectedNode && (<button onClick={handleClearSelection} title="Clear Selection" className="w-9 h-9 flex items-center justify-center bg-[#1a1a1a] border border-[#262626] rounded text-white/35 hover:bg-[#262626] hover:text-white/80 transition-colors">
            <RotateCcw className="w-4 h-4"/>
          </button>)}

      </div>
    </div>);
});
GraphCanvas.displayName = 'GraphCanvas';
