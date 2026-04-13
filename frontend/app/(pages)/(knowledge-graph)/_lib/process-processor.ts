import { KnowledgeGraph, GraphNode, NodeLabel } from './types';
import { CommunityMembership } from './community-processor';
import { calculateEntryPointScore, isTestFile } from './entry-point-scoring';
export interface ProcessDetectionConfig {
    maxTraceDepth: number;
    maxBranching: number;
    maxProcesses: number;
    minSteps: number;
}
const DEFAULT_CONFIG: ProcessDetectionConfig = {
    maxTraceDepth: 10,
    maxBranching: 4,
    maxProcesses: 75,
    minSteps: 2,
};
export interface ProcessNode {
    id: string;
    label: string;
    heuristicLabel: string;
    processType: 'intra_community' | 'cross_community';
    stepCount: number;
    communities: string[];
    entryPointId: string;
    terminalId: string;
    trace: string[];
}
export interface ProcessStep {
    nodeId: string;
    processId: string;
    step: number;
}
export interface ProcessDetectionResult {
    processes: ProcessNode[];
    steps: ProcessStep[];
    stats: {
        totalProcesses: number;
        crossCommunityCount: number;
        avgStepCount: number;
        entryPointsFound: number;
    };
}
type AdjacencyList = Map<string, string[]>;
const buildCallsGraph = (graph: KnowledgeGraph): AdjacencyList => {
    const adj = new Map<string, string[]>();
    graph.relationships.forEach(rel => {
        if (rel.type === 'CALLS') {
            if (!adj.has(rel.sourceId))
                adj.set(rel.sourceId, []);
            adj.get(rel.sourceId)!.push(rel.targetId);
        }
    });
    return adj;
};
const buildReverseCallsGraph = (graph: KnowledgeGraph): AdjacencyList => {
    const adj = new Map<string, string[]>();
    graph.relationships.forEach(rel => {
        if (rel.type === 'CALLS') {
            if (!adj.has(rel.targetId))
                adj.set(rel.targetId, []);
            adj.get(rel.targetId)!.push(rel.sourceId);
        }
    });
    return adj;
};
const findEntryPoints = (graph: KnowledgeGraph, reverseCallsEdges: AdjacencyList, callsEdges: AdjacencyList): string[] => {
    const symbolTypes = new Set<NodeLabel>(['Function', 'Method']);
    const candidates: {
        id: string;
        score: number;
    }[] = [];
    graph.nodes.forEach(node => {
        if (!symbolTypes.has(node.label))
            return;
        const filePath = node.properties.filePath || '';
        if (isTestFile(filePath))
            return;
        const callers = reverseCallsEdges.get(node.id) || [];
        const callees = callsEdges.get(node.id) || [];
        if (callees.length === 0)
            return;
        const { score } = calculateEntryPointScore(node.properties.name, node.properties.language || 'javascript', node.properties.isExported ?? false, callers.length, callees.length, filePath);
        if (score > 0)
            candidates.push({ id: node.id, score });
    });
    return candidates.sort((a, b) => b.score - a.score).slice(0, 200).map(c => c.id);
};
const traceFromEntryPoint = (entryId: string, callsEdges: AdjacencyList, config: ProcessDetectionConfig): string[][] => {
    const traces: string[][] = [];
    const queue: [
        string,
        string[]
    ][] = [[entryId, [entryId]]];
    while (queue.length > 0 && traces.length < config.maxBranching * 3) {
        const [currentId, path] = queue.shift()!;
        const callees = callsEdges.get(currentId) || [];
        if (callees.length === 0) {
            if (path.length >= config.minSteps)
                traces.push([...path]);
        }
        else if (path.length >= config.maxTraceDepth) {
            if (path.length >= config.minSteps)
                traces.push([...path]);
        }
        else {
            const limitedCallees = callees.slice(0, config.maxBranching);
            let addedBranch = false;
            for (const calleeId of limitedCallees) {
                if (!path.includes(calleeId)) {
                    queue.push([calleeId, [...path, calleeId]]);
                    addedBranch = true;
                }
            }
            if (!addedBranch && path.length >= config.minSteps)
                traces.push([...path]);
        }
    }
    return traces;
};
const deduplicateTraces = (traces: string[][]): string[][] => {
    if (traces.length === 0)
        return [];
    const sorted = [...traces].sort((a, b) => b.length - a.length);
    const unique: string[][] = [];
    for (const trace of sorted) {
        const traceKey = trace.join('->');
        const isSubset = unique.some(existing => existing.join('->').includes(traceKey));
        if (!isSubset)
            unique.push(trace);
    }
    return unique;
};
const capitalize = (s: string) => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
const sanitizeId = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '_').substring(0, 20).toLowerCase();
export const processProcesses = async (knowledgeGraph: KnowledgeGraph, memberships: CommunityMembership[], onProgress?: (message: string, progress: number) => void, config: Partial<ProcessDetectionConfig> = {}): Promise<ProcessDetectionResult> => {
    const cfg = { ...DEFAULT_CONFIG, ...config };
    onProgress?.('Finding entry points...', 0);
    const membershipMap = new Map<string, string>();
    memberships.forEach(m => membershipMap.set(m.nodeId, m.communityId));
    const callsEdges = buildCallsGraph(knowledgeGraph);
    const reverseCallsEdges = buildReverseCallsGraph(knowledgeGraph);
    const nodeMap = new Map<string, GraphNode>();
    knowledgeGraph.nodes.forEach(n => nodeMap.set(n.id, n));
    const entryPoints = findEntryPoints(knowledgeGraph, reverseCallsEdges, callsEdges);
    onProgress?.(`Found ${entryPoints.length} entry points, tracing flows...`, 20);
    const allTraces: string[][] = [];
    for (let i = 0; i < entryPoints.length && allTraces.length < cfg.maxProcesses * 2; i++) {
        const traces = traceFromEntryPoint(entryPoints[i], callsEdges, cfg);
        traces.filter(t => t.length >= cfg.minSteps).forEach(t => allTraces.push(t));
        if (i % 10 === 0) {
            onProgress?.(`Tracing entry point ${i + 1}/${entryPoints.length}...`, 20 + (i / entryPoints.length) * 40);
        }
    }
    onProgress?.(`Found ${allTraces.length} traces, deduplicating...`, 60);
    const uniqueTraces = deduplicateTraces(allTraces);
    const limitedTraces = uniqueTraces.sort((a, b) => b.length - a.length).slice(0, cfg.maxProcesses);
    onProgress?.(`Creating ${limitedTraces.length} process nodes...`, 80);
    const processes: ProcessNode[] = [];
    const steps: ProcessStep[] = [];
    limitedTraces.forEach((trace, idx) => {
        const entryPointId = trace[0];
        const terminalId = trace[trace.length - 1];
        const communitiesSet = new Set<string>();
        trace.forEach(nodeId => {
            const comm = membershipMap.get(nodeId);
            if (comm)
                communitiesSet.add(comm);
        });
        const communities = Array.from(communitiesSet);
        const processType = communities.length > 1 ? 'cross_community' : 'intra_community';
        const entryNode = nodeMap.get(entryPointId);
        const terminalNode = nodeMap.get(terminalId);
        const entryName = entryNode?.properties.name || 'Unknown';
        const terminalName = terminalNode?.properties.name || 'Unknown';
        const heuristicLabel = `${capitalize(entryName)} → ${capitalize(terminalName)}`;
        const processId = `proc_${idx}_${sanitizeId(entryName)}`;
        processes.push({ id: processId, label: heuristicLabel, heuristicLabel, processType, stepCount: trace.length, communities, entryPointId, terminalId, trace });
        trace.forEach((nodeId, stepIdx) => steps.push({ nodeId, processId, step: stepIdx + 1 }));
    });
    onProgress?.('Process detection complete!', 100);
    const crossCommunityCount = processes.filter(p => p.processType === 'cross_community').length;
    const avgStepCount = processes.length > 0 ? processes.reduce((sum, p) => sum + p.stepCount, 0) / processes.length : 0;
    return {
        processes,
        steps,
        stats: {
            totalProcesses: processes.length,
            crossCommunityCount,
            avgStepCount: Math.round(avgStepCount * 10) / 10,
            entryPointsFound: entryPoints.length,
        },
    };
};
