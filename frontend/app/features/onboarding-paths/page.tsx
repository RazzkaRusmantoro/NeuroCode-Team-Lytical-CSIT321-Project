'use client';
import ShowcasePageLayout from "../../components/showcase/ShowcasePageLayout";
const steps = [
    { title: 'Local environment', detail: 'Toolchain, env files, seed data', done: true },
    { title: 'Core services map', detail: 'How API, workers, and web talk', done: true },
    { title: 'First contribution', detail: 'Branch flow, tests, review norms', done: false },
];
export default function OnboardingPathsPage() {
    return (<ShowcasePageLayout eyebrow="Feature preview" title="Onboarding paths" breadcrumbCurrent="Onboarding Paths" description="New teammates get a guided path through setup, architecture, and their first meaningful change. Paths are generated from live structure so they never drift from the repo you actually ship.">
      <div className="rounded-2xl border border-white/10 bg-[#121214] overflow-hidden shadow-2xl shadow-black/50 max-w-2xl">
        <div className="px-4 py-3 border-b border-white/10 flex justify-between items-center bg-white/[0.03]">
          <span className="text-sm text-white/80 font-medium">Backend engineer · Week 1</span>
          <span className="text-[10px] text-emerald-400/90">67% complete</span>
        </div>
        <ul className="divide-y divide-white/10">
          {steps.map((s) => (<li key={s.title} className="flex gap-4 px-5 py-4">
              <span className={`mt-0.5 w-5 h-5 rounded-full border flex items-center justify-center text-[10px] ${s.done ? 'border-emerald-500/60 bg-emerald-500/15 text-emerald-300' : 'border-white/20 text-white/30'}`}>
                {s.done ? '✓' : ''}
              </span>
              <div>
                <p className="text-sm font-medium text-white">{s.title}</p>
                <p className="text-xs text-white/45 mt-0.5">{s.detail}</p>
              </div>
            </li>))}
        </ul>
      </div>
    </ShowcasePageLayout>);
}
