'use client';
import ShowcasePageLayout from "../components/showcase/ShowcasePageLayout";
export default function DocumentationPage() {
    return (<ShowcasePageLayout eyebrow="Product preview" title="Documentation" titleAccent="that stays in sync" breadcrumbCurrent="Documentation" description="NeuroCode turns your repository into living documentation: onboarding guides, module overviews, and API surfaces that refresh as code changes. Below is a stylized example of how a doc workspace could feel inside the product.">
      <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
          <span className="w-2.5 h-2.5 rounded-full bg-red-500/70"/>
          <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70"/>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70"/>
          <span className="ml-2 text-xs text-white/40 font-mono">docs / billing-service</span>
          <span className="ml-auto text-[10px] uppercase tracking-wider text-emerald-400/90 flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/> Live sync
          </span>
        </div>
        <div className="grid md:grid-cols-[220px_1fr] min-h-[420px]">
          <aside className="border-b md:border-b-0 md:border-r border-white/10 p-4 space-y-1 bg-[#0c0c0e]">
            {['Overview', 'Architecture', 'API Reference', 'Runbooks', 'Contributing'].map((item, i) => (<div key={item} className={`text-sm rounded-lg px-3 py-2 ${i === 1 ? 'bg-[var(--color-primary)]/15 text-white border border-[var(--color-primary)]/25' : 'text-white/50 hover:bg-white/[0.04]'}`}>
                {item}
              </div>))}
          </aside>
          <main className="p-6 md:p-8 space-y-4">
            <h2 className="text-xl font-semibold text-white">Architecture</h2>
            <div className="space-y-2">
              <div className="h-2.5 w-full max-w-lg rounded bg-white/15"/>
              <div className="h-2.5 w-full max-w-md rounded bg-white/10"/>
              <div className="h-2.5 w-full max-w-xl rounded bg-white/10"/>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/[0.02] p-4 mt-6">
              <p className="text-xs font-mono text-[var(--color-primary)]/90 mb-2">{'// Inferred from src/modules/billing'}</p>
              <p className="text-sm text-white/70 leading-relaxed">
                The billing pipeline validates events, applies pricing rules, and emits ledger entries. Downstream consumers subscribe to <span className="text-white/90 font-medium">BillingEvents</span> for analytics and dunning workflows.
              </p>
            </div>
          </main>
        </div>
      </div>
    </ShowcasePageLayout>);
}
