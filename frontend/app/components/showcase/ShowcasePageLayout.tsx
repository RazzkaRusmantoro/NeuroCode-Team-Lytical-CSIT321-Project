"use client";
import type { ReactNode } from "react";
import Link from "next/link";
import LandingSubpageShell from "../LandingSubpageShell";
type ShowcasePageLayoutProps = {
    eyebrow: string;
    title: string;
    titleAccent?: string;
    breadcrumbCurrent?: string;
    description: string;
    children: ReactNode;
};
export default function ShowcasePageLayout({ eyebrow, title, titleAccent, breadcrumbCurrent, description, children, }: ShowcasePageLayoutProps) {
    return (<LandingSubpageShell>
      <div className="container mx-auto px-4 max-w-6xl">
        <nav className="text-sm text-white/40 mb-8">
          <Link href="/" className="hover:text-white/70 transition-colors">Home</Link>
          <span className="mx-2">/</span>
          <span className="text-white/60">{breadcrumbCurrent ?? title}</span>
        </nav>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold mb-5">
          {eyebrow}
        </div>
        <h1 className="text-3xl md:text-5xl font-bold text-white tracking-tight mb-6">
          {title}
          {titleAccent && (<span className="text-[var(--color-primary)]"> {titleAccent}</span>)}
        </h1>
        <p className="text-lg text-white/65 max-w-3xl leading-relaxed mb-12">
          {description}
        </p>
        {children}
      </div>
    </LandingSubpageShell>);
}
