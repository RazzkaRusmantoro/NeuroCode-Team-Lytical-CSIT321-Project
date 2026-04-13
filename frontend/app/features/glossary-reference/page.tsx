'use client';
import ShowcasePageLayout from "../../components/showcase/ShowcasePageLayout";
export default function GlossaryReferencePage() {
    return (<ShowcasePageLayout eyebrow="Feature preview" title="Glossary & code reference" breadcrumbCurrent="Glossary & Code Reference" description="Domain terms and implementation details stay linked: glossary entries jump to definitions, usages, and the narrative docs that mention them so teams share one vocabulary.">
      <div className="grid md:grid-cols-2 gap-4 max-w-4xl">
        <div className="rounded-2xl border border-white/10 bg-[#121214] p-5 shadow-xl">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-white/40 mb-3">Glossary</h3>
          <dl className="space-y-3 text-sm">
            <div>
              <dt className="text-[var(--color-primary)] font-medium">LedgerEntry</dt>
              <dd className="text-white/55 mt-0.5">Immutable financial event appended after successful capture.</dd>
            </div>
            <div>
              <dt className="text-[var(--color-primary)] font-medium">Dunning</dt>
              <dd className="text-white/55 mt-0.5">Retry workflow when a renewal fails soft-decline thresholds.</dd>
            </div>
          </dl>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0c0c0e] p-5 font-mono text-xs shadow-xl">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-white/40 mb-3">Reference</h3>
          <pre className="text-white/60 leading-relaxed">{`export async function postLedgerEntry(
  tx: Transaction,
): Promise<Result<void>> {
  // writes to events + projections
}`}</pre>
          <p className="text-[10px] text-white/35 mt-3">Cross-links to docs · tests · ADRs</p>
        </div>
      </div>
    </ShowcasePageLayout>);
}
