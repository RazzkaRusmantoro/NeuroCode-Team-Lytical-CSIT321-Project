'use client';
import { useRef, useEffect, useCallback, useState } from 'react';
import Sigma from 'sigma';
import Graph from 'graphology';
import fa2Layout from 'graphology-layout-forceatlas2';
import noverlap from 'graphology-layout-noverlap';
import EdgeCurveProgram from '@sigma/edge-curve';
import { createNodeBorderProgram } from '@sigma/node-border';
import { SigmaNodeAttributes, SigmaEdgeAttributes, captureNodePositions } from './graph-adapter';
import type { EdgeType } from './constants';
const NodeBorderProgram = createNodeBorderProgram({
    borders: [
        { size: { value: 2, mode: 'pixels' }, color: { attribute: 'borderColor' } },
        { size: { fill: true }, color: { attribute: 'color' } },
    ],
});
const hexToRgb = (hex: string): {
    r: number;
    g: number;
    b: number;
} => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) } : { r: 100, g: 100, b: 100 };
};
const rgbToHex = (r: number, g: number, b: number): string => '#' + [r, g, b].map(x => { const h = Math.max(0, Math.min(255, Math.round(x))).toString(16); return h.length === 1 ? '0' + h : h; }).join('');
const dimColor = (hex: string, amount: number): string => {
    const rgb = hexToRgb(hex);
    const darkBg = { r: 18, g: 18, b: 28 };
    return rgbToHex(darkBg.r + (rgb.r - darkBg.r) * amount, darkBg.g + (rgb.g - darkBg.g) * amount, darkBg.b + (rgb.b - darkBg.b) * amount);
};
const brightenColor = (hex: string, factor: number): string => {
    const rgb = hexToRgb(hex);
    return rgbToHex(rgb.r + (255 - rgb.r) * (factor - 1) / factor, rgb.g + (255 - rgb.g) * (factor - 1) / factor, rgb.b + (255 - rgb.b) * (factor - 1) / factor);
};
interface UseSigmaOptions {
    onNodeClick?: (nodeId: string) => void;
    onNodeHover?: (nodeId: string | null) => void;
    onStageClick?: () => void;
    highlightedNodeIds?: Set<string>;
    visibleEdgeTypes?: EdgeType[];
}
export interface UseSigmaReturn {
    containerRef: React.RefObject<HTMLDivElement | null>;
    sigmaRef: React.RefObject<Sigma | null>;
    setGraph: (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>) => void;
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
    focusNode: (nodeId: string) => void;
    selectedNode: string | null;
    setSelectedNode: (nodeId: string | null) => void;
    forceAtlas2: boolean;
    setForceAtlas2: (enabled: boolean) => void;
}
const NOVERLAP_SETTINGS = { maxIterations: 20, ratio: 1.1, margin: 10, expansion: 1.05 };
const getFA2Settings = (nodeCount: number) => {
    const isSmall = nodeCount < 500;
    const isMedium = nodeCount >= 500 && nodeCount < 2000;
    const isLarge = nodeCount >= 2000 && nodeCount < 10000;
    return {
        gravity: isSmall ? 0.8 : isMedium ? 0.5 : isLarge ? 0.3 : 0.15,
        scalingRatio: isSmall ? 15 : isMedium ? 30 : isLarge ? 60 : 100,
        slowDown: isSmall ? 1 : isMedium ? 2 : isLarge ? 3 : 5,
        barnesHutOptimize: nodeCount > 200,
        barnesHutTheta: isLarge ? 0.8 : 0.6,
        strongGravityMode: false,
        outboundAttractionDistribution: true,
        linLogMode: false,
        adjustSizes: true,
        edgeWeightInfluence: 1,
    };
};
const getInstantLayoutIterations = (nodeCount: number): number => {
    if (nodeCount > 10000)
        return 40;
    if (nodeCount > 5000)
        return 55;
    if (nodeCount > 2000)
        return 80;
    if (nodeCount > 500)
        return 120;
    if (nodeCount > 100)
        return 180;
    return 260;
};
const getBoostedLayoutIterations = (nodeCount: number): number => Math.min(480, Math.round(getInstantLayoutIterations(nodeCount) * 2.25));
export const useSigma = (options: UseSigmaOptions = {}): UseSigmaReturn => {
    const containerRef = useRef<HTMLDivElement>(null);
    const sigmaRef = useRef<Sigma | null>(null);
    const graphRef = useRef<Graph<SigmaNodeAttributes, SigmaEdgeAttributes> | null>(null);
    const selectedNodeRef = useRef<string | null>(null);
    const highlightedRef = useRef<Set<string>>(new Set());
    const visibleEdgeTypesRef = useRef<EdgeType[] | null>(null);
    const forceAtlas2Ref = useRef(false);
    const forceAtlas2SnapshotRef = useRef<Map<string, {
        x: number;
        y: number;
    }> | null>(null);
    const [forceAtlas2, setForceAtlas2State] = useState(false);
    const [selectedNode, setSelectedNodeState] = useState<string | null>(null);
    useEffect(() => {
        highlightedRef.current = options.highlightedNodeIds || new Set();
        visibleEdgeTypesRef.current = options.visibleEdgeTypes || null;
        sigmaRef.current?.refresh();
    }, [options.highlightedNodeIds, options.visibleEdgeTypes]);
    const setSelectedNode = useCallback((nodeId: string | null) => {
        selectedNodeRef.current = nodeId;
        setSelectedNodeState(nodeId);
        const sigma = sigmaRef.current;
        if (!sigma)
            return;
        const camera = sigma.getCamera();
        camera.animate({ ratio: camera.ratio * 1.0001 }, { duration: 50 });
        sigma.refresh();
    }, []);
    useEffect(() => {
        if (!containerRef.current)
            return;
        const graph = new Graph<SigmaNodeAttributes, SigmaEdgeAttributes>();
        graphRef.current = graph;
        const sigma = new Sigma(graph, containerRef.current, {
            defaultNodeType: 'bordered',
            nodeProgramClasses: { bordered: NodeBorderProgram },
            renderLabels: true,
            labelFont: 'JetBrains Mono, monospace',
            labelSize: 11,
            labelWeight: '500',
            labelColor: { color: '#e4e4ed' },
            labelRenderedSizeThreshold: 8,
            labelDensity: 0.1,
            labelGridCellSize: 70,
            defaultNodeColor: '#6b7280',
            defaultEdgeColor: '#2a2a3a',
            defaultEdgeType: 'curved',
            edgeProgramClasses: { curved: EdgeCurveProgram },
            defaultDrawNodeHover: (context, data, settings) => {
                const label = data.label;
                if (!label)
                    return;
                const size = settings.labelSize || 11;
                const font = settings.labelFont || 'JetBrains Mono, monospace';
                const weight = settings.labelWeight || '500';
                context.font = `${weight} ${size}px ${font}`;
                const textWidth = context.measureText(label).width;
                const nodeSize = data.size || 8;
                const x = data.x;
                const y = data.y - nodeSize - 10;
                const paddingX = 8;
                const paddingY = 5;
                const height = size + paddingY * 2;
                const width = textWidth + paddingX * 2;
                context.fillStyle = '#12121c';
                context.beginPath();
                context.roundRect(x - width / 2, y - height / 2, width, height, 4);
                context.fill();
                context.strokeStyle = data.color || '#6366f1';
                context.lineWidth = 2;
                context.stroke();
                context.fillStyle = '#f5f5f7';
                context.textAlign = 'center';
                context.textBaseline = 'middle';
                context.fillText(label, x, y);
                context.beginPath();
                context.arc(data.x, data.y, nodeSize + 4, 0, Math.PI * 2);
                context.strokeStyle = data.color || '#6366f1';
                context.lineWidth = 2;
                context.globalAlpha = 0.5;
                context.stroke();
                context.globalAlpha = 1;
            },
            minCameraRatio: 0.002,
            maxCameraRatio: 50,
            hideEdgesOnMove: true,
            zIndex: true,
            nodeReducer: (node, data) => {
                const res = { ...data };
                if (data.hidden) {
                    res.hidden = true;
                    return res;
                }
                const currentSelected = selectedNodeRef.current;
                const highlighted = highlightedRef.current;
                const hasHighlights = highlighted.size > 0;
                const isHighlighted = highlighted.has(node);
                if (hasHighlights && !currentSelected) {
                    if (isHighlighted) {
                        res.color = '#06b6d4';
                        res.size = (data.size || 8) * 1.6;
                        res.zIndex = 2;
                        res.highlighted = true;
                    }
                    else {
                        res.color = dimColor(data.color, 0.2);
                        res.size = (data.size || 8) * 0.5;
                        res.zIndex = 0;
                    }
                    return res;
                }
                if (currentSelected) {
                    const g = graphRef.current;
                    if (g) {
                        const isSelected = node === currentSelected;
                        const isNeighbor = g.hasEdge(node, currentSelected) || g.hasEdge(currentSelected, node);
                        if (isSelected) {
                            res.size = (data.size || 8) * 1.8;
                            res.zIndex = 2;
                            res.highlighted = true;
                        }
                        else if (isNeighbor) {
                            res.size = (data.size || 8) * 1.3;
                            res.zIndex = 1;
                        }
                        else {
                            res.color = dimColor(data.color, 0.25);
                            res.size = (data.size || 8) * 0.6;
                            res.zIndex = 0;
                        }
                    }
                }
                return res;
            },
            edgeReducer: (edge, data) => {
                const res = { ...data };
                const visibleTypes = visibleEdgeTypesRef.current;
                if (visibleTypes && data.relationType && !visibleTypes.includes(data.relationType as EdgeType)) {
                    res.hidden = true;
                    return res;
                }
                const currentSelected = selectedNodeRef.current;
                const highlighted = highlightedRef.current;
                const hasHighlights = highlighted.size > 0;
                if (hasHighlights && !currentSelected) {
                    const g = graphRef.current;
                    if (g) {
                        const [source, target] = g.extremities(edge);
                        const bothHighlighted = highlighted.has(source) && highlighted.has(target);
                        const oneHighlighted = highlighted.has(source) || highlighted.has(target);
                        if (bothHighlighted) {
                            res.color = '#06b6d4';
                            res.size = Math.max(2, (data.size || 1) * 3);
                            res.zIndex = 2;
                        }
                        else if (oneHighlighted) {
                            res.color = dimColor('#06b6d4', 0.4);
                            res.size = 1;
                            res.zIndex = 1;
                        }
                        else {
                            res.color = dimColor(data.color, 0.08);
                            res.size = 0.2;
                            res.zIndex = 0;
                        }
                    }
                    return res;
                }
                if (currentSelected) {
                    const g = graphRef.current;
                    if (g) {
                        const [source, target] = g.extremities(edge);
                        const isConnected = source === currentSelected || target === currentSelected;
                        if (isConnected) {
                            res.color = brightenColor(data.color, 1.5);
                            res.size = Math.max(3, (data.size || 1) * 4);
                            res.zIndex = 2;
                        }
                        else {
                            res.color = dimColor(data.color, 0.1);
                            res.size = 0.3;
                            res.zIndex = 0;
                        }
                    }
                }
                return res;
            },
        });
        sigmaRef.current = sigma;
        sigma.on('clickNode', ({ node }) => {
            setSelectedNode(node);
            options.onNodeClick?.(node);
        });
        sigma.on('clickStage', () => {
            setSelectedNode(null);
            options.onStageClick?.();
        });
        sigma.on('enterNode', ({ node }) => {
            options.onNodeHover?.(node);
            if (containerRef.current)
                containerRef.current.style.cursor = 'pointer';
        });
        sigma.on('leaveNode', () => {
            options.onNodeHover?.(null);
            if (containerRef.current)
                containerRef.current.style.cursor = 'grab';
        });
        return () => {
            sigma.kill();
            sigmaRef.current = null;
            graphRef.current = null;
        };
    }, []);
    const applyLayout = useCallback((graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>, boosted: boolean) => {
        if (graph.order === 0)
            return;
        const inferredSettings = fa2Layout.inferSettings(graph);
        const iterations = boosted ? getBoostedLayoutIterations(graph.order) : getInstantLayoutIterations(graph.order);
        fa2Layout.assign(graph, {
            iterations,
            settings: { ...inferredSettings, ...getFA2Settings(graph.order) },
        });
        noverlap.assign(graph, NOVERLAP_SETTINGS);
        sigmaRef.current?.refresh();
    }, []);
    const setGraph = useCallback((newGraph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>) => {
        const sigma = sigmaRef.current;
        if (!sigma)
            return;
        forceAtlas2SnapshotRef.current = null;
        graphRef.current = newGraph;
        sigma.setGraph(newGraph);
        setSelectedNode(null);
        applyLayout(newGraph, forceAtlas2Ref.current);
        sigma.getCamera().animatedReset({ duration: 0 });
    }, [applyLayout, setSelectedNode]);
    const setForceAtlas2 = useCallback((enabled: boolean) => {
        if (enabled === forceAtlas2Ref.current)
            return;
        forceAtlas2Ref.current = enabled;
        setForceAtlas2State(enabled);
        const graph = graphRef.current;
        const sigma = sigmaRef.current;
        if (!graph || graph.order === 0 || !sigma)
            return;
        if (enabled) {
            forceAtlas2SnapshotRef.current = captureNodePositions(graph);
            applyLayout(graph, true);
        }
        else {
            const snap = forceAtlas2SnapshotRef.current;
            forceAtlas2SnapshotRef.current = null;
            if (snap && snap.size > 0) {
                snap.forEach((p, id) => {
                    if (graph.hasNode(id)) {
                        graph.setNodeAttribute(id, 'x', p.x);
                        graph.setNodeAttribute(id, 'y', p.y);
                    }
                });
            }
            else {
                applyLayout(graph, false);
            }
            sigma.refresh();
        }
        sigma.getCamera().animatedReset({ duration: 0 });
    }, [applyLayout]);
    const focusNode = useCallback((nodeId: string) => {
        const sigma = sigmaRef.current;
        const graph = graphRef.current;
        if (!sigma || !graph || !graph.hasNode(nodeId))
            return;
        const alreadySelected = selectedNodeRef.current === nodeId;
        selectedNodeRef.current = nodeId;
        setSelectedNodeState(nodeId);
        if (!alreadySelected) {
            const nodeAttrs = graph.getNodeAttributes(nodeId);
            sigma.getCamera().animate({ x: nodeAttrs.x, y: nodeAttrs.y, ratio: 0.15 }, { duration: 400 });
        }
        sigma.refresh();
    }, []);
    const zoomIn = useCallback(() => sigmaRef.current?.getCamera().animatedZoom({ duration: 200 }), []);
    const zoomOut = useCallback(() => sigmaRef.current?.getCamera().animatedUnzoom({ duration: 200 }), []);
    const resetZoom = useCallback(() => { sigmaRef.current?.getCamera().animatedReset({ duration: 300 }); setSelectedNode(null); }, [setSelectedNode]);
    return { containerRef, sigmaRef, setGraph, zoomIn, zoomOut, resetZoom, focusNode, selectedNode, setSelectedNode, forceAtlas2, setForceAtlas2 };
};
