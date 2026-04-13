"use client";
import React, { useEffect, useRef, memo } from "react";
const CHARACTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
export function generateRandomString(length: number): string {
    let result = "";
    for (let i = 0; i < length; i++) {
        result += CHARACTERS.charAt(Math.floor(Math.random() * CHARACTERS.length));
    }
    return result;
}
const JETBRAINS_STYLE: React.CSSProperties = {
    fontFamily: "var(--font-jetbrains-mono)",
};
const SCRAMBLE_INTERVAL_MS = 120;
export interface OrangeCursorGlowPatternProps {
    positionRef: {
        readonly current: {
            x: number;
            y: number;
        };
    };
}
export const OrangeCursorGlowPattern = memo(function OrangeCursorGlowPattern({ positionRef, }: OrangeCursorGlowPatternProps) {
    const gradientRef = useRef<HTMLDivElement>(null);
    const textMaskRef = useRef<HTMLDivElement>(null);
    const textNodeRef = useRef<HTMLParagraphElement>(null);
    useEffect(() => {
        if (textNodeRef.current) {
            textNodeRef.current.textContent = generateRandomString(1500);
        }
        const id = setInterval(() => {
            if (textNodeRef.current) {
                textNodeRef.current.textContent = generateRandomString(1500);
            }
        }, SCRAMBLE_INTERVAL_MS);
        return () => clearInterval(id);
    }, []);
    useEffect(() => {
        let rafId: number;
        const update = () => {
            rafId = requestAnimationFrame(update);
            const pos = positionRef.current;
            if (!pos)
                return;
            const mask = `radial-gradient(250px at ${pos.x}px ${pos.y}px, white, transparent)`;
            if (gradientRef.current) {
                gradientRef.current.style.maskImage = mask;
                (gradientRef.current.style as unknown as Record<string, string>)
                    .webkitMaskImage = mask;
            }
            if (textMaskRef.current) {
                textMaskRef.current.style.maskImage = mask;
                (textMaskRef.current.style as unknown as Record<string, string>)
                    .webkitMaskImage = mask;
            }
        };
        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [positionRef]);
    return (<div className="pointer-events-none absolute inset-0 z-0">
      <div className="absolute inset-0 rounded-2xl opacity-40 [mask-image:linear-gradient(white,transparent)]" aria-hidden/>
      <div ref={gradientRef} className="absolute inset-0 rounded-2xl bg-gradient-to-r from-orange-950 to-[#0d0604] opacity-[0.12] backdrop-blur-xl"/>
      <div ref={textMaskRef} className="absolute inset-0 mix-blend-overlay opacity-[0.1]">
        <p ref={textNodeRef} className="absolute inset-x-0 h-full break-words whitespace-pre-wrap text-xs font-bold text-white" style={JETBRAINS_STYLE}/>
      </div>
    </div>);
});
