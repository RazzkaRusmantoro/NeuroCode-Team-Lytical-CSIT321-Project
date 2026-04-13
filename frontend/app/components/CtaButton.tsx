"use client";
import React from "react";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
interface CtaButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    text?: string;
    href?: string;
}
function CtaButton({ text = "Get started", className, href, ...props }: CtaButtonProps) {
    const baseClass = cn("group relative z-10 inline-flex min-w-52 min-h-12 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-[#262626] bg-[#171717] px-6 py-3 text-center font-semibold text-white transition-colors hover:border-orange-500/50", "font-[var(--font-geist-sans),system-ui,sans-serif]", className);
    const content = (<>
      <div className="relative z-10 flex items-center justify-center gap-1.5 transition-all duration-300 group-hover:translate-x-12 group-hover:opacity-0">
        <span className="w-8 shrink-0" aria-hidden/>
        <span className="inline-block whitespace-nowrap">{text}</span>
      </div>
      <div className="absolute top-0 z-10 flex h-full w-full translate-x-12 items-center justify-center gap-2 text-white opacity-0 transition-all duration-300 group-hover:-translate-x-1 group-hover:opacity-100">
        <span className="whitespace-nowrap">{text}</span>
        <ArrowRight className="h-4 w-4 shrink-0"/>
      </div>
      <div className="absolute left-6 top-1/2 z-0 h-2 w-2 -translate-y-1/2 rounded-lg bg-orange-500 transition-all duration-300 group-hover:left-0 group-hover:top-0 group-hover:translate-y-0 group-hover:h-full group-hover:w-full group-hover:rounded-full group-hover:bg-orange-500"/>
    </>);
    if (href) {
        return <a href={href} className={baseClass}>{content}</a>;
    }
    return (<button type="button" className={baseClass} {...props}>
      {content}
    </button>);
}
export { CtaButton };
