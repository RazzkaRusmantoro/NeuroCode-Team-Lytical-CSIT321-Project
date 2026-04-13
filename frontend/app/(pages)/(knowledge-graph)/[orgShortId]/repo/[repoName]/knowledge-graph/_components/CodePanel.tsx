'use client';
import { useEffect, useState, useRef, useCallback } from 'react';
import { X, FileCode, ShieldAlert } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useKGState } from '../../../../../_lib/useKGState';
import { NODE_COLORS } from '../../../../../_lib/constants';
import { GraphNode } from '../../../../../_lib/types';
import { RISK_LEVEL_META, RiskFactors } from '../../../../../_lib/risk-scorer';
const getLanguageFromPath = (filePath: string): string => {
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    const map: Record<string, string> = {
        '.ts': 'TypeScript', '.tsx': 'TSX', '.js': 'JavaScript', '.jsx': 'JSX',
        '.py': 'Python', '.go': 'Go', '.rs': 'Rust', '.java': 'Java',
        '.cs': 'C#', '.cpp': 'C++', '.c': 'C', '.rb': 'Ruby',
        '.php': 'PHP', '.swift': 'Swift', '.kt': 'Kotlin',
        '.vue': 'Vue', '.svelte': 'Svelte',
    };
    return map[ext] || ext.slice(1).toUpperCase();
};
const decodeBase64 = (b64: string): string => {
    try {
        return atob(b64.replace(/\n/g, ''));
    }
    catch {
        return b64;
    }
};
const PRISM_LANG_MAP: Record<string, string> = {
    '.ts': 'typescript', '.tsx': 'tsx', '.js': 'javascript', '.jsx': 'jsx',
    '.py': 'python', '.go': 'go', '.rs': 'rust', '.java': 'java',
    '.cs': 'csharp', '.cpp': 'cpp', '.c': 'c', '.rb': 'ruby',
    '.php': 'php', '.swift': 'swift', '.kt': 'kotlin',
    '.vue': 'markup', '.svelte': 'markup',
    '.json': 'json', '.yaml': 'yaml', '.yml': 'yaml',
    '.html': 'html', '.css': 'css', '.scss': 'scss', '.md': 'markdown',
    '.sh': 'bash', '.bash': 'bash', '.sql': 'sql',
};
function extToLang(filePath: string): string {
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    return PRISM_LANG_MAP[ext] || 'text';
}
interface CodeViewerProps {
    content: string;
    filePath?: string;
    language?: string;
    startLine?: number;
    endLine?: number;
}
function CodeViewer({ content, filePath, language, startLine, endLine }: CodeViewerProps) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const lang = language ? language.toLowerCase() : (filePath ? extToLang(filePath) : 'text');
    const highlightLines = startLine && endLine
        ? Array.from({ length: endLine - startLine + 1 }, (_, i) => startLine + i)
        : startLine ? [startLine] : [];
    useEffect(() => {
        if (!scrollRef.current || !startLine)
            return;
        const lineHeight = 21;
        scrollRef.current.scrollTop = Math.max(0, (startLine - 4) * lineHeight);
    }, [startLine, endLine, content]);
    return (<div ref={scrollRef} className="overflow-auto flex-1 custom-scrollbar" style={{ background: '#0e0e11' }}>
            <style>{`
                .kg-code-highlight .token { }
                .kg-code-hl-line { background: rgba(213,103,7,0.12) !important; display: block; border-left: 2px solid #d56707; }
            `}</style>
            <SyntaxHighlighter language={lang} style={vscDarkPlus} showLineNumbers wrapLines lineProps={(lineNumber: number) => ({
            className: highlightLines.includes(lineNumber) ? 'kg-code-hl-line' : '',
        })} customStyle={{
            margin: 0,
            padding: '12px 0',
            background: '#0e0e11',
            fontSize: '12px',
            lineHeight: '1.75',
            minHeight: '100%',
        }} lineNumberStyle={{
            minWidth: '2.5rem',
            paddingRight: '1rem',
            color: 'rgba(255,255,255,0.18)',
            userSelect: 'none',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            marginRight: '1rem',
        }} codeTagProps={{ className: 'kg-code-highlight' }}>
                {content}
            </SyntaxHighlighter>
        </div>);
}
function Chip({ label, value, color }: {
    label: string;
    value: string | boolean | undefined;
    color?: string;
}) {
    if (value === undefined || value === null || value === false)
        return null;
    const displayValue = typeof value === 'boolean' ? label : String(value);
    return (<span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border" style={{
            backgroundColor: `${color || '#d56707'}15`,
            borderColor: `${color || '#d56707'}40`,
            color: color || '#f59f43',
        }}>
      {typeof value === 'boolean' ? displayValue : `${label}: ${displayValue}`}
    </span>);
}
function RiskBar({ label, norm, raw, unit = '' }: {
    label: string;
    norm: number;
    raw: number;
    unit?: string;
}) {
    return (<div>
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-white/40">{label}</span>
        <span className="text-[10px] font-mono text-white/50">{raw}{unit}</span>
      </div>
      <div className="h-1 bg-[#262626] rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500" style={{
            width: `${Math.round(norm * 100)}%`,
            background: norm > 0.75 ? '#ef4444' : norm > 0.5 ? '#f97316' : norm > 0.25 ? '#f59e0b' : '#10b981',
        }}/>
      </div>
    </div>);
}
function RiskBreakdown({ score, level, factors }: {
    score: number;
    level: string;
    factors: RiskFactors;
}) {
    const meta = RISK_LEVEL_META[level as keyof typeof RISK_LEVEL_META];
    const [open, setOpen] = useState(false);
    return (<div className="px-4 py-2.5 border-b border-[#262626] shrink-0">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center gap-2 text-left group">
        <ShieldAlert className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }}/>
        <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded shrink-0" style={{ color: meta.color, backgroundColor: meta.bg }}>
          {meta.label} risk
        </span>
        
        <div className="flex-1 h-1 bg-[#1a1a1a] rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${Math.round(score * 100)}%`, backgroundColor: meta.color, opacity: 0.7 }}/>
        </div>
        <span className="text-[10px] font-mono text-white/30 shrink-0">{Math.round(score * 100)}/100</span>
        <span className="text-[10px] text-white/20 group-hover:text-white/40 transition-colors">{open ? '▲' : '▼'}</span>
      </button>

      {open && (<div className="mt-3 flex flex-col gap-2">
          <RiskBar label="Dependents (callers)" norm={factors.normInDegree} raw={factors.inDegree}/>
          <RiskBar label="Community crossings" norm={factors.normCrossings} raw={factors.communityCrossings}/>
          <RiskBar label="Lines of code" norm={factors.normLOC} raw={factors.linesOfCode} unit=" lines"/>
          <RiskBar label="Dependencies (calls out)" norm={factors.normOutDegree} raw={factors.outDegree}/>
          <p className="text-[10px] text-white/20 pt-2 border-t border-[#262626] leading-relaxed">
            On the graph: bigger node = higher risk · more faded = lower risk.<br />
            Formula: callers×40% + crossings×30% + size×20% + fan-out×10%
          </p>
        </div>)}
    </div>);
}
export function CodePanel({ explorerSidebarCollapsed = false, }: {
    explorerSidebarCollapsed?: boolean;
} = {}) {
    const { selectedNode, isCodePanelOpen, closeCodePanel, repoId } = useKGState();
    const [panelWidth, setPanelWidth] = useState(420);
    const isResizing = useRef(false);
    const startX = useRef(0);
    const startWidth = useRef(0);
    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        startX.current = e.clientX;
        startWidth.current = panelWidth;
        const onMove = (ev: MouseEvent) => {
            if (!isResizing.current)
                return;
            const delta = ev.clientX - startX.current;
            const next = Math.max(280, Math.min(720, startWidth.current + delta));
            setPanelWidth(next);
        };
        const onUp = () => {
            isResizing.current = false;
            window.removeEventListener('mousemove', onMove);
            window.removeEventListener('mouseup', onUp);
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
    }, [panelWidth]);
    const [content, setContent] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastFetchedRef = useRef<string | null>(null);
    const fetchFile = useCallback(async (node: GraphNode) => {
        const filePath = node.properties.filePath;
        if (!filePath || node.label === 'Folder' || node.label === 'Community' || node.label === 'Process') {
            setContent(null);
            return;
        }
        const cacheKey = `${repoId}:${filePath}`;
        if (lastFetchedRef.current === cacheKey)
            return;
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`/api/github/repositories/${encodeURIComponent(repoId)}/contents?path=${encodeURIComponent(filePath)}`);
            if (!res.ok)
                throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            const fileEntry = Array.isArray(data?.contents) ? data.contents[0] : data?.contents;
            const raw = fileEntry?.content;
            if (!raw)
                throw new Error('No content returned');
            setContent(decodeBase64(raw));
            lastFetchedRef.current = cacheKey;
        }
        catch (e) {
            setError(e instanceof Error ? e.message : 'Failed to load file');
            setContent(null);
        }
        finally {
            setLoading(false);
        }
    }, [repoId]);
    useEffect(() => {
        if (selectedNode && isCodePanelOpen) {
            fetchFile(selectedNode);
        }
        else {
            setContent(null);
            setError(null);
            lastFetchedRef.current = null;
        }
    }, [selectedNode, isCodePanelOpen, fetchFile]);
    const NO_SOURCE_LABELS = new Set(['Folder', 'Community', 'Process']);
    if (!isCodePanelOpen || !selectedNode || NO_SOURCE_LABELS.has(selectedNode.label))
        return null;
    const { label, properties } = selectedNode;
    const { name, filePath, startLine, endLine, language, isAsync, isExported, isStatic, riskScore, riskLevel, riskFactors } = properties;
    const nodeColor = NODE_COLORS[label] || '#6366f1';
    const displayLang = language || (filePath ? getLanguageFromPath(filePath) : '');
    const fileName = filePath ? filePath.split('/').pop() : '';
    const leftAfterExplorer = explorerSidebarCollapsed
        ? 'left-[calc(1rem+3rem+0.75rem)]'
        : 'left-[calc(1rem+16rem+0.75rem)]';
    return (<div className={`absolute top-14 bottom-4 z-[15] flex flex-col bg-[#121215] border border-[#262626] rounded-xl shadow-2xl shadow-black/50 overflow-hidden animate-in slide-in-from-left duration-200 ${leftAfterExplorer}`} style={{ width: panelWidth }}>
      <div onMouseDown={handleResizeStart} className="absolute top-0 right-0 bottom-0 w-1.5 z-10 cursor-ew-resize group" title="Drag to resize">
        <div className="absolute inset-y-0 right-0 w-px bg-[#262626] group-hover:w-1 group-hover:bg-[var(--color-primary)]/40 transition-all duration-150"/>
      </div>
      
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: nodeColor }}/>
          <span className="font-mono text-sm text-white/90 truncate">{name}</span>
          <span className="text-xs text-white/30 shrink-0">({label})</span>
        </div>
        <button onClick={closeCodePanel} className="p-1 text-white/25 hover:text-white/80 hover:bg-white/[0.04] rounded transition-colors shrink-0 ml-2">
          <X className="w-4 h-4"/>
        </button>
      </div>

      
      <div className="px-4 py-2.5 border-b border-[#262626] shrink-0">
        <div className="flex flex-wrap gap-1.5 mb-2">
          <Chip label="exported" value={isExported} color="#10b981"/>
          <Chip label="async" value={isAsync} color="#06b6d4"/>
          <Chip label="static" value={isStatic} color="#f59e0b"/>
          {displayLang && <Chip label="lang" value={displayLang} color="#d56707"/>}
          {startLine && <Chip label="line" value={`${startLine}${endLine && endLine !== startLine ? `–${endLine}` : ''}`} color="#d56707"/>}
        </div>

        {filePath && (<div className="flex items-center gap-1.5 text-[11px] text-white/35 font-mono">
            <FileCode className="w-3 h-3 shrink-0"/>
            <span className="truncate" title={filePath}>{filePath}</span>
          </div>)}
      </div>

      
      {typeof riskScore === 'number' && riskLevel && riskFactors && (<RiskBreakdown score={riskScore as number} level={riskLevel as string} factors={riskFactors as RiskFactors}/>)}

      
      <div className="flex-1 overflow-hidden flex flex-col">
        {loading && (<div className="flex-1 flex items-center justify-center">
            <div className="flex items-center gap-2 text-white/35 text-xs">
              <div className="w-4 h-4 border-2 border-[#262626] border-t-[#d56707] rounded-full animate-spin"/>
              Loading {fileName}…
            </div>
          </div>)}

        {error && !loading && (<div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-400 text-xs font-mono mb-1">{error}</p>
              <p className="text-white/25 text-[11px]">Could not load file content</p>
              <button onClick={() => { lastFetchedRef.current = null; fetchFile(selectedNode); }} className="mt-3 px-3 py-1 text-[11px] bg-[#1a1a1a] border border-[#262626] hover:border-[var(--color-primary)]/40 text-white/60 rounded transition-colors">
                Retry
              </button>
            </div>
          </div>)}

        {!loading && !error && content !== null && (<CodeViewer content={content} filePath={filePath} language={displayLang} startLine={startLine} endLine={endLine}/>)}

      </div>
    </div>);
}
