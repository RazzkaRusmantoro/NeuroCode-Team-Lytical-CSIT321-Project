'use client';
import ShowcasePageLayout from "../../components/showcase/ShowcasePageLayout";
export default function CodeAwareChatPage() {
    return (<ShowcasePageLayout eyebrow="Feature preview" title="Code-aware chat" breadcrumbCurrent="Code-Aware Chat" description="Ask natural-language questions and receive answers constrained by retrieved snippets from your repos. Citations anchor every claim to real files so reviewers can trust the response.">
      <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden shadow-2xl shadow-black/50 max-w-3xl">
        <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03] flex items-center gap-2">
          <span className="text-xs text-white/50">#engineering · billing rollout</span>
        </div>
        <div className="p-5 space-y-4">
          <div className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-sm text-white/75 max-w-[90%]">
            Where do we validate tax IDs before charging a card?
          </div>
          <div className="rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/25 px-4 py-3 text-sm text-white/85 max-w-[95%] ml-auto">
            <p className="mb-2">Tax validation runs in <span className="text-[var(--color-primary)] font-medium">TaxIdService.validate</span> before <span className="font-mono text-xs text-white/70">PaymentGateway.capture</span> is invoked.</p>
            <p className="text-[11px] text-white/45 flex flex-wrap gap-2">
              <span className="rounded bg-black/30 px-2 py-0.5">src/billing/tax.ts:L42</span>
              <span className="rounded bg-black/30 px-2 py-0.5">src/payments/gateway.ts:L118</span>
            </p>
          </div>
        </div>
      </div>
    </ShowcasePageLayout>);
}
