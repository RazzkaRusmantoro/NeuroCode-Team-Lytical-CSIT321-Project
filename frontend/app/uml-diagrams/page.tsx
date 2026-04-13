'use client';
import ShowcasePageLayout from "../components/showcase/ShowcasePageLayout";
export default function UmlDiagramsPage() {
    return (<ShowcasePageLayout eyebrow="Product preview" title="UML & diagrams" titleAccent="from your code" breadcrumbCurrent="UML Diagrams" description="Sequence, class, and state views help teams align on behavior without maintaining stale diagrams by hand. The canvas below illustrates the kind of structured diagram NeuroCode could surface next to definitions in your repo.">
      <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden shadow-2xl shadow-black/50">
        <div className="flex flex-wrap items-center gap-3 px-4 py-3 border-b border-white/10 bg-white/[0.03]">
          <span className="text-xs text-white/50">Diagram</span>
          <div className="flex gap-2">
            {['Class', 'Sequence', 'State'].map((t, i) => (<span key={t} className={`text-xs px-2.5 py-1 rounded-full border ${i === 0 ? 'border-[var(--color-primary)]/40 bg-[var(--color-primary)]/10 text-white' : 'border-white/10 text-white/45'}`}>
                {t}
              </span>))}
          </div>
          <span className="ml-auto text-[10px] text-white/35 font-mono">checkout.flow.ts</span>
        </div>
        <div className="p-8 md:p-12 min-h-[400px] relative bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:20px_20px]">
          <div className="max-w-3xl mx-auto flex flex-col gap-6">
            <div className="rounded-xl border-2 border-[var(--color-primary)]/35 bg-[#16161a]/90 p-4 w-[200px] shadow-lg shadow-[var(--color-primary)]/10">
              <p className="text-xs text-[var(--color-primary)] font-semibold mb-1">CheckoutService</p>
              <p className="text-[11px] text-white/50">+ authorizePayment()</p>
              <p className="text-[11px] text-white/50">+ captureOrder()</p>
            </div>
            <div className="flex flex-wrap gap-8 items-start pl-4 md:pl-24">
              <div className="rounded-xl border border-white/15 bg-[#16161a]/90 p-4 w-[180px]">
                <p className="text-xs text-white/80 font-semibold mb-1">PaymentGateway</p>
                <p className="text-[11px] text-white/45">interface</p>
              </div>
              <div className="rounded-xl border border-white/15 bg-[#16161a]/90 p-4 w-[180px]">
                <p className="text-xs text-white/80 font-semibold mb-1">InventoryClient</p>
                <p className="text-[11px] text-white/45">+ reserveStock()</p>
              </div>
            </div>
            <p className="text-center text-xs text-white/40 pt-4">Illustrative layout — real diagrams would map to your types and call paths.</p>
          </div>
        </div>
      </div>
    </ShowcasePageLayout>);
}
