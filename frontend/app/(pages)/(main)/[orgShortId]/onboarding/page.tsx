'use client';
import { useRouter, useParams } from 'next/navigation';
import LoadingSpinner from '@/app/components/LoadingSpinner';
import { useRef, useState, useEffect } from 'react';
import { slugify } from '@/lib/utils/slug';
import { getOnboardingProgress } from '@/lib/onboarding/progress';
interface OrgPath {
    id: string;
    title: string;
    summaryDescription: string;
    modules: {
        id: string;
        name: string;
        summaryDescription: string;
        order: number;
    }[];
}
function PathCard({ path, status, onOpen, }: {
    path: OrgPath;
    status: 'waiting' | 'inProgress' | 'completed';
    onOpen: () => void;
}) {
    const moduleCount = path.modules?.length ?? 0;
    return (<div onClick={onOpen} className="bg-[#262626]/50 border border-[#262626] rounded-lg p-4 hover:border-[var(--color-primary)]/50 hover:bg-[#262626]/70 transition-all cursor-pointer">
      <div className="flex items-start justify-between mb-2">
        <h4 className="text-base font-semibold text-white flex-1">{path.title}</h4>
        <span className="text-xs px-2 py-1 rounded bg-[#262626] text-white/60">
          {moduleCount} module{moduleCount !== 1 ? 's' : ''}
        </span>
      </div>
      <p className="text-sm text-white/70 mb-3 line-clamp-2">{path.summaryDescription}</p>
      <div className="flex items-center justify-between mt-3">
        {status === 'completed' && (<span className="text-xs px-3 py-1.5 rounded bg-green-500/20 text-green-400">✓ Completed</span>)}
        {status !== 'completed' && (<button type="button" onClick={(e) => { e.stopPropagation(); onOpen(); }} className="text-xs px-3 py-1.5 rounded bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] text-white transition-colors font-medium cursor-pointer">
            {status === 'inProgress' ? 'Continue' : 'Start'}
          </button>)}
      </div>
    </div>);
}
function LearningPathCarouselCard({ path, progress, orgShortId, onOpen, showTopBanner = false, }: {
    path: OrgPath;
    progress: Record<string, {
        status?: string;
    }>;
    orgShortId: string;
    onOpen: () => void;
    showTopBanner?: boolean;
}) {
    return (<div role="button" tabIndex={0} onClick={onOpen} onKeyDown={(e) => e.key === 'Enter' && onOpen()} className="flex-shrink-0 w-80 bg-[#262626]/50 border border-[#262626] rounded-lg overflow-hidden hover:border-[var(--color-primary)]/50 hover:bg-[#262626]/70 transition-all group cursor-pointer">
      {showTopBanner && (<div className="relative h-32 bg-gradient-to-br from-[#262626] to-[#1a1a1a]"/>)}
      <div className="p-4 flex flex-col">
        <h3 className="text-base font-semibold text-white mb-2 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors">{path.title}</h3>
        <p className="text-sm text-white/70 line-clamp-2 flex-1">{path.summaryDescription}</p>
        <div className="mt-3 flex items-center justify-between">
          <span className="text-xs text-white/50">{path.modules?.length ?? 0} modules</span>
          <span className="text-xs px-2 py-1 rounded bg-[var(--color-primary)]/20 text-[var(--color-primary)]">
            {progress[path.id]?.status === 'completed' ? 'Done' : progress[path.id]?.status === 'started' ? 'Continue' : 'Start'}
          </span>
        </div>
      </div>
    </div>);
}
export default function OnboardingPage() {
    const router = useRouter();
    const params = useParams();
    const orgShortId = params?.orgShortId as string;
    const carouselRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [startX, setStartX] = useState(0);
    const [scrollLeft, setScrollLeft] = useState(0);
    const [hasMoved, setHasMoved] = useState(false);
    const [showSetup, setShowSetup] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const [setupStep, setSetupStep] = useState(0);
    const [experience, setExperience] = useState('');
    const [role, setRole] = useState('');
    const [teamSize, setTeamSize] = useState('');
    const [learningStyle, setLearningStyle] = useState('');
    const [interests, setInterests] = useState<string[]>([]);
    const [isTransitioning, setIsTransitioning] = useState(false);
    const [generatingText, setGeneratingText] = useState('Analyzing repository structure...');
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [dotCount, setDotCount] = useState(0);
    const [showPathsModal, setShowPathsModal] = useState(false);
    const [isPathsModalMounted, setIsPathsModalMounted] = useState(false);
    const [suggestedPaths, setSuggestedPaths] = useState<{
        id: string;
        title: string;
        summaryDescription: string;
        modules: {
            id: string;
            name: string;
            summaryDescription: string;
            order: number;
        }[];
    }[]>([]);
    const [selectedPathsToGenerate, setSelectedPathsToGenerate] = useState<string[]>([]);
    const [isGeneratingPaths, setIsGeneratingPaths] = useState(false);
    const [pathsGenProgress, setPathsGenProgress] = useState(0);
    const [isFetchingSuggestions, setIsFetchingSuggestions] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [suggestedPathsError, setSuggestedPathsError] = useState<string | null>(null);
    const [orgPaths, setOrgPaths] = useState<OrgPath[]>([]);
    const [orgPathsLoading, setOrgPathsLoading] = useState(false);
    const [generatedPathIds, setGeneratedPathIds] = useState<string[]>([]);
    const [generatedPathsLoading, setGeneratedPathsLoading] = useState(true);
    useEffect(() => {
        if (!orgShortId)
            return;
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        fetch(`${base}/api/organizations/${orgShortId}/onboarding/generated-paths`, { credentials: 'include' })
            .then((res) => res.ok ? res.json() : { pathIds: [] })
            .then((data) => setGeneratedPathIds(data.pathIds ?? []))
            .catch(() => setGeneratedPathIds([]))
            .finally(() => setGeneratedPathsLoading(false));
    }, [orgShortId]);
    useEffect(() => {
        if (!orgShortId || generatedPathIds.length === 0) {
            setOrgPaths([]);
            return;
        }
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        fetch(`${base}/api/organizations/${orgShortId}/onboarding/suggested-paths`, { credentials: 'include' })
            .then((res) => res.ok ? res.json() : { paths: [] })
            .then((data) => {
            const paths: OrgPath[] = data.paths ?? [];
            setOrgPaths(paths.filter((p) => generatedPathIds.includes(p.id)));
        })
            .catch(() => setOrgPaths([]));
    }, [orgShortId, generatedPathIds]);
    const progress = typeof window !== 'undefined' ? getOnboardingProgress(orgShortId) : {};
    const waitingPaths = orgPaths.filter((p) => !progress[p.id]);
    const inProgressPaths = orgPaths.filter((p) => progress[p.id]?.status === 'started');
    const completedPaths = orgPaths.filter((p) => progress[p.id]?.status === 'completed');
    const hasInProgress = inProgressPaths.length > 0;
    const allCompleted = orgPaths.length > 0 && completedPaths.length === orgPaths.length;
    const overallProgressPercent = orgPaths.length > 0 ? Math.round((completedPaths.length / orgPaths.length) * 100) : 0;
    const hasGeneratedPaths = generatedPathIds.length > 0;
    const carouselPaths = hasInProgress ? inProgressPaths : waitingPaths;
    useEffect(() => {
        if (!showPathsModal || !orgShortId)
            return;
        setIsPathsModalMounted(true);
        setShowSuggestions(false);
        setSuggestedPathsError(null);
        setIsFetchingSuggestions(true);
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        function doRefresh() {
            return fetch(`${base}/api/organizations/${orgShortId}/onboarding/suggested-paths/refresh`, {
                method: 'POST',
                credentials: 'include',
            })
                .then((res) => {
                if (!res.ok)
                    return res.json().then((b) => { throw new Error(b?.error || 'Refresh failed'); });
                return res.json();
            })
                .then((data) => {
                const paths = data.paths ?? [];
                setSuggestedPaths(paths);
                setSelectedPathsToGenerate(paths.map((p: {
                    id: string;
                }) => p.id));
                setIsFetchingSuggestions(false);
                if (paths.length > 0)
                    setTimeout(() => setShowSuggestions(true), 50);
            })
                .catch((err) => {
                setSuggestedPathsError(err?.message || 'Could not generate suggestions');
                setIsFetchingSuggestions(false);
            });
        }
        fetch(`${base}/api/organizations/${orgShortId}/onboarding/suggested-paths`, { credentials: 'include' })
            .then((res) => {
            if (!res.ok)
                throw new Error(res.status === 401 ? 'Not authenticated' : res.status === 403 ? 'Access denied' : 'Failed to load');
            return res.json();
        })
            .then((data) => {
            const paths = data.paths ?? [];
            if (paths.length > 0) {
                setSuggestedPaths(paths);
                setSelectedPathsToGenerate(paths.map((p: {
                    id: string;
                }) => p.id));
                setIsFetchingSuggestions(false);
                setTimeout(() => setShowSuggestions(true), 50);
            }
            else {
                doRefresh();
            }
        })
            .catch((err) => {
            setSuggestedPathsError(err?.message || 'Could not load suggestions');
            setIsFetchingSuggestions(false);
        });
    }, [showPathsModal, orgShortId]);
    const refreshSuggestions = () => {
        if (!orgShortId)
            return;
        setShowSuggestions(false);
        setSuggestedPathsError(null);
        setIsFetchingSuggestions(true);
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        fetch(`${base}/api/organizations/${orgShortId}/onboarding/suggested-paths/refresh`, {
            method: 'POST',
            credentials: 'include',
        })
            .then((res) => {
            if (!res.ok)
                return res.json().then((b) => { throw new Error(b?.error || 'Refresh failed'); });
            return res.json();
        })
            .then((data) => {
            const paths = data.paths ?? [];
            setSuggestedPaths(paths);
            setSelectedPathsToGenerate(paths.map((p: {
                id: string;
            }) => p.id));
            setIsFetchingSuggestions(false);
            if (paths.length > 0)
                setTimeout(() => setShowSuggestions(true), 50);
        })
            .catch((err) => {
            setSuggestedPathsError(err?.message || 'Could not refresh suggestions');
            setIsFetchingSuggestions(false);
        });
    };
    const handleGeneratePaths = async () => {
        const selected = suggestedPaths.filter((p) => selectedPathsToGenerate.includes(p.id));
        if (selected.length === 0)
            return;
        const base = typeof window !== 'undefined' ? window.location.origin : '';
        try {
            const res = await fetch(`${base}/api/organizations/${orgShortId}/onboarding/paths/draft`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ pathIds: selected.map((p) => p.id) }),
            });
            const data = await res.json().catch(() => ({}));
            if (data.pathIds?.length)
                setGeneratedPathIds((prev) => [...new Set([...prev, ...data.pathIds])]);
        }
        catch {
        }
        setShowPathsModal(false);
        const first = selected[0];
        router.push(`/${orgShortId}/onboarding/${slugify(first.title)}`);
    };
    useEffect(() => {
        const t = setTimeout(() => setIsMounted(true), 50);
        return () => clearTimeout(t);
    }, []);
    const goToNextStep = () => {
        setIsTransitioning(true);
        setTimeout(() => {
            setSetupStep(s => s + 1);
            setIsTransitioning(false);
        }, 400);
    };
    useEffect(() => {
        if (setupStep === 5) {
            setLoadingProgress(0);
            const progressInterval = setInterval(() => {
                setLoadingProgress((prev) => {
                    if (prev < 60)
                        return prev + Math.random() * 15;
                    if (prev < 85)
                        return prev + Math.random() * 5;
                    return prev;
                });
            }, 500);
            const dotInterval = setInterval(() => {
                setDotCount((prev) => (prev + 1) % 4);
            }, 400);
            const texts = [
                'Analyzing repository structure...',
                'Mapping architectural dependencies...',
                'Extracting code ownership data...',
                'Crafting your personalized path...',
                'Ready to dive in!'
            ];
            let i = 0;
            const textInterval = setInterval(() => {
                i++;
                if (i < texts.length) {
                    setGeneratingText(texts[i]);
                }
                else {
                    clearInterval(textInterval);
                    clearInterval(progressInterval);
                    clearInterval(dotInterval);
                    setLoadingProgress(100);
                    setTimeout(() => setShowSetup(false), 800);
                }
            }, 1000);
            return () => {
                clearInterval(textInterval);
                clearInterval(progressInterval);
                clearInterval(dotInterval);
            };
        }
    }, [setupStep]);
    const toggleInterest = (id: string) => {
        setInterests(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
    };
    const navigateToTaskCompass = () => {
        router.push(`/${orgShortId}/task-compass`);
    };
    const navigateToHotZones = () => {
        router.push(`/${orgShortId}/hot-zones`);
    };
    const scrollCarousel = (direction: 'left' | 'right') => {
        if (carouselRef.current) {
            const scrollAmount = 400;
            const currentScroll = carouselRef.current.scrollLeft;
            const newScroll = direction === 'left'
                ? currentScroll - scrollAmount
                : currentScroll + scrollAmount;
            carouselRef.current.scrollTo({
                left: newScroll,
                behavior: 'smooth',
            });
        }
    };
    const handleMouseDown = (e: React.MouseEvent) => {
        if (!carouselRef.current)
            return;
        setIsDragging(true);
        setHasMoved(false);
        setStartX(e.pageX - carouselRef.current.offsetLeft);
        setScrollLeft(carouselRef.current.scrollLeft);
    };
    const handleMouseLeave = () => {
        setIsDragging(false);
        setHasMoved(false);
        if (carouselRef.current) {
            carouselRef.current.style.cursor = '';
        }
    };
    const handleMouseUp = () => {
        setIsDragging(false);
        setHasMoved(false);
        if (carouselRef.current) {
            carouselRef.current.style.cursor = '';
        }
    };
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !carouselRef.current)
            return;
        const x = e.pageX - carouselRef.current.offsetLeft;
        const walk = x - startX;
        if (Math.abs(walk) > 5) {
            if (!hasMoved) {
                setHasMoved(true);
                carouselRef.current.style.cursor = 'grabbing';
            }
            e.preventDefault();
            carouselRef.current.scrollLeft = scrollLeft - walk;
        }
    };
    const handleTouchStart = (e: React.TouchEvent) => {
        if (!carouselRef.current)
            return;
        setIsDragging(true);
        setHasMoved(false);
        setStartX(e.touches[0].pageX - carouselRef.current.offsetLeft);
        setScrollLeft(carouselRef.current.scrollLeft);
    };
    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging || !carouselRef.current)
            return;
        const x = e.touches[0].pageX - carouselRef.current.offsetLeft;
        const walk = x - startX;
        if (Math.abs(walk) > 5) {
            setHasMoved(true);
            carouselRef.current.scrollLeft = scrollLeft - walk;
        }
    };
    const handleTouchEnd = () => {
        setIsDragging(false);
        setHasMoved(false);
    };
    return (<>
      {showSetup && (<div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-700 ease-out ${isMounted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setShowSetup(false)} role="dialog" aria-modal="true">
          <div className={`relative bg-[#121215] border border-[#262626] rounded-2xl w-full max-w-[1000px] min-h-[600px] flex overflow-hidden shadow-2xl transition-all duration-700 delay-100 ease-out transform ${isMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`} onClick={(e) => e.stopPropagation()}>
            
            <div className="w-[320px] bg-gradient-to-b from-white/[0.03] to-transparent border-r border-[#262626] p-8 hidden md:flex flex-col relative z-10 shrink-0">
              <div className="flex items-start gap-2 mb-10 text-white/60 text-sm">
                <svg className="w-5 h-5 text-white/50 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                <span>Get started by setting up your onboarding profile.</span>
              </div>
              
              <div className="relative flex-1 ml-2">
                
                <div className="absolute left-[15px] top-4 bottom-8 w-[1px] border-l border-dashed border-[#404040]"/>
                
                {[
                { id: 0, title: 'Role', desc: 'Define your focus area' },
                { id: 1, title: 'Experience', desc: 'Your technical background' },
                { id: 2, title: 'Team Size', desc: 'Collaboration style' },
                { id: 3, title: 'Learning Style', desc: 'How you absorb info' },
                { id: 4, title: 'Interests', desc: 'What to explore first' }
            ].map((step, idx) => {
                const isActive = setupStep === step.id;
                const isPast = setupStep > step.id;
                return (<div key={step.id} className="relative flex gap-5 mb-8 last:mb-0">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center relative z-10 transition-colors duration-300 ${isActive ? 'bg-[var(--color-primary)]/10 border-2 border-[var(--color-primary)] text-[var(--color-primary)]' :
                        isPast ? 'bg-[#262626] text-white/60 border border-[#404040]' :
                            'bg-[#121215] border border-[#262626] text-white/40'}`}>
                        {isPast ? (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/></svg>) : isActive ? (<svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6"/></svg>) : (<span className="text-xs font-medium">{idx + 1}</span>)}
                      </div>
                      <div className={`pt-1.5 transition-opacity duration-300 ${isActive ? 'opacity-100' : isPast ? 'opacity-70' : 'opacity-40'}`}>
                        <div className={`text-sm font-semibold mb-1 ${isActive ? 'text-white' : 'text-white/80'}`}>{step.title}</div>
                        <div className="text-xs text-white/50 leading-relaxed">{step.desc}</div>
                      </div>
                    </div>);
            })}
              </div>
            </div>

            
            <div className="flex-1 relative bg-[#121215] flex flex-col">
              
              <button type="button" onClick={() => setShowSetup(false)} className="absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>

              <div className={`flex-1 p-12 flex flex-col transition-all duration-400 transform ${isTransitioning ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>
                
                {setupStep < 5 && (<div className="text-[var(--color-primary)] text-xs font-bold tracking-widest mb-6 uppercase">
                    STEP {setupStep + 1} OF 5
                  </div>)}

                {setupStep === 0 && (<div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-3">Let's get you onboarded</h2>
                      <p className="text-white/60 mb-10 text-sm leading-relaxed max-w-lg">What is your role? This helps us focus on the code and context you'll need most.</p>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                    { id: 'frontend', title: 'Frontend Engineer' },
                    { id: 'backend', title: 'Backend Engineer' },
                    { id: 'fullstack', title: 'Fullstack Engineer' },
                    { id: 'devops', title: 'DevOps / SRE' },
                    { id: 'product', title: 'Product Manager' },
                    { id: 'data', title: 'Data Scientist' },
                ].map((opt) => (<button key={opt.id} onClick={() => setRole(opt.id)} className={`p-4 text-center rounded-xl border transition-all duration-200 group hover:-translate-y-1 cursor-pointer ${role === opt.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10 text-white'
                        : 'border-[#262626] hover:border-[#404040] bg-[#262626]/50 text-white/70'}`}>
                            <div className="font-medium text-sm">{opt.title}</div>
                          </button>))}
                      </div>
                    </div>
                    
                    <div className="mt-10 pt-6 border-t border-[#262626] flex justify-start">
                      <button onClick={goToNextStep} disabled={!role} className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg transition-all hover:bg-[var(--color-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed">
                        Save and continue
                      </button>
                    </div>
                  </div>)}

                {setupStep === 1 && (<div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-3">Experience with this stack?</h2>
                      <p className="text-white/60 mb-10 text-sm leading-relaxed max-w-lg">We'll adjust the depth of our explanations accordingly.</p>
                      <div className="space-y-3">
                        {[
                    { id: 'new', title: 'Brand new', desc: 'I need the basics and foundational concepts' },
                    { id: 'familiar', title: 'Somewhat familiar', desc: 'I know the tech, just need to see how it\'s used here' },
                    { id: 'expert', title: 'Expert', desc: 'Just show me the architecture and where things live' }
                ].map((opt) => (<button key={opt.id} onClick={() => setExperience(opt.id)} className={`w-full p-4 text-left rounded-xl border transition-all duration-200 flex items-center justify-between group cursor-pointer ${experience === opt.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[#262626] hover:border-[#404040] bg-[#262626]/50'}`}>
                            <div>
                              <div className="font-medium text-white mb-1">{opt.title}</div>
                              <div className="text-sm text-white/50">{opt.desc}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${experience === opt.id ? 'border-[var(--color-primary)]' : 'border-[#404040]'}`}>
                              {experience === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]"/>}
                            </div>
                          </button>))}
                      </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-[#262626] flex justify-start">
                      <button onClick={goToNextStep} disabled={!experience} className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg transition-all hover:bg-[var(--color-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed">
                        Save and continue
                      </button>
                    </div>
                  </div>)}

                {setupStep === 2 && (<div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-3">What size team are you joining?</h2>
                      <p className="text-white/60 mb-10 text-sm leading-relaxed max-w-lg">This helps us customize our recommendations on team communication and PRs.</p>
                      <div className="space-y-3">
                        {[
                    { id: 'solo', title: 'Just me / Solo contributor', desc: 'I am taking full ownership' },
                    { id: 'small', title: 'Small team (2-5)', desc: 'Tight-knit, agile development' },
                    { id: 'medium', title: 'Medium team (6-15)', desc: 'Established processes and review cycles' },
                    { id: 'large', title: 'Large organization (15+)', desc: 'Complex cross-team collaboration' }
                ].map((opt) => (<button key={opt.id} onClick={() => setTeamSize(opt.id)} className={`w-full p-4 text-left rounded-xl border transition-all duration-200 flex items-center justify-between group cursor-pointer ${teamSize === opt.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[#262626] hover:border-[#404040] bg-[#262626]/50'}`}>
                            <div>
                              <div className="font-medium text-white mb-1">{opt.title}</div>
                              <div className="text-sm text-white/50">{opt.desc}</div>
                            </div>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center ${teamSize === opt.id ? 'border-[var(--color-primary)]' : 'border-[#404040]'}`}>
                              {teamSize === opt.id && <div className="w-2.5 h-2.5 rounded-full bg-[var(--color-primary)]"/>}
                            </div>
                          </button>))}
                      </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-[#262626] flex justify-start">
                      <button onClick={goToNextStep} disabled={!teamSize} className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg transition-all hover:bg-[var(--color-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed">
                        Save and continue
                      </button>
                    </div>
                  </div>)}

                {setupStep === 3 && (<div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-3">How do you prefer to learn?</h2>
                      <p className="text-white/60 mb-10 text-sm leading-relaxed max-w-lg">We'll tailor your onboarding tasks to match your style.</p>
                      <div className="grid grid-cols-2 gap-4">
                        {[
                    { id: 'docs', title: 'Read Documentation', desc: 'Give me the high-level theory first' },
                    { id: 'code', title: 'Dive into Code', desc: 'Let me read the implementation' },
                    { id: 'tasks', title: 'Hands-on Tasks', desc: 'Give me small bugs to fix' },
                    { id: 'visual', title: 'Visual Diagrams', desc: 'Show me the architecture' }
                ].map((opt) => (<button key={opt.id} onClick={() => setLearningStyle(opt.id)} className={`p-4 text-left rounded-xl border transition-all duration-200 group hover:-translate-y-1 cursor-pointer ${learningStyle === opt.id
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                        : 'border-[#262626] hover:border-[#404040] bg-[#262626]/50'}`}>
                            <div className="font-medium text-white mb-1">{opt.title}</div>
                            <div className="text-xs text-white/50">{opt.desc}</div>
                          </button>))}
                      </div>
                    </div>

                    <div className="mt-10 pt-6 border-t border-[#262626] flex justify-start">
                      <button onClick={goToNextStep} disabled={!learningStyle} className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg transition-all hover:bg-[var(--color-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed">
                        Save and continue
                      </button>
                    </div>
                  </div>)}

                {setupStep === 4 && (<div className="flex flex-col h-full">
                    <div className="flex-1">
                      <h2 className="text-3xl font-bold text-white mb-3">What do you want to explore first?</h2>
                      <p className="text-white/60 mb-10 text-sm leading-relaxed max-w-lg">Select up to 3 areas of interest (Optional)</p>
                      <div className="flex flex-wrap gap-3">
                        {[
                    'Authentication', 'Database Schema', 'API Gateway',
                    'Component Library', 'CI/CD Pipeline', 'State Management',
                    'Testing Strategy', 'Deployment Structure'
                ].map((topic) => (<button key={topic} onClick={() => toggleInterest(topic)} className={`px-4 py-2 rounded-full border transition-all duration-200 cursor-pointer text-sm ${interests.includes(topic)
                        ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/20 text-white'
                        : 'border-[#262626] hover:border-[#404040] bg-transparent text-white/70'}`}>
                            {topic}
                          </button>))}
                      </div>
                    </div>
                    
                    <div className="mt-10 pt-6 border-t border-[#262626] flex justify-start">
                      <button onClick={goToNextStep} className="px-6 py-2.5 bg-[var(--color-primary)] text-white text-sm font-medium rounded-lg transition-all hover:bg-[var(--color-primary-light)] flex items-center gap-2 cursor-pointer">
                        Generate Path
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14m-7-7l7 7-7 7"/>
                        </svg>
                      </button>
                    </div>
                  </div>)}

                {setupStep === 5 && (<div className="flex flex-col items-center justify-center flex-1 py-12">
                    <div className="mb-8 scale-[0.8] origin-center">
                      <LoadingSpinner />
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-4 w-64 text-center">
                      Preparing your workspace
                      <span className="inline-block text-left" style={{ width: '24px' }}>
                        {'.'.repeat(dotCount)}
                      </span>
                    </h3>
                    <p className="text-sm text-white/50 mb-4 text-center max-w-xs">{generatingText}</p>
                    <div className="w-64 h-1.5 bg-[#212121] rounded-full overflow-hidden border border-white/5 relative">
                      <div className="absolute top-0 left-0 h-full bg-[var(--color-primary)] rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}/>
                    </div>
                  </div>)}

              </div>
            </div>
          </div>
        </div>)}

      {showPathsModal && (<div className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md transition-all duration-500 ease-out ${isPathsModalMounted ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => !isGeneratingPaths && setShowPathsModal(false)} role="dialog" aria-modal="true">
          <div className={`relative bg-[#121215] border border-[#262626] rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl transition-all duration-500 delay-100 ease-out transform ${isPathsModalMounted ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-8 scale-95'}`} onClick={(e) => e.stopPropagation()}>
            
            {!isGeneratingPaths && (<button type="button" onClick={() => setShowPathsModal(false)} className="absolute top-6 right-6 z-10 w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" aria-label="Close">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>)}

            <div className="flex flex-col h-full overflow-hidden">
              {isGeneratingPaths ? (<div className="flex flex-col items-center justify-center flex-1 py-16 px-8 md:px-10 min-h-[400px]">
                  <div className="mb-8 scale-[0.8] origin-center">
                    <LoadingSpinner />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 w-72 text-center">
                    Generating your paths
                    <span className="inline-block text-left" style={{ width: '24px' }}>
                      {'.'.repeat(Math.floor(pathsGenProgress / 20) % 4)}
                    </span>
                  </h3>
                  <p className="text-sm text-white/50 mb-8 text-center max-w-sm">
                    Analyzing repositories, mapping dependencies, and generating structured modules...
                  </p>
                  <div className="w-72 h-1.5 bg-[#212121] rounded-full overflow-hidden border border-white/5 relative">
                    <div className="absolute top-0 left-0 h-full bg-[var(--color-primary)] rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.min(100, Math.max(0, pathsGenProgress))}%` }}/>
                  </div>
                </div>) : isFetchingSuggestions ? (<div className="flex flex-col items-center justify-center flex-1 py-16 px-8 md:px-10 min-h-[400px]">
                  <div className="mb-8 scale-[0.8] origin-center">
                    <LoadingSpinner />
                  </div>
                  <h3 className="text-xl font-bold text-white mb-4 w-72 text-center">
                    Analyzing repositories
                  </h3>
                  <p className="text-sm text-white/50 mb-8 text-center max-w-sm">
                    Discovering the best learning paths for your team...
                  </p>
                </div>) : suggestedPathsError ? (<div className="flex flex-col items-center justify-center flex-1 py-16 px-8 md:px-10 min-h-[400px]">
                  <p className="text-white/70 mb-4 text-center">{suggestedPathsError}</p>
                  <button onClick={refreshSuggestions} className="px-4 py-2 rounded-lg text-sm font-medium bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer">
                    Try again
                  </button>
                </div>) : suggestedPaths.length === 0 ? (<div className="flex flex-col items-center justify-center flex-1 py-16 px-8 md:px-10 min-h-[400px]">
                  <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Suggested Learning Paths</h2>
                  <p className="text-white/60 text-sm text-center max-w-md mb-8">
                    No suggestions yet. Generate onboarding paths based on your organization and repositories.
                  </p>
                  <button onClick={refreshSuggestions} className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)] transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                    </svg>
                    Generate suggestions
                  </button>
                </div>) : (<div className="flex flex-col h-full overflow-hidden">
                  
                  <div className="shrink-0 p-8 md:p-10 pb-6 border-b border-[#262626]">
                    <h2 className="text-2xl font-bold text-white tracking-tight mb-2">Suggested Learning Paths</h2>
                    <div className="flex items-center justify-between">
                      <p className="text-white/60 text-sm leading-relaxed pr-8">
                        Based on your organization's connected repositories, we recommend drafting these foundational paths.
                      </p>
                      <button onClick={refreshSuggestions} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-white/50 bg-[#262626]/50 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer shrink-0" title="Re-analyze repositories">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                        Refresh
                      </button>
                    </div>
                  </div>

                  
                  <div className="flex-1 overflow-y-auto px-8 py-4 md:px-10 md:py-6 custom-scrollbar">
                    <div className="space-y-4">
                      {suggestedPaths.map((path, index) => (<label key={path.id} className={`group relative flex items-start p-5 rounded-2xl cursor-pointer transition-all duration-500 ease-out transform ${showSuggestions ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'} ${selectedPathsToGenerate.includes(path.id)
                        ? 'bg-[var(--color-primary)]/10 ring-1 ring-[var(--color-primary)]/50'
                        : 'bg-[#262626] hover:bg-[#333333] ring-1 ring-[#262626]'}`} style={{ transitionDelay: `${index * 100}ms` }}>
                          <div className="flex-1 pr-12">
                            <div className="flex items-center gap-3 mb-2">
                              <span className={`font-semibold text-base transition-colors ${selectedPathsToGenerate.includes(path.id) ? 'text-white' : 'text-white/90 group-hover:text-white'}`}>
                                {path.title}
                              </span>
                              <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#262626] text-white/60">
                                {path.modules?.length ?? 0} modules
                              </span>
                            </div>
                            <p className={`text-sm leading-relaxed transition-colors ${selectedPathsToGenerate.includes(path.id) ? 'text-white/70' : 'text-white/50 group-hover:text-white/60'}`}>
                              {path.summaryDescription}
                            </p>
                          </div>
                          
                          <div className="absolute right-5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center transition-all duration-300 ${selectedPathsToGenerate.includes(path.id)
                        ? 'bg-[var(--color-primary)] scale-110 shadow-lg shadow-[var(--color-primary)]/20'
                        : 'bg-[#262626] group-hover:bg-[#333]'}`}>
                              <svg className={`w-3.5 h-3.5 transition-all duration-300 ${selectedPathsToGenerate.includes(path.id) ? 'text-white opacity-100 scale-100' : 'text-transparent opacity-0 scale-50'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                              </svg>
                            </div>
                          </div>

                          <input type="checkbox" className="hidden" checked={selectedPathsToGenerate.includes(path.id)} onChange={() => {
                        setSelectedPathsToGenerate(prev => prev.includes(path.id)
                            ? prev.filter(p => p !== path.id)
                            : [...prev, path.id]);
                    }}/>
                        </label>))}
                    </div>
                  </div>

                  
                  <div className="shrink-0 p-6 md:px-10 border-t border-[#262626] bg-[#121215] flex items-center justify-between mt-auto">
                    <button onClick={() => setShowPathsModal(false)} className="px-5 py-2.5 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-white/5 transition-colors cursor-pointer">
                      Cancel
                    </button>
                    <button onClick={handleGeneratePaths} disabled={selectedPathsToGenerate.length === 0} className="px-6 py-2.5 rounded-lg text-sm font-semibold bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-light)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer shadow-lg shadow-[var(--color-primary)]/20">
                      Draft {selectedPathsToGenerate.length} Path{selectedPathsToGenerate.length !== 1 ? 's' : ''}
                    </button>
                  </div>
                </div>)}
            </div>
          </div>
        </div>)}

      <div className={`mx-auto max-w-screen-2xl ${showSetup || showPathsModal ? 'opacity-20 pointer-events-none blur-sm' : ''} transition-all duration-500`}>
        <div className="min-h-full py-10 text-white">
          
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">Onboarding</h1>
            <p className="text-white/60">Guides and learning paths for this organization.</p>
          </div>

          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <button onClick={navigateToTaskCompass} className="bg-orange-400/20 backdrop-blur-sm border border-orange-400/50 rounded-lg p-6 hover:border-orange-400/80 hover:bg-orange-400/30 transition-all text-left group cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-400/30 rounded-lg text-orange-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Task Compass</h3>
              </div>
              <p className="text-sm text-white/70 mb-4">Discover recommended tasks based on your role and experience level</p>
              <div className="flex items-center text-sm text-orange-300 group-hover:gap-2 transition-all">
                <span>Explore</span>
                <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </button>
            <button onClick={navigateToHotZones} className="bg-orange-400/20 backdrop-blur-sm border border-orange-400/50 rounded-lg p-6 hover:border-orange-400/80 hover:bg-orange-400/30 transition-all text-left group cursor-pointer">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-orange-400/30 rounded-lg text-orange-300">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-white">Hot Zones</h3>
              </div>
              <p className="text-sm text-white/70 mb-4">Identify active areas in the codebase with recent changes and high activity</p>
              <div className="flex items-center text-sm text-orange-300 group-hover:gap-2 transition-all">
                <span>Explore</span>
                <svg className="w-4 h-4 ml-1 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </div>
            </button>
          </div>

          {!generatedPathsLoading && hasGeneratedPaths ? (<>
              
              {!allCompleted && (<>
                  <div className="flex items-center gap-4 mb-8">
                    <div className="bg-[#262626]/50 border border-[#262626] rounded-lg px-4 py-2">
                      <div className="text-xs text-white/50 mb-1">Overall Progress</div>
                      <div className="flex items-center gap-3">
                        <div className="w-32 bg-[#262626] rounded-full h-2">
                          <div className="bg-[var(--color-primary)] h-2 rounded-full transition-all" style={{ width: `${overallProgressPercent}%` }}/>
                        </div>
                        <span className="text-sm font-semibold text-white">{overallProgressPercent}%</span>
                      </div>
                    </div>
                  </div>

                  <section className="mb-8">
                    <div className="bg-[#121215] border border-[#262626] rounded-lg p-6">
                      <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold text-white">
                          {hasInProgress ? 'Continue learning' : 'Start learning'}
                        </h2>
                        <div className="flex items-center gap-2">
                          <button onClick={() => scrollCarousel('left')} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 flex items-center justify-center transition-colors cursor-pointer" aria-label="Scroll left">
                            <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/></svg>
                          </button>
                          <button onClick={() => scrollCarousel('right')} className="w-10 h-10 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-light)] border border-[var(--color-primary)]/50 flex items-center justify-center transition-colors cursor-pointer" aria-label="Scroll right">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/></svg>
                          </button>
                        </div>
                      </div>
                      <div ref={carouselRef} className="flex gap-6 overflow-x-auto hide-scrollbar pb-4 select-none" onMouseDown={handleMouseDown} onMouseLeave={handleMouseLeave} onMouseUp={handleMouseUp} onMouseMove={handleMouseMove} onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
                        {carouselPaths.map((path) => (<LearningPathCarouselCard key={path.id} path={path} progress={progress} orgShortId={orgShortId} onOpen={() => !hasMoved && router.push(`/${orgShortId}/onboarding/${slugify(path.title)}`)} showTopBanner={false}/>))}
                      </div>
                    </div>
                  </section>
                </>)}

              <section className="mb-8">
                <div className="mb-4">
                  <h2 className="text-xl font-semibold text-white mb-1">Your Learning Path</h2>
                  <p className="text-sm text-white/50">Track your progress through your org&apos;s learning paths</p>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-amber-400"/>
                      <h3 className="text-base font-semibold text-white">Not started ({waitingPaths.length})</h3>
                    </div>
                    <div className="space-y-4">
                      {waitingPaths.map((path) => (<PathCard key={path.id} path={path} status="waiting" onOpen={() => router.push(`/${orgShortId}/onboarding/${slugify(path.title)}`)}/>))}
                      {waitingPaths.length === 0 && (<div className="bg-[#262626]/30 border border-[#262626] rounded-lg p-6 text-center">
                          <p className="text-white/50 text-sm">All paths started or completed</p>
                        </div>)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-[var(--color-primary)]"/>
                      <h3 className="text-base font-semibold text-white">In progress ({inProgressPaths.length})</h3>
                    </div>
                    <div className="space-y-4">
                      {inProgressPaths.map((path) => (<PathCard key={path.id} path={path} status="inProgress" onOpen={() => router.push(`/${orgShortId}/onboarding/${slugify(path.title)}`)}/>))}
                      {inProgressPaths.length === 0 && (<div className="bg-[#262626]/30 border border-[#262626] rounded-lg p-6 text-center">
                          <p className="text-white/50 text-sm">No paths in progress</p>
                        </div>)}
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-green-400"/>
                      <h3 className="text-base font-semibold text-white">Completed ({completedPaths.length})</h3>
                    </div>
                    <div className="space-y-4">
                      {completedPaths.map((path) => (<PathCard key={path.id} path={path} status="completed" onOpen={() => router.push(`/${orgShortId}/onboarding/${slugify(path.title)}`)}/>))}
                      {completedPaths.length === 0 && (<div className="bg-[#262626]/30 border border-[#262626] rounded-lg p-6 text-center">
                          <p className="text-white/50 text-sm">Complete a path and pass the quiz to see it here</p>
                        </div>)}
                    </div>
                  </div>
                </div>
              </section>
            </>) : (<section className="mb-8">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Learning Paths</h2>
                <p className="text-sm text-white/50">Structured guides to bring your team up to speed.</p>
              </div>

              <div className="max-w-2xl">
                <div className="relative overflow-hidden rounded-2xl border border-[#262626] bg-gradient-to-b from-[#262626] to-[#121215] group cursor-pointer flex flex-col" onClick={() => setShowPathsModal(true)}>
                  
                  <div className="absolute -top-24 -right-24 w-48 h-48 bg-[var(--color-primary)]/20 rounded-full blur-3xl group-hover:bg-[var(--color-primary)]/30 transition-all duration-500"></div>
                  
                  <div className="p-8 flex-1 flex flex-col relative z-10">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--color-primary)] to-orange-600 flex items-center justify-center text-white mb-6 shadow-lg shadow-[var(--color-primary)]/20 group-hover:scale-105 transition-transform duration-300">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"/>
                      </svg>
                    </div>
                    
                    <h3 className="text-xl font-bold text-white mb-3 tracking-tight">Generate Learning Paths</h3>
                    <p className="text-sm text-white/60 mb-8 leading-relaxed flex-1 pr-4">
                      Build canonical onboarding flows for the entire team. We'll map your repositories and draft structured modules covering architecture, local setup, and contributing guidelines.
                    </p>
                    
                    <div className="inline-flex items-center text-sm font-semibold text-white/90 group-hover:text-[var(--color-primary)] transition-colors">
                      Start drafting
                      <svg className="w-4 h-4 ml-2 transform group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7"/>
                      </svg>
                    </div>
                  </div>
                </div>
              </div>
            </section>)}
        </div>
      </div>
    </>);
}
