'use client';
import { PipelineProgress } from '../../../../../_lib/useKGState';
interface LoadingOverlayProps {
    progress: PipelineProgress;
    onRetry?: () => void;
}
export const LoadingOverlay = ({ progress, onRetry }: LoadingOverlayProps) => {
    const isError = progress.phase === 'error';
    return (<div className="absolute inset-0 z-50 flex flex-col items-center justify-center" style={{ background: 'rgba(18,18,21,0.72)', backdropFilter: 'blur(3px)' }}>

      
      {!isError && (<div className="absolute top-0 left-0 right-0 h-0.5 bg-white/5">
          <div className="h-full transition-all duration-700 ease-out" style={{
                width: `${progress.percent}%`,
                background: 'linear-gradient(90deg, #d56707, #f59f43)',
            }}/>
        </div>)}

      
      <div className="flex flex-col items-center gap-4 px-8 py-7 rounded-2xl border border-white/[0.08] shadow-2xl" style={{ background: 'rgba(15,15,18,0.95)', minWidth: 280 }}>

        {isError ? (<>
            <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/25 flex items-center justify-center">
              <span className="text-red-400 text-base font-bold">✕</span>
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-white/80 mb-1">Build failed</p>
              <p className="text-xs text-white/35 font-mono leading-relaxed max-w-[220px]">{progress.message}</p>
            </div>
            <div className="flex gap-2 mt-1">
              {onRetry && (<button onClick={onRetry} className="px-4 py-1.5 text-xs font-medium rounded-lg transition-colors" style={{ background: '#d56707', color: '#fff' }}>
                  Retry
                </button>)}
              <button onClick={() => window.history.back()} className="px-4 py-1.5 text-xs font-medium rounded-lg border border-white/10 text-white/50 hover:text-white/80 hover:bg-white/[0.05] transition-colors">
                Go back
              </button>
            </div>
          </>) : (<>
            
            <div className="relative w-10 h-10">
              <div className="absolute inset-0 rounded-full border-2 border-white/[0.06]"/>
              <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{
                borderTopColor: '#d56707',
                animationDuration: '1.4s',
            }}/>
              
              <svg className="absolute inset-0 m-auto w-4 h-4" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="3" r="1.5" fill="#d56707"/>
                <circle cx="13" cy="11" r="1.5" fill="#ed8a2e"/>
                <circle cx="3" cy="11" r="1.5" fill="#f59f43"/>
                <line x1="8" y1="3" x2="13" y2="11" stroke="#d56707" strokeWidth="1" strokeOpacity="0.6"/>
                <line x1="8" y1="3" x2="3" y2="11" stroke="#d56707" strokeWidth="1" strokeOpacity="0.6"/>
                <line x1="13" y1="11" x2="3" y2="11" stroke="#d56707" strokeWidth="1" strokeOpacity="0.4"/>
              </svg>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium text-white/80 mb-1">Building knowledge graph</p>
              <p className="text-xs text-white/35 font-mono">{progress.message}</p>
            </div>

            
            <div className="w-full h-1 bg-white/[0.06] rounded-full overflow-hidden">
              <div className="h-full rounded-full transition-all duration-500 ease-out" style={{
                width: `${Math.max(4, progress.percent)}%`,
                background: 'linear-gradient(90deg, #d56707, #f59f43)',
            }}/>
            </div>
            <p className="text-[11px] font-mono text-[#d56707] -mt-2">{progress.percent}%</p>
          </>)}
      </div>
    </div>);
};
