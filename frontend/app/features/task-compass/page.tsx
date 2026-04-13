'use client';
import ShowcasePageLayout from "../../components/showcase/ShowcasePageLayout";
export default function TaskCompassPage() {
    return (<ShowcasePageLayout eyebrow="Feature preview" title="Task compass" breadcrumbCurrent="Task Compass" description="Before coding, Task Compass orients you with a concise brief: intent, risky areas, suggested entry files, and owners. It is ideal for tickets that span unfamiliar services.">
      <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden shadow-2xl shadow-black/50 max-w-2xl">
        <div className="px-5 py-4 border-b border-white/10 bg-white/[0.03]">
          <p className="text-[10px] uppercase tracking-wider text-white/40">Ticket NC-1842</p>
          <p className="text-lg font-semibold text-white mt-1">Add partial refunds to hosted checkout</p>
        </div>
        <div className="p-5 space-y-4 text-sm">
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase mb-1">Summary</p>
            <p className="text-white/70">Extend the capture flow to support partial captures against authorized holds, with idempotent retries.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-orange-300/80 uppercase mb-1">Caution</p>
            <p className="text-white/65">Webhook ordering is not guaranteed—mirror the idempotency strategy used in <span className="font-mono text-xs text-white/80">payments/webhooks.ts</span>.</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-white/40 uppercase mb-1">Likely entry points</p>
            <ul className="text-white/60 space-y-1 font-mono text-xs">
              <li>src/checkout/capture.ts</li>
              <li>src/payments/gateway.ts</li>
              <li>proto/checkout/v2/service.proto</li>
            </ul>
          </div>
        </div>
      </div>
    </ShowcasePageLayout>);
}
