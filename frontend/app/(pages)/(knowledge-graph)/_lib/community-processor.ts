import Graph from 'graphology';
import louvain from 'graphology-communities-louvain';
import { KnowledgeGraph, NodeLabel } from './types';
export interface CommunityNode {
    id: string;
    label: string;
    heuristicLabel: string;
    cohesion: number;
    symbolCount: number;
}
export interface CommunityMembership {
    nodeId: string;
    communityId: string;
}
export interface CommunityDetectionResult {
    communities: CommunityNode[];
    memberships: CommunityMembership[];
    stats: {
        totalCommunities: number;
        modularity: number;
        nodesProcessed: number;
    };
}
export const COMMUNITY_COLORS = [
    '#ef4444', '#f97316', '#eab308', '#22c55e',
    '#06b6d4', '#3b82f6', '#8b5cf6', '#d946ef',
    '#ec4899', '#f43f5e', '#14b8a6', '#84cc16',
];
export const getCommunityColor = (communityIndex: number): string => COMMUNITY_COLORS[communityIndex % COMMUNITY_COLORS.length];
export const processCommunities = async (knowledgeGraph: KnowledgeGraph, onProgress?: (message: string, progress: number) => void): Promise<CommunityDetectionResult> => {
    onProgress?.('Building graph for community detection...', 10);
    const graph = buildGraphologyGraph(knowledgeGraph);
    if (graph.order === 0) {
        return { communities: [], memberships: [], stats: { totalCommunities: 0, modularity: 0, nodesProcessed: 0 } };
    }
    onProgress?.(`Running Louvain algorithm on ${graph.order} nodes...`, 30);
    const details = louvain.detailed(graph, { resolution: 1.0 });
    onProgress?.(`Found ${details.count} communities...`, 60);
    const communityNodes = createCommunityNodes(details.communities as Record<string, number>, details.count, graph, knowledgeGraph);
    onProgress?.('Creating membership edges...', 80);
    const memberships: CommunityMembership[] = [];
    Object.entries(details.communities).forEach(([nodeId, communityNum]) => {
        memberships.push({ nodeId, communityId: `comm_${communityNum}` });
    });
    onProgress?.('Community detection complete!', 100);
    return {
        communities: communityNodes,
        memberships,
        stats: { totalCommunities: details.count, modularity: details.modularity, nodesProcessed: graph.order },
    };
};
const buildGraphologyGraph = (knowledgeGraph: KnowledgeGraph): Graph => {
    const graph = new Graph({ type: 'undirected', allowSelfLoops: false });
    const symbolTypes = new Set<NodeLabel>(['Function', 'Class', 'Method', 'Interface']);
    knowledgeGraph.nodes.forEach(node => {
        if (symbolTypes.has(node.label)) {
            graph.addNode(node.id, { name: node.properties.name, filePath: node.properties.filePath, type: node.label });
        }
    });
    const clusteringRelTypes = new Set(['CALLS', 'INHERITS', 'IMPLEMENTS']);
    knowledgeGraph.relationships.forEach(rel => {
        if (clusteringRelTypes.has(rel.type)) {
            if (graph.hasNode(rel.sourceId) && graph.hasNode(rel.targetId) && rel.sourceId !== rel.targetId) {
                if (!graph.hasEdge(rel.sourceId, rel.targetId)) {
                    graph.addEdge(rel.sourceId, rel.targetId);
                }
            }
        }
    });
    return graph;
};
const createCommunityNodes = (communities: Record<string, number>, communityCount: number, graph: Graph, knowledgeGraph: KnowledgeGraph): CommunityNode[] => {
    const communityMembers = new Map<number, string[]>();
    Object.entries(communities).forEach(([nodeId, commNum]) => {
        if (!communityMembers.has(commNum))
            communityMembers.set(commNum, []);
        communityMembers.get(commNum)!.push(nodeId);
    });
    const nodePathMap = new Map<string, string>();
    knowledgeGraph.nodes.forEach(node => {
        if (node.properties.filePath)
            nodePathMap.set(node.id, node.properties.filePath);
    });
    const communityNodes: CommunityNode[] = [];
    communityMembers.forEach((memberIds, commNum) => {
        if (memberIds.length < 2)
            return;
        const heuristicLabel = generateHeuristicLabel(memberIds, nodePathMap, graph, commNum);
        communityNodes.push({
            id: `comm_${commNum}`,
            label: heuristicLabel,
            heuristicLabel,
            cohesion: calculateCohesion(memberIds, graph),
            symbolCount: memberIds.length,
        });
    });
    communityNodes.sort((a, b) => b.symbolCount - a.symbolCount);
    return communityNodes;
};
const generateHeuristicLabel = (memberIds: string[], nodePathMap: Map<string, string>, graph: Graph, commNum: number): string => {
    const folderCounts = new Map<string, number>();
    memberIds.forEach(nodeId => {
        const filePath = nodePathMap.get(nodeId) || '';
        const parts = filePath.split('/').filter(Boolean);
        if (parts.length >= 2) {
            const folder = parts[parts.length - 2];
            if (!['src', 'lib', 'core', 'utils', 'common', 'shared', 'helpers'].includes(folder.toLowerCase())) {
                folderCounts.set(folder, (folderCounts.get(folder) || 0) + 1);
            }
        }
    });
    let maxCount = 0;
    let bestFolder = '';
    folderCounts.forEach((count, folder) => {
        if (count > maxCount) {
            maxCount = count;
            bestFolder = folder;
        }
    });
    if (bestFolder)
        return bestFolder.charAt(0).toUpperCase() + bestFolder.slice(1);
    const names: string[] = [];
    memberIds.forEach(nodeId => {
        const name = graph.getNodeAttribute(nodeId, 'name');
        if (name)
            names.push(name);
    });
    if (names.length > 2) {
        const commonPrefix = findCommonPrefix(names);
        if (commonPrefix.length > 2)
            return commonPrefix.charAt(0).toUpperCase() + commonPrefix.slice(1);
    }
    return `Cluster_${commNum}`;
};
const findCommonPrefix = (strings: string[]): string => {
    if (strings.length === 0)
        return '';
    const sorted = strings.slice().sort();
    const first = sorted[0];
    const last = sorted[sorted.length - 1];
    let i = 0;
    while (i < first.length && first[i] === last[i])
        i++;
    return first.substring(0, i);
};
const calculateCohesion = (memberIds: string[], graph: Graph): number => {
    if (memberIds.length <= 1)
        return 1.0;
    const memberSet = new Set(memberIds);
    let internalEdges = 0;
    let totalEdges = 0;
    memberIds.forEach(nodeId => {
        if (graph.hasNode(nodeId)) {
            graph.forEachNeighbor(nodeId, neighbor => {
                totalEdges++;
                if (memberSet.has(neighbor))
                    internalEdges++;
            });
        }
    });
    if (totalEdges === 0)
        return 1.0;
    return Math.min(1.0, internalEdges / totalEdges);
};
