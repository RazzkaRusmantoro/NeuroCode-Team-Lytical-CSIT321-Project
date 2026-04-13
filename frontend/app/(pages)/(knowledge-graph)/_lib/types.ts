export type NodeLabel = 'Folder' | 'File' | 'Function' | 'Class' | 'Method' | 'Interface' | 'Community' | 'Process';
export interface GraphNode {
    id: string;
    label: NodeLabel;
    properties: {
        name: string;
        filePath: string;
        startLine?: number;
        endLine?: number;
        language?: string;
        isAsync?: boolean;
        isExported?: boolean;
        isStatic?: boolean;
        extends?: string | null;
        heuristicLabel?: string;
        cohesion?: number;
        symbolCount?: number;
        heuristicLabelProcess?: string;
        processType?: 'intra_community' | 'cross_community';
        stepCount?: number;
        riskScore?: number;
        riskLevel?: 'low' | 'medium' | 'high' | 'critical';
        riskFactors?: {
            inDegree: number;
            outDegree: number;
            communityCrossings: number;
            linesOfCode: number;
            normInDegree: number;
            normOutDegree: number;
            normCrossings: number;
            normLOC: number;
        };
        semanticClusterId?: number;
        semanticClusterLabel?: string;
        umapX?: number;
        umapY?: number;
        [key: string]: unknown;
    };
}
export interface GraphRelationship {
    id: string;
    type: string;
    sourceId: string;
    targetId: string;
    properties?: Record<string, unknown>;
}
export interface KnowledgeGraph {
    readonly nodes: GraphNode[];
    readonly relationships: GraphRelationship[];
    readonly nodeCount: number;
    readonly relationshipCount: number;
    addNode(node: GraphNode): void;
    addRelationship(rel: GraphRelationship): void;
}
