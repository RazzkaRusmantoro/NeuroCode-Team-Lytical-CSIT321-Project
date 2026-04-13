'use client';
import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
const content = [
    {
        title: "Graph-Based Memory",
        description: "We don't just chunk your code. We build a semantic graph of every function, class, and dependency so the AI understands your architecture like a senior engineer.",
        gradient: "from-orange-500/20 to-rose-500/20",
        border: "border-orange-500/30",
        icon: "bg-orange-500/50"
    },
    {
        title: "Context-Aware Chat",
        description: "Ask anything about your codebase. Our models fetch exact file references, line numbers, and explain the 'why' behind complex business logic.",
        gradient: "from-blue-500/20 to-cyan-500/20",
        border: "border-blue-500/30",
        icon: "bg-blue-500/50"
    },
    {
        title: "Automated PR Reviews",
        description: "Stop merging blind. NeuroCode catches security flaws, anti-patterns, and architectural regressions before they hit your main branch.",
        gradient: "from-emerald-500/20 to-teal-500/20",
        border: "border-emerald-500/30",
        icon: "bg-emerald-500/50"
    }
];
export default function FluidScrollReveal() {
    const containerRef = useRef<HTMLDivElement>(null);
    const { scrollYProgress } = useScroll({
        target: containerRef,
        offset: ["start start", "end end"]
    });
    return (<section ref={containerRef} className="relative bg-[#0a0a0b] h-[300vh]">
      <div className="sticky top-0 h-screen flex items-center overflow-hidden">
        
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none"/>

        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-12 lg:gap-24 relative z-10">
          
          
          <div className="hidden xl:flex flex-col items-center gap-4 absolute -left-12 top-1/2 -translate-y-1/2 z-20">
            <span className="text-[10px] uppercase tracking-widest text-white/40 font-bold rotate-180" style={{ writingMode: 'vertical-rl' }}>
              Scroll Progress
            </span>
            <div className="h-[300px] w-1 bg-white/10 rounded-full overflow-hidden">
              <motion.div className="w-full bg-white/60 rounded-full origin-top" style={{
            height: "100%",
            scaleY: scrollYProgress
        }}/>
            </div>
          </div>

          
          <div className="w-full md:w-1/2 flex flex-col justify-center relative h-[400px]">
            {content.map((item, index) => {
            const step = 1 / content.length;
            const start = index * step;
            const end = start + step;
            const opacity = useTransform(scrollYProgress, [Math.max(0, start - 0.1), start, end - 0.1, Math.min(1, end + 0.1)], [0, 1, 1, 0]);
            const y = useTransform(scrollYProgress, [Math.max(0, start - 0.1), start, end - 0.1, Math.min(1, end + 0.1)], [40, 0, 0, -40]);
            return (<motion.div key={index} style={{ opacity, y }} className="absolute inset-0 flex flex-col justify-center pointer-events-none">
                  <h2 className="text-5xl md:text-6xl font-extrabold text-white mb-6 tracking-tight leading-tight">
                    {item.title}
                  </h2>
                  <p className="text-xl md:text-2xl text-white/60 leading-relaxed max-w-lg font-medium">
                    {item.description}
                  </p>
                </motion.div>);
        })}
          </div>

          
          <div className="w-full md:w-1/2 aspect-square md:aspect-auto md:h-[600px] relative [perspective:1000px]">
            {content.map((item, index) => {
            const step = 1 / content.length;
            const start = index * step;
            const end = start + step;
            const scale = useTransform(scrollYProgress, [Math.max(0, start - 0.1), start, end, Math.min(1, end + 0.1)], [0.8, 1, 1, 0.9]);
            const opacity = useTransform(scrollYProgress, [Math.max(0, start - 0.1), start, end, Math.min(1, end + 0.1)], [0, 1, 1, 0]);
            const y = useTransform(scrollYProgress, [Math.max(0, start - 0.1), start, end, Math.min(1, end + 0.1)], [100, 0, 0, -50]);
            const rotateX = useTransform(scrollYProgress, [Math.max(0, start - 0.1), start, end], ["20deg", "0deg", "-10deg"]);
            return (<motion.div key={index} style={{ opacity, scale, y, rotateX, zIndex: index }} className={`absolute inset-0 m-auto w-full max-w-[500px] aspect-[4/3] rounded-3xl bg-gradient-to-br ${item.gradient} backdrop-blur-3xl border ${item.border} flex items-center justify-center shadow-2xl overflow-hidden origin-bottom`}>
                  
                  <div className="absolute inset-4 bg-[#0a0a0b]/90 rounded-2xl border border-white/5 flex flex-col p-6 shadow-inner">
                    <div className="flex items-center gap-2 mb-8">
                      <div className="w-3 h-3 rounded-full bg-white/10"/>
                      <div className="w-3 h-3 rounded-full bg-white/10"/>
                      <div className="w-3 h-3 rounded-full bg-white/10"/>
                    </div>
                    
                    
                    <div className="space-y-4 flex-1 flex flex-col">
                      <div className="w-3/4 h-4 bg-white/5 rounded-full"/>
                      <div className="w-1/2 h-4 bg-white/5 rounded-full"/>
                      <div className="w-5/6 h-4 bg-white/5 rounded-full"/>
                      
                      <div className="mt-auto flex justify-between items-end pt-8">
                        <div className={`w-24 h-24 rounded-full border-4 border-white/5 flex items-center justify-center`}>
                          <div className={`w-12 h-12 rounded-full ${item.icon} blur-md`}/>
                        </div>
                        <div className="space-y-2">
                          <div className="w-32 h-6 bg-white/5 rounded-md"/>
                          <div className="w-24 h-6 bg-white/5 rounded-md"/>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>);
        })}
          </div>

        </div>
      </div>
    </section>);
}
