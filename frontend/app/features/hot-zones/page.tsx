'use client';
import ShowcasePageLayout from "../../components/showcase/ShowcasePageLayout";
const rows = [
    { path: 'services/checkout/capture.ts', score: 0.92, note: 'Frequent incidents + high churn' },
    { path: 'packages/sdk/src/client.ts', score: 0.78, note: 'Broad fan-in from apps' },
    { path: 'infra/terraform/modules/vpc', score: 0.64, note: 'Risky blast radius' },
];
export default function HotZonesPage() {
    return (<ShowcasePageLayout eyebrow="Feature preview" title="Hot zones & risk patterns" breadcrumbCurrent="Hot Zones" description="Semantic similarity and activity signals combine to spotlight areas that deserve extra review. Use it to prioritize refactors, tests, or pair programming before risky releases.">
      <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden shadow-2xl shadow-black/50 max-w-3xl">
        <div className="px-4 py-3 border-b border-white/10 bg-white/[0.03] flex justify-between items-center">
          <span className="text-xs text-white/50">Similar to: refund retries</span>
          <span className="text-[10px] text-orange-300/90">Heat map · last 30d</span>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[10px] uppercase tracking-wider text-white/35 border-b border-white/10">
              <th className="px-4 py-2 font-medium">Path</th>
              <th className="px-4 py-2 font-medium w-24">Score</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (<tr key={r.path} className="border-b border-white/[0.06] last:border-0">
                <td className="px-4 py-3">
                  <p className="text-white/80 font-mono text-xs">{r.path}</p>
                  <p className="text-[11px] text-white/40 mt-0.5">{r.note}</p>
                </td>
                <td className="px-4 py-3">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden w-full">
                    <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-orange-300" style={{ width: `${Math.round(r.score * 100)}%` }}/>
                  </div>
                  <p className="text-[10px] text-white/45 mt-1 tabular-nums">{(r.score * 100).toFixed(0)}</p>
                </td>
              </tr>))}
          </tbody>
        </table>
      </div>
    </ShowcasePageLayout>);
}
