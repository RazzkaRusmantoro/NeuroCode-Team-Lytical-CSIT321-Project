"use client";
import { motion } from "framer-motion";
import React, { useEffect, useRef, useState, useCallback, memo } from "react";
import { SpiralAnimation } from "./SpiralAnimation";
import { DottedSurface } from "./DottedSurface";
import { AbstractShader } from "./AbstractShader";
import { OrangeCursorGlowPattern } from "./OrangeCursorGlowPattern";
export type AccordionItem = {
    id: string;
    title: string;
    description: string;
};
const PANEL_COLLAPSED_WIDTH = 128;
const PANEL_EXPANDED_WIDTH = 460;
const WAVE_DURATION = 3.2;
const WAVE_OFFSET = 0.5;
const WIGGLE_PX = 2;
const EDGE_DURATION = 0.07;
const STAGGER_DELAY = 0.1;
const CHEVRON_MOVE_TO_CENTER_DELAY_MS = 90;
const HOVER_LEAVE_DELAY_MS = 120;
const LIVE_DOCS_LERP = 0.032;
const EDGE_SHADOW = "0 0 10px rgba(249,115,22,0.35)";
const EDGE_TOP_STYLE: React.CSSProperties = { transformOrigin: "left", boxShadow: EDGE_SHADOW };
const EDGE_RIGHT_STYLE: React.CSSProperties = { transformOrigin: "top", boxShadow: EDGE_SHADOW };
const EDGE_BOTTOM_STYLE: React.CSSProperties = { transformOrigin: "right", boxShadow: EDGE_SHADOW };
const EDGE_LEFT_STYLE: React.CSSProperties = { transformOrigin: "bottom", boxShadow: EDGE_SHADOW };
const STRIP_TITLE_STYLE: React.CSSProperties = {
    fontFamily: "var(--font-red-hat-mono)",
    writingMode: "vertical-lr",
    textOrientation: "mixed",
};
const GRADIENT_BG_STYLE: React.CSSProperties = {
    background: "linear-gradient(to right, #1a1a1c 0%, #161618 40%, #1a0f08 75%, #140a04 100%)",
};
const FADE_GRADIENT_STYLE: React.CSSProperties = {
    background: "linear-gradient(to right, #0d0d0f 0%, rgba(13,13,15,0.85) 20%, rgba(13,13,15,0.4) 50%, transparent 70%)",
};
const RED_HAT_DISPLAY_STYLE: React.CSSProperties = { fontFamily: "var(--font-red-hat-display)" };
const RED_HAT_MONO_STYLE: React.CSSProperties = { fontFamily: "var(--font-red-hat-mono)" };
const COUNTUP_STYLE: React.CSSProperties = {
    fontFamily: "var(--font-red-hat-mono)",
    color: "transparent",
    WebkitTextStroke: "1px #f97316",
    paintOrder: "stroke fill",
};
const CONTAINER_VARIANTS = { visible: {}, hidden: {} };
function ChevronRight({ className }: {
    className?: string;
}) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
      <path d="M9 18l6-6-6-6"/>
    </svg>);
}
function ChevronLeft({ className }: {
    className?: string;
}) {
    return (<svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="square">
      <path d="M15 6l-6 6 6 6"/>
    </svg>);
}
const CountUpStep = memo(function CountUpStep({ number, visible, position = "bottom", }: {
    number: number;
    visible: boolean;
    position?: "top" | "bottom";
}) {
    const label = number < 10 ? `0${number}` : String(number);
    const hiddenY = position === "top" ? 20 : -20;
    return (<motion.div className="relative flex min-h-[6rem] w-full shrink-0 justify-center pt-2" initial={false} animate={visible ? { y: 0, opacity: 1 } : { y: hiddenY, opacity: 0 }} transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}>
      <span className="text-6xl font-semibold tabular-nums opacity-50 md:text-7xl lg:text-8xl" style={COUNTUP_STYLE}>
        {label}
      </span>
    </motion.div>);
});
const GlossaryCardPattern = memo(function GlossaryCardPattern({ positionRef, }: {
    positionRef: {
        readonly current: {
            x: number;
            y: number;
        };
    };
}) {
    const maskRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        let rafId: number;
        const update = () => {
            rafId = requestAnimationFrame(update);
            const pos = positionRef.current;
            if (!pos || !maskRef.current)
                return;
            const mask = `radial-gradient(300px at ${pos.x}px ${pos.y}px, white, transparent)`;
            maskRef.current.style.maskImage = mask;
            (maskRef.current.style as unknown as Record<string, string>)
                .webkitMaskImage = mask;
        };
        rafId = requestAnimationFrame(update);
        return () => cancelAnimationFrame(rafId);
    }, [positionRef]);
    return (<div ref={maskRef} className="pointer-events-none absolute inset-0 z-0 flex items-center justify-center overflow-hidden rounded-2xl">
      <SpiralAnimation totalDots={600} size={400} dotRadius={2} margin={2} duration={2} dotColor="#f97316" backgroundColor="transparent" visibility={0.2} fillContainer/>
    </div>);
});
export function HorizontalAccordion({ items }: {
    items: AccordionItem[];
}) {
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const [chevronCenteredIndex, setChevronCenteredIndex] = useState<number | null>(null);
    const [accordionVisible, setAccordionVisible] = useState(false);
    const leaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const ref = useRef<HTMLDivElement>(null);
    const lastScrollY = useRef(0);
    useEffect(() => {
        if (typeof window === "undefined")
            return;
        lastScrollY.current = window.scrollY;
        const el = ref.current;
        if (!el)
            return;
        const update = () => {
            const rect = el.getBoundingClientRect();
            const vh = window.innerHeight;
            const inViewport = rect.top < vh && rect.bottom > 0;
            const aboveViewport = rect.bottom < 0;
            const belowViewport = rect.top > vh;
            const scrollY = window.scrollY;
            const scrollingDown = scrollY > lastScrollY.current;
            lastScrollY.current = scrollY;
            setAccordionVisible((prev) => {
                if (inViewport)
                    return true;
                if (aboveViewport)
                    return scrollingDown;
                if (belowViewport)
                    return false;
                return prev;
            });
        };
        update();
        window.addEventListener("scroll", update, { passive: true });
        window.addEventListener("resize", update);
        return () => {
            window.removeEventListener("scroll", update);
            window.removeEventListener("resize", update);
        };
    }, []);
    const liveDocsContentRef = useRef<HTMLDivElement | null>(null);
    const liveDocsMouseTargetRef = useRef({ x: 0, y: 0 });
    const liveDocsMouseDisplayRef = useRef({ x: 0, y: 0 });
    const glossaryRefsContentRef = useRef<HTMLDivElement | null>(null);
    const glossaryRefsMouseRef = useRef({ x: 0, y: 0 });
    const umlContentRef = useRef<HTMLDivElement | null>(null);
    const umlMouseRef = useRef({ x: 0, y: 0 });
    const liveDocsRefCb = useCallback((el: HTMLDivElement | null) => {
        liveDocsContentRef.current = el;
    }, []);
    const glossaryRefsRefCb = useCallback((el: HTMLDivElement | null) => {
        glossaryRefsContentRef.current = el;
    }, []);
    const umlRefCb = useCallback((el: HTMLDivElement | null) => {
        umlContentRef.current = el;
    }, []);
    const handleMouseEnter = useCallback((index: number) => {
        if (leaveTimeoutRef.current) {
            clearTimeout(leaveTimeoutRef.current);
            leaveTimeoutRef.current = null;
        }
        setHoveredIndex(index);
    }, []);
    const handleMouseLeave = useCallback(() => {
        leaveTimeoutRef.current = setTimeout(() => setHoveredIndex(null), HOVER_LEAVE_DELAY_MS);
    }, []);
    const handleLiveDocsMouseMove = useCallback((e: React.MouseEvent) => {
        const el = liveDocsContentRef.current;
        if (!el)
            return;
        const rect = el.getBoundingClientRect();
        liveDocsMouseTargetRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);
    const handleGlossaryRefsMouseMove = useCallback((e: React.MouseEvent) => {
        const el = glossaryRefsContentRef.current;
        if (!el)
            return;
        const rect = el.getBoundingClientRect();
        glossaryRefsMouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);
    const handleGlossaryRefsMouseMoveFromContent = useCallback((e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        glossaryRefsMouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);
    const handleUmlMouseMove = useCallback((e: React.MouseEvent) => {
        const el = umlContentRef.current;
        if (!el)
            return;
        const rect = el.getBoundingClientRect();
        umlMouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);
    const handleUmlMouseMoveFromContent = useCallback((e: React.MouseEvent) => {
        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
        umlMouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top,
        };
    }, []);
    useEffect(() => {
        if (hoveredIndex === null) {
            setChevronCenteredIndex(null);
            return;
        }
        const t = setTimeout(() => setChevronCenteredIndex(hoveredIndex), CHEVRON_MOVE_TO_CENTER_DELAY_MS);
        return () => clearTimeout(t);
    }, [hoveredIndex]);
    useEffect(() => {
        const isLiveDocsExpanded = hoveredIndex !== null && items[hoveredIndex]?.id === "code-chat";
        if (!isLiveDocsExpanded)
            return;
        const raf = requestAnimationFrame(() => {
            const el = liveDocsContentRef.current;
            if (!el)
                return;
            const rect = el.getBoundingClientRect();
            const cx = rect.width / 2;
            const cy = rect.height / 2;
            liveDocsMouseTargetRef.current = { x: cx, y: cy };
            liveDocsMouseDisplayRef.current = { x: cx, y: cy };
        });
        return () => cancelAnimationFrame(raf);
    }, [hoveredIndex, items]);
    const liveDocsExpandedRef = useRef(false);
    liveDocsExpandedRef.current =
        hoveredIndex !== null && items[hoveredIndex]?.id === "code-chat";
    useEffect(() => {
        let rafId: number;
        const tick = () => {
            rafId = requestAnimationFrame(tick);
            if (!liveDocsExpandedRef.current)
                return;
            const target = liveDocsMouseTargetRef.current;
            const prev = liveDocsMouseDisplayRef.current;
            liveDocsMouseDisplayRef.current = {
                x: prev.x + (target.x - prev.x) * LIVE_DOCS_LERP,
                y: prev.y + (target.y - prev.y) * LIVE_DOCS_LERP,
            };
        };
        rafId = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(rafId);
    }, []);
    useEffect(() => {
        const isGlossaryExpanded = hoveredIndex !== null && items[hoveredIndex]?.id === "glossary-refs";
        if (!isGlossaryExpanded)
            return;
        const raf = requestAnimationFrame(() => {
            const el = glossaryRefsContentRef.current;
            if (!el)
                return;
            const rect = el.getBoundingClientRect();
            glossaryRefsMouseRef.current = {
                x: rect.width / 2,
                y: rect.height / 2,
            };
        });
        return () => cancelAnimationFrame(raf);
    }, [hoveredIndex, items]);
    useEffect(() => {
        const isUmlExpanded = hoveredIndex !== null && items[hoveredIndex]?.id === "rag-pipeline";
        if (!isUmlExpanded)
            return;
        const raf = requestAnimationFrame(() => {
            const el = umlContentRef.current;
            if (!el)
                return;
            const rect = el.getBoundingClientRect();
            umlMouseRef.current = { x: rect.width / 2, y: rect.height / 2 };
        });
        return () => cancelAnimationFrame(raf);
    }, [hoveredIndex, items]);
    useEffect(() => {
        return () => {
            if (leaveTimeoutRef.current)
                clearTimeout(leaveTimeoutRef.current);
        };
    }, []);
    return (<div ref={ref} className="relative flex justify-center w-full">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-orange-500/5 blur-[120px] rounded-full pointer-events-none"/>
      <motion.div className="relative z-10 inline-flex h-[28rem] min-h-[420px] items-stretch gap-12 md:h-[32rem]" initial="hidden" animate={accordionVisible ? "visible" : "hidden"} variants={CONTAINER_VARIANTS}>
        {items.map((item, index) => {
            const isExpanded = hoveredIndex === index;
            const numberOnTop = index % 2 === 0;
            const numberBlock = (<div className="min-h-[6rem] w-full overflow-hidden">
              <CountUpStep number={6 + index} visible={isExpanded} position={numberOnTop ? "top" : "bottom"}/>
            </div>);
            return (<div key={item.id} className="flex flex-col items-center shrink-0">
              {numberOnTop && numberBlock}
              <motion.div className={`relative h-full shrink-0 rounded-none border border-white/10 ${numberOnTop ? "mt-5" : ""}`} variants={{
                    hidden: { y: 56, opacity: 0 },
                    visible: {
                        y: 0,
                        opacity: 1,
                        transition: {
                            delay: index * STAGGER_DELAY,
                            duration: 0.5,
                            ease: [0.22, 1, 0.36, 1],
                        },
                    },
                }} initial="hidden" animate={[
                    accordionVisible ? "visible" : "hidden",
                    { width: isExpanded ? PANEL_EXPANDED_WIDTH : PANEL_COLLAPSED_WIDTH },
                ] as unknown as string} transition={{ type: "spring", stiffness: 400, damping: 30 }} onMouseEnter={() => handleMouseEnter(index)} onMouseLeave={handleMouseLeave} onMouseMove={item.id === "code-chat" && isExpanded
                    ? handleLiveDocsMouseMove
                    : item.id === "glossary-refs" && isExpanded
                        ? handleGlossaryRefsMouseMove
                        : item.id === "rag-pipeline" && isExpanded
                            ? handleUmlMouseMove
                            : undefined}>
                
                <motion.div className="pointer-events-none absolute top-0 left-0 z-[999] h-px w-full bg-orange-500" style={EDGE_TOP_STYLE} initial={false} animate={{ scaleX: isExpanded ? 1 : 0 }} transition={{ duration: EDGE_DURATION, delay: isExpanded ? 0 : EDGE_DURATION * 3, ease: "linear" }}/>
                <motion.div className="pointer-events-none absolute top-0 right-0 z-[999] h-full w-px bg-orange-500" style={EDGE_RIGHT_STYLE} initial={false} animate={{ scaleY: isExpanded ? 1 : 0 }} transition={{ duration: EDGE_DURATION, delay: isExpanded ? EDGE_DURATION : EDGE_DURATION * 2, ease: "linear" }}/>
                <motion.div className="pointer-events-none absolute bottom-0 left-0 z-[999] h-px w-full bg-orange-500" style={EDGE_BOTTOM_STYLE} initial={false} animate={{ scaleX: isExpanded ? 1 : 0 }} transition={{ duration: EDGE_DURATION, delay: isExpanded ? EDGE_DURATION * 2 : EDGE_DURATION, ease: "linear" }}/>
                <motion.div className="pointer-events-none absolute top-0 left-0 z-[999] h-full w-px bg-orange-500" style={EDGE_LEFT_STYLE} initial={false} animate={{ scaleY: isExpanded ? 1 : 0 }} transition={{ duration: EDGE_DURATION, delay: isExpanded ? EDGE_DURATION * 3 : 0, ease: "linear" }}/>

                
                <div className="relative flex h-full w-full overflow-hidden bg-[#121214]">
                  
                  <div className="pointer-events-none absolute inset-0 z-0 opacity-[0.1]" style={GRADIENT_BG_STYLE}/>

                  
                  <div className="relative z-10 flex h-full w-[460px] shrink-0 overflow-hidden rounded-none bg-transparent">
                    <div className="relative flex h-full w-[128px] shrink-0 flex-col items-stretch overflow-hidden bg-[#0d0d0f]">
                      
                      <motion.div className="flex flex-1 items-center justify-center px-2 pt-2 pb-14" style={STRIP_TITLE_STYLE} initial={false} animate={{ x: isExpanded ? -100 : 0 }} transition={{ type: "spring", stiffness: 300, damping: 35 }}>
                        <span className="select-none text-base font-medium uppercase tracking-widest text-white">
                          {item.title}
                        </span>
                      </motion.div>
                      <motion.span className={`absolute left-1/2 flex -translate-x-1/2 shrink-0 ${isExpanded ? "text-orange-400" : "text-white/50"}`} style={{
                    bottom: isExpanded && chevronCenteredIndex === index ? undefined : 16,
                    top: isExpanded && chevronCenteredIndex === index ? "50%" : undefined,
                    y: isExpanded && chevronCenteredIndex === index ? "-50%" : 0,
                }} initial={false} animate={isExpanded
                    ? {
                        x: [0, -100, 0],
                        opacity: [1, 0, 1],
                        scale: [1, 1, 1.55],
                    }
                    : {
                        x: [-WIGGLE_PX, WIGGLE_PX, -WIGGLE_PX],
                        opacity: 1,
                        scale: 1,
                    }} transition={isExpanded
                    ? {
                        duration: 0.32,
                        times: [0, 0.28, 1],
                        ease: "easeOut",
                    }
                    : {
                        duration: WAVE_DURATION,
                        repeat: Infinity,
                        repeatType: "reverse",
                        ease: "easeInOut",
                        delay: -index * WAVE_OFFSET,
                    }}>
                        {isExpanded ? (<ChevronLeft className="h-7 w-7"/>) : (<ChevronRight className="h-4 w-4"/>)}
                      </motion.span>
                    </div>

                    <motion.div ref={item.id === "code-chat"
                    ? liveDocsRefCb
                    : item.id === "glossary-refs"
                        ? glossaryRefsRefCb
                        : item.id === "rag-pipeline"
                            ? umlRefCb
                            : undefined} className="relative flex w-[332px] shrink-0 flex-col overflow-hidden" initial={false} animate={{ opacity: isExpanded ? 1 : 0 }} transition={{
                    opacity: {
                        duration: 0.2,
                        delay: isExpanded ? 0 : 0.45,
                    },
                }} style={{
                    pointerEvents: isExpanded ? "auto" : "none",
                    fontFamily: "var(--font-red-hat-display)",
                }} onMouseMove={item.id === "code-chat" && isExpanded
                    ? handleLiveDocsMouseMove
                    : item.id === "glossary-refs" && isExpanded
                        ? handleGlossaryRefsMouseMoveFromContent
                        : item.id === "rag-pipeline" && isExpanded
                            ? handleUmlMouseMoveFromContent
                            : undefined}>
                      {item.id === "code-chat" && isExpanded && (<OrangeCursorGlowPattern positionRef={liveDocsMouseDisplayRef}/>)}
                      {item.id === "rag-pipeline" && isExpanded && (<OrangeCursorGlowPattern positionRef={umlMouseRef}/>)}
                      {item.id === "glossary-refs" && isExpanded && (<GlossaryCardPattern positionRef={glossaryRefsMouseRef}/>)}
                      {item.id === "onboarding-paths" && isExpanded && <DottedSurface />}
                      {item.id === "pr-analysis" && isExpanded && <AbstractShader />}
                      <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-28 shrink-0" style={FADE_GRADIENT_STYLE}/>
                      
                      <div className="relative z-20 flex min-h-0 flex-1 flex-col items-center justify-center overflow-hidden px-8 pt-8 pb-20 text-center">
                        <p className="max-w-md text-base font-light leading-relaxed text-[#a1a1aa] md:text-lg" style={RED_HAT_DISPLAY_STYLE}>
                          {item.description}
                        </p>
                        <motion.h3 className="absolute bottom-6 right-6 text-right text-2xl font-extralight uppercase tracking-wide text-white md:text-3xl" style={RED_HAT_MONO_STYLE} initial={false} animate={{
                    y: isExpanded ? 0 : 28,
                    opacity: isExpanded ? 1 : 0,
                }} transition={{
                    type: "spring",
                    stiffness: 260,
                    damping: 30,
                    delay: isExpanded ? 0.12 : 0,
                }}>
                          {item.title}
                        </motion.h3>
                      </div>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
              {!numberOnTop && numberBlock}
            </div>);
        })}
      </motion.div>
    </div>);
}
