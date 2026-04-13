'use client';
import { useEffect, useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import CountUp from 'react-countup';
import Navbar from "./components/Navbar";
import SmoothScroll from "./components/SmoothScroll";
type RevealChar = {
    char: string;
    isLetter: boolean;
};
function useInfinityReveal(trigger: boolean, duration = 2400): RevealChar[] {
    const initial: RevealChar[] = 'UNLIMITED'.split('').map(c => ({ char: c, isLetter: true }));
    const [display, setDisplay] = useState<RevealChar[]>(initial);
    const played = useRef(false);
    useEffect(() => {
        if (!trigger || played.current)
            return;
        played.current = true;
        const word = 'UNLIMITED';
        const digits = '0123456789';
        const len = word.length;
        const totalFrames = 60;
        const shrinkStart = 0.4;
        let frame = 0;
        const id = setInterval(() => {
            const progress = frame / totalFrames;
            if (progress >= 0.95) {
                clearInterval(id);
                setDisplay([{ char: '∞', isLetter: true }]);
                return;
            }
            let visibleCount: number;
            if (progress < shrinkStart) {
                visibleCount = len;
            }
            else {
                const shrinkProgress = (progress - shrinkStart) / (0.95 - shrinkStart);
                visibleCount = Math.max(1, Math.round(len * (1 - shrinkProgress)));
            }
            const chars: RevealChar[] = [];
            for (let i = 0; i < visibleCount; i++) {
                if (Math.random() < 0.5) {
                    chars.push({ char: word[i], isLetter: true });
                }
                else {
                    chars.push({ char: digits[Math.floor(Math.random() * digits.length)], isLetter: false });
                }
            }
            setDisplay(chars);
            frame++;
        }, duration / totalFrames);
        return () => clearInterval(id);
    }, [trigger, duration]);
    return display;
}
import WorkflowCurvedConnector from "./components/WorkflowCurvedConnector";
import FeaturesTimeline from "./components/FeaturesTimeline";
import { HorizontalAccordion } from "./components/HorizontalAccordion";
import { CtaButton } from "./components/CtaButton";
const accordionFeatures = [
    {
        id: "code-chat",
        title: "Code-Aware Chat",
        description: "Ask questions and get grounded answers constrained by retrieved context from your organization's vector collections.",
    },
    {
        id: "knowledge-graph",
        title: "Knowledge Graph",
        description: "Visualize your entire codebase as an interactive graph. Explore files, functions, and dependencies as interconnected nodes—understand how everything connects at a glance.",
    },
    {
        id: "onboarding-paths",
        title: "Onboarding Paths",
        description: "Personalized paths for new developers. Generate role-specific modules covering setup, architecture, and contributing\u2014so they ship in hours, not weeks.",
    },
    {
        id: "rag-pipeline",
        title: "RAG Pipeline",
        description: "Your code flows through ingest, chunk, embed, index, and generate. One pipeline turns repositories into searchable, queryable context for AI and humans.",
    },
    {
        id: "glossary-refs",
        title: "Glossary & Code Reference",
        description: "Central glossary and code reference views. Definitions, usages, and cross-links so everyone speaks the same language about your codebase.",
    },
];
const CTA_TEXT = "Ready to get started?";
const CTA_ORANGE_START = 12;
const LANDING_TEAM_MEMBERS = [
    { name: 'Abdur Rahman Abdul Cader', role: 'AI · Retrieval · Backend' },
    { name: 'Razzka Rusmantoro', role: 'Backend · Database · Platform' },
    { name: 'Jordan Bryan Gakam', role: 'UI Design · Visualizations · UX' },
    { name: 'Mahwan Awwalulridjal', role: 'Full-stack Engineer' },
    { name: 'Gleb Shipov', role: 'Full-stack Engineer' },
] as const;
type LandingTeamMember = (typeof LANDING_TEAM_MEMBERS)[number];
const teamMotionEase: [number, number, number, number] = [0.22, 1, 0.36, 1];
function TeamMemberCard({ member }: {
    member: LandingTeamMember;
}) {
    return (<motion.article className="group/card relative flex h-full min-h-0 w-full flex-col rounded-2xl border border-[#2a2a2e] bg-[#131316] p-5 shadow-lg shadow-black/20" initial={false} whileHover={{
            y: -6,
            borderColor: 'rgba(var(--color-primary-rgb), 0.5)',
            boxShadow: '0 20px 40px -14px rgba(0,0,0,0.4), 0 0 0 1px rgba(var(--color-primary-rgb), 0.12)',
            transition: { duration: 0.22, ease: teamMotionEase },
        }} whileTap={{ scale: 0.995 }} transition={{ type: 'spring', stiffness: 420, damping: 30 }}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--color-primary)]/50 to-transparent opacity-60"/>
        <div className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover/card:opacity-100" style={{
                background: 'radial-gradient(640px circle at 50% -20%, rgba(var(--color-primary-rgb), 0.14), transparent 55%)',
            }}/>
        <span className="absolute left-0 top-0 h-full w-[3px] scale-y-0 origin-top rounded-l-2xl bg-gradient-to-b from-[var(--color-primary)] via-[var(--color-primary)]/60 to-transparent transition-transform duration-300 ease-out group-hover/card:scale-y-100"/>
      </div>
      <div className="relative z-10 flex min-h-0 flex-1 flex-col text-left">
        <div className="flex h-[8rem] w-full shrink-0 flex-col justify-start overflow-hidden sm:h-[8.25rem] md:h-[9rem] lg:h-[9.5rem]">
          <h3 className="text-lg font-bold leading-tight tracking-tight text-white break-words [overflow-wrap:anywhere] sm:text-xl md:text-xl lg:text-2xl lg:leading-snug">
            {member.name}
          </h3>
        </div>
        <p className="mt-1 shrink-0 text-sm font-semibold leading-snug text-[var(--color-primary)] md:text-[15px]">
          {member.role}
        </p>
      </div>
    </motion.article>);
}
function TeamSection() {
    const ref = useRef<HTMLElement | null>(null);
    const inView = useInView(ref, { once: true, amount: 0.12, margin: '-32px 0px 0px 0px' });
    return (<section id="team" ref={ref} className="scroll-mt-28 relative overflow-hidden border-t border-white/[0.08] bg-[#0a0a0b] py-24 md:py-32 lg:py-40" aria-labelledby="team-heading">
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--color-primary)]/[0.04] via-transparent to-transparent"/>
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff08_1px,transparent_1px),linear-gradient(to_bottom,#ffffff08_1px,transparent_1px)] bg-[size:40px_40px] opacity-50"/>
        <motion.div className="absolute -left-24 top-1/4 h-[22rem] w-[22rem] rounded-full bg-[var(--color-primary)]/[0.1] blur-[120px]" animate={inView ? { opacity: [0.5, 0.85, 0.5], scale: [1, 1.05, 1] } : { opacity: 0.4 }} transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}/>
        <motion.div className="absolute -right-20 bottom-1/4 h-[24rem] w-[24rem] rounded-full bg-orange-500/[0.09] blur-[130px]" animate={inView ? { opacity: [0.45, 0.8, 0.45], scale: [1, 1.06, 1] } : { opacity: 0.35 }} transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut', delay: 1 }}/>
      </div>

      <div className="container relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div initial={{ opacity: 0, y: 22 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 22 }} transition={{ duration: 0.48, ease: teamMotionEase }}>
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--color-primary)]/35 bg-[var(--color-primary)]/12 px-4 py-1.5 text-sm font-semibold uppercase tracking-wide text-[var(--color-primary)]">
              Meet the team
            </span>
          </motion.div>
          <motion.h2 id="team-heading" className="mt-6 text-4xl font-bold tracking-tight text-white md:text-5xl lg:text-[3.25rem] lg:leading-tight" initial={{ opacity: 0, y: 26 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 26 }} transition={{ duration: 0.52, delay: 0.06, ease: teamMotionEase }}>
            Team
          </motion.h2>
          <motion.p className="mt-5 text-base leading-relaxed text-white/50 md:text-lg md:leading-relaxed" initial={{ opacity: 0, y: 20 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }} transition={{ duration: 0.48, delay: 0.12, ease: teamMotionEase }}>
            People building NeuroCode — documentation, retrieval, and codebase intelligence for real teams.
          </motion.p>
        </div>

        <div className="mt-12 md:mt-14 mx-auto max-w-6xl">
          <ul className="grid list-none grid-cols-1 gap-4 p-0 sm:grid-cols-2 lg:grid-cols-3 md:gap-5 auto-rows-fr">
            {LANDING_TEAM_MEMBERS.slice(0, 3).map((member, index) => (<motion.li key={member.name} className="min-h-0 h-full" initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{
                        duration: 0.55,
                        delay: 0.16 + index * 0.085,
                        ease: teamMotionEase,
                    }}>
                <TeamMemberCard member={member}/>
              </motion.li>))}
          </ul>
          <ul className="mt-5 md:mt-6 flex list-none flex-wrap justify-center gap-4 p-0 md:gap-5">
            {LANDING_TEAM_MEMBERS.slice(3).map((member, index) => (<motion.li key={member.name} className="w-full min-h-0 sm:max-w-md lg:w-[calc((100%-2rem)/3)] lg:max-w-[calc((100%-2rem)/3)] lg:shrink-0" initial={{ opacity: 0, y: 40 }} animate={inView ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }} transition={{
                        duration: 0.55,
                        delay: 0.16 + (3 + index) * 0.085,
                        ease: teamMotionEase,
                    }}>
                <TeamMemberCard member={member}/>
              </motion.li>))}
          </ul>
        </div>
      </div>
    </section>);
}
function CTAStillMore() {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: false, amount: 0.3 });
    const prevInView = useRef(false);
    const [scrollKey, setScrollKey] = useState(0);
    const letters = CTA_TEXT.split('');
    useEffect(() => {
        if (inView && !prevInView.current)
            setScrollKey((k) => k + 1);
        prevInView.current = inView;
    }, [inView]);
    return (<section ref={ref} id="cta" className="scroll-mt-28 relative bg-[#0a0a0b] overflow-hidden">
      <div className="container relative mx-auto max-w-6xl px-4 py-40 md:py-56 lg:py-64 flex flex-col items-center justify-center text-center">
        
        <motion.div key={`glow-${scrollKey}`} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(80vw,600px)] h-[min(80vw,600px)] rounded-full bg-orange-500/[0.02] blur-[80px]" initial={{ opacity: 0, scale: 0.95 }} animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.95 }} transition={{ duration: inView ? 0.35 : 0.1, ease: [0.22, 1, 0.36, 1] }} aria-hidden/>
        
        <motion.span key={`neurocode-${scrollKey}`} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 font-mono font-bold select-none whitespace-nowrap text-[8rem] md:text-[12rem] lg:text-[14rem] leading-none bg-clip-text text-transparent" style={{
            backgroundImage: 'radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.18) 0%, rgba(249, 115, 22, 0.08) 40%, rgba(249, 115, 22, 0.05) 100%)',
            WebkitBackgroundClip: 'text',
        }} initial={{ opacity: 0, scale: 0.98 }} animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.98 }} transition={{ duration: inView ? 0.35 : 0.1, ease: [0.22, 1, 0.36, 1] }} aria-hidden>
          NeuroCode
        </motion.span>
        <p className="relative z-10 text-3xl md:text-4xl lg:text-5xl font-semibold text-white/80 tracking-tight mb-10 inline-flex flex-wrap justify-center">
          {letters.map((char, i) => (<motion.span key={i} className={`inline-block ${i >= CTA_ORANGE_START ? 'text-orange-400' : ''}`} initial={{ y: 28, opacity: 0 }} animate={inView ? { y: 0, opacity: 1 } : { y: 28, opacity: 0 }} transition={{
                duration: inView ? 0.25 : 0.1,
                delay: inView ? i * 0.02 : 0,
                ease: [0.22, 1, 0.36, 1],
            }}>
              {char === ' ' ? '\u00A0' : char}
            </motion.span>))}
        </p>
        <CtaButton href="/login" text="Join now"/>
      </div>
    </section>);
}
export default function Home() {
    const heroRef = useRef<HTMLElement | null>(null);
    const featuresRef = useRef<HTMLElement | null>(null);
    const workflowRef = useRef<HTMLElement | null>(null);
    const statsPlayedRef = useRef(false);
    const [statsShouldCount, setStatsShouldCount] = useState(false);
    const infinityDisplay = useInfinityReveal(statsShouldCount, 2400);
    const [isVisible, setIsVisible] = useState({
        hero: false,
        features: false,
        workflow: false,
    });
    const [codebaseConnected, setCodebaseConnected] = useState(false);
    const [ragActiveStage, setRagActiveStage] = useState(0);
    const [docReady, setDocReady] = useState(false);
    const ragCycleCompleteRef = useRef(false);
    const codebaseDirRef = useRef<HTMLDivElement | null>(null);
    const codebaseScrollThumbRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
        const el = codebaseDirRef.current;
        const thumb = codebaseScrollThumbRef.current;
        if (!codebaseConnected || !el)
            return;
        const duration = 4500;
        let phase: 'down' | 'up' = 'down';
        let startTime: number | null = null;
        const updateThumb = () => {
            if (!thumb)
                return;
            const maxScroll = el.scrollHeight - el.clientHeight;
            const trackHeight = el.clientHeight;
            if (maxScroll <= 0)
                return;
            const thumbHeight = Math.max((el.clientHeight / el.scrollHeight) * trackHeight, 28);
            const thumbTop = (el.scrollTop / maxScroll) * (trackHeight - thumbHeight);
            thumb.style.height = `${thumbHeight}px`;
            thumb.style.transform = `translateY(${thumbTop}px)`;
        };
        const tick = (now: number) => {
            if (startTime === null)
                startTime = now;
            const elapsed = now - startTime;
            const maxScroll = el.scrollHeight - el.clientHeight;
            if (maxScroll <= 0) {
                frameRef.current = requestAnimationFrame(tick);
                return;
            }
            const t = Math.min(elapsed / duration, 1);
            const eased = 1 - (1 - t) * (1 - t);
            if (phase === 'down') {
                el.scrollTop = maxScroll * eased;
                if (t >= 1) {
                    phase = 'up';
                    startTime = now;
                }
            }
            else {
                el.scrollTop = maxScroll * (1 - eased);
                if (t >= 1) {
                    phase = 'down';
                    startTime = now;
                }
            }
            updateThumb();
            frameRef.current = requestAnimationFrame(tick);
        };
        let frameRef = { current: 0 };
        frameRef.current = requestAnimationFrame(tick);
        return () => cancelAnimationFrame(frameRef.current);
    }, [codebaseConnected]);
    useEffect(() => {
        if (!isVisible.workflow)
            return;
        const t = setTimeout(() => setCodebaseConnected(true), 3000);
        return () => clearTimeout(t);
    }, [isVisible.workflow]);
    useEffect(() => {
        if (!codebaseConnected || !isVisible.workflow)
            return;
        const startRag = setTimeout(() => setRagActiveStage(1), 500);
        return () => clearTimeout(startRag);
    }, [codebaseConnected, isVisible.workflow]);
    useEffect(() => {
        if (ragActiveStage < 1 || ragActiveStage > 5)
            return;
        const t = setTimeout(() => {
            if (ragActiveStage === 5) {
                if (!ragCycleCompleteRef.current) {
                    ragCycleCompleteRef.current = true;
                    setDocReady(true);
                }
                setRagActiveStage(1);
            }
            else {
                setRagActiveStage((s) => s + 1);
            }
        }, 1200);
        return () => clearTimeout(t);
    }, [ragActiveStage]);
    useEffect(() => {
        const scrollToHash = () => {
            const raw = window.location.hash.replace(/^#/, "");
            if (!raw) {
                return;
            }
            const id = raw === "roadmap" ? "features" : raw;
            if (id === "hero") {
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
            }
            requestAnimationFrame(() => {
                document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
            });
        };
        scrollToHash();
        window.addEventListener("hashchange", scrollToHash);
        return () => window.removeEventListener("hashchange", scrollToHash);
    }, []);
    useEffect(() => {
        setIsVisible((prev) => ({ ...prev, hero: true }));
        const observers: IntersectionObserver[] = [];
        const createObserver = (ref: React.RefObject<HTMLElement | null>, key: keyof typeof isVisible) => {
            if (!ref.current)
                return;
            const observer = new IntersectionObserver(([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible((prev) => ({ ...prev, [key]: true }));
                }
            }, { threshold: 0.05, rootMargin: '0px 0px -300px 0px' });
            observer.observe(ref.current);
            observers.push(observer);
        };
        createObserver(featuresRef, 'features');
        createObserver(workflowRef, 'workflow');
        return () => {
            observers.forEach((observer) => observer.disconnect());
        };
    }, []);
    useEffect(() => {
        if (!isVisible.features || statsPlayedRef.current)
            return;
        statsPlayedRef.current = true;
        setStatsShouldCount(true);
    }, [isVisible.features]);
    return (<SmoothScroll>
      <Navbar />
      <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-[#0f0f11]">
        
        <section id="hero" ref={heroRef} className={`scroll-mt-28 relative min-h-[60vh] flex items-center justify-center overflow-hidden pt-40 md:pt-56 pb-12 transition-all duration-1000 ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          
          <div className="absolute inset-0 z-0 hidden md:block bg-[linear-gradient(to_right,#ffffff15_1px,transparent_1px),linear-gradient(to_bottom,#ffffff15_1px,transparent_1px)] bg-[size:24px_24px] animate-grid-flow motion-reduce:animate-none">
            
            <div className="absolute inset-0 bg-gradient-to-b from-[#0f0f11] via-transparent to-[#0f0f11]"></div>
            
            <div className="absolute left-1/2 top-0 -translate-x-1/2 bg-[var(--color-primary)]/30 w-[500px] h-[500px] rounded-full blur-[120px] opacity-20"></div>
          </div>
          
          
          <div className="container relative z-10 px-4 mx-auto max-w-7xl">
            <div className="flex flex-col items-center text-center space-y-6">
            
            <h1 className={`text-6xl md:text-7xl font-bold leading-tight transition-all duration-700 ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: isVisible.hero ? '50ms' : '0ms' }}>
              <span className="block text-white">Understand Your Codebase</span>
              <span className="block text-[var(--color-primary)]">With AI Intelligence</span>
            </h1>

            
            <p className={`text-xl text-white/70 max-w-2xl transition-all duration-700 ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: isVisible.hero ? '100ms' : '0ms' }}>
              Autonomous documentation, onboarding services, and repository-wide insights. 
              From code to comprehension in seconds.
            </p>

            <div className="flex flex-col items-center gap-8 mt-8">
              
              <button className={`relative group cta-hero-idle hover:[animation-play-state:paused] px-8 py-3.5 bg-[#171717] border border-[#262626] hover:border-[var(--color-primary)]/60 hover:scale-[1.02] active:scale-[0.98] text-white font-medium rounded-full cursor-pointer transition-all duration-300 flex items-center gap-3 overflow-hidden ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: isVisible.hero ? '150ms' : '0ms' }}>
                <div className="absolute inset-0 rounded-full bg-[var(--color-primary)]/0 group-hover:bg-[var(--color-primary)]/10 transition-colors duration-300"/>
                <div className="absolute -inset-px rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-[var(--color-primary)]/20 blur-sm" aria-hidden/>
                <svg className="w-4 h-4 relative z-10 text-[var(--color-primary)]/80 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M8 5v14l11-7L8 5z"/>
                </svg>
                <span className="relative z-10 tracking-tight">Get Started</span>
                <svg className="w-4 h-4 relative z-10 text-white/60 group-hover:text-[var(--color-primary)] group-hover:translate-x-1 transition-all duration-300 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>

            
            <div className={`mt-12 w-full max-w-4xl relative transition-all duration-700 ${isVisible.hero ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: isVisible.hero ? '200ms' : '0ms' }}>
              
              <div className="absolute inset-0 bg-[var(--color-primary)]/40 rounded-2xl blur-[80px] -z-10 opacity-75"></div>
              <video src="/videos/Product_Preview.mp4" autoPlay loop muted playsInline className="w-full rounded-2xl border border-[#262626] shadow-2xl relative z-10"/>
            </div>
            </div>
          </div>
        </section>

        
        <section id="product" ref={featuresRef} className={`scroll-mt-28 py-24 relative overflow-hidden bg-[#0f0f11] transition-all duration-700 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 -left-20 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[128px]"></div>
            <div className="absolute bottom-1/4 -right-20 w-96 h-96 bg-[var(--color-accent)]/5 rounded-full blur-[128px]"></div>
          </div>

          <div className="container mx-auto px-4 relative z-10">
            <div className="max-w-6xl mx-auto">
              <div className="grid lg:grid-cols-2 gap-16 items-center">
                
                <div className={`transition-all duration-700 delay-100 ${isVisible.features ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-8'}`}>
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold mb-6">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5" aria-hidden="true">
                      <path d="M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z"></path>
                      <path d="M20 2v4"></path>
                      <path d="M22 4h-4"></path>
                      <circle cx="4" cy="20" r="2"></circle>
                    </svg>
                    The Future of Development
                  </div>
                  
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-8 leading-tight text-white">
                    Intelligent Code <span className="text-[var(--color-primary)]">Understanding</span> <br />for Modern Teams.
                  </h2>
                  
                  <div className="space-y-6 text-lg text-white/70 leading-relaxed">
                    <p>
                      NeuroCode isn't just a platform; it's a new way of understanding code. We are an <span className="text-white font-medium">AI-driven organization</span> where intelligent agents autonomously document, analyze, and optimize your entire codebase.
                    </p>
                    <p>
                      We believe documentation should be {' '}
                      <span className="relative inline-block">
                        <span className={`absolute inset-y-[-2px] inset-x-[-6px] bg-[var(--color-accent)]/15 rounded-sm transition-transform duration-1000 ease-out origin-left ${isVisible.features ? 'scale-x-100' : 'scale-x-0'}`} style={{ transitionDelay: '600ms' }}/>
                        <span className={`relative font-medium italic transition-colors duration-700 ${isVisible.features ? 'text-[var(--color-accent)]' : 'text-white/70'}`} style={{ transitionDelay: '600ms' }}>
                          automatically generated
                        </span>
                      </span>
                      . By leveraging multi-agent AI systems, we close the gap between code complexity and developer understanding, allowing teams to onboard faster while AI handles the heavy lifting.
                    </p>
                  </div>
                  
                  <div className="mt-10 flex flex-nowrap gap-6 items-end">
                    <div className="flex flex-col shrink-0">
                      <span className="text-3xl font-bold text-white font-mono tabular-nums">
                        {statsShouldCount ? <CountUp start={0} end={90} duration={2.0} suffix="%"/> : '0%'}
                      </span>
                      <span className="text-sm text-white/50 uppercase tracking-wider font-semibold">Faster Onboarding</span>
                    </div>
                    <div className="w-px h-12 bg-white/10 hidden sm:block shrink-0"></div>
                    <div className="flex flex-col shrink-0">
                      <span className="text-3xl font-bold text-white font-mono tabular-nums">
                        {statsShouldCount ? <CountUp start={0} end={100} duration={2.0} suffix="%"/> : '0%'}
                      </span>
                      <span className="text-sm text-white/50 uppercase tracking-wider font-semibold">Auto-Documented</span>
                    </div>
                    <div className="w-px h-12 bg-white/10 hidden sm:block shrink-0"></div>
                    <div className="flex flex-col shrink-0 min-w-0">
                      <span className="text-3xl font-bold font-mono tabular-nums whitespace-nowrap">
                        {infinityDisplay.map((c, i) => (<span key={i} className={c.isLetter ? 'text-[var(--color-accent)]' : 'text-white'}>
                            {c.char}
                          </span>))}
                      </span>
                      <span className="text-sm text-white/50 uppercase tracking-wider font-semibold">Intelligence</span>
                    </div>
                  </div>
                </div>

                
                <div className={`grid gap-6 transition-all duration-700 delay-200 ${isVisible.features ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-8'}`}>
                  
                  <div className={`relative bg-[#171717]/50 border border-[#262626] backdrop-blur-sm rounded overflow-hidden group hover:border-[var(--color-primary)]/50 transition-all duration-500 p-6 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: isVisible.features ? '300ms' : '0ms' }}>
                    <div className="pointer-events-none absolute -inset-px rounded opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(650px circle at 0px 0px, rgba(var(--color-primary-rgb), 0.1), transparent 80%)` }}></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none"></div>
                    <div className="relative z-10">
                      <div className="flex items-start gap-5">
                        <div className="p-3 rounded flex-shrink-0 bg-[var(--color-primary)]/10">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[var(--color-primary)]" aria-hidden="true">
                            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">Auto-Generated Documentation</h3>
                          <p className="text-white/70 text-sm leading-relaxed">AI agents analyze your entire codebase and generate comprehensive documentation automatically, keeping it always up-to-date.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  
                  <div className={`relative bg-[#171717]/50 border border-[#262626] backdrop-blur-sm rounded overflow-hidden group hover:border-[var(--color-primary)]/50 transition-all duration-500 p-6 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: isVisible.features ? '400ms' : '0ms' }}>
                    <div className="pointer-events-none absolute -inset-px rounded opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(650px circle at 0px 0px, rgba(var(--color-primary-rgb), 0.1), transparent 80%)` }}></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none"></div>
                    <div className="relative z-10">
                      <div className="flex items-start gap-5">
                        <div className="p-3 rounded flex-shrink-0 bg-[var(--color-accent)]/10">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-[var(--color-accent)]" aria-hidden="true">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                            <circle cx="9" cy="7" r="4"></circle>
                            <path d="M22 21v-2a4 4 0 0 0-3-3.87"></path>
                            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">Instant Onboarding</h3>
                          <p className="text-white/70 text-sm leading-relaxed">New developers get up to speed in hours, not weeks. Personalized onboarding paths powered by AI understand your codebase structure.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  
                  <div className={`relative bg-[#171717]/50 border border-[#262626] backdrop-blur-sm rounded overflow-hidden group hover:border-[var(--color-primary)]/50 transition-all duration-500 p-6 ${isVisible.features ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`} style={{ transitionDelay: isVisible.features ? '500ms' : '0ms' }}>
                    <div className="pointer-events-none absolute -inset-px rounded opacity-0 transition duration-300 group-hover:opacity-100" style={{ background: `radial-gradient(650px circle at 0px 0px, rgba(var(--color-primary-rgb), 0.1), transparent 80%)` }}></div>
                    <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] opacity-20 pointer-events-none"></div>
                    <div className="relative z-10">
                      <div className="flex items-start gap-5">
                        <div className="p-3 rounded flex-shrink-0 bg-green-500/10">
                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-green-500" aria-hidden="true">
                            <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">Repository Intelligence</h3>
                          <p className="text-white/70 text-sm leading-relaxed">Graph-based code understanding captures dependencies, relationships, and patterns across your entire repository in real-time.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                      
              </div>
            </div>
          </div>
        </section>

        
        <section id="workflow" ref={workflowRef} className={`scroll-mt-28 py-24 relative overflow-hidden bg-[#0a0a0b] transition-all duration-700 ${isVisible.workflow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'}`}>
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff06_1px,transparent_1px),linear-gradient(to_bottom,#ffffff06_1px,transparent_1px)] bg-[size:24px_24px] opacity-60 pointer-events-none"/>
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-64 h-64 rounded-full bg-[var(--color-primary)] blur-[100px] opacity-20"/>
            <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full bg-[var(--color-primary)] blur-[80px] opacity-15"/>
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-[#0a0a0b]/50 via-transparent to-[#0a0a0b]/50 pointer-events-none"/>

          <div className="container mx-auto px-4 relative z-10">
            <div className="text-center mb-16">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded border border-[var(--color-primary)]/30 bg-[var(--color-primary)]/10 text-[var(--color-primary)] text-xs font-semibold mb-4">
                How it works
              </div>
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                From Repo to Docs in One Flow
              </h2>
              <p className="text-white/60 max-w-xl mx-auto">
                Your codebase flows through our RAG pipeline into living documentation.
              </p>
            </div>

            <div className="flex flex-col lg:flex-row items-stretch justify-center gap-8 lg:gap-0 max-w-6xl mx-auto">
              
              <div className={`relative flex-1 min-w-0 max-w-md mx-auto lg:mx-0 transition-all duration-700 ${isVisible.workflow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: isVisible.workflow ? '100ms' : '0ms' }}>
                <div className="workflow-panel h-full flex flex-col rounded-2xl">
                  <div className="workflow-stage-title">
                    <span className="workflow-stage-title-icon workflow-stage-title-icon-code" aria-hidden/>
                    <span>Your codebase</span>
                  </div>
                  <div className="flex-1 flex flex-col px-5 pb-5 min-h-0">
                    <div className="flex-1 rounded-xl bg-[#1a1a1d]/60 flex items-center justify-center p-5 min-h-[200px] relative overflow-hidden">
                      {!codebaseConnected ? (<button type="button" onClick={() => setCodebaseConnected(true)} className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-white/20 bg-white/[0.02] hover:border-[var(--color-primary)]/50 hover:bg-[var(--color-primary)]/5 px-6 py-5 transition-all duration-300 group workflow-connect-btn">
                          <div className="w-12 h-12 rounded-xl bg-[#262626] flex items-center justify-center group-hover:bg-[var(--color-primary)]/15 transition-colors">
                            <svg className="w-6 h-6 text-white/60 group-hover:text-[var(--color-primary)]" fill="currentColor" viewBox="0 0 24 24"><path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd"/></svg>
                          </div>
                          <span className="text-sm font-medium text-white/90">Connect repository</span>
                          <span className="text-xs text-white/50">Connect to GitHub</span>
                        </button>) : (<div className="w-full max-w-[260px] mx-auto workflow-codebase-reveal">
                          <div className="rounded-xl bg-[#0d0d0f]/90 border border-white/5 overflow-hidden">
                            <div className="flex items-center gap-1.5 px-2.5 py-2 bg-white/[0.04] border-b border-white/5">
                              <span className="w-2.5 h-2.5 rounded-full bg-red-500/70"/>
                              <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70"/>
                              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70"/>
                              <span className="ml-1 text-[10px] text-white/40 font-mono">src/</span>
                            </div>
                            <div className="flex items-stretch border-t border-white/5">
                              <div ref={codebaseDirRef} className="flex-1 min-w-0 h-[140px] overflow-y-auto overflow-x-hidden workflow-codebase-dir">
                                <div className="p-2.5 space-y-1">
                                  {[
                { type: 'folder' as const, name: 'components/', primary: true },
                { type: 'file' as const, name: 'Button.tsx', primary: true },
                { type: 'file' as const, name: 'api.ts', primary: true },
                { type: 'folder' as const, name: 'lib/', primary: true },
                { type: 'file' as const, name: 'utils.ts', primary: false },
                { type: 'file' as const, name: 'types.ts', primary: false },
                { type: 'folder' as const, name: 'hooks/', primary: false },
                { type: 'file' as const, name: 'useAuth.ts', primary: false },
                { type: 'file' as const, name: 'useFetch.ts', primary: false },
                { type: 'folder' as const, name: 'styles/', primary: false },
                { type: 'file' as const, name: 'theme.ts', primary: false },
                { type: 'file' as const, name: 'index.ts', primary: false },
                { type: 'folder' as const, name: 'config/', primary: false },
                { type: 'file' as const, name: 'constants.ts', primary: false },
                { type: 'file' as const, name: 'env.ts', primary: false },
            ].map((item, idx) => (<div key={idx} className={`flex items-center gap-1.5 ${item.type === 'folder' ? '' : 'pl-4'} ${item.primary ? 'text-white/50' : 'text-white/40'}`}>
                                      {item.type === 'folder' ? (<svg className={`w-4 h-4 flex-shrink-0 ${item.primary ? 'text-[var(--color-primary)]/80' : 'text-white/30'}`} fill="currentColor" viewBox="0 0 20 20"><path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z"/></svg>) : (<svg className={`w-3.5 h-3.5 flex-shrink-0 ${item.primary ? 'text-[var(--color-primary)]/60' : 'text-white/30'}`} fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd"/></svg>)}
                                      <span className="text-[10px] font-mono truncate">{item.name}</span>
                                    </div>))}
                                </div>
                              </div>
                              <div className="relative w-[6px] h-[140px] flex-shrink-0 bg-white/[0.06] rounded-r overflow-hidden workflow-codebase-scrollbar-track">
                                <div ref={codebaseScrollThumbRef} className="workflow-codebase-scrollbar-thumb absolute left-0 top-0 w-full rounded min-h-[28px]" style={{ height: 28, transform: 'translateY(0)' }}/>
                              </div>
                            </div>
                          </div>
                          <div className="mt-3 flex justify-center gap-1">
                            <div className="h-0.5 w-4 rounded bg-[var(--color-primary)]/40"/>
                            <div className="h-0.5 w-6 rounded bg-[var(--color-primary)]/30"/>
                            <div className="h-0.5 w-3 rounded bg-[var(--color-primary)]/50"/>
                          </div>
                        </div>)}
                    </div>
                  </div>
                </div>
              </div>

              <WorkflowCurvedConnector />

              
              <div className={`relative flex-1 min-w-0 max-w-md mx-auto lg:mx-0 transition-all duration-700 ${isVisible.workflow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: isVisible.workflow ? '200ms' : '0ms' }}>
                <div className="workflow-panel h-full flex flex-col rounded-2xl">
                  <div className="workflow-stage-title">
                    <span className="workflow-stage-title-icon workflow-stage-title-icon-rag" aria-hidden/>
                    <span>RAG pipeline</span>
                  </div>
                  <div className="flex-1 flex flex-col px-5 pb-5 min-h-0">
                    <div className="flex-1 rounded-xl bg-[#1a1a1d]/60 flex items-center justify-center p-4 min-h-[200px]">
                      <div className="w-full max-w-[240px]">
                        {[
            { icon: 'inbox', color: 'workflow-node-orange', label: 'Ingest' },
            { icon: 'scissors', color: 'workflow-node-purple', label: 'Chunk' },
            { icon: 'cube', color: 'workflow-node-green', label: 'Embed' },
            { icon: 'search', color: 'workflow-node-blue', label: 'Index' },
            { icon: 'sparkles', color: 'workflow-node-pink', label: 'Generate' },
        ].map(({ icon, color, label }, i) => {
            const stageNum = i + 1;
            const isActive = ragActiveStage === stageNum;
            const isComplete = ragActiveStage > stageNum;
            const visible = isActive || isComplete;
            return (<div key={i} className="workflow-rag-row">
                              <div className="workflow-rag-row-icon">
                                <div className={`workflow-pipeline-node ${color} ${visible ? 'workflow-node-visible' : ''}`}>
                                  {icon === 'inbox' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"/></svg>}
                                  {icon === 'scissors' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z"/></svg>}
                                  {icon === 'cube' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>}
                                  {icon === 'search' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>}
                                  {icon === 'sparkles' && <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"/></svg>}
                                </div>
                              </div>
                              <span className={`workflow-rag-label ${visible ? 'workflow-rag-label-visible' : ''}`}>{label}</span>
                              <div className="workflow-rag-bar-wrap">
                                {isActive && <div className="workflow-rag-bar" key={ragActiveStage}/>}
                                {isComplete && <div className="workflow-rag-bar workflow-rag-bar-full"/>}
                              </div>
                              {i < 4 && <div className="workflow-rag-connector"/>}
                            </div>);
        })}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <WorkflowCurvedConnector mirror/>

              
              <div className={`relative flex-1 min-w-0 max-w-md mx-auto lg:mx-0 transition-all duration-700 ${isVisible.workflow ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`} style={{ transitionDelay: isVisible.workflow ? '300ms' : '0ms' }}>
                <div className="workflow-panel h-full flex flex-col rounded-2xl">
                  <div className="workflow-stage-title">
                    <span className="workflow-stage-title-icon workflow-stage-title-icon-doc" aria-hidden/>
                    <span>Documentation generation</span>
                  </div>
                  <div className="flex-1 flex flex-col px-5 pb-5 min-h-0">
                    <div className="flex-1 rounded-xl bg-[#1a1a1d]/60 flex items-center justify-center p-5 min-h-[200px] relative overflow-hidden">
                      <div className="w-full max-w-[200px]">
                        {!docReady ? (<div className="flex flex-col items-center gap-4 workflow-doc-generating">
                            <div className="w-14 h-14 rounded-xl bg-[var(--color-primary)]/10 border border-[var(--color-primary)]/20 flex items-center justify-center">
                              <svg className="w-7 h-7 text-[var(--color-primary)] animate-[workflow-doc-spin_1.5s_linear_infinite]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/></svg>
                            </div>
                            <div className="text-center">
                              <p className="text-sm font-medium text-white/90">Generating docs</p>
                              <p className="text-xs text-white/50 mt-0.5">From your codebase...</p>
                            </div>
                            <div className="flex gap-1">
                              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]/60 animate-[workflow-doc-dot_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}/>
                              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]/60 animate-[workflow-doc-dot_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.2s' }}/>
                              <span className="w-2 h-2 rounded-full bg-[var(--color-primary)]/60 animate-[workflow-doc-dot_0.6s_ease-in-out_infinite]" style={{ animationDelay: '0.4s' }}/>
                            </div>
                          </div>) : (<div className="workflow-doc-ready workflow-doc-loop">
                            <div className="rounded-lg bg-[#0d0d0f]/90 border border-white/5 overflow-hidden mb-3 workflow-doc-card">
                              <div className="px-2.5 py-2 bg-[var(--color-primary)]/10 border-b border-white/5 flex items-center gap-2">
                                <svg className="w-4 h-4 text-[var(--color-primary)] flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                                <div className="min-w-0">
                                  <p className="text-[10px] font-semibold text-white/90 truncate">Getting Started</p>
                                  <p className="text-[8px] text-white/50">Overview · Quick start</p>
                                </div>
                              </div>
                              <div className="p-2 space-y-1.5 workflow-doc-lines">
                                <div className="h-1 w-full rounded bg-white/20"/>
                                <div className="h-1 w-4/5 rounded bg-white/15"/>
                                <div className="h-1 w-3/4 rounded bg-white/10"/>
                                <div className="h-1 w-1/2 rounded bg-[var(--color-primary)]/30 workflow-doc-line-highlight"/>
                              </div>
                            </div>
                            <div className="workflow-doc-cycle mb-3">
                              <p className="text-[8px] text-white/40 uppercase tracking-wider mb-1.5">Also available</p>
                              <div className="flex flex-wrap justify-center gap-1.5">
                                {['API Reference', 'Architecture', 'Guides'].map((title, idx) => (<span key={title} className="workflow-doc-cycle-item rounded bg-white/5 px-2 py-1 text-[8px] text-white/60 border border-white/10" style={{ animationDelay: `${idx * 0.4}s` }}>{title}</span>))}
                              </div>
                            </div>
                            <div className="flex justify-center">
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/25 px-2.5 py-1 text-[9px] font-medium text-emerald-400/90 workflow-doc-live">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"/>
                                Live · auto-sync
                              </span>
                            </div>
                          </div>)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <FeaturesTimeline />

        <section className="relative bg-[#0a0a0b]">
          <div className="container mx-auto w-full max-w-7xl px-4 pt-0 pb-32 md:pb-44">
            <HorizontalAccordion items={accordionFeatures}/>
          </div>
        </section>

        <TeamSection />

        
        <CTAStillMore />

        
        <div className="flex justify-center bg-[#171717] py-6">
          <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="flex cursor-pointer items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-white/70 transition-colors hover:border-orange-500/40 hover:bg-white/10 hover:text-white" aria-label="Back to top">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18"/>
            </svg>
            Back to top
          </button>
        </div>

        
        <footer className="relative border-t border-[#262626] bg-[#171717]">
          <div className="container mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
            <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:justify-between lg:gap-16">
              <div className="max-w-md">
                <a href="/" className="inline-block">
                  <img src="/Full-logo.png" alt="NeuroCode" className="h-8 w-auto"/>
                </a>
                <p className="mt-4 text-sm leading-relaxed text-white/50">
                  Connect GitHub, explore repositories with documentation and knowledge views, and use AI grounded in your org’s code. Sign in to open the app workspace.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 sm:gap-12 lg:flex lg:shrink-0 lg:gap-16">
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">Account</h4>
                  <ul className="mt-4 space-y-2.5">
                    <li><a href="/login" className="text-sm text-white/45 transition-colors hover:text-[var(--color-primary)]">Sign in</a></li>
                    <li><a href="/register" className="text-sm text-white/45 transition-colors hover:text-[var(--color-primary)]">Create account</a></li>
                  </ul>
                </div>
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-white/70">On this page</h4>
                  <ul className="mt-4 space-y-2.5">
                    <li><a href="#product" className="text-sm text-white/45 transition-colors hover:text-[var(--color-primary)]">Product</a></li>
                    <li><a href="#workflow" className="text-sm text-white/45 transition-colors hover:text-[var(--color-primary)]">Workflow</a></li>
                    <li><a href="#features" className="text-sm text-white/45 transition-colors hover:text-[var(--color-primary)]">Features</a></li>
                    <li><a href="#team" className="text-sm text-white/45 transition-colors hover:text-[var(--color-primary)]">Team</a></li>
                    <li><a href="#cta" className="text-sm text-white/45 transition-colors hover:text-[var(--color-primary)]">Get started</a></li>
                  </ul>
                </div>
              </div>
            </div>
            <div className="mt-12 border-t border-[#262626] pt-8">
              <p className="text-center text-sm text-white/35 sm:text-left">
                © {new Date().getFullYear()} NeuroCode. Web app built with Next.js; sign in to use organization and repository features in the product.
              </p>
            </div>
          </div>
        </footer>

      </div>
    </SmoothScroll>);
}
