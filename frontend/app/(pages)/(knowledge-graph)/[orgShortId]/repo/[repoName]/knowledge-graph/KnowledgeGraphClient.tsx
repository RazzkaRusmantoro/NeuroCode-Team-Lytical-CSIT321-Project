'use client';
import { useEffect, useCallback, useRef } from 'react';
import dynamic from 'next/dynamic';
import { KGStateProvider, useKGState, PipelinePhase } from '../../../../_lib/useKGState';
import { createKnowledgeGraph } from '../../../../_lib/graph';
import { GraphNode, GraphRelationship } from '../../../../_lib/types';
import { LoadingOverlay } from './_components/LoadingOverlay';
const ExplorerUI = dynamic(() => import('./_components/ExplorerUI'), { ssr: false });
function KGPipeline({ mongoRepoId, repoFullName, orgShortId, }: {
    mongoRepoId: string;
    repoFullName: string;
    orgShortId: string;
}) {
    const { setGraph, setProgress, progress } = useKGState();
    const cancelledRef = useRef(false);
    const pollTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const buildTriggeredRef = useRef(false);
    useEffect(() => {
        let cancelled = false;
        cancelledRef.current = false;
        buildTriggeredRef.current = false;
        const stopPoll = () => {
            if (pollTimerRef.current) {
                clearInterval(pollTimerRef.current);
                pollTimerRef.current = null;
            }
        };
        const update = (phase: PipelinePhase, percent: number, message: string) => {
            if (!cancelled)
                setProgress({ phase, percent, message });
        };
        const populateGraph = (data: {
            nodes: unknown[];
            relationships: unknown[];
        }) => {
            if (cancelled)
                return;
            const kg = createKnowledgeGraph();
            for (const n of data.nodes as {
                id: string;
                label: string;
                properties: GraphNode['properties'];
            }[]) {
                kg.addNode({ id: n.id, label: n.label as GraphNode['label'], properties: n.properties });
            }
            for (const r of data.relationships as {
                id: string;
                type: string;
                sourceId: string;
                targetId: string;
            }[]) {
                kg.addRelationship({ id: r.id, type: r.type, sourceId: r.sourceId, targetId: r.targetId } as GraphRelationship);
            }
            setGraph(kg);
            if (!cancelled)
                setProgress({ phase: 'complete', percent: 100, message: 'Ready' });
        };
        const run = async () => {
            try {
                update('cloning', 10, 'Checking knowledge graph cache...');
                const checkRes = await fetch(`/api/knowledge-graph/${encodeURIComponent(mongoRepoId)}`);
                if (cancelled)
                    return;
                if (!checkRes.ok)
                    throw new Error(`Cache check failed: HTTP ${checkRes.status}`);
                const checkData = await checkRes.json();
                if (cancelled)
                    return;
                if (checkData.status === 'ready') {
                    update('building', 95, 'Loading graph from cache...');
                    populateGraph(checkData);
                    return;
                }
                if (buildTriggeredRef.current)
                    return;
                buildTriggeredRef.current = true;
                update('building', 10, 'Building knowledge graph on server...');
                const buildRes = await fetch(`/api/knowledge-graph/${encodeURIComponent(mongoRepoId)}/build`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ repoFullName }),
                });
                if (cancelled)
                    return;
                if (!buildRes.ok) {
                    const err = await buildRes.json().catch(() => ({}));
                    throw new Error(err?.error || `Build trigger failed: HTTP ${buildRes.status}`);
                }
                const buildData = await buildRes.json();
                if (cancelled)
                    return;
                if (buildData.error)
                    throw new Error(buildData.error);
                update('communities', 15, 'Processing repository on server...');
                await new Promise<void>((resolve, reject) => {
                    const POLL_MS = 5000;
                    const TIMEOUT_MS = 10 * 60000;
                    let elapsedMs = 0;
                    pollTimerRef.current = setInterval(async () => {
                        if (cancelled) {
                            stopPoll();
                            resolve();
                            return;
                        }
                        elapsedMs += POLL_MS;
                        const fakePct = Math.min(90, 15 + Math.round((elapsedMs / 90000) * 75));
                        update('communities', fakePct, 'Processing repository on server...');
                        if (elapsedMs > TIMEOUT_MS) {
                            stopPoll();
                            reject(new Error('Knowledge graph build timed out. Please try again.'));
                            return;
                        }
                        try {
                            const res = await fetch(`/api/knowledge-graph/${encodeURIComponent(mongoRepoId)}`);
                            if (cancelled) {
                                stopPoll();
                                resolve();
                                return;
                            }
                            if (!res.ok)
                                return;
                            const data = await res.json();
                            if (data.status === 'ready') {
                                stopPoll();
                                populateGraph(data);
                                resolve();
                            }
                        }
                        catch { }
                    }, POLL_MS);
                });
            }
            catch (err) {
                if (!cancelled) {
                    const message = err instanceof Error ? err.message : 'Unknown error';
                    setProgress({ phase: 'error', percent: 0, message: `Error: ${message}` });
                }
            }
        };
        run();
        return () => {
            cancelled = true;
            cancelledRef.current = true;
            stopPoll();
        };
    }, [mongoRepoId, repoFullName]);
    return (<div className="relative h-full w-full min-h-0">
      <ExplorerUI orgShortId={orgShortId} repoFullName={repoFullName} mongoRepoId={mongoRepoId}/>
      {progress.phase !== 'complete' && <LoadingOverlay progress={progress} onRetry={() => setProgress({ phase: 'idle', percent: 0, message: 'Initializing...' })}/>}
    </div>);
}
export default function KnowledgeGraphClient({ repositoryUrl, repoId, mongoRepoId, orgShortId, }: {
    repositoryUrl: string;
    repoId: string;
    mongoRepoId: string;
    orgShortId: string;
}) {
    return (<KGStateProvider repoId={repoId}>
      <KGPipeline mongoRepoId={mongoRepoId} repoFullName={repoId} orgShortId={orgShortId}/>
    </KGStateProvider>);
}
