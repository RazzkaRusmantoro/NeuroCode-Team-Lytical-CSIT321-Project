'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { RefreshCw } from 'lucide-react';
type RiskLevel = 'low' | 'medium' | 'high';
interface HotZone {
    repositoryId: string;
    repoUrlName: string;
    repositoryName: string;
    repoFullName: string | null;
    areaType: 'file' | 'module';
    areaName: string;
    filePath?: string;
    modulePath?: string;
    riskLevel: RiskLevel;
    whySensitive: string;
    recentActivityCount: number;
    lastMajorChange: string | null;
    frequentContributors: {
        name: string;
        commits: number;
    }[];
    additions?: number;
    deletions?: number;
}
interface HotZonesDashboardProps {
    orgShortId: string;
    repositories: {
        id: string;
        name: string;
        urlName: string;
        hasUrlName: boolean;
    }[];
}
function useDebouncedValue<T>(value: T, delayMs: number) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const t = setTimeout(() => setDebounced(value), delayMs);
        return () => clearTimeout(t);
    }, [value, delayMs]);
    return debounced;
}
function riskLevelStyles(level: RiskLevel) {
    switch (level) {
        case 'high':
            return {
                badgeBg: 'bg-red-500/15 border-red-500/40 text-red-300',
                chipBg: 'bg-red-500/10 text-red-300',
            };
        case 'medium':
            return {
                badgeBg: 'bg-amber-400/15 border-amber-400/40 text-amber-200',
                chipBg: 'bg-amber-400/10 text-amber-200',
            };
        case 'low':
        default:
            return {
                badgeBg: 'bg-emerald-500/15 border-emerald-500/40 text-emerald-200',
                chipBg: 'bg-emerald-500/10 text-emerald-200',
            };
    }
}
export default function HotZonesDashboard({ orgShortId, repositories }: HotZonesDashboardProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [hotZones, setHotZones] = useState<HotZone[]>([]);
    const [repoMenuOpen, setRepoMenuOpen] = useState(false);
    const repoMenuRef = useRef<HTMLDivElement>(null);
    const [selectedRepos, setSelectedRepos] = useState<string[]>([]);
    const [taskQuery, setTaskQuery] = useState('');
    const debouncedTaskQuery = useDebouncedValue(taskQuery, 250);
    const [suggestedFiles, setSuggestedFiles] = useState<string[]>([]);
    const [suggestedSymbols, setSuggestedSymbols] = useState<{
        filePath: string;
        symbol: string;
    }[]>([]);
    const [suggestionsLoading, setSuggestionsLoading] = useState(false);
    const [pinnedFiles, setPinnedFiles] = useState<string[]>([]);
    const [refreshingRepos, setRefreshingRepos] = useState(false);
    const [hotzonesVersion, setHotzonesVersion] = useState(0);
    useEffect(() => {
        let isMounted = true;
        const fetchHotZones = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await fetch(`/api/organizations/org-${encodeURIComponent(orgShortId)}/hot-zones`);
                if (!response.ok) {
                    const data = await response.json().catch(() => ({}));
                    throw new Error(data?.message || data?.error || 'Failed to load Hot Zones');
                }
                const data = await response.json();
                if (!isMounted)
                    return;
                setHotZones(Array.isArray(data.hotZones) ? data.hotZones : []);
            }
            catch (err) {
                if (!isMounted)
                    return;
                setError(err instanceof Error ? err.message : 'Unexpected error while loading Hot Zones');
            }
            finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };
        if (orgShortId) {
            fetchHotZones();
        }
        return () => {
            isMounted = false;
        };
    }, [orgShortId, hotzonesVersion]);
    useEffect(() => {
        if (!repoMenuOpen)
            return;
        const onClick = (e: MouseEvent) => {
            if (repoMenuRef.current && !repoMenuRef.current.contains(e.target as Node)) {
                setRepoMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', onClick);
        return () => document.removeEventListener('mousedown', onClick);
    }, [repoMenuOpen]);
    useEffect(() => {
        let isMounted = true;
        const run = async () => {
            const q = debouncedTaskQuery.trim();
            if (!q) {
                setSuggestedFiles([]);
                setSuggestedSymbols([]);
                setSuggestionsLoading(false);
                return;
            }
            try {
                setSuggestionsLoading(true);
                const res = await fetch(`/api/organizations/org-${encodeURIComponent(orgShortId)}/hot-zones/recommend-areas`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        query: q,
                        repoUrlNames: selectedRepos.length > 0 ? selectedRepos : undefined,
                        topN: 8,
                    }),
                });
                if (!res.ok) {
                    setSuggestedFiles([]);
                    setSuggestedSymbols([]);
                    return;
                }
                const data = await res.json().catch(() => ({}));
                if (!isMounted)
                    return;
                const files = Array.isArray(data?.files) ? data.files : [];
                const symbols = Array.isArray(data?.symbols) ? data.symbols : [];
                setSuggestedFiles(files
                    .map((f: any) => (typeof f?.file_path === 'string' ? f.file_path : ''))
                    .filter(Boolean)
                    .slice(0, 8));
                setSuggestedSymbols(symbols
                    .map((s: any) => ({
                    filePath: typeof s?.file_path === 'string' ? s.file_path : '',
                    symbol: typeof s?.symbol === 'string' ? s.symbol : '',
                }))
                    .filter((s: any) => s.filePath && s.symbol)
                    .slice(0, 8));
            }
            finally {
                if (isMounted)
                    setSuggestionsLoading(false);
            }
        };
        run();
        return () => {
            isMounted = false;
        };
    }, [debouncedTaskQuery, orgShortId, selectedRepos]);
    const availableRepos = useMemo(() => {
        return repositories
            .map(r => ({
            repoUrlName: r.urlName,
            label: r.name,
            disabled: !r.hasUrlName,
        }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [repositories]);
    const normalizedQuery = useMemo(() => debouncedTaskQuery.trim().toLowerCase(), [debouncedTaskQuery]);
    const filteredHotZones = useMemo(() => {
        let zones = hotZones.slice();
        if (selectedRepos.length > 0) {
            const allow = new Set(selectedRepos);
            zones = zones.filter(z => allow.has(z.repoUrlName));
        }
        if (normalizedQuery) {
            zones = zones.filter(z => {
                const contributorNames = (z.frequentContributors || []).map(c => c.name).join(' ');
                const haystack = `${z.areaName} ${z.filePath ?? ''} ${z.modulePath ?? ''} ${z.repositoryName ?? ''} ${z.repoFullName ?? ''} ${z.whySensitive ?? ''} ${contributorNames}`.toLowerCase();
                return haystack.includes(normalizedQuery);
            });
        }
        if (pinnedFiles.length > 0) {
            const allow = new Set(pinnedFiles);
            zones = zones.filter(z => z.filePath && allow.has(z.filePath));
        }
        zones.sort((a, b) => {
            const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
            const riskDiff = order[a.riskLevel] - order[b.riskLevel];
            if (riskDiff !== 0)
                return riskDiff;
            return (b.recentActivityCount ?? 0) - (a.recentActivityCount ?? 0);
        });
        return zones;
    }, [hotZones, selectedRepos, normalizedQuery, pinnedFiles]);
    const handleCardClick = (zone: HotZone) => {
        if (!zone.repoUrlName)
            return;
        router.push(`/org-${orgShortId}/repo/${zone.repoUrlName}`);
    };
    const formatDate = (iso: string | null) => {
        if (!iso)
            return 'Unknown';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime()))
            return 'Unknown';
        return d.toLocaleDateString();
    };
    return (<div className="mx-auto max-w-screen-2xl">
      <div className="flex items-baseline justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Hot Zones</h1>
          <p className="text-sm text-white/60 max-w-2xl">
            High-activity, high-impact areas in this organization&apos;s codebase.
          </p>
        </div>
      </div>

      
      <div className="mb-6 flex flex-col gap-3">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex-1 flex flex-col sm:flex-row gap-3">
            
            <div className="relative flex-1 min-w-[240px]">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/50 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input value={taskQuery} onChange={e => setTaskQuery(e.target.value)} placeholder='Search' className="w-full pl-10 pr-3 py-2 bg-[#121215] border border-[#262626] rounded text-white text-sm placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"/>
            </div>

            
            <div className="relative" ref={repoMenuRef}>
              <button type="button" onClick={() => setRepoMenuOpen(o => !o)} className="w-full sm:w-auto inline-flex items-center justify-between gap-2 px-3 py-2 bg-[#121215] border border-[#262626] rounded text-sm text-white/80 hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer min-w-[220px]">
                <span className="truncate">
                  {selectedRepos.length === 0
            ? 'All repositories'
            : `${selectedRepos.length} repos selected`}
                </span>
                <svg className={`w-4 h-4 transition-transform ${repoMenuOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                </svg>
              </button>

              {repoMenuOpen && (<div className="absolute z-20 mt-2 w-full sm:w-[320px] rounded border border-[#262626] bg-[#121215] shadow-lg overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2 border-b border-[#262626]">
                    <p className="text-xs text-white/60">Scope repositories</p>
                    <button type="button" onClick={() => setSelectedRepos([])} className="text-xs text-[var(--color-primary)] hover:opacity-80 cursor-pointer" disabled={selectedRepos.length === 0}>
                      Clear
                    </button>
                  </div>
                  <div className="max-h-64 overflow-y-auto custom-scrollbar p-2">
                    {availableRepos.length === 0 ? (<div className="px-3 py-2 text-sm text-white/60">No repositories found</div>) : (availableRepos.map(repo => {
                const checked = selectedRepos.includes(repo.repoUrlName);
                return (<label key={repo.repoUrlName} className="flex items-center gap-2 px-3 py-2 rounded hover:bg-white/5 cursor-pointer">
                            <Checkbox checked={checked} disabled={repo.disabled} onCheckedChange={() => {
                        if (repo.disabled)
                            return;
                        setSelectedRepos(prev => {
                            if (prev.includes(repo.repoUrlName)) {
                                return prev.filter(r => r !== repo.repoUrlName);
                            }
                            return [...prev, repo.repoUrlName];
                        });
                    }}/>
                            <span className={`text-sm truncate ${repo.disabled ? 'text-white/40' : 'text-white/80'}`}>
                              {repo.label}
                            </span>
                            {repo.disabled && (<span className="text-[11px] text-white/35">(missing urlName)</span>)}
                          </label>);
            }))}
                  </div>
                </div>)}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={() => {
            setSelectedRepos([]);
            setTaskQuery('');
            setPinnedFiles([]);
        }} className="px-3 py-2 rounded border border-[#262626] bg-[#121215] text-sm text-white/70 hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer" disabled={selectedRepos.length === 0 && taskQuery.trim().length === 0 && pinnedFiles.length === 0}>
              Clear filters
            </button>
            <button type="button" onClick={async () => {
            try {
                setRefreshingRepos(true);
                await fetch(`/api/organizations/org-${encodeURIComponent(orgShortId)}/repositories/revalidate`, { method: 'POST' });
                setHotzonesVersion(v => v + 1);
            }
            finally {
                setRefreshingRepos(false);
                router.refresh();
            }
        }} className="inline-flex items-center gap-2 px-3 py-2 rounded border border-[#262626] bg-[#121215] text-sm text-white/70 hover:text-white hover:bg-[#1a1a1a] transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed" disabled={refreshingRepos} title="Refresh repository list">
              <RefreshCw className={`w-4 h-4 ${refreshingRepos ? 'animate-spin' : ''}`}/>
              {refreshingRepos ? 'Refreshing…' : 'Refresh'}
            </button>
          </div>
        </div>

        
        {normalizedQuery && (<div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/50">Suggested files/classes:</span>
            {suggestionsLoading ? (<span className="text-xs text-white/60">Searching…</span>) : (<>
                {suggestedFiles.length > 0 ? (suggestedFiles.map(filePath => (<button key={filePath} type="button" onClick={() => setPinnedFiles(prev => prev.includes(filePath) ? prev : [...prev, filePath])} className="px-2 py-1 rounded-full border border-[#262626] bg-white/5 text-xs text-white/70 hover:text-white hover:bg-white/10 cursor-pointer" title="Pin this file">
                      {filePath}
                    </button>))) : (<span className="text-xs text-white/60">No file suggestions yet.</span>)}

                {suggestedSymbols.length > 0 &&
                    suggestedSymbols.map(s => (<span key={`${s.filePath}::${s.symbol}`} className="px-2 py-1 rounded-full border border-[#262626] bg-white/5 text-xs text-white/55" title={s.filePath}>
                      {s.symbol}
                    </span>))}
              </>)}
          </div>)}

        {pinnedFiles.length > 0 && (<div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-white/50">Pinned files:</span>
            {pinnedFiles.map(fp => (<button key={fp} type="button" onClick={() => setPinnedFiles(prev => prev.filter(x => x !== fp))} className="px-2 py-1 rounded-full border border-[#262626] bg-[var(--color-primary)]/10 text-xs text-[var(--color-primary)] hover:bg-[var(--color-primary)]/15 cursor-pointer" title="Remove pinned file">
                {fp} ×
              </button>))}
            <button type="button" onClick={() => setPinnedFiles([])} className="text-xs text-white/60 hover:text-white cursor-pointer">
              Clear pinned
            </button>
          </div>)}
      </div>

      {loading && (<div className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map(i => (<div key={i} className="h-52 rounded border border-[#262626] bg-[#121215] animate-pulse">
              <div className="h-full w-full bg-gradient-to-br from-white/5 via-transparent to-white/5"/>
            </div>))}
        </div>)}

      {!loading && error && (<div className="mt-10 rounded border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>)}

      {!loading && !error && hotZones.length === 0 && (<div className="mt-10 rounded border border-[#262626] bg-[#171717]/60 px-6 py-10 text-center">
          <h2 className="text-lg font-semibold text-white mb-2">No Hot Zones yet</h2>
          <p className="text-sm text-white/60">
            Once repositories in this organization start seeing activity, we&apos;ll surface
            the most sensitive areas here.
          </p>
        </div>)}

      {!loading && !error && hotZones.length > 0 && (<div className="mt-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredHotZones.map(zone => {
                const styles = riskLevelStyles(zone.riskLevel);
                const contributors = zone.frequentContributors && zone.frequentContributors.length > 0
                    ? zone.frequentContributors
                    : [];
                return (<button key={`${zone.repoUrlName}:${zone.areaType}:${zone.filePath ?? zone.modulePath ?? zone.areaName}`} type="button" onClick={() => handleCardClick(zone)} className="group relative flex h-full min-h-[12rem] flex-col overflow-hidden rounded border border-[#262626] bg-[#121215] p-4 text-left transition-all duration-300 hover:border-[var(--color-primary)]/60 hover:shadow-[0_0_25px_rgba(0,0,0,0.6)] cursor-pointer">
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[var(--color-primary)]/0 via-transparent to-[var(--color-primary)]/0 group-hover:from-[var(--color-primary)]/10 group-hover:to-transparent transition-colors duration-300"/>

                  <div className="relative flex items-start justify-between gap-2">
                    <div>
                      <div className="inline-flex items-center gap-2 rounded-full border px-2.5 py-1 text-xs font-medium uppercase tracking-wide text-white/70 border-white/10 bg-white/5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--color-primary)]"/>
                        {zone.repositoryName}
                      </div>
                      {zone.repoFullName && (<p className="mt-2 text-xs text-white/40">
                          {zone.repoFullName}
                        </p>)}
                    </div>

                    <div className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${styles.badgeBg}`}>
                      <span className={`inline-block h-1.5 w-1.5 rounded-full ${zone.riskLevel === 'high'
                        ? 'bg-red-400'
                        : zone.riskLevel === 'medium'
                            ? 'bg-amber-300'
                            : 'bg-emerald-300'}`}/>
                      <span className="capitalize">{zone.riskLevel} risk</span>
                    </div>
                  </div>

                  <p className="relative mt-3 text-xs font-semibold text-white line-clamp-2">
                    {zone.areaName}
                  </p>
                  <p className="relative mt-2 line-clamp-3 text-xs text-white/70">
                    {zone.whySensitive}
                  </p>

                  <div className="relative mt-4 grid grid-cols-2 gap-3 text-xs">
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-white/40">
                        Recent activity (last 30 days)
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {zone.recentActivityCount ?? 0} commits
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] uppercase tracking-wide text-white/40">
                        Last major change
                      </p>
                      <p className="text-sm font-semibold text-white">
                        {formatDate(zone.lastMajorChange)}
                      </p>
                    </div>
                  </div>

                  <div className="relative mt-4 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      {contributors.length > 0 ? (contributors.map(contributor => (<span key={contributor.name} className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${styles.chipBg}`}>
                            {contributor.name} · {contributor.commits}
                          </span>))) : (<span className="text-[11px] text-white/45">
                          Owners will appear once we see commit activity.
                        </span>)}
                    </div>

                    <span className="text-[11px] font-medium text-[var(--color-primary)] opacity-80 group-hover:opacity-100">
                      View repository →
                    </span>
                  </div>
                </button>);
            })}
        </div>)}
    </div>);
}
