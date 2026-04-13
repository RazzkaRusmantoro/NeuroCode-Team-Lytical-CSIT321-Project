'use client';
import ShowcasePageLayout from "../../components/showcase/ShowcasePageLayout";
const stages = ['Ingest', 'Chunk', 'Embed', 'Index', 'Generate'];
export default function RagPipelinePage() {
    return (<ShowcasePageLayout eyebrow="Feature preview" title="RAG pipeline" breadcrumbCurrent="RAG Pipeline" description="Your code moves through a repeatable pipeline so embeddings and indexes stay aligned with HEAD. Each stage is observable so teams can debug drift, re-run slices, and trust retrieval quality.">
      <div className="rounded-2xl border border-white/10 bg-[#121214] p-6 md:p-8 shadow-2xl shadow-black/50">
        <div className="flex flex-wrap items-center justify-center gap-3 md:gap-2">
          {stages.map((label, i) => (<div key={label} className="flex items-center gap-2 md:gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-semibold shrink-0 ${i <= 2 ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/35' : 'bg-white/[0.04] text-white/35 border border-white/10'}`}>
                {i + 1}
              </div>
              <span className="text-sm text-white/75">{label}</span>
              {i < stages.length - 1 && <span className="hidden sm:inline text-white/20 mx-1 md:mx-2">→</span>}
            </div>))}
        </div>
        <p className="text-xs text-white/40 mt-8 text-center">Illustrative checkpointing — production would surface timings, token counts, and per-repo health.</p>
      </div>
    </ShowcasePageLayout>);
}
