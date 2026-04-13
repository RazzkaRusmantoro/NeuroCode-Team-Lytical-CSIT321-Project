import Graph from 'graphology';
import { KnowledgeGraph, NodeLabel } from './types';
import { NODE_COLORS, NODE_SIZES, getCommunityColor, getSemanticClusterColor } from './constants';
export interface SigmaNodeAttributes {
    x: number;
    y: number;
    size: number;
    color: string;
    label: string;
    nodeType: NodeLabel;
    filePath: string;
    startLine?: number;
    endLine?: number;
    hidden?: boolean;
    zIndex?: number;
    highlighted?: boolean;
    mass?: number;
    community?: number;
    communityColor?: string;
    originalColor?: string;
    originalSize?: number;
    riskScore?: number;
    semanticClusterId?: number;
    semanticClusterLabel?: string;
    umapX?: number;
    umapY?: number;
    borderColor?: string;
    type?: string;
}
export interface SigmaEdgeAttributes {
    size: number;
    color: string;
    relationType: string;
    type?: string;
    curvature?: number;
    zIndex?: number;
    hidden?: boolean;
}
const getScaledNodeSize = (baseSize: number, nodeCount: number): number => {
    if (nodeCount > 50000)
        return Math.max(1, baseSize * 0.4);
    if (nodeCount > 20000)
        return Math.max(1.5, baseSize * 0.5);
    if (nodeCount > 5000)
        return Math.max(2, baseSize * 0.65);
    if (nodeCount > 1000)
        return Math.max(2.5, baseSize * 0.8);
    return baseSize;
};
const getNodeMass = (nodeType: NodeLabel, nodeCount: number): number => {
    const m = nodeCount > 5000 ? 2 : nodeCount > 1000 ? 1.5 : 1;
    switch (nodeType) {
        case 'Folder': return 15 * m;
        case 'File': return 3 * m;
        case 'Class':
        case 'Interface': return 5 * m;
        case 'Function':
        case 'Method': return 2 * m;
        default: return 1;
    }
};
export const knowledgeGraphToGraphology = (knowledgeGraph: KnowledgeGraph, communityMemberships?: Map<string, number>): Graph<SigmaNodeAttributes, SigmaEdgeAttributes> => {
    const graph = new Graph<SigmaNodeAttributes, SigmaEdgeAttributes>();
    const nodeCount = knowledgeGraph.nodes.length;
    const parentToChildren = new Map<string, string[]>();
    const childToParent = new Map<string, string>();
    const hierarchyRelations = new Set(['CONTAINS', 'HAS_METHOD']);
    knowledgeGraph.relationships.forEach(rel => {
        if (hierarchyRelations.has(rel.type)) {
            if (!parentToChildren.has(rel.sourceId))
                parentToChildren.set(rel.sourceId, []);
            parentToChildren.get(rel.sourceId)!.push(rel.targetId);
            childToParent.set(rel.targetId, rel.sourceId);
        }
    });
    const nodeMap = new Map(knowledgeGraph.nodes.map(n => [n.id, n]));
    const structuralTypes = new Set<NodeLabel>(['Folder']);
    const structuralNodes = knowledgeGraph.nodes.filter(n => structuralTypes.has(n.label));
    const structuralSpread = Math.sqrt(nodeCount) * 40;
    const childJitter = Math.sqrt(nodeCount) * 3;
    const clusterCenters = new Map<number, {
        x: number;
        y: number;
    }>();
    if (communityMemberships && communityMemberships.size > 0) {
        const communities = new Set(communityMemberships.values());
        const communityCount = communities.size;
        const clusterSpread = structuralSpread * 0.8;
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        let idx = 0;
        communities.forEach(communityId => {
            const angle = idx * goldenAngle;
            const radius = clusterSpread * Math.sqrt((idx + 1) / communityCount);
            clusterCenters.set(communityId, { x: radius * Math.cos(angle), y: radius * Math.sin(angle) });
            idx++;
        });
    }
    const clusterJitter = Math.sqrt(nodeCount) * 1.5;
    const nodePositions = new Map<string, {
        x: number;
        y: number;
    }>();
    structuralNodes.forEach((node, index) => {
        const goldenAngle = Math.PI * (3 - Math.sqrt(5));
        const angle = index * goldenAngle;
        const radius = structuralSpread * Math.sqrt((index + 1) / Math.max(structuralNodes.length, 1));
        const jitter = structuralSpread * 0.15;
        const x = radius * Math.cos(angle) + (Math.random() - 0.5) * jitter;
        const y = radius * Math.sin(angle) + (Math.random() - 0.5) * jitter;
        nodePositions.set(node.id, { x, y });
        const baseColor = NODE_COLORS[node.label] || '#9ca3af';
        const baseSize = getScaledNodeSize(NODE_SIZES[node.label] || 8, nodeCount);
        const riskScore = typeof node.properties.riskScore === 'number' ? node.properties.riskScore : undefined;
        graph.addNode(node.id, {
            x, y,
            size: baseSize,
            color: baseColor,
            borderColor: 'rgba(255,255,255,0.18)',
            originalColor: baseColor,
            originalSize: baseSize,
            riskScore,
            label: node.properties.name,
            nodeType: node.label,
            filePath: node.properties.filePath,
            startLine: node.properties.startLine,
            endLine: node.properties.endLine,
            hidden: false,
            mass: getNodeMass(node.label, nodeCount),
            type: 'bordered',
        });
    });
    const addNodeWithPosition = (nodeId: string) => {
        if (graph.hasNode(nodeId))
            return;
        const node = nodeMap.get(nodeId);
        if (!node)
            return;
        let x: number, y: number;
        const communityIndex = communityMemberships?.get(nodeId);
        const symbolTypes = new Set<NodeLabel>(['Function', 'Class', 'Method', 'Interface']);
        const clusterCenter = communityIndex !== undefined ? clusterCenters.get(communityIndex) : null;
        if (clusterCenter && symbolTypes.has(node.label)) {
            x = clusterCenter.x + (Math.random() - 0.5) * clusterJitter;
            y = clusterCenter.y + (Math.random() - 0.5) * clusterJitter;
        }
        else {
            const parentId = childToParent.get(nodeId);
            const parentPos = parentId ? nodePositions.get(parentId) : null;
            if (parentPos) {
                x = parentPos.x + (Math.random() - 0.5) * childJitter;
                y = parentPos.y + (Math.random() - 0.5) * childJitter;
            }
            else {
                x = (Math.random() - 0.5) * structuralSpread * 0.5;
                y = (Math.random() - 0.5) * structuralSpread * 0.5;
            }
        }
        nodePositions.set(nodeId, { x, y });
        const hasCommunity = communityIndex !== undefined;
        const usesCommunityColor = hasCommunity && symbolTypes.has(node.label);
        const nodeColor = usesCommunityColor
            ? getCommunityColor(communityIndex!)
            : NODE_COLORS[node.label] || '#9ca3af';
        const riskScore2 = typeof node.properties.riskScore === 'number' ? node.properties.riskScore : undefined;
        const baseSize2 = getScaledNodeSize(NODE_SIZES[node.label] || 8, nodeCount);
        const semanticClusterId = typeof node.properties.semanticClusterId === 'number'
            ? node.properties.semanticClusterId : undefined;
        graph.addNode(nodeId, {
            x, y,
            size: baseSize2,
            color: nodeColor,
            borderColor: 'rgba(255,255,255,0.18)',
            originalColor: nodeColor,
            originalSize: baseSize2,
            riskScore: riskScore2,
            label: node.properties.name,
            nodeType: node.label,
            filePath: node.properties.filePath,
            startLine: node.properties.startLine,
            endLine: node.properties.endLine,
            hidden: false,
            mass: getNodeMass(node.label, nodeCount),
            community: communityIndex,
            communityColor: hasCommunity ? getCommunityColor(communityIndex!) : undefined,
            semanticClusterId,
            semanticClusterLabel: node.properties.semanticClusterLabel as string | undefined,
            umapX: typeof node.properties.umapX === 'number' ? node.properties.umapX : undefined,
            umapY: typeof node.properties.umapY === 'number' ? node.properties.umapY : undefined,
            type: 'bordered',
        });
    };
    const queue: string[] = [...structuralNodes.map(n => n.id)];
    const visited = new Set<string>(queue);
    while (queue.length > 0) {
        const currentId = queue.shift()!;
        const children = parentToChildren.get(currentId) || [];
        for (const childId of children) {
            if (!visited.has(childId)) {
                visited.add(childId);
                addNodeWithPosition(childId);
                queue.push(childId);
            }
        }
    }
    knowledgeGraph.nodes.forEach(node => {
        if (!graph.hasNode(node.id))
            addNodeWithPosition(node.id);
    });
    const edgeBaseSize = nodeCount > 20000 ? 0.4 : nodeCount > 5000 ? 0.6 : 1.0;
    const EDGE_STYLES: Record<string, {
        color: string;
        sizeMultiplier: number;
    }> = {
        CONTAINS: { color: '#2d5a3d', sizeMultiplier: 0.4 },
        HAS_METHOD: { color: '#0e7490', sizeMultiplier: 0.5 },
        IMPORTS: { color: '#1d4ed8', sizeMultiplier: 0.6 },
        CALLS: { color: '#7c3aed', sizeMultiplier: 0.8 },
        INHERITS: { color: '#c2410c', sizeMultiplier: 1.0 },
        IMPLEMENTS: { color: '#be185d', sizeMultiplier: 0.9 },
    };
    knowledgeGraph.relationships.forEach(rel => {
        if (graph.hasNode(rel.sourceId) && graph.hasNode(rel.targetId)) {
            if (!graph.hasEdge(rel.sourceId, rel.targetId)) {
                const style = EDGE_STYLES[rel.type] || { color: '#4a4a5a', sizeMultiplier: 0.5 };
                graph.addEdge(rel.sourceId, rel.targetId, {
                    size: edgeBaseSize * style.sizeMultiplier,
                    color: style.color,
                    relationType: rel.type,
                    type: 'arrow',
                });
            }
        }
    });
    return graph;
};
export const hexWithAlpha = (hex: string, alpha: number): string => {
    const a = Math.round(Math.max(0, Math.min(1, alpha)) * 255)
        .toString(16)
        .padStart(2, '0');
    return `${hex.slice(0, 7)}${a}`;
};
export const applyRiskColors = (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>, enabled: boolean): void => {
    graph.forEachNode((nodeId, attrs) => {
        const origColor = attrs.originalColor || attrs.color;
        const origSize = attrs.originalSize ?? attrs.size;
        if (!enabled || attrs.riskScore === undefined) {
            graph.setNodeAttribute(nodeId, 'color', origColor);
            graph.setNodeAttribute(nodeId, 'size', origSize);
            return;
        }
        const s = attrs.riskScore;
        const sizeMult = 0.7 + s * 2.1;
        const alpha = 0.18 + s * 0.82;
        graph.setNodeAttribute(nodeId, 'size', origSize * sizeMult);
        graph.setNodeAttribute(nodeId, 'color', hexWithAlpha(origColor, alpha));
    });
};
export const filterGraphByLabels = (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>, visibleLabels: NodeLabel[]): void => {
    graph.forEachNode((nodeId, attributes) => {
        graph.setNodeAttribute(nodeId, 'hidden', !visibleLabels.includes(attributes.nodeType));
    });
};
export const getNodesWithinHops = (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>, startNodeId: string, maxHops: number): Set<string> => {
    const visited = new Set<string>();
    const queue: {
        nodeId: string;
        depth: number;
    }[] = [{ nodeId: startNodeId, depth: 0 }];
    while (queue.length > 0) {
        const { nodeId, depth } = queue.shift()!;
        if (visited.has(nodeId))
            continue;
        visited.add(nodeId);
        if (depth < maxHops) {
            graph.forEachNeighbor(nodeId, neighborId => {
                if (!visited.has(neighborId))
                    queue.push({ nodeId: neighborId, depth: depth + 1 });
            });
        }
    }
    return visited;
};
export const filterGraphByDepth = (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>, selectedNodeId: string | null, maxHops: number | null, visibleLabels: NodeLabel[]): void => {
    if (maxHops === null || selectedNodeId === null || !graph.hasNode(selectedNodeId)) {
        filterGraphByLabels(graph, visibleLabels);
        return;
    }
    const nodesInRange = getNodesWithinHops(graph, selectedNodeId, maxHops);
    graph.forEachNode((nodeId, attributes) => {
        graph.setNodeAttribute(nodeId, 'hidden', !visibleLabels.includes(attributes.nodeType) || !nodesInRange.has(nodeId));
    });
};
export const applySemanticColors = (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>, enabled: boolean): void => {
    graph.forEachNode((nodeId, attrs) => {
        const origColor = attrs.originalColor || attrs.color;
        if (!enabled || attrs.semanticClusterId === undefined) {
            graph.setNodeAttribute(nodeId, 'color', origColor);
            return;
        }
        graph.setNodeAttribute(nodeId, 'color', getSemanticClusterColor(attrs.semanticClusterId));
    });
};
export const captureNodePositions = (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>): Map<string, {
    x: number;
    y: number;
}> => {
    const map = new Map<string, {
        x: number;
        y: number;
    }>();
    graph.forEachNode((nodeId, attrs) => map.set(nodeId, { x: attrs.x, y: attrs.y }));
    return map;
};
export const animateNodesToPositions = (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>, targets: Map<string, {
    x: number;
    y: number;
}>, refresh: () => void, onDone?: () => void): (() => void) => {
    type Tween = {
        id: string;
        x0: number;
        y0: number;
        x1: number;
        y1: number;
    };
    const tweens: Tween[] = [];
    graph.forEachNode((nodeId, attrs) => {
        const target = targets.get(nodeId);
        if (target)
            tweens.push({ id: nodeId, x0: attrs.x, y0: attrs.y, x1: target.x, y1: target.y });
    });
    if (tweens.length === 0) {
        onDone?.();
        return () => { };
    }
    const DURATION = 1200;
    const startTime = performance.now();
    let rafId: number;
    const ease = (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t);
    const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / DURATION);
        const e = ease(t);
        for (const { id, x0, y0, x1, y1 } of tweens) {
            graph.setNodeAttribute(id, 'x', x0 + (x1 - x0) * e);
            graph.setNodeAttribute(id, 'y', y0 + (y1 - y0) * e);
        }
        refresh();
        if (t < 1)
            rafId = requestAnimationFrame(step);
        else
            onDone?.();
    };
    rafId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(rafId);
};
export const buildUmapTargets = (graph: Graph<SigmaNodeAttributes, SigmaEdgeAttributes>): Map<string, {
    x: number;
    y: number;
}> => {
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    graph.forEachNode((_, attrs) => {
        if (attrs.umapX !== undefined) {
            minX = Math.min(minX, attrs.x);
            maxX = Math.max(maxX, attrs.x);
            minY = Math.min(minY, attrs.y);
            maxY = Math.max(maxY, attrs.y);
        }
    });
    const scale = Math.max((maxX - minX) || 400, (maxY - minY) || 400) * 0.5;
    const targets = new Map<string, {
        x: number;
        y: number;
    }>();
    graph.forEachNode((nodeId, attrs) => {
        if (attrs.umapX !== undefined && attrs.umapY !== undefined)
            targets.set(nodeId, { x: attrs.umapX * scale, y: attrs.umapY * scale });
    });
    return targets;
};
