'use client';
import { useKGState } from '../../../../../_lib/useKGState';
export const StatusBar = () => {
    const { graph, progress } = useKGState();
    const nodeCount = graph?.nodes.length ?? 0;
    const edgeCount = graph?.relationships.length ?? 0;
    const primaryLanguage = (() => {
        if (!graph)
            return null;
        const langs = graph.nodes.map(n => n.properties.language).filter(Boolean) as string[];
        if (langs.length === 0)
            return null;
        const counts = langs.reduce<Record<string, number>>((acc, lang) => { acc[lang] = (acc[lang] || 0) + 1; return acc; }, {});
        return Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
    })();
    const isRunning = progress.phase !== 'complete' && progress.phase !== 'idle';
    return (<footer className="flex items-center justify-between px-4 py-1.5 bg-[#0e0e11] border-t border-[#262626] text-[11px] shrink-0">
      
      <div className="flex items-center gap-3">
        {isRunning ? (<>
            <div className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-primary)] animate-pulse"/>
              <span className="text-[var(--color-primary-light)] font-medium">{progress.phase}</span>
            </div>
            <div className="w-24 h-0.5 bg-[#262626] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-300" style={{ width: `${progress.percent}%`, background: 'linear-gradient(90deg, #d56707, #f59f43)' }}/>
            </div>
            <span className="text-white/30">{progress.message}</span>
          </>) : (<div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"/>
            <span className="text-white/40">Ready</span>
          </div>)}
      </div>

      
      <div className="flex items-center gap-4">
        {graph && (<div className="flex items-center gap-3 text-white/30 font-mono">
            <span>{nodeCount} nodes</span>
            <span className="text-[#262626]">·</span>
            <span>{edgeCount} edges</span>
            {primaryLanguage && (<>
                <span className="text-[#262626]">·</span>
                <span>{primaryLanguage}</span>
              </>)}
          </div>)}
        <div className="flex items-center gap-1.5 pl-3 border-l border-[#262626]">
          <span className="text-[var(--color-primary)]/60 font-semibold tracking-wide">NeuroCode</span>
          <span className="text-white/20">Knowledge Graph</span>
        </div>
      </div>
    </footer>);
};
