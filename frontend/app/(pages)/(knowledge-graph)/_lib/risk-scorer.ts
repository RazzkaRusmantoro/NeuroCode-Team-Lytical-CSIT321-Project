import { KnowledgeGraph, GraphNode, NodeLabel } from './types';
export interface RiskFactors {
    inDegree: number;
    outDegree: number;
    communityCrossings: number;
    linesOfCode: number;
    normInDegree: number;
    normOutDegree: number;
    normCrossings: number;
    normLOC: number;
}
export interface RiskScore {
    score: number;
    level: 'low' | 'medium' | 'high' | 'critical';
    color: string;
    factors: RiskFactors;
}
export const getRiskColor = (score: number): string => {
    if (score < 0.25)
        return '#10b981';
    if (score < 0.5)
        return '#f59e0b';
    if (score < 0.75)
        return '#f97316';
    return '#ef4444';
};
export const getRiskLevel = (score: number): RiskScore['level'] => {
    if (score < 0.25)
        return 'low';
    if (score < 0.5)
        return 'medium';
    if (score < 0.75)
        return 'high';
    return 'critical';
};
export const RISK_LEVEL_META: Record<RiskScore['level'], {
    label: string;
    color: string;
    bg: string;
}> = {
    low: { label: 'Low', color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
    medium: { label: 'Medium', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    high: { label: 'High', color: '#f97316', bg: 'rgba(249,115,22,0.12)' },
    critical: { label: 'Critical', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
};
const WEIGHTS = {
    inDegree: 0.40,
    crossings: 0.30,
    loc: 0.20,
    outDegree: 0.10,
};
const SCORED_LABELS = new Set<NodeLabel>(['Function', 'Class', 'Method', 'Interface', 'File']);
export const computeRiskScores = (knowledgeGraph: KnowledgeGraph): Map<string, RiskScore> => {
    const result = new Map<string, RiskScore>();
    const scoredNodes = knowledgeGraph.nodes.filter(n => SCORED_LABELS.has(n.label));
    if (scoredNodes.length === 0)
        return result;
    const communityOf = new Map<string, number>();
    knowledgeGraph.relationships.forEach(rel => {
        if (rel.type === 'MEMBER_OF') {
            communityOf.set(rel.sourceId, parseInt(rel.targetId.replace('comm_', ''), 10) || 0);
        }
    });
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();
    const crossingMap = new Map<string, number>();
    scoredNodes.forEach(n => {
        inDegreeMap.set(n.id, 0);
        outDegreeMap.set(n.id, 0);
        crossingMap.set(n.id, 0);
    });
    const relevantTypes = new Set(['CALLS', 'IMPORTS', 'INHERITS', 'IMPLEMENTS', 'HAS_METHOD']);
    knowledgeGraph.relationships.forEach(rel => {
        if (!relevantTypes.has(rel.type))
            return;
        const src = rel.sourceId;
        const tgt = rel.targetId;
        if (inDegreeMap.has(tgt))
            inDegreeMap.set(tgt, (inDegreeMap.get(tgt) || 0) + 1);
        if (outDegreeMap.has(src))
            outDegreeMap.set(src, (outDegreeMap.get(src) || 0) + 1);
        const srcComm = communityOf.get(src);
        const tgtComm = communityOf.get(tgt);
        if (srcComm !== undefined && tgtComm !== undefined && srcComm !== tgtComm) {
            if (crossingMap.has(src))
                crossingMap.set(src, (crossingMap.get(src) || 0) + 1);
            if (crossingMap.has(tgt))
                crossingMap.set(tgt, (crossingMap.get(tgt) || 0) + 1);
        }
    });
    const rawValues = scoredNodes.map(node => ({
        id: node.id,
        inDeg: inDegreeMap.get(node.id) || 0,
        outDeg: outDegreeMap.get(node.id) || 0,
        crossings: crossingMap.get(node.id) || 0,
        loc: node.properties.endLine && node.properties.startLine
            ? node.properties.endLine - node.properties.startLine
            : 0,
    }));
    const maxOf = (key: keyof typeof rawValues[0]): number => Math.max(...rawValues.map(v => v[key] as number), 1);
    const maxInDeg = maxOf('inDeg');
    const maxOutDeg = maxOf('outDeg');
    const maxCrossing = maxOf('crossings');
    const maxLOC = maxOf('loc');
    rawValues.forEach(({ id, inDeg, outDeg, crossings, loc }) => {
        const normInDegree = inDeg / maxInDeg;
        const normOutDegree = outDeg / maxOutDeg;
        const normCrossings = crossings / maxCrossing;
        const normLOC = loc / maxLOC;
        const score = normInDegree * WEIGHTS.inDegree +
            normCrossings * WEIGHTS.crossings +
            normLOC * WEIGHTS.loc +
            normOutDegree * WEIGHTS.outDegree;
        const node = knowledgeGraph.nodes.find(n => n.id === id)!;
        const factors: RiskFactors = {
            inDegree: inDeg,
            outDegree: outDeg,
            communityCrossings: crossings,
            linesOfCode: loc,
            normInDegree,
            normOutDegree,
            normCrossings,
            normLOC,
        };
        result.set(id, {
            score,
            level: getRiskLevel(score),
            color: getRiskColor(score),
            factors,
        });
        node.properties.riskScore = score;
        node.properties.riskFactors = factors;
        node.properties.riskLevel = getRiskLevel(score);
    });
    return result;
};
