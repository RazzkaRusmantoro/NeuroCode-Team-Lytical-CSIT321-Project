'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils/slug';
import LoadingSpinner from '@/app/components/LoadingSpinner';
interface GenerateDocumentationModalProps {
    isOpen: boolean;
    onClose: () => void;
    repoName: string;
    repoFullName: string;
    orgShortId: string;
    repoUrlName: string;
    repositoryId: string;
}
type View = 'docTypeChoice' | 'textual';
type DocType = 'api' | 'architecture' | 'aiAgent' | 'onboarding';
type AiAgentDocKind = 'context' | 'playbook' | 'custom';
const AI_AGENT_DOC_KIND_OPTIONS: {
    type: AiAgentDocKind;
    label: string;
    description: string;
}[] = [
    { type: 'context', label: 'Context', description: 'Explanations: project overview, structure, conventions, how things work' },
    { type: 'playbook', label: 'Playbook', description: 'Procedures: step-by-step instructions (e.g. how to add doc, run tests)' },
    { type: 'custom', label: 'Custom', description: 'Free-form; describe exactly what you need' },
];
const DOC_TYPE_OPTIONS: {
    type: DocType;
    label: string;
    description: string;
}[] = [
    { type: 'api', label: 'API/Code Documentation', description: 'Functions, classes, parameters, code references and examples' },
    { type: 'architecture', label: 'System Architecture Documentation', description: 'Components, data flow, design decisions and how the system works' },
    { type: 'aiAgent', label: 'AI-Agent (.md)', description: 'Structured markdown for AI agents: clear sections, parseable, minimal prose' },
    { type: 'onboarding', label: 'Onboarding', description: 'Getting started, setup, conventions and where to find things' },
];
const VISIBLE_DOC_TYPES: DocType[] = ['api', 'architecture'];
export default function GenerateDocumentationModal({ isOpen, onClose, repoName, repoFullName, orgShortId, repoUrlName, repositoryId, }: GenerateDocumentationModalProps) {
    const [view, setView] = useState<View>('docTypeChoice');
    const [selectedDocType, setSelectedDocType] = useState<DocType | null>(null);
    const [target, setTarget] = useState('');
    const [aiAgentDocKind, setAiAgentDocKind] = useState<AiAgentDocKind | null>(null);
    const [aiAgentExtraInstructions, setAiAgentExtraInstructions] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<any>(null);
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
        let interval: NodeJS.Timeout;
        if (isGenerating) {
            setDotCount(0);
            interval = setInterval(() => {
                setDotCount((prev) => (prev + 1) % 4);
            }, 400);
        }
        return () => clearInterval(interval);
    }, [isGenerating]);
    useEffect(() => {
        if (!isOpen) {
            setView('docTypeChoice');
            setSelectedDocType(null);
            setTarget('');
            setAiAgentDocKind(null);
            setAiAgentExtraInstructions('');
            setError(null);
        }
    }, [isOpen]);
    if (!isOpen)
        return null;
    const handleDocTypeSelect = (type: DocType) => {
        setSelectedDocType(type);
        setView('textual');
        setError(null);
    };
    const handleBack = () => {
        if (view === 'textual') {
            setView('docTypeChoice');
            setTarget('');
            setAiAgentDocKind(null);
            setAiAgentExtraInstructions('');
        }
        else {
            setView('docTypeChoice');
            setSelectedDocType(null);
        }
        setError(null);
    };
    const handleGenerate = async () => {
        const isAiAgent = selectedDocType === 'aiAgent';
        if (isAiAgent) {
            if (!aiAgentDocKind) {
                setError('Please select what kind of AI-Agent document you want to generate');
                return;
            }
            if (!aiAgentExtraInstructions.trim()) {
                setError('Please provide instructions for what to generate');
                return;
            }
        }
        else {
            if (!target.trim()) {
                setError('Please enter a description of what documentation you want to generate');
                return;
            }
        }
        setIsGenerating(true);
        setError(null);
        setResult(null);
        const promptForApi = isAiAgent && aiAgentDocKind
            ? `${AI_AGENT_DOC_KIND_OPTIONS.find((o) => o.type === aiAgentDocKind)?.label || aiAgentDocKind}. ${aiAgentExtraInstructions.trim()}`
            : target.trim();
        const body: Record<string, string> = {
            repoFullName: repoFullName,
            orgShortId: orgShortId,
            repoUrlName: repoUrlName,
            branch: 'main',
            scope: 'custom',
            prompt: promptForApi,
            ...(selectedDocType && { documentationType: selectedDocType }),
            ...(isAiAgent &&
                aiAgentDocKind && {
                aiAgentDocKind,
                aiAgentExtraInstructions: aiAgentExtraInstructions.trim(),
            }),
        };
        try {
            const response = await fetch('/api/documentation/generate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });
            const data = await response.json();
            if (!response.ok) {
                setError(data.error || data.details || 'Failed to generate documentation');
                return;
            }
            setResult(data);
            const base = orgShortId.startsWith('org-') ? orgShortId : `org-${orgShortId}`;
            const slug = data.slug || (data.title ? slugify(data.title) : slugify(promptForApi) || 'documentation');
            setLoadingProgress(100);
            setTimeout(() => {
                onClose();
                router.push(`/${base}/repo/${repoUrlName}/documentation/${encodeURIComponent(slug)}`);
            }, 400);
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setIsGenerating(false);
        }
    };
    return (<div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      
      <div className={`absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-300 ease-out ${hasEntered ? 'opacity-100' : 'opacity-0'}`} onClick={onClose}/>

      
      <div className={`relative z-10 bg-[#1a1a1a] rounded-lg border border-[#424242] p-8 w-full max-w-5xl min-h-[500px] overflow-hidden flex flex-col transition-all duration-300 ease-out origin-center ${hasEntered ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-95 -translate-y-4'}`}>
        <div className="flex justify-between items-center mb-6 flex-shrink-0">
          <div className="flex items-center gap-4">
            {(view === 'docTypeChoice' || view === 'textual') && (<button onClick={handleBack} className="text-white/60 hover:text-white transition-colors duration-200 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                </svg>
              </button>)}
            <h2 className="text-2xl font-bold text-white">
              Generate Documentation
            </h2>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white transition-colors duration-200 cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <div className="relative overflow-hidden p-5 flex-1 flex flex-col min-h-0">
          
          <div className={`flex-1 flex flex-col min-h-0 transition-all duration-500 ease-in-out ${view === 'docTypeChoice'
            ? 'transform translate-x-0 opacity-100 relative'
            : 'transform -translate-x-full opacity-0 absolute w-full inset-0'}`}>
            <div className="grid grid-cols-2 grid-rows-[1fr] gap-6 flex-1 min-h-0 w-full">
              {DOC_TYPE_OPTIONS.filter(({ type }) => VISIBLE_DOC_TYPES.includes(type)).map(({ type, label, description }) => (<div key={type} onClick={() => handleDocTypeSelect(type)} className="group relative border border-white/10 rounded-lg p-8 hover:border-[#BC4918]/50 transition-all duration-300 cursor-pointer flex flex-col min-h-0 bg-[#212121]" onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow = '0 0 25px rgba(188, 73, 24, 0.2)';
                e.currentTarget.style.transform = 'translateY(-2px)';
            }} onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.transform = 'translateY(0)';
            }}>
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-[#D85A2A] transition-colors duration-300">
                    {label}
                  </h3>
                  <p className="text-sm text-white/70 flex-1">
                    {description}
                  </p>
                </div>))}
            </div>
          </div>

          
          <div className={`transition-all duration-500 ease-in-out ${view === 'textual'
            ? 'transform translate-x-0 opacity-100 relative'
            : 'transform translate-x-full opacity-0 absolute w-full'}`}>
            {isGenerating ? (<div className="flex flex-col items-center justify-center min-h-[320px] py-12">
                <div className="mb-8 scale-[0.8] origin-center">
                  <LoadingSpinner />
                </div>
                
                <h3 className="text-lg font-semibold text-white mb-4 w-64 text-center">
                  Generating documentation
                  <span className="inline-block text-left" style={{ width: '24px' }}>
                    {'.'.repeat(dotCount)}
                  </span>
                </h3>
                
                <div className="w-64 h-1.5 bg-[#212121] rounded-full overflow-hidden border border-white/5 relative">
                  <div className="absolute top-0 left-0 h-full bg-[#BC4918] rounded-full transition-all duration-300 ease-out" style={{ width: `${Math.min(100, Math.max(0, loadingProgress))}%` }}/>
                </div>
              </div>) : view === 'textual' && selectedDocType === 'aiAgent' ? (<div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-3">
                    What kind of AI-Agent document?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {AI_AGENT_DOC_KIND_OPTIONS.map(({ type, label, description }) => (<button key={type} type="button" onClick={() => setAiAgentDocKind(type)} className={`text-left p-4 rounded border transition-all duration-200 ${aiAgentDocKind === type
                    ? 'border-[#BC4918] bg-[#BC4918]/10 text-white'
                    : 'border-white/10 bg-[#212121] text-white/90 hover:border-white/20 hover:bg-[#252525]'}`}>
                        <span className="font-medium block mb-0.5">{label}</span>
                        <span className="text-xs text-white/60">{description}</span>
                      </button>))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-white/70 mb-2">
                    Instructions
                  </label>
                  <textarea value={aiAgentExtraInstructions} onChange={(e) => setAiAgentExtraInstructions(e.target.value)} placeholder={aiAgentDocKind === 'custom'
                ? "e.g. 'Cursor rules for this repo focusing on testing conventions'"
                : aiAgentDocKind === 'context'
                    ? "e.g. 'Explain the auth flow and where config lives'"
                    : "e.g. 'How to add a new doc type and run the generator'"} rows={4} className="w-full px-4 py-3 bg-[#212121] border border-white/10 rounded text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-[#BC4918] focus:border-transparent transition-all resize-none"/>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <button onClick={() => handleGenerate()} disabled={isGenerating || !aiAgentDocKind || !aiAgentExtraInstructions.trim()} className="w-full px-6 py-3 bg-[#BC4918] hover:bg-[#BC4918]/80 disabled:bg-[#BC4918]/50 disabled:cursor-not-allowed text-white font-medium rounded transition-all duration-200 cursor-pointer">
                    Generate AI-Agent Documentation
                  </button>
                </div>

                {error && (<div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>)}
              </div>) : (<div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-white/70 mb-3">
                    What documentation would you like to generate?
                  </label>
                  <textarea value={target} onChange={(e) => setTarget(e.target.value)} placeholder="Describe what you want documented. For example: 'Explain the payment processing flow' or 'Document the authentication system' or 'How does the API handle user requests?'" rows={8} className="w-full px-4 py-3 bg-[#212121] border border-white/10 rounded text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[#BC4918] focus:border-transparent transition-all resize-none"/>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <button onClick={() => handleGenerate()} disabled={isGenerating || !target.trim()} className="w-full px-6 py-3 bg-[#BC4918] hover:bg-[#BC4918]/80 disabled:bg-[#BC4918]/50 disabled:cursor-not-allowed text-white font-medium rounded transition-all duration-200 cursor-pointer">
                    Generate Documentation
                  </button>
                </div>

                {error && (<div className="mt-4 p-4 bg-red-500/10 border border-red-500/50 rounded">
                    <p className="text-red-400 text-sm">{error}</p>
                  </div>)}
              </div>)}
          </div>
        </div>
      </div>
    </div>);
}
