'use client';
import { motion, useMotionTemplate, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { MouseEvent, useRef } from 'react';
import { Bot, Zap, Shield, Search } from 'lucide-react';
const bentoItems = [
    {
        title: "Autonomous Agents",
        description: "Multi-agent systems that autonomously document, refactor, and analyze without human intervention.",
        icon: Bot,
        colSpan: "col-span-1 md:col-span-2",
        delay: 0.1,
    },
    {
        title: "Real-time Sync",
        description: "Your docs update the moment code is pushed to your main branch.",
        icon: Zap,
        colSpan: "col-span-1",
        delay: 0.2,
    },
    {
        title: "Enterprise Security",
        description: "SOC2 compliant, zero-retention policies, and VPC deployment options.",
        icon: Shield,
        colSpan: "col-span-1",
        delay: 0.3,
    },
    {
        title: "Semantic Search",
        description: "Ask questions in natural language and get precise answers with source code citations.",
        icon: Search,
        colSpan: "col-span-1 md:col-span-2",
        delay: 0.4,
    },
];
function BentoCard({ item }: {
    item: typeof bentoItems[0];
}) {
    const ref = useRef<HTMLDivElement>(null);
    const x = useMotionValue(0);
    const y = useMotionValue(0);
    const mouseXSpring = useSpring(x, { stiffness: 300, damping: 30 });
    const mouseYSpring = useSpring(y, { stiffness: 300, damping: 30 });
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);
    function handleMouseMove(e: MouseEvent) {
        if (!ref.current)
            return;
        const rect = ref.current.getBoundingClientRect();
        const width = rect.width;
        const height = rect.height;
        const mouseXPos = e.clientX - rect.left;
        const mouseYPos = e.clientY - rect.top;
        const xPct = (mouseXPos / width - 0.5) * 2;
        const yPct = (mouseYPos / height - 0.5) * 2;
        x.set(xPct);
        y.set(yPct);
        mouseX.set(e.clientX - rect.left);
        mouseY.set(e.clientY - rect.top);
    }
    function handleMouseLeave() {
        x.set(0);
        y.set(0);
    }
    const rotateX = useTransform(mouseYSpring, [-1, 1], ["7deg", "-7deg"]);
    const rotateY = useTransform(mouseXSpring, [-1, 1], ["-7deg", "7deg"]);
    return (<motion.div ref={ref} style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d",
        }} initial={{ opacity: 0, y: 40 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }} transition={{ duration: 0.8, delay: item.delay, ease: "easeOut" }} onMouseMove={handleMouseMove} onMouseLeave={handleMouseLeave} className={`relative group rounded-[2rem] border border-white/5 bg-[#121214] p-8 md:p-10 flex flex-col justify-between overflow-hidden ${item.colSpan}`}>
      
      <motion.div className="pointer-events-none absolute -inset-px rounded-[2rem] opacity-0 transition duration-500 group-hover:opacity-100 z-0" style={{
            background: useMotionTemplate `
            radial-gradient(
              600px circle at ${mouseX}px ${mouseY}px,
              rgba(249, 115, 22, 0.15),
              transparent 80%
            )
          `,
        }}/>
      
      
      <div className="relative z-10 transform-gpu transition-transform duration-500 group-hover:translate-z-10" style={{ transform: "translateZ(30px)" }}>
        <div className="w-14 h-14 rounded-2xl bg-[#1a1a1d] border border-white/10 flex items-center justify-center mb-8 group-hover:bg-orange-500/10 group-hover:border-orange-500/30 group-hover:scale-110 transition-all duration-500">
          <item.icon className="w-7 h-7 text-white/50 group-hover:text-orange-400 transition-colors duration-500"/>
        </div>
        <div>
          <h3 className="text-2xl md:text-3xl font-bold text-white mb-3 tracking-tight">{item.title}</h3>
          <p className="text-white/50 leading-relaxed text-lg max-w-sm">{item.description}</p>
        </div>
      </div>
      
      
      <div className="absolute bottom-0 right-0 w-64 h-64 bg-orange-500/5 blur-[80px] rounded-full pointer-events-none"/>
    </motion.div>);
}
export default function InteractiveBento() {
    return (<section className="py-24 md:py-32 relative bg-[#0a0a0b] overflow-hidden [perspective:1000px]">
      <div className="absolute top-0 left-0 w-full h-full bg-[radial-gradient(ellipse_at_top,rgba(249,115,22,0.05),transparent_50%)] pointer-events-none"/>
      
      <div className="container mx-auto px-4 relative z-10">
        <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.8 }} className="text-center mb-20 max-w-3xl mx-auto">
          <h2 className="text-5xl md:text-7xl font-extrabold text-white mb-6 tracking-tight">
            Capabilities beyond <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600">
              traditional tooling.
            </span>
          </h2>
          <p className="text-xl text-white/50 font-medium">
            NeuroCode's intelligence layer integrates seamlessly with your existing workflow, bringing AI directly to where your code lives.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {bentoItems.map((item, idx) => (<BentoCard key={idx} item={item}/>))}
        </div>
      </div>
    </section>);
}
