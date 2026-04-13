'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { GitBranch, Compass, Flame, GraduationCap, ArrowRight, Network, BookOpen, Clock, ChevronRight, CheckCircle2, Circle, Sparkles, Share2, GitPullRequest, TreePine, } from 'lucide-react';
import { getOnboardingProgress } from '@/lib/onboarding/progress';
import { slugify } from '@/lib/utils/slug';
interface Repo {
    id: string;
    name: string;
    urlName: string;
    description: string | null;
    lastUpdate: string | null;
    source: string;
}
interface DashboardClientProps {
    userName: string;
    orgSegment: string;
    orgName: string;
    repos: Repo[];
}
interface OnboardingPathItem {
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
function getGreeting(name: string): string {
    const h = new Date().getHours();
    const part = h < 12 ? 'morning' : h < 17 ? 'afternoon' : 'evening';
    return `Good ${part}, ${name.split(' ')[0]}`;
}
function relativeTime(iso: string | null): string {
    if (!iso)
        return 'Never synced';
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 2)
        return 'Just now';
    if (m < 60)
        return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `${h}h ago`;
    const d = Math.floor(h / 24);
    if (d < 30)
        return `${d}d ago`;
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function formatDate(): string {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}
const FEATURES = [
    { id: 'repositories', label: 'Repositories', description: 'Manage connected repos', Icon: GitBranch, color: '#f59f43', bg: 'rgba(245,159,67,0.10)', border: 'rgba(245,159,67,0.22)' },
    { id: 'task-compass', label: 'Task Compass', description: 'AI-guided task navigation', Icon: Compass, color: '#ed8a2e', bg: 'rgba(237,138,46,0.08)', border: 'rgba(237,138,46,0.18)' },
    { id: 'hot-zones', label: 'Hot Zones', description: 'High-risk areas in your codebase', Icon: Flame, color: '#ea680c', bg: 'rgba(234,104,12,0.08)', border: 'rgba(234,104,12,0.18)' },
    { id: 'onboarding', label: 'Onboarding', description: 'Learn the codebase step by step', Icon: GraduationCap, color: '#d56707', bg: 'rgba(213,103,7,0.08)', border: 'rgba(213,103,7,0.18)' },
] as const;
function FeatureCard({ feature, href }: {
    feature: typeof FEATURES[number];
    href: string;
}) {
    const router = useRouter();
    const { Icon, label, description, color, bg, border } = feature;
    return (<button onClick={() => router.push(href)} className="group flex flex-col gap-3 p-4 rounded-xl border text-left transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.99]" style={{ backgroundColor: bg, borderColor: border }}>
            <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                    <Icon className="w-4 h-4" style={{ color }}/>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-white/20 group-hover:text-white/50 group-hover:translate-x-0.5 transition-all"/>
            </div>
            <div>
                <p className="text-sm font-semibold text-white/90">{label}</p>
                <p className="text-xs text-white/40 mt-0.5 leading-snug">{description}</p>
            </div>
        </button>);
}
function DocumentationCard({ orgSegment, repos }: {
    orgSegment: string;
    repos: Repo[];
}) {
    const router = useRouter();
    const sorted = [...repos].sort((a, b) => (b.lastUpdate ?? '').localeCompare(a.lastUpdate ?? ''));
    const preview = sorted.slice(0, 6);
    return (<div className="bg-[#111113] border border-[#1e1e1e] rounded-xl p-6 flex flex-col gap-4 min-h-[320px] h-full">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,159,67,0.12)', border: '1px solid rgba(245,159,67,0.22)' }}>
                    <BookOpen className="w-5 h-5" style={{ color: '#f59f43' }}/>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-base font-semibold text-white">Documentation</h3>
                        <span className="text-xs font-mono text-white/35">{repos.length} repo{repos.length === 1 ? '' : 's'}</span>
                    </div>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed max-w-xl">
                        Open generated docs for any connected repository. Sync status reflects the last time we pulled from your source.
                    </p>
                </div>
                <button onClick={() => router.push(`/${orgSegment}/repositories`)} className="shrink-0 text-[11px] text-white/25 hover:text-white/60 flex items-center gap-1 transition-colors">
                    Repos <ChevronRight className="w-3 h-3"/>
                </button>
            </div>
            {repos.length === 0 ? (<div className="flex-1 flex flex-col items-center justify-center rounded-xl border border-dashed border-white/[0.06] py-10 px-4">
                    <p className="text-sm text-white/35 text-center mb-3">Connect a repository to generate documentation.</p>
                    <button type="button" onClick={() => router.push(`/${orgSegment}/repositories`)} className="text-xs px-3 py-2 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 text-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/15 transition-colors">
                        Go to repositories
                    </button>
                </div>) : (<div className="flex-1 flex flex-col gap-2 min-h-0">
                    <p className="text-[10px] font-semibold text-white/25 uppercase tracking-wider">Recent</p>
                    <div className="flex flex-col gap-1.5 flex-1 overflow-hidden">
                        {preview.map((repo) => (<button key={repo.id} type="button" onClick={() => router.push(`/${orgSegment}/repo/${repo.urlName}/documentation`)} className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all text-left group">
                                <GitBranch className="w-4 h-4 shrink-0 text-[var(--color-primary)]/80"/>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-white/90 truncate">{repo.name}</p>
                                    <p className="text-[10px] text-white/30 mt-0.5 font-mono truncate">/{repo.urlName}</p>
                                </div>
                                <div className="flex items-center gap-1.5 shrink-0 text-[10px] text-white/25 font-mono">
                                    <Clock className="w-3 h-3"/>
                                    <span>{relativeTime(repo.lastUpdate)}</span>
                                </div>
                                <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors shrink-0"/>
                            </button>))}
                    </div>
                </div>)}
        </div>);
}
function VisualTreeCard({ orgSegment }: {
    orgSegment: string;
}) {
    const router = useRouter();
    const features = [
        { label: 'Visual Tree', description: 'Interactive codebase map', Icon: TreePine, color: '#f59f43', href: `/${orgSegment}/repositories` },
        { label: 'UML Diagrams', description: 'Architecture diagrams', Icon: Share2, color: '#ed8a2e', href: `/${orgSegment}/repositories` },
        { label: 'PR Analysis', description: 'AI-powered review insights', Icon: GitPullRequest, color: '#ea680c', href: `/${orgSegment}/repositories` },
        { label: 'Hot Zones', description: 'High-risk file detection', Icon: Flame, color: '#d56707', href: `/${orgSegment}/hot-zones` },
    ];
    return (<div className="bg-[#111113] border border-[#1e1e1e] rounded-xl p-6 flex flex-col gap-4 min-h-[320px] h-full">
            <div className="flex items-start gap-3">
                <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0" style={{ background: 'rgba(245,159,67,0.12)', border: '1px solid rgba(245,159,67,0.22)' }}>
                    <Sparkles className="w-5 h-5" style={{ color: '#f59f43' }}/>
                </div>
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-white">In-repo tools</h3>
                    <p className="text-xs text-white/40 mt-1 leading-relaxed max-w-xl">
                        Jump into maps, diagrams, reviews, and risk views. Pick a repo from Repositories when a screen asks for context.
                    </p>
                </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 flex-1 auto-rows-fr">
                {features.map(({ label, description, Icon, color, href }) => (<button key={label} type="button" onClick={() => router.push(href)} className="flex flex-col items-stretch gap-2 p-4 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/[0.05] hover:border-white/[0.1] transition-all text-left group min-h-[100px]">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}18` }}>
                                <Icon className="w-4 h-4" style={{ color }}/>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/15 group-hover:text-white/40 transition-colors shrink-0 ml-auto"/>
                        </div>
                        <div>
                            <p className="text-sm font-semibold text-white/85">{label}</p>
                            <p className="text-xs text-white/35 mt-1 leading-snug">{description}</p>
                        </div>
                    </button>))}
            </div>
        </div>);
}
interface HotZoneItem {
    areaName: string;
    filePath?: string;
    riskLevel: 'low' | 'medium' | 'high';
    recentActivityCount: number;
}
function hotZoneMeta(level: 'low' | 'medium' | 'high') {
    if (level === 'high')
        return { color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' };
    if (level === 'medium')
        return { color: '#fb923c', bg: 'rgba(251,146,60,0.08)', border: 'rgba(251,146,60,0.2)' };
    return { color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' };
}
function HotZonesPreview({ orgSegment }: {
    orgSegment: string;
}) {
    const router = useRouter();
    const [zones, setZones] = useState<HotZoneItem[]>([]);
    const [loading, setLoading] = useState(true);
    useEffect(() => {
        fetch(`/api/organizations/${orgSegment}/hot-zones`, { credentials: 'include' })
            .then((r) => r.ok ? r.json() : { hotZones: [] })
            .then((data) => setZones(Array.isArray(data.hotZones) ? data.hotZones.slice(0, 3) : []))
            .catch(() => setZones([]))
            .finally(() => setLoading(false));
    }, [orgSegment]);
    return (<div className="bg-[#111113] border border-[#1e1e1e] rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-orange-400"/>
                <h3 className="text-sm font-semibold text-white/80">Hot Zones</h3>
                <span className="text-[10px] text-white/25 ml-1">Top risk areas</span>
                <button onClick={() => router.push(`/${orgSegment}/hot-zones`)} className="ml-auto text-[11px] text-white/25 hover:text-white/60 flex items-center gap-1 transition-colors">
                    View all <ChevronRight className="w-3 h-3"/>
                </button>
            </div>
            {loading ? (<div className="flex flex-col gap-2">
                    {[0, 1, 2].map((i) => (<div key={i} className="h-9 rounded-lg bg-white/[0.03] animate-pulse"/>))}
                </div>) : zones.length === 0 ? (<p className="text-xs text-white/25 py-3 text-center">No hot zones detected yet.</p>) : (<div className="flex flex-col gap-2">
                    {zones.map((zone, i) => {
                const { color, bg, border } = hotZoneMeta(zone.riskLevel);
                const label = zone.filePath ?? zone.areaName;
                return (<div key={i} className="flex items-center gap-3 px-3 py-2.5 rounded-lg border" style={{ backgroundColor: bg, borderColor: border }}>
                                <span className="text-[11px] font-mono text-white/20 w-4 shrink-0">#{i + 1}</span>
                                <span className="text-xs font-mono text-white/70 flex-1 truncate">{label}</span>
                                <div className="flex items-center gap-1.5 shrink-0">
                                    <Flame className="w-3 h-3" style={{ color }}/>
                                    <span className="text-xs font-mono" style={{ color }}>{zone.recentActivityCount}</span>
                                </div>
                                <span className="text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize shrink-0" style={{ color, backgroundColor: bg, borderColor: border }}>
                                    {zone.riskLevel}
                                </span>
                            </div>);
            })}
                </div>)}
        </div>);
}
function RepoCard({ repo, orgSegment }: {
    repo: Repo;
    orgSegment: string;
}) {
    const router = useRouter();
    const base = `/${orgSegment}/repo/${repo.urlName}`;
    return (<div onClick={() => router.push(base)} className="group relative flex flex-col border border-[#262626] rounded p-6 cursor-pointer overflow-hidden bg-[#262626]/50 transition-all duration-300 hover:border-[var(--color-primary)]/50" onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = 'rgba(var(--color-primary-rgb), 0.3) 0px 0px 25px';
            e.currentTarget.style.transform = 'translateY(-2px)';
        }} onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
        }}>
            <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[var(--color-primary)] transition-colors duration-300 pr-6 truncate">
                {repo.name}
            </h3>

            <div className="w-fit inline-block pl-3 pr-7 py-1 rounded text-sm font-medium mb-3 bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                /{repo.urlName}
            </div>

            {repo.description
            ? <p className="text-sm text-white/70 mb-4 line-clamp-3 leading-relaxed">{repo.description}</p>
            : <p className="text-sm text-white/25 italic mb-4">No description</p>}

            <div className="flex-grow"/>

            <hr className="border-[#262626] mb-3 mt-2"/>

            <div className="flex items-center justify-between text-xs text-white/50">
                <div className="flex items-center gap-4" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => router.push(`${base}/knowledge-graph`)} className="flex items-center gap-1.5 hover:text-[var(--color-primary-light)] transition-colors">
                        <Network className="w-3.5 h-3.5"/> KG
                    </button>
                    <button onClick={() => router.push(`${base}/documentation`)} className="flex items-center gap-1.5 hover:text-[var(--color-primary-light)] transition-colors">
                        <BookOpen className="w-3.5 h-3.5"/> Docs
                    </button>
                </div>
                <div className="flex items-center gap-1 font-mono">
                    <Clock className="w-3 h-3"/>
                    <span>{relativeTime(repo.lastUpdate)}</span>
                </div>
            </div>

            <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/0 to-[var(--color-primary)]/0 group-hover:from-[var(--color-primary)]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none rounded"/>
        </div>);
}
function OnboardingCard({ orgSegment, paths, progress, loading }: {
    orgSegment: string;
    paths: OnboardingPathItem[];
    progress: Record<string, {
        status: string;
        completedAt?: string;
    }>;
    loading: boolean;
}) {
    const router = useRouter();
    const completed = paths.filter((p) => progress[p.id]?.status === 'completed').length;
    const inProgress = paths.filter((p) => progress[p.id]?.status === 'started');
    const notStarted = paths.filter((p) => !progress[p.id]?.status);
    const pct = paths.length > 0 ? Math.round((completed / paths.length) * 100) : 0;
    return (<div className="bg-[#111113] border border-[#1e1e1e] rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <GraduationCap className="w-4 h-4" style={{ color: '#f59f43' }}/>
                <h3 className="text-sm font-semibold text-white/80">Onboarding</h3>
                <button onClick={() => router.push(`/${orgSegment}/onboarding`)} className="ml-auto text-[11px] text-white/25 hover:text-white/60 flex items-center gap-1 transition-colors">
                    View all <ChevronRight className="w-3 h-3"/>
                </button>
            </div>
            {loading ? (<p className="text-xs text-white/30 py-4 text-center">Loading…</p>) : paths.length === 0 ? (<div className="text-center py-4">
                    <p className="text-xs text-white/30 mb-3">No learning paths yet.</p>
                    <button onClick={() => router.push(`/${orgSegment}/onboarding`)} className="text-xs px-3 py-1.5 rounded-lg transition-colors" style={{ background: 'rgba(213,103,7,0.10)', border: '1px solid rgba(213,103,7,0.22)', color: '#f59f43' }}>
                        Get started
                    </button>
                </div>) : (<>
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #d56707, #f59f43)' }}/>
                        </div>
                        <span className="text-[11px] font-mono text-white/30">{pct}%</span>
                        <span className="text-[11px] text-white/25">{completed}/{paths.length}</span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                        {(inProgress.length > 0 ? inProgress : notStarted).slice(0, 3).map((path) => {
                const status = progress[path.id]?.status;
                const StatusIcon = status === 'completed' ? CheckCircle2 : status === 'started' ? Sparkles : Circle;
                const iconColor = status === 'completed' ? 'text-[var(--color-primary-light)]' : status === 'started' ? 'text-[var(--color-primary)]' : 'text-white/20';
                return (<button key={path.id} onClick={() => router.push(`/${orgSegment}/onboarding/${slugify(path.title)}`)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.05] border border-transparent hover:border-white/5 transition-all text-left">
                                    <StatusIcon className={`w-3.5 h-3.5 shrink-0 ${iconColor}`}/>
                                    <span className="text-xs text-white/60 truncate flex-1">{path.title}</span>
                                    <span className="text-[10px] text-white/20 shrink-0">{path.modules?.length ?? 0} modules</span>
                                </button>);
            })}
                    </div>
                </>)}
        </div>);
}
function StatPill({ label, value, onClick }: {
    label: string;
    value: string | number;
    onClick?: () => void;
}) {
    const cls = 'flex flex-col items-center px-4 py-2.5 rounded-xl border border-[#1e1e1e] bg-white/[0.02] min-w-[90px]';
    const inner = (<>
            <span className="text-lg font-bold text-white font-mono">{value}</span>
            <span className="text-[10px] text-white/30 mt-0.5">{label}</span>
        </>);
    return onClick
        ? <button onClick={onClick} className={`${cls} hover:border-[#2a2a2a] hover:bg-white/[0.04] transition-colors`}>{inner}</button>
        : <div className={cls}>{inner}</div>;
}
function SectionHeader({ title, subtitle, action }: {
    title: string;
    subtitle?: string;
    action?: {
        label: string;
        href: string;
    };
}) {
    const router = useRouter();
    return (<div className="flex items-baseline gap-2 mb-3">
            <h2 className="text-[11px] font-semibold text-white/30 uppercase tracking-widest">{title}</h2>
            {subtitle && <span className="text-xs text-white/20 font-mono">{subtitle}</span>}
            {action && (<button onClick={() => router.push(action.href)} className="ml-auto text-xs text-white/30 hover:text-white/60 flex items-center gap-1 transition-colors">
                    {action.label} <ArrowRight className="w-3 h-3"/>
                </button>)}
        </div>);
}
export default function DashboardClient({ userName, orgSegment, orgName, repos }: DashboardClientProps) {
    const router = useRouter();
    const [greeting, setGreeting] = useState('');
    const [dateStr, setDateStr] = useState('');
    const [onboardingPaths, setOnboardingPaths] = useState<OnboardingPathItem[]>([]);
    const [onboardingProgress, setOnboardingProgress] = useState<Record<string, {
        status: string;
        completedAt?: string;
    }>>({});
    const [onboardingLoading, setOnboardingLoading] = useState(true);
    useEffect(() => { setGreeting(getGreeting(userName)); setDateStr(formatDate()); }, [userName]);
    useEffect(() => {
        if (!orgSegment)
            return;
        setOnboardingProgress(getOnboardingProgress(orgSegment));
        const base = window.location.origin;
        fetch(`${base}/api/organizations/${orgSegment}/onboarding/generated-paths`, { credentials: 'include' })
            .then((r) => (r.ok ? r.json() : { pathIds: [] }))
            .then(async (data) => {
            const pathIds: string[] = data.pathIds ?? [];
            if (!pathIds.length)
                return;
            const s = await fetch(`${base}/api/organizations/${orgSegment}/onboarding/suggested-paths`, { credentials: 'include' });
            const { paths = [] } = s.ok ? await s.json() : {};
            setOnboardingPaths((paths as OnboardingPathItem[]).filter((p) => pathIds.includes(p.id)));
        })
            .catch(() => { })
            .finally(() => setOnboardingLoading(false));
    }, [orgSegment]);
    useEffect(() => {
        const onFocus = () => setOnboardingProgress(getOnboardingProgress(orgSegment));
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [orgSegment]);
    const featureRoutes: Record<string, string> = {
        repositories: `/${orgSegment}/repositories`,
        'task-compass': `/${orgSegment}/task-compass`,
        'hot-zones': `/${orgSegment}/hot-zones`,
        onboarding: `/${orgSegment}/onboarding`,
    };
    const recentRepo = [...repos].sort((a, b) => (b.lastUpdate ?? '').localeCompare(a.lastUpdate ?? ''))[0] ?? null;
    return (<div className="w-full max-w-screen-2xl mx-auto pb-24 pt-2 space-y-8">

            
            <div className="relative rounded-2xl border border-[#1e1e1e] bg-[#0d0d0f] overflow-hidden px-7 py-7">
                <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(ellipse at 15% 60%, rgba(213,103,7,0.07) 0%, transparent 55%)' }}/>
                <div className="relative flex flex-wrap items-start justify-between gap-6">
                    <div>
                        <p className="text-[11px] font-medium text-white/30 uppercase tracking-widest mb-1">{orgName}</p>
                        <h1 className="text-3xl font-bold text-white tracking-tight">{greeting}</h1>
                        <p className="text-sm text-white/40 mt-1">{dateStr}</p>
                    </div>
                    <div className="flex flex-wrap gap-3">
                        <StatPill label="Repositories" value={repos.length}/>
                        {recentRepo && <StatPill label="Last synced" value={relativeTime(recentRepo.lastUpdate)} onClick={() => router.push(`/${orgSegment}/repo/${recentRepo.urlName}`)}/>}
                        <StatPill label="Paths" value={onboardingLoading ? '…' : onboardingPaths.length}/>
                    </div>
                </div>
            </div>

            
            <section>
                <SectionHeader title="Features"/>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {FEATURES.map((f) => <FeatureCard key={f.id} feature={f} href={featureRoutes[f.id] ?? '/'}/>)}
                </div>
            </section>

            
            <section>
                <SectionHeader title="Analytics"/>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
                    <DocumentationCard orgSegment={orgSegment} repos={repos}/>
                    <VisualTreeCard orgSegment={orgSegment}/>
                </div>
            </section>

            
            <section>
                <SectionHeader title="Repositories" subtitle={`${repos.length} connected`}/>
                {repos.length === 0 ? (<div className="flex flex-col items-center justify-center py-12 rounded-xl border border-dashed border-[#1e1e1e] text-center gap-3">
                        <p className="text-sm text-white/30">No repositories connected yet.</p>
                        <button onClick={() => router.push(`/${orgSegment}/repositories`)} className="text-xs px-4 py-2 rounded-lg bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 text-[var(--color-primary-light)] hover:bg-[var(--color-primary)]/20 transition-colors">
                            Connect a repository
                        </button>
                    </div>) : (<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {repos.slice(0, 5).map((repo) => <RepoCard key={repo.id} repo={repo} orgSegment={orgSegment}/>)}
                        <button onClick={() => router.push(`/${orgSegment}/repositories`)} className="group flex flex-col items-center justify-center gap-3 border border-dashed border-[#333] rounded p-6 cursor-pointer transition-all duration-300 hover:border-[var(--color-primary)]/40 hover:bg-[var(--color-primary)]/5">
                            <div className="w-10 h-10 rounded-full flex items-center justify-center border border-[#333] group-hover:border-[var(--color-primary)]/40 transition-colors">
                                <ArrowRight className="w-4 h-4 text-white/25 group-hover:text-[var(--color-primary-light)] transition-colors"/>
                            </div>
                            <div className="text-center">
                                <p className="text-sm font-semibold text-white/35 group-hover:text-[var(--color-primary-light)] transition-colors">View all</p>
                                <p className="text-xs text-white/20 mt-0.5">{repos.length} repositories</p>
                            </div>
                        </button>
                    </div>)}
            </section>

            
            <section>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    <HotZonesPreview orgSegment={orgSegment}/>
                    <OnboardingCard orgSegment={orgSegment} paths={onboardingPaths} progress={onboardingProgress} loading={onboardingLoading}/>
                </div>
            </section>
        </div>);
}
