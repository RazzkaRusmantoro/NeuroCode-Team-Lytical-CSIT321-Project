'use client';
import ShowcasePageLayout from "../components/showcase/ShowcasePageLayout";
export default function KnowledgeGraphPage() {
    return (<ShowcasePageLayout eyebrow="Product preview" title="Knowledge graph" titleAccent="across the repo" breadcrumbCurrent="Knowledge Graph" description="Graph views connect files, exports, and external systems. Filters and lenses (ownership, runtime hotspots, test coverage) help you pivot from exploration to action. The mock canvas suggests how dense relationships might be clustered for readability.">
      <div className="rounded-2xl border border-white/10 bg-[#0a0a0c] overflow-hidden shadow-2xl shadow-black/50 min-h-[440px] relative">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(249,115,22,0.08),transparent_55%)] pointer-events-none"/>
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03] relative z-10">
          <span className="text-xs text-white/50">Graph · dependency + symbol edges</span>
          <span className="text-[10px] text-white/35 font-mono">layout: force-directed</span>
        </div>
        <div className="relative z-10 p-8 h-[360px] flex items-center justify-center">
          <svg viewBox="0 0 400 240" className="w-full max-w-lg text-white/30" aria-hidden>
            <defs>
              <marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
                <path d="M0,0 L6,3 L0,6 Z" fill="currentColor"/>
              </marker>
            </defs>
            <line x1="80" y1="120" x2="180" y2="70" stroke="currentColor" strokeWidth="1" markerEnd="url(#arrow)"/>
            <line x1="80" y1="120" x2="180" y2="170" stroke="currentColor" strokeWidth="1" markerEnd="url(#arrow)"/>
            <line x1="180" y1="70" x2="300" y2="100" stroke="currentColor" strokeWidth="1" markerEnd="url(#arrow)"/>
            <line x1="180" y1="170" x2="300" y2="140" stroke="currentColor" strokeWidth="1" markerEnd="url(#arrow)"/>
            <circle cx="80" cy="120" r="28" className="fill-[#1a1a1f] stroke-[var(--color-primary)]/50" strokeWidth="2"/>
            <text x="80" y="124" textAnchor="middle" className="fill-white/70 text-[10px]">api.ts</text>
            <circle cx="180" cy="70" r="24" className="fill-[#1a1a1f] stroke-white/20" strokeWidth="1"/>
            <text x="180" y="74" textAnchor="middle" className="fill-white/60 text-[9px]">auth</text>
            <circle cx="180" cy="170" r="24" className="fill-[#1a1a1f] stroke-white/20" strokeWidth="1"/>
            <text x="180" y="174" textAnchor="middle" className="fill-white/60 text-[9px]">db</text>
            <circle cx="300" cy="120" r="32" className="fill-[#1a1a1f] stroke-orange-400/40" strokeWidth="2"/>
            <text x="300" y="124" textAnchor="middle" className="fill-orange-200/90 text-[10px]">Checkout</text>
          </svg>
        </div>
        <p className="relative z-10 px-6 pb-6 text-xs text-white/45 text-center">Interactive zoom, search, and path highlighting would ship on top of this graph scaffold.</p>
      </div>
    </ShowcasePageLayout>);
}
