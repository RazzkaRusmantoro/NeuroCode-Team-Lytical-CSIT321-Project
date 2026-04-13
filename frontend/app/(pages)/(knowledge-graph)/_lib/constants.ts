import { NodeLabel } from './types';
export const NODE_COLORS: Record<NodeLabel, string> = {
    Folder: '#d56707',
    File: '#3b82f6',
    Class: '#f59e0b',
    Function: '#10b981',
    Method: '#14b8a6',
    Interface: '#ec4899',
    Community: '#ed8a2e',
    Process: '#f43f5e',
};
export const NODE_SIZES: Record<NodeLabel, number> = {
    Folder: 10,
    File: 6,
    Class: 8,
    Function: 4,
    Method: 3,
    Interface: 7,
    Community: 0,
    Process: 0,
};
export const COMMUNITY_COLORS = [
    '#d56707',
    '#ed8a2e',
    '#f59f43',
    '#f59e0b',
    '#10b981',
    '#3b82f6',
    '#8b5cf6',
    '#ec4899',
    '#14b8a6',
    '#f43f5e',
    '#22c55e',
    '#84cc16',
];
export const getCommunityColor = (communityIndex: number): string => COMMUNITY_COLORS[communityIndex % COMMUNITY_COLORS.length];
export const DEFAULT_VISIBLE_LABELS: NodeLabel[] = [
    'Folder',
    'File',
    'Class',
    'Function',
    'Method',
    'Interface',
];
export const FILTERABLE_LABELS: NodeLabel[] = [
    'Folder',
    'File',
    'Class',
    'Function',
    'Method',
    'Interface',
];
export type EdgeType = 'CONTAINS' | 'IMPORTS' | 'CALLS' | 'INHERITS' | 'IMPLEMENTS' | 'HAS_METHOD';
export const ALL_EDGE_TYPES: EdgeType[] = [
    'CONTAINS',
    'IMPORTS',
    'CALLS',
    'INHERITS',
    'IMPLEMENTS',
    'HAS_METHOD',
];
export const DEFAULT_VISIBLE_EDGES: EdgeType[] = [
    'CONTAINS',
    'IMPORTS',
    'CALLS',
    'INHERITS',
    'IMPLEMENTS',
    'HAS_METHOD',
];
export const EDGE_INFO: Record<EdgeType, {
    color: string;
    label: string;
}> = {
    CONTAINS: { color: '#2d5a3d', label: 'Contains' },
    IMPORTS: { color: '#1d4ed8', label: 'Imports' },
    CALLS: { color: '#d56707', label: 'Calls' },
    INHERITS: { color: '#c2410c', label: 'Inherits' },
    IMPLEMENTS: { color: '#be185d', label: 'Implements' },
    HAS_METHOD: { color: '#0e7490', label: 'Has Method' },
};
export const SEMANTIC_CLUSTER_COLORS: string[] = [
    '#06b6d4',
    '#a855f7',
    '#22c55e',
    '#f59e0b',
    '#3b82f6',
    '#ec4899',
    '#14b8a6',
    '#f97316',
    '#84cc16',
    '#6366f1',
    '#e11d48',
    '#0891b2',
    '#d946ef',
    '#65a30d',
    '#7c3aed',
];
export const getSemanticClusterColor = (clusterId: number): string => {
    if (clusterId < 0)
        return '#4a4a5a';
    return SEMANTIC_CLUSTER_COLORS[clusterId % SEMANTIC_CLUSTER_COLORS.length];
};
