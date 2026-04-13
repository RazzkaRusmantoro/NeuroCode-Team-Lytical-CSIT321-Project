'use client';
import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { KnowledgeGraph, GraphNode, NodeLabel } from './types';
import { EdgeType, DEFAULT_VISIBLE_LABELS, DEFAULT_VISIBLE_EDGES } from './constants';
export type PipelinePhase = 'idle' | 'cloning' | 'reading' | 'building' | 'communities' | 'processes' | 'complete' | 'error';
export interface PipelineProgress {
    phase: PipelinePhase;
    percent: number;
    message: string;
    detail?: string;
    stats?: {
        filesProcessed: number;
        totalFiles: number;
        nodesCreated: number;
    };
}
interface KGState {
    graph: KnowledgeGraph | null;
    progress: PipelineProgress;
    selectedNode: GraphNode | null;
    visibleLabels: NodeLabel[];
    visibleEdgeTypes: EdgeType[];
    depthFilter: number | null;
    highlightedNodeIds: Set<string>;
    isCodePanelOpen: boolean;
    isRiskModeEnabled: boolean;
    isSemanticModeEnabled: boolean;
    repoId: string;
    setGraph: (graph: KnowledgeGraph | null) => void;
    setProgress: (p: PipelineProgress) => void;
    setSelectedNode: (node: GraphNode | null) => void;
    toggleLabelVisibility: (label: NodeLabel) => void;
    toggleEdgeVisibility: (edge: EdgeType) => void;
    setDepthFilter: (depth: number | null) => void;
    setHighlightedNodeIds: (ids: Set<string>) => void;
    openCodePanel: () => void;
    closeCodePanel: () => void;
    setRiskModeEnabled: (enabled: boolean) => void;
    setSemanticModeEnabled: (enabled: boolean) => void;
}
const KGStateContext = createContext<KGState | null>(null);
export const useKGState = (): KGState => {
    const ctx = useContext(KGStateContext);
    if (!ctx)
        throw new Error('useKGState must be used inside KGStateProvider');
    return ctx;
};
interface KGStateProviderProps {
    children: ReactNode;
    repoId: string;
}
export const KGStateProvider = ({ children, repoId }: KGStateProviderProps) => {
    const [graph, setGraph] = useState<KnowledgeGraph | null>(null);
    const [progress, setProgress] = useState<PipelineProgress>({
        phase: 'idle',
        percent: 0,
        message: 'Initializing...',
    });
    const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);
    const [visibleLabels, setVisibleLabels] = useState<NodeLabel[]>(DEFAULT_VISIBLE_LABELS);
    const [visibleEdgeTypes, setVisibleEdgeTypes] = useState<EdgeType[]>(DEFAULT_VISIBLE_EDGES);
    const [depthFilter, setDepthFilter] = useState<number | null>(null);
    const [highlightedNodeIds, setHighlightedNodeIds] = useState<Set<string>>(new Set());
    const [isCodePanelOpen, setIsCodePanelOpen] = useState(false);
    const [isRiskModeEnabled, setIsRiskModeEnabled] = useState(true);
    const [isSemanticModeEnabled, setIsSemanticModeEnabled] = useState(false);
    const toggleLabelVisibility = useCallback((label: NodeLabel) => {
        setVisibleLabels(prev => prev.includes(label) ? prev.filter(l => l !== label) : [...prev, label]);
    }, []);
    const toggleEdgeVisibility = useCallback((edge: EdgeType) => {
        setVisibleEdgeTypes(prev => prev.includes(edge) ? prev.filter(e => e !== edge) : [...prev, edge]);
    }, []);
    const openCodePanel = useCallback(() => setIsCodePanelOpen(true), []);
    const closeCodePanel = useCallback(() => setIsCodePanelOpen(false), []);
    const setRiskModeEnabled = useCallback((v: boolean) => setIsRiskModeEnabled(v), []);
    const setSemanticModeEnabled = useCallback((v: boolean) => setIsSemanticModeEnabled(v), []);
    return (<KGStateContext.Provider value={{
            graph,
            progress,
            selectedNode,
            visibleLabels,
            visibleEdgeTypes,
            depthFilter,
            highlightedNodeIds,
            isCodePanelOpen,
            isRiskModeEnabled,
            isSemanticModeEnabled,
            repoId,
            setGraph,
            setProgress,
            setSelectedNode,
            toggleLabelVisibility,
            toggleEdgeVisibility,
            setDepthFilter,
            setHighlightedNodeIds,
            openCodePanel,
            closeCodePanel,
            setRiskModeEnabled,
            setSemanticModeEnabled,
        }}>
      {children}
    </KGStateContext.Provider>);
};
