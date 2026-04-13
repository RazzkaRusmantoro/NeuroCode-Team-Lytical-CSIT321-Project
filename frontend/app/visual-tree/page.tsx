'use client';
import ShowcasePageLayout from "../components/showcase/ShowcasePageLayout";
const tree = [
    { depth: 0, label: 'acme-platform', tag: 'repo', hot: false },
    { depth: 1, label: 'services', tag: 'folder', hot: false },
    { depth: 2, label: 'api-gateway', tag: 'module', hot: true },
    { depth: 2, label: 'auth', tag: 'module', hot: true },
    { depth: 2, label: 'billing', tag: 'module', hot: false },
    { depth: 1, label: 'packages', tag: 'folder', hot: false },
    { depth: 2, label: 'ui-kit', tag: 'package', hot: false },
    { depth: 2, label: 'sdk', tag: 'package', hot: false },
];
export default function VisualTreePage() {
    return (<ShowcasePageLayout eyebrow="Product preview" title="Architecture" titleAccent="visual tree" breadcrumbCurrent="Visual Tree" description="A visual tree orients contributors around how folders and services relate. NeuroCode could highlight frequently touched areas, ownership, and generated summaries at each node so navigation doubles as onboarding.">
      <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 bg-white/[0.03]">
          <span className="text-xs text-white/50">Repository structure</span>
          <div className="flex items-center gap-2 text-[10px] text-white/40">
            <span className="inline-flex items-center gap-1 rounded-full bg-orange-500/15 border border-orange-500/25 px-2 py-0.5 text-orange-300/90">Hot path</span>
            <span>Zoom: fit</span>
          </div>
        </div>
        <div className="p-6 md:p-8 font-mono text-sm">
          {tree.map((row, idx) => (<div key={idx} className="flex items-center gap-2 py-1.5 border-b border-white/[0.04] last:border-0" style={{ paddingLeft: `${row.depth * 1.25}rem` }}>
              <span className="text-white/25">{row.depth ? '└' : ''}</span>
              <span className={`truncate ${row.hot ? 'text-orange-300/95' : 'text-white/80'}`}>{row.label}</span>
              <span className="text-[10px] uppercase tracking-wide text-white/35 ml-auto flex-shrink-0">{row.tag}</span>
            </div>))}
        </div>
        <div className="px-6 pb-6 text-xs text-white/45">
          Nodes marked as hot paths could reflect churn, incident history, or semantic centrality from your graph index.
        </div>
      </div>
    </ShowcasePageLayout>);
}
