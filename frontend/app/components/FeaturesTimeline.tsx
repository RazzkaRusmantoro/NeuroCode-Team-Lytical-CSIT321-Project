'use client';
import { useRef, useState, useEffect } from 'react';
import { motion, useScroll, useTransform, useInView } from 'framer-motion';
import { Compass, Network, Flame, FileText, Share2 } from 'lucide-react';
import CountUp from 'react-countup';
const features = [
    {
        id: 'live-docs',
        title: 'Live Documentation',
        icon: FileText,
        description: 'AI-generated docs that stay in sync with your codebase. Connect your repo and get architecture overviews, API references, and guides that update automatically.',
    },
    {
        id: 'visual-tree',
        title: 'Architecture Visual Tree',
        icon: Network,
        description: 'Generate a structure-oriented understanding of your repository with navigable architecture views augmented by AI.',
    },
    {
        id: 'uml-diagrams',
        title: 'UML & Diagrams',
        icon: Share2,
        description: 'Sequence, class, use-case, and state diagrams generated from your code. Navigate and share architecture visually without maintaining diagrams by hand.',
    },
    {
        id: 'task-compass',
        title: 'Task Compass',
        icon: Compass,
        description: 'Context helper for your tasks. Produces summary, caution areas, relevant files, entry points, and ownership to orient you before implementation.',
    },
    {
        id: 'hot-zones',
        title: 'Hot Zones & Risk Patterns',
        icon: Flame,
        description: 'Surface activity and risk patterns. Recommends relevant code areas by semantic similarity to focus your impact where it matters most.',
    }
];
const SCRAMBLE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
function useTextScramble(finalText: string, trigger: boolean, duration = 1000): string {
    const [output, setOutput] = useState(finalText);
    const played = useRef(false);
    useEffect(() => {
        if (!trigger || played.current)
            return;
        played.current = true;
        const len = finalText.length;
        const totalFrames = 30;
        let frame = 0;
        const id = setInterval(() => {
            const progress = frame / totalFrames;
            const revealCount = Math.floor(progress * len * 1.3);
            let result = '';
            for (let i = 0; i < len; i++) {
                if (finalText[i] === ' ') {
                    result += ' ';
                }
                else if (i < revealCount) {
                    result += finalText[i];
                }
                else {
                    result += SCRAMBLE_CHARS[Math.floor(Math.random() * SCRAMBLE_CHARS.length)];
                }
            }
            setOutput(result);
            frame++;
            if (frame >= totalFrames) {
                clearInterval(id);
                setOutput(finalText);
            }
        }, duration / totalFrames);
        return () => clearInterval(id);
    }, [trigger, finalText, duration]);
    return output;
}
export default function FeaturesTimeline() {
    const containerRef = useRef<HTMLDivElement>(null);
    const headingRef = useRef<HTMLDivElement>(null);
    const scrollCtaRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start center", "end 0.85"]
    });
    const { scrollYProgress: headingScroll } = useScroll({
        target: headingRef,
        offset: ["start 0.9", "end 0.1"]
    });
    const lineHeight = useTransform(scrollYProgress, [0, 1], ["0%", "100%"]);
    const headingY = useTransform(headingScroll, [0, 0.4, 0.8, 1], [100, 0, 0, -50]);
    const headingOpacity = useTransform(headingScroll, [0, 0.3, 0.8, 1], [0, 1, 1, 0]);
    const headingScale = useTransform(headingScroll, [0, 0.3, 0.8, 1], [0.9, 1, 1, 0.95]);
    const headingInView = useInView(headingRef, { once: true, margin: "-5%" });
    const scrambledText = useTextScramble('in seconds.', headingInView, 1000);
    const scrollCtaInView = useInView(scrollCtaRef, { once: false, amount: 0.5 });
    return (<section id="features" className="scroll-mt-28 py-24 md:py-32 relative bg-[#0a0a0b] overflow-hidden">
      
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-orange-500/5 blur-[200px] rounded-full pointer-events-none"/>

      
      <div className="container mx-auto px-4 relative z-10 mb-24 md:mb-32" ref={headingRef}>
        <motion.div style={{
            y: headingY,
            opacity: headingOpacity,
            scale: headingScale
        }} className="max-w-4xl mx-auto md:ml-[10%] lg:ml-[15%] text-left">
          <h2 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 tracking-tight leading-tight">
            From codebase to context <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 inline-block">
              {scrambledText}
            </span>
          </h2>
          <p className="text-white/60 max-w-2xl text-lg md:text-xl leading-relaxed font-medium">
            Our intelligent pipeline handles everything automatically — <br className="hidden md:block"/>
            just connect your repo and let AI do the rest.
          </p>
        </motion.div>
      </div>

      <div className="container mx-auto px-4 relative z-10 pb-20">
        <div className="relative max-w-5xl mx-auto" ref={containerRef}>
          
          <div className="absolute left-8 md:left-1/2 top-4 bottom-4 w-px bg-white/10 transform md:-translate-x-1/2 z-0">
            
            <motion.div className="absolute left-1/2 top-0 w-[2px] bg-gradient-to-b from-orange-400 via-orange-500 to-orange-600 transform -translate-x-1/2 z-[-1]" style={{ height: lineHeight }}/>
          </div>

          <div className="space-y-24 md:space-y-40 relative z-10 pt-10 pb-10">
            {features.map((feature, index) => (<TimelineItem key={feature.id} feature={feature} index={index} isEven={index % 2 === 0} totalItems={features.length} scrollYProgress={scrollYProgress}/>))}
          </div>
        </div>
      </div>

      
      <div ref={scrollCtaRef} className="flex flex-col items-center pt-12 pb-7 md:pt-16 md:pb-10 relative z-10">
        <motion.p initial={false} animate={scrollCtaInView
            ? { opacity: 1, y: 0, scale: 1 }
            : { opacity: 0, y: 24, scale: 0.96 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }} className="text-3xl md:text-4xl lg:text-5xl font-semibold text-white/70 tracking-tight">
          There's more.
        </motion.p>
      </div>
    </section>);
}
function TimelineItem({ feature, index, isEven, totalItems, scrollYProgress }: {
    feature: typeof features[number];
    index: number;
    isEven: boolean;
    totalItems: number;
    scrollYProgress: any;
}) {
    const itemRef = useRef<HTMLDivElement>(null);
    const triggerPoint = index === 0 ? 0.05 : (index / totalItems) + 0.05;
    const [isTriggered, setIsTriggered] = useState(false);
    useEffect(() => {
        return scrollYProgress.onChange((latest: number) => {
            if (latest >= triggerPoint && !isTriggered) {
                setIsTriggered(true);
            }
            else if (latest < triggerPoint && isTriggered) {
                setIsTriggered(false);
            }
        });
    }, [scrollYProgress, triggerPoint, isTriggered]);
    const Icon = feature.icon;
    return (<div ref={itemRef} className="relative flex flex-col md:flex-row items-center w-full group py-16">
      
      <motion.div initial={false} animate={isTriggered ? {
            scale: 1.3,
            borderColor: "rgba(249,115,22,0.6)",
            boxShadow: "0 0 40px rgba(249,115,22,0.4)",
            backgroundColor: "rgba(10,10,11,1)"
        } : {
            scale: 1,
            borderColor: "rgba(255,255,255,0.1)",
            boxShadow: "0 0 0px rgba(249,115,22,0)",
            backgroundColor: "rgba(10,10,11,1)"
        }} transition={{ type: "spring", stiffness: 300, damping: 20 }} className="absolute left-8 md:left-1/2 top-1/2 transform -translate-y-1/2 -translate-x-1/2 w-12 h-12 md:w-16 md:h-16 rounded-full z-20 flex items-center justify-center border bg-[#0a0a0b]">
         
        {isTriggered && [0, 0.6, 1.2].map((delay) => (<motion.div key={delay} initial={{ scale: 1, opacity: 0 }} animate={{ scale: 3, opacity: [0, 0.5, 0] }} transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut", delay }} className="absolute inset-0 border border-orange-500 rounded-full pointer-events-none" style={{ zIndex: -1 }}/>))}
        
        
        {isTriggered && (<motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }} className="absolute inset-0 bg-orange-500/30 rounded-full blur-xl animate-pulse z-0"/>)}
        
        <Icon className={`relative z-10 w-5 h-5 md:w-6 md:h-6 transition-colors duration-500 ${isTriggered ? 'text-orange-400' : 'text-white/30'}`}/>
      </motion.div>

      
      <div className="hidden md:block w-1/2 pr-12 lg:pr-24">
        {isEven && (<motion.div initial={false} animate={isTriggered ? { opacity: 1, x: 0 } : { opacity: 0.3, x: -20 }} transition={{ duration: 0.6, type: "spring", bounce: 0.4 }} className="flex justify-end relative z-30">
            <FeatureCard feature={feature} index={index} align="right" isActive={isTriggered}/>
          </motion.div>)}
      </div>

      
      <div className="hidden md:block w-1/2 pl-12 lg:pl-24">
        {!isEven && (<motion.div initial={false} animate={isTriggered ? { opacity: 1, x: 0 } : { opacity: 0.3, x: 20 }} transition={{ duration: 0.6, type: "spring", bounce: 0.4 }} className="flex justify-start relative z-30">
            <FeatureCard feature={feature} index={index} align="left" isActive={isTriggered}/>
          </motion.div>)}
      </div>

      
      <div className="md:hidden pl-24 w-full relative z-30">
        <motion.div initial={false} animate={isTriggered ? { opacity: 1, x: 0 } : { opacity: 0.3, x: 20 }} transition={{ duration: 0.6, type: "spring", bounce: 0.4 }}>
          <FeatureCard feature={feature} index={index} align="left" isActive={isTriggered}/>
        </motion.div>
      </div>

    </div>);
}
const formatNumber = (n: number) => String(Math.round(n)).padStart(2, '0');
function FeatureCard({ feature, index, align, isActive }: {
    feature: typeof features[number];
    index: number;
    align: 'left' | 'right';
    isActive: boolean;
}) {
    const targetNumber = index + 1;
    const [shouldCount, setShouldCount] = useState(false);
    const hasAnimated = useRef(false);
    useEffect(() => {
        if (isActive && !hasAnimated.current) {
            hasAnimated.current = true;
            setShouldCount(true);
        }
    }, [isActive]);
    const numberDisplay = shouldCount
        ? <CountUp start={0} end={targetNumber} duration={1.0} formattingFn={formatNumber}/>
        : '00';
    return (<div className="relative group w-full max-w-[480px]">
      
      
      <div className={`hidden md:block absolute top-1/2 -translate-y-1/2 ${align === 'right'
            ? 'right-[calc(100%+2rem)] lg:right-[calc(100%+3rem)]'
            : 'left-[calc(100%+2rem)] lg:left-[calc(100%+3rem)]'} font-mono font-extrabold text-[8rem] lg:text-[12rem] leading-none transition-all duration-700 select-none pointer-events-none timeline-number-outline ${isActive ? 'timeline-number-outline-active scale-100' : 'scale-90'}`}>
        {numberDisplay}
      </div>

      
      <div className={`bg-[#121214]/80 backdrop-blur-sm border rounded-2xl p-8 md:p-10 relative transition-all duration-500 w-full ${isActive ? 'border-orange-500/30 shadow-[0_10px_40px_-15px_rgba(249,115,22,0.2)]' : 'border-white/5'}`}>
        
        
        <div className={`md:hidden font-mono font-bold text-5xl mb-6 timeline-number-outline-mobile ${isActive ? 'timeline-number-outline-mobile-active' : ''}`}>
          {numberDisplay}
        </div>

        <div className={`flex flex-col relative z-10 ${align === 'right' ? 'items-end text-right' : 'items-start text-left'}`}>
          
          <h3 className={`text-2xl md:text-3xl font-bold mb-4 tracking-tight transition-colors duration-500 ${isActive ? 'text-white' : 'text-white/40'}`}>
            {feature.title}
          </h3>
          
          
          <p className={`leading-relaxed text-sm md:text-[15px] max-w-sm transition-colors duration-500 ${isActive ? 'text-[#a1a1aa]' : 'text-[#a1a1aa]/40'}`}>
            {feature.description}
          </p>
          
          
          <div className={`mt-8 h-[2px] rounded-full transition-all duration-700 ${isActive ? 'w-16 bg-orange-500' : 'w-8 bg-white/10'}`}></div>
        </div>
      </div>
    </div>);
}
