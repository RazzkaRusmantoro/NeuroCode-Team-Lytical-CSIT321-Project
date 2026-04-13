'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils/slug';
import LoadingSpinner from '@/app/components/LoadingSpinner';
type DiagramType = 'class' | 'sequence' | 'useCase' | 'state';
const UML_DIAGRAM_OPTIONS: {
    type: DiagramType;
    label: string;
    description: string;
}[] = [
    { type: 'class', label: 'Class diagram', description: 'Classes, interfaces, inheritance and associations' },
    { type: 'sequence', label: 'Sequence diagram', description: 'Message flow between objects over time' },
    { type: 'useCase', label: 'Use case diagram', description: 'Actors and use cases' },
    { type: 'state', label: 'State diagram', description: 'States and transitions' },
];
interface GenerateUmlModalProps {
    isOpen: boolean;
    onClose: () => void;
    repoName: string;
    repoFullName: string;
    orgShortId: string;
    repoUrlName: string;
    repositoryId: string;
}
export default function GenerateUmlModal({ isOpen, onClose, repoFullName, orgShortId, repoUrlName, }: GenerateUmlModalProps) {
    const [view, setView] = useState<'umlChoice' | 'umlPrompt'>('umlChoice');
    const [umlDiagramType, setUmlDiagramType] = useState<DiagramType | null>(null);
    const [target, setTarget] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [loadingProgress, setLoadingProgress] = useState(0);
    const [dotCount, setDotCount] = useState(0);
    const [hasEntered, setHasEntered] = useState(false);
    const router = useRouter();
    useEffect(() => {
        if (isOpen) {
            setHasEntered(false);
            const frame = requestAnimationFrame(() => {
                requestAnimationFrame(() => setHasEntered(true));
            });
            return () => cancelAnimationFrame(frame);
        }
    }, [isOpen]);
    useEffect(() => {
        let interval: NodeJS.Timeout;
        if (isGenerating) {
            setLoadingProgress(0);
            interval = setInterval(() => {
                setLoadingProgress((prev) => {
                    if (prev < 60)
                        return prev + Math.random() * 15;
                    if (prev < 85)
                        return prev + Math.random() * 5;
                    return prev;
                });
            }, 500);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);
    useEffect(() => {
        if (isGenerating) {
            setDotCount(0);
            const interval = setInterval(() => {
                setDotCount((prev) => (prev + 1) % 4);
            }, 400);
            return () => clearInterval(interval);
        }
    }, [isGenerating]);
    useEffect(() => {
        if (!isOpen) {
            setView('umlChoice');
            setUmlDiagramType(null);
            setTarget('');
            setError(null);
        }
    }, [isOpen]);
    if (!isOpen)
        return null;
    const handleDiagramSelect = (type: DiagramType) => {
        setUmlDiagramType(type);
        setView('umlPrompt');
        setError(null);
    };
    const handleBack = () => {
        setView('umlChoice');
        setUmlDiagramType(null);
        setTarget('');
        setError(null);
    };
    const handleGenerate = async () => {
        if (!target.trim()) {
            setError('Please describe what to include in the diagram');
            return;
        }
        if (!umlDiagramType)
            return;
        setIsGenerating(true);
        setError(null);
        try {
            const response = await fetch('/api/documentation/uml/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    repoFullName,
                    orgShortId,
                    repoUrlName,
                    branch: 'main',
                    prompt: target.trim(),
                    diagramType: umlDiagramType,
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || data.details || 'Failed to generate UML diagram');
                return;
            }
            const slug = data.slug || `${umlDiagramType}-${slugify(target.trim()) || 'diagram'}`;
            const base = orgShortId.startsWith('org-') ? orgShortId : `org-${orgShortId}`;
            setLoadingProgress(100);
            setTimeout(() => {
                onClose();
                router.push(`/${base}/repo/${repoUrlName}/documentation/uml/${encodeURIComponent(slug)}`);
            }, 400);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setIsGenerating(false);
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${hasEntered ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}/>
      <div className={`relative z-10 bg-[#1a1a1a] rounded border border-[#424242] p-8 w-full mx-4 shadow-2xl max-w-5xl min-h-[500px] overflow-hidden transition-all duration-300 ease-out ${hasEntered ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}>
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {(view === 'umlPrompt') && (<button onClick={handleBack} className="text-white/60 hover:text-white transition-colors duration-200 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
              </button>)}
            <h2 className="text-2xl font-bold text-white">Generate UML diagram</h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors duration-200 cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="relative overflow-hidden p-5">
          
          <div className={`transition-all duration-500 ease-in-out ${view === 'umlChoice'
            ? 'transform translate-x-0 opacity-100 relative'
            : 'transform -translate-x-full opacity-0 absolute w-full'}`}>
            <div className="grid grid-cols-2 gap-6">
              {UML_DIAGRAM_OPTIONS.map(({ type, label, description }) => {
            const isAnimatedBg = type === 'class' || type === 'sequence' || type === 'useCase' || type === 'state';
            return (<div key={type} onClick={() => handleDiagramSelect(type)} className="group relative border border-white/10 rounded p-8 hover:border-[#BC4918]/50 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col min-h-[300px] bg-transparent" onMouseEnter={(e) => {
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(188, 73, 24, 0.3)';
                    e.currentTarget.style.transform = 'translateY(-2px)';
                }} onMouseLeave={(e) => {
                    e.currentTarget.style.boxShadow = 'none';
                    e.currentTarget.style.transform = 'translateY(0)';
                }}>
                    {isAnimatedBg && (<div className="absolute inset-0 bg-gradient-to-br from-[#BC4918]/15 via-[#1a1a1a] to-[#1a1a1a] z-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"/>)}
                    <div className={`absolute top-0 left-0 right-0 bg-[#212121] z-10 ${isAnimatedBg
                    ? 'h-full transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:h-[35%]'
                    : 'bottom-0'}`}>
                      {isAnimatedBg && (<div className="absolute bottom-[-40px] left-0 right-0 h-[40px] bg-gradient-to-b from-[#212121] to-transparent pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-700"/>)}
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3 group-hover:text-[#D85A2A] transition-colors duration-300 z-20 relative pointer-events-none">
                      {label}
                    </h3>
                    <p className="text-base text-white/70 z-20 relative pointer-events-none">
                      {description}
                    </p>
                    <div className="flex-grow z-20 relative pointer-events-none"/>

                    
                    {type === 'class' && (<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center pointer-events-none z-0 translate-y-12 group-hover:translate-y-[25px] overflow-hidden">
                        <div className="relative w-[340px] h-[220px] scale-[0.9]">
                          <div className="absolute left-[180px] top-[75px] w-[140px] bg-[#1a1a1e] border border-[#333] rounded-[8px] shadow-xl overflow-hidden font-mono opacity-100">
                            <div className="px-2 py-1.5 bg-gradient-to-b from-[#252528] to-[#1e1e22] border-b border-[#333] text-center">
                              <div className="text-[11px] font-bold text-white tracking-wide">AuthService</div>
                            </div>
                            <div className="px-2 py-1.5 border-b border-[#2a2a2e] bg-[#1e1e22] flex flex-col gap-0.5">
                              <div className="text-[9px] flex gap-1 whitespace-nowrap"><span className="text-[#f87171] font-bold">-</span><span className="text-[#e4e4e7]">token</span><span className="text-[#71717a]">: str</span></div>
                            </div>
                            <div className="px-2 py-1.5 bg-[#1a1a1e] flex flex-col gap-0.5">
                              <div className="text-[9px] flex gap-1 whitespace-nowrap"><span className="text-[#6ee7b7] font-bold">+</span><span className="text-[#e4e4e7]">login()</span><span className="text-[#71717a]">: bool</span></div>
                            </div>
                          </div>
                          <div className="absolute left-[20px] top-[75px] w-[110px] bg-[#1a1a1e] border border-[#333] rounded-[8px] shadow-xl overflow-hidden font-mono opacity-100">
                            <div className="px-2 py-1.5 bg-gradient-to-b from-[#252528] to-[#1e1e22] border-b border-[#333] text-center">
                              <div className="text-[9px] text-[#888] italic mb-0.5">&lt;&lt;interface&gt;&gt;</div>
                              <div className="text-[11px] font-bold text-white tracking-wide">User</div>
                            </div>
                            <div className="px-2 py-1.5 border-b border-[#2a2a2e] bg-[#1e1e22] flex flex-col gap-0.5">
                              <div className="text-[9px] flex gap-1 whitespace-nowrap"><span className="text-[#6ee7b7] font-bold">+</span><span className="text-[#e4e4e7]">id</span><span className="text-[#71717a]">: str</span></div>
                            </div>
                          </div>
                          <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-80" style={{ zIndex: -2 }}>
                            <path d="M 130 105 L 180 105" stroke="#e4e4e7" strokeWidth="1.5" fill="none"/>
                            <polygon points="180,105 174,102 174,108" fill="#e4e4e7"/>
                            <text x="138" y="100" fill="#a1a1aa" fontSize="10" fontFamily="monospace">1</text>
                            <text x="166" y="100" fill="#a1a1aa" fontSize="10" fontFamily="monospace">0..*</text>
                          </svg>
                        </div>
                      </div>)}
                    {type === 'sequence' && (<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center pointer-events-none z-0 translate-y-12 group-hover:translate-y-[48px] overflow-hidden">
                        <div className="relative w-[340px] h-[220px] scale-[0.9] opacity-100">
                          <div className="absolute left-[50px] top-[40px] flex flex-col items-center w-[60px]">
                            <div className="w-full bg-[#2a2a2e] border border-[#444] rounded py-1.5 text-center text-white text-[11px] font-semibold z-10 shadow-md">Client</div>
                            <div className="w-px h-[140px] border-l-2 border-dashed border-[#555] mt-1 relative flex flex-col items-center">
                              <div className="absolute top-[20px] w-[12px] h-[80px] bg-[#e4e4e7] border border-[#333] rounded-sm transform -translate-x-1/2"/>
                            </div>
                          </div>
                          <div className="absolute left-[230px] top-[40px] flex flex-col items-center w-[60px]">
                            <div className="w-full bg-[#2a2a2e] border border-[#444] rounded py-1.5 text-center text-white text-[11px] font-semibold z-10 shadow-md">Server</div>
                            <div className="w-px h-[140px] border-l-2 border-dashed border-[#555] mt-1 relative flex flex-col items-center">
                              <div className="absolute top-[40px] w-[12px] h-[40px] bg-[#e4e4e7] border border-[#333] rounded-sm transform -translate-x-1/2"/>
                            </div>
                          </div>
                          <svg className="absolute inset-0 w-full h-full pointer-events-none z-20">
                            <path d="M 86 100 L 254 100" stroke="#e4e4e7" strokeWidth="1.5" fill="none"/>
                            <polygon points="254,100 248,97 248,103" fill="#e4e4e7"/>
                            <text x="170" y="95" fill="#e4e4e7" fontSize="10" fontFamily="monospace" textAnchor="middle">request()</text>
                            <path d="M 254 130 L 86 130" stroke="#e4e4e7" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
                            <polygon points="86,130 92,127 92,133" fill="none" stroke="#e4e4e7" strokeWidth="1.5"/>
                            <text x="170" y="125" fill="#e4e4e7" fontSize="10" fontFamily="monospace" textAnchor="middle">response</text>
                          </svg>
                        </div>
                      </div>)}
                    {type === 'useCase' && (<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center pointer-events-none z-0 translate-y-12 group-hover:translate-y-[28px] overflow-hidden">
                        <div className="relative w-[340px] h-[220px] scale-[0.9] opacity-100">
                          <div className="absolute left-[110px] top-[20px] w-[180px] h-[170px] z-0">
                            <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                              <rect x={0.5} y={0.5} width={179} height={169} fill="rgba(255,255,255,0.02)" stroke="#e4e4e7" strokeWidth="2"/>
                            </svg>
                            <div className="absolute top-0 left-0 w-full text-center py-2 text-[#e4e4e7] font-bold text-[14px] font-mono z-10">System</div>
                          </div>
                          <div className="absolute left-[20px] top-[60px] flex flex-col items-center gap-1 z-10" style={{ width: 80, height: 80 }}>
                            <svg width={48} height={48} viewBox="0 0 40 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-[#e4e4e7] shrink-0">
                              <circle cx="20" cy="10" r="8"/>
                              <line x1="20" y1="18" x2="20" y2="35"/>
                              <line x1="5" y1="25" x2="35" y2="25"/>
                              <line x1="20" y1="35" x2="10" y2="48"/>
                              <line x1="20" y1="35" x2="30" y2="48"/>
                            </svg>
                            <span className="text-[#e4e4e7] text-xs font-semibold font-mono text-center max-w-[120px] truncate">User</span>
                          </div>
                          <div className="absolute left-[130px] top-[55px] w-[140px] h-[50px] flex items-center justify-center z-10">
                            <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                              <ellipse cx={70} cy={25} rx={66} ry={21} fill="rgba(255,255,255,0.04)" stroke="#e4e4e7" strokeWidth="1.5"/>
                            </svg>
                            <span className="relative z-10 text-[#e4e4e7] text-xs font-medium font-mono text-center px-2">Login</span>
                          </div>
                          <div className="absolute left-[130px] top-[120px] w-[140px] h-[50px] flex items-center justify-center z-10">
                            <svg className="absolute inset-0 w-full h-full" style={{ overflow: 'visible' }}>
                              <ellipse cx={70} cy={25} rx={66} ry={21} fill="rgba(255,255,255,0.04)" stroke="#e4e4e7" strokeWidth="1.5"/>
                            </svg>
                            <span className="relative z-10 text-[#e4e4e7] text-xs font-medium font-mono text-center px-2">View Dashboard</span>
                          </div>
                          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            <path d="M 80 90 L 134 80" stroke="#e4e4e7" strokeWidth="1.5" fill="none"/>
                            <path d="M 80 90 L 134 145" stroke="#e4e4e7" strokeWidth="1.5" fill="none"/>
                          </svg>
                        </div>
                      </div>)}
                    {type === 'state' && (<div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] flex items-center justify-center pointer-events-none z-0 translate-y-12 group-hover:translate-y-[35px] overflow-hidden">
                        <div className="relative w-[340px] h-[220px] scale-[0.9] opacity-100">
                          <div className="absolute left-[30px] top-[100px] flex items-center justify-center z-10">
                            <div className="w-[16px] h-[16px] bg-[#e4e4e7] rounded-full border-2 border-[#1a1a1a]"/>
                          </div>
                          <div className="absolute left-[90px] top-[85px] w-[90px] h-[46px] bg-[#1e1e22] border border-[#555] rounded-[12px] flex items-center justify-center z-10 shadow-md">
                            <span className="text-[11px] text-[#e4e4e7] font-mono text-center leading-tight">Draft</span>
                          </div>
                          <div className="absolute left-[220px] top-[40px] w-[90px] h-[46px] bg-[#1e1e22] border border-[#555] rounded-[12px] flex items-center justify-center z-10 shadow-md">
                            <span className="text-[11px] text-[#e4e4e7] font-mono text-center leading-tight">Review</span>
                          </div>
                          <div className="absolute left-[220px] top-[130px] w-[90px] h-[46px] bg-[#1e1e22] border border-[#555] rounded-[12px] flex items-center justify-center z-10 shadow-md">
                            <span className="text-[11px] text-[#e4e4e7] font-mono text-center leading-tight">Published</span>
                          </div>
                          <div className="absolute left-[330px] top-[145px] flex items-center justify-center z-10">
                            <div className="w-[20px] h-[20px] rounded-full border-2 border-[#e4e4e7] flex items-center justify-center">
                              <div className="w-[10px] h-[10px] bg-[#e4e4e7] rounded-full"/>
                            </div>
                          </div>
                          <svg className="absolute inset-0 w-[380px] h-[220px] pointer-events-none z-0 opacity-80" style={{ marginLeft: '-10px' }}>
                            <path d="M 56 108 L 100 108" stroke="#e4e4e7" strokeWidth="1.5" fill="none"/>
                            <polygon points="100,108 94,105 94,111" fill="#e4e4e7"/>
                            <path d="M 175 95 L 230 75" stroke="#e4e4e7" strokeWidth="1.5" fill="none"/>
                            <polygon points="230,75 223,74 226,81" fill="#e4e4e7"/>
                            <path d="M 275 86 L 275 130" stroke="#e4e4e7" strokeWidth="1.5" fill="none"/>
                            <polygon points="275,130 272,124 278,124" fill="#e4e4e7"/>
                            <path d="M 230 60 Q 150 40 140 85" stroke="#e4e4e7" strokeWidth="1.5" strokeDasharray="4 4" fill="none"/>
                            <polygon points="140,85 143,78 137,80" fill="#e4e4e7"/>
                            <path d="M 320 153 L 340 155" stroke="#e4e4e7" strokeWidth="1.5" fill="none"/>
                            <polygon points="340,155 334,152 334,158" fill="#e4e4e7"/>
                          </svg>
                        </div>
                      </div>)}

                    
                    {type === 'class' && (<div className="absolute right-4 bottom-4 opacity-[0.07] group-hover:opacity-0 transition-all duration-400 pointer-events-none translate-y-4 group-hover:translate-y-2 group-hover:scale-95 z-10">
                        <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="60" y="20" width="80" height="60" rx="4" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="60" y1="45" x2="140" y2="45" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="60" y1="65" x2="140" y2="65" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <path d="M100 80 L100 110" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <path d="M50 110 L150 110" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <path d="M50 110 L50 130" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <path d="M150 110 L150 130" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <rect x="10" y="130" width="80" height="50" rx="4" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="10" y1="155" x2="90" y2="155" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <rect x="110" y="130" width="80" height="50" rx="4" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="110" y1="155" x2="190" y2="155" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <polygon points="100,80 95,90 105,90" fill="currentColor" className="text-white"/>
                        </svg>
                      </div>)}
                    {type === 'sequence' && (<div className="absolute right-4 bottom-4 opacity-[0.07] group-hover:opacity-0 transition-all duration-400 pointer-events-none translate-y-4 group-hover:translate-y-2 group-hover:scale-95 z-10">
                        <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <rect x="30" y="20" width="50" height="30" rx="4" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <rect x="120" y="20" width="50" height="30" rx="4" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="55" y1="50" x2="55" y2="180" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8" className="text-white"/>
                          <line x1="145" y1="50" x2="145" y2="180" stroke="currentColor" strokeWidth="4" strokeDasharray="8 8" className="text-white"/>
                          <rect x="47" y="70" width="16" height="90" fill="currentColor" className="text-white"/>
                          <rect x="137" y="90" width="16" height="50" fill="currentColor" className="text-white"/>
                          <path d="M63 100 L133 100" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <polygon points="133,95 141,100 133,105" fill="currentColor" className="text-white"/>
                          <path d="M133 130 L63 130" stroke="currentColor" strokeWidth="4" strokeDasharray="4 4" className="text-white"/>
                          <polygon points="63,125 55,130 63,135" fill="currentColor" className="text-white"/>
                        </svg>
                      </div>)}
                    {type === 'useCase' && (<div className="absolute right-4 bottom-4 opacity-[0.07] group-hover:opacity-0 transition-all duration-400 pointer-events-none translate-y-4 group-hover:translate-y-2 group-hover:scale-95 z-10">
                        <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="40" cy="80" r="15" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="40" y1="95" x2="40" y2="135" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="40" y1="105" x2="20" y2="120" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="40" y1="105" x2="60" y2="120" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="40" y1="135" x2="25" y2="165" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="40" y1="135" x2="55" y2="165" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <rect x="90" y="20" width="100" height="160" rx="8" stroke="currentColor" strokeWidth="4" className="text-white" strokeDasharray="8 8"/>
                          <ellipse cx="140" cy="60" rx="35" ry="20" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <ellipse cx="140" cy="140" rx="35" ry="20" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="55" y1="105" x2="105" y2="70" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <line x1="55" y1="125" x2="105" y2="135" stroke="currentColor" strokeWidth="4" className="text-white"/>
                        </svg>
                      </div>)}
                    {type === 'state' && (<div className="absolute right-4 bottom-4 opacity-[0.07] group-hover:opacity-0 transition-all duration-400 pointer-events-none translate-y-4 group-hover:translate-y-2 group-hover:scale-95 z-10">
                        <svg width="160" height="160" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="30" cy="100" r="12" fill="currentColor" className="text-white"/>
                          <rect x="70" y="75" width="50" height="50" rx="16" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <rect x="150" y="30" width="40" height="40" rx="16" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <rect x="150" y="130" width="40" height="40" rx="16" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <path d="M42 100 L70 100" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <polygon points="65,95 73,100 65,105" fill="currentColor" className="text-white"/>
                          <path d="M120 90 L150 60" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <polygon points="143,62 152,58 148,67" fill="currentColor" className="text-white"/>
                          <path d="M120 110 L150 140" stroke="currentColor" strokeWidth="4" className="text-white"/>
                          <polygon points="148,133 152,142 143,138" fill="currentColor" className="text-white"/>
                        </svg>
                      </div>)}

                    <div className="absolute inset-0 bg-gradient-to-br from-[#BC4918]/0 to-[#BC4918]/0 group-hover:from-[#BC4918]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none rounded z-10"/>
                  </div>);
        })}
            </div>
          </div>

          
          <div className={`transition-all duration-500 ease-in-out ${view === 'umlPrompt'
            ? 'transform translate-x-0 opacity-100 relative'
            : 'transform translate-x-full opacity-0 absolute w-full'}`}>
            {isGenerating ? (<div className="flex flex-col items-center justify-center min-h-[280px] py-12">
                  <LoadingSpinner />
                  <h3 className="text-lg font-semibold text-white mt-6 mb-4">
                    Generating diagram{'.'.repeat(dotCount)}
                  </h3>
                  <div className="w-64 h-1.5 bg-[#212121] rounded-full overflow-hidden border border-white/5">
                    <div className="h-full bg-[#BC4918] rounded-full transition-all duration-300" style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}/>
                  </div>
                </div>) : (<div className="space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-3">
                      Describe what to include in the diagram (e.g. scope, focus area)
                    </label>
                    <textarea value={target} onChange={(e) => setTarget(e.target.value)} placeholder="e.g. 'All classes in the auth module' or 'Checkout flow from cart to payment'" rows={6} className="w-full px-4 py-3 bg-[#212121] border border-white/10 rounded text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#BC4918] focus:border-transparent transition-all resize-none"/>
                  </div>
                  <div className="pt-4 border-t border-white/10 space-y-3">
                    <button onClick={handleGenerate} disabled={isGenerating || !target.trim()} className="w-full px-6 py-3 bg-[#BC4918] hover:bg-[#BC4918]/80 disabled:bg-[#BC4918]/50 disabled:cursor-not-allowed text-white font-medium rounded transition-all duration-200 cursor-pointer">
                      Generate diagram
                    </button>
                  </div>
                  {error && (<div className="p-4 bg-red-500/10 border border-red-500/50 rounded">
                      <p className="text-red-400 text-sm">{error}</p>
                    </div>)}
                </div>)}
          </div>
        </div>
      </div>
    </div>);
}
