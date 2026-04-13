"use client";
import type { ReactNode } from "react";
import Navbar from "./Navbar";
export default function LandingSubpageShell({ children, }: {
    children: ReactNode;
}) {
    return (<>
      <Navbar />
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0f0f11] pt-28 md:pt-32 pb-16">
        {children}
      </div>
    </>);
}
