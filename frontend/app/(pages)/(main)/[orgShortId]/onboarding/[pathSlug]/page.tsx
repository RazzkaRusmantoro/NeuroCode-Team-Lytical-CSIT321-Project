'use client';
import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { slugify } from '@/lib/utils/slug';
import { setPathProgress, getPathProgress } from '@/lib/onboarding/progress';
import { useDocumentation, type CodeReferenceDetail } from '@/app/(pages)/(main)/[orgShortId]/repo/[repoName]/documentation/context/DocumentationContext';
import DocumentationContentBody from '@/app/(pages)/(main)/[orgShortId]/repo/[repoName]/documentation/components/DocumentationContentBody';
interface PathModule {
    id: string;
    name: string;
    summaryDescription: string;
    order: number;
}
interface LearningPath {
    id: string;
    title: string;
    summaryDescription: string;
    modules: PathModule[];
}
function OnboardingPathContent() {
    const params = useParams<{
        orgShortId: string;
        pathSlug: string;
    }>();
    const orgShortId = params?.orgShortId as string;
    const pathSlug = params?.pathSlug as string;
    const { setDocumentation } = useDocumentation();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [path, setPath] = useState<LearningPath | null>(null);
    const [isCompleted, setIsCompleted] = useState(false);
    const [isMarkingComplete, setIsMarkingComplete] = useState(false);
    const [contentDoc, setContentDoc] = useState<{
        title?: string;
        documentation?: {
            sections?: Array<{
                id: string;
                title: string;
                description: string;
                subsections?: Array<{
                    id: string;
                    title: string;
                    description: string;
                }>;
            }>;
        };
        code_references?: (string | CodeReferenceDetail)[];
    } | null>(null);
    useEffect(() => {
        if (!orgShortId || !path?.id)
            return;
        const current = getPathProgress(orgShortId, path.id);
        if (current?.status === 'completed') {
            setIsCompleted(true);
            return;
        }
        setPathProgress(orgShortId, path.id, { status: 'started' });
    }, [orgShortId, path?.id]);
    const handleMarkComplete = useCallback(() => {
        if (!orgShortId || !path?.id)
            return;
        setIsMarkingComplete(true);
        setPathProgress(orgShortId, path.id, {
            status: 'completed',
            completedAt: new Date().toISOString(),
        });
        setIsCompleted(true);
        setIsMarkingComplete(false);
    }, [orgShortId, path?.id]);
    useEffect(() => {
        if (!orgShortId || !pathSlug)
            return;
        const fetchPaths = async () => {
            try {
                setLoading(true);
                setError(null);
                const base = typeof window !== 'undefined' ? window.location.origin : '';
                const res = await fetch(`${base}/api/organizations/${orgShortId}/onboarding/suggested-paths`, { credentials: 'include' });
                if (!res.ok)
                    throw new Error('Failed to load paths');
                const data = await res.json();
                const paths: LearningPath[] = data.paths ?? [];
                const slugLower = decodeURIComponent(pathSlug).toLowerCase().trim();
                const found = paths.find((p) => slugify(p.title) === slugLower || p.id === pathSlug) ?? paths.find((p) => slugify(p.title) === slugLower.replace(/-/g, ' '));
                setPath(found ?? null);
            }
            catch (err) {
                setError(err instanceof Error ? err.message : 'Something went wrong');
            }
            finally {
                setLoading(false);
            }
        };
        fetchPaths();
    }, [orgShortId, pathSlug]);
    useEffect(() => {
        if (!orgShortId || !pathSlug || !path)
            return;
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        const slug = encodeURIComponent(pathSlug);
        fetch(`${base}/api/organizations/${orgShortId}/onboarding/paths/${slug}/content`, { credentials: 'include' })
            .then((res) => (res.ok ? res.json() : null))
            .then((data) => {
            if (data?.documentation) {
                const doc = data.documentation;
                setContentDoc({
                    title: doc.title,
                    documentation: doc.documentation || {},
                    code_references: (doc.code_references ?? []) as (string | CodeReferenceDetail)[],
                });
            }
            else {
                setContentDoc(null);
            }
        })
            .catch(() => setContentDoc(null));
    }, [orgShortId, pathSlug, path?.id]);
    useEffect(() => {
        if (!contentDoc?.documentation?.sections) {
            setDocumentation(null);
            return;
        }
        setDocumentation({
            title: contentDoc.title || path?.title || '',
            sections: contentDoc.documentation.sections,
            code_references: contentDoc.code_references || [],
        });
    }, [contentDoc, path?.title, setDocumentation]);
    const handleCodeRefClick = useCallback((codeRefId: string) => {
        const el = document.getElementById(codeRefId);
        if (el)
            el.scrollIntoView({ behavior: 'smooth', block: 'start' });
        else
            document.getElementById('code-references-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, []);
    if (loading) {
        return (<div className="h-full flex flex-col overflow-y-auto custom-scrollbar py-6">
        <div className="max-w-screen-2xl mx-auto w-full px-6 flex-1 flex flex-col min-h-0">
          <div className="animate-pulse flex-1 flex flex-col">
            <div className="h-8 bg-white/10 rounded w-3/4 mb-6 flex-shrink-0"/>
            <div className="space-y-4 flex-1 flex flex-col">
              {Array.from({ length: 24 }).map((_, i) => (<div key={i} className="h-4 bg-white/10 rounded flex-shrink-0" style={{ width: i % 3 === 0 ? '100%' : i % 3 === 1 ? '83%' : '66%' }}/>))}
            </div>
          </div>
        </div>
      </div>);
    }
    if (error) {
        return (<div className="py-6">
        <div className="max-w-screen-2xl mx-auto w-full px-6">
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
            <p className="text-red-400 text-sm">{error}</p>
            <Link href={`/${orgShortId}/onboarding`} className="inline-block mt-3 text-sm text-white/70 hover:text-white">Back to Onboarding</Link>
          </div>
        </div>
      </div>);
    }
    if (!path) {
        return (<div className="py-6">
        <div className="max-w-screen-2xl mx-auto w-full px-6">
          <p className="text-white/60 mb-4">Learning path not found.</p>
          <Link href={`/${orgShortId}/onboarding`} className="text-sm text-[var(--color-primary)] hover:underline">Back to Onboarding</Link>
        </div>
      </div>);
    }
    const sortedModules = [...(path.modules ?? [])].sort((a, b) => a.order - b.order);
    const hasGeneratedContent = contentDoc?.documentation?.sections && contentDoc.documentation.sections.length > 0;
    return (<div className="py-6">
      <div className="max-w-screen-2xl mx-auto w-full px-6">
        <h1 className="text-3xl font-bold text-white mb-2">{path.title}</h1>
        {path.summaryDescription && <p className="text-white/70 text-lg leading-relaxed mb-8">{path.summaryDescription}</p>}
        <div className="border-t-2 border-white/20 mb-10"/>

        {hasGeneratedContent ? (<DocumentationContentBody content={contentDoc} onCodeRefClick={handleCodeRefClick}/>) : (<div className="space-y-12">
            {sortedModules.map((module, index) => (<div key={module.id} id={`section-${module.id}`} className="scroll-mt-6">
                {index > 0 && <div className="border-t-2 border-white/20 mb-12 mt-12"/>}
                <h2 className="text-2xl font-semibold text-white mb-3">{index + 1}. {module.name}</h2>
                <div className="prose prose-invert max-w-none">
                  <p className="text-white/85 leading-relaxed whitespace-pre-wrap">{module.summaryDescription || 'No description yet.'}</p>
                </div>
              </div>))}
          </div>)}

        
        <div className="mt-16 pt-12 border-t-2 border-white/20">
          {isCompleted ? (<div className="bg-green-500/10 border border-green-500/50 rounded-2xl p-8 text-center">
              <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                </svg>
              </div>
              <h3 className="text-xl font-bold text-white mb-2">You&apos;ve completed this path</h3>
              <p className="text-white/70 mb-6">Nice work. This path is marked complete for you.</p>
              <Link href={`/${orgShortId}/onboarding`} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--color-primary)] text-white text-sm font-semibold hover:bg-[var(--color-primary-light)] transition-colors">
                Back to Onboarding
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </Link>
            </div>) : (<div className="flex flex-col items-center text-center">
              <p className="text-white/60 text-sm mb-4">Done reading? Mark this path complete for yourself.</p>
              <button type="button" onClick={handleMarkComplete} disabled={isMarkingComplete} className="px-8 py-4 rounded-xl bg-[var(--color-primary)] text-white font-semibold hover:bg-[var(--color-primary-light)] disabled:opacity-70 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-[var(--color-primary)]/20 hover:scale-[1.02] active:scale-[0.98] inline-flex items-center gap-2">
                {isMarkingComplete ? (<>
                    <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>
                    Marking complete…
                  </>) : (<>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
                    </svg>
                    Mark as complete
                  </>)}
              </button>
            </div>)}
        </div>
      </div>
    </div>);
}
export default function OnboardingPathPage() {
    return <OnboardingPathContent />;
}
