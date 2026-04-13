'use client';
import { useRef, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { MessageSquare } from 'lucide-react';
import { FileTreePanel } from './FileTreePanel';
import { GraphCanvas, GraphCanvasHandle } from './GraphCanvas';
import { CodePanel } from './CodePanel';
import KGChatPanel from './KGChatPanel';
interface ExplorerUIProps {
    orgShortId: string;
    repoFullName: string;
    mongoRepoId: string;
}
export default function ExplorerUI({ orgShortId, repoFullName, mongoRepoId }: ExplorerUIProps) {
    const router = useRouter();
    const canvasRef = useRef<GraphCanvasHandle>(null);
    const [explorerCollapsed, setExplorerCollapsed] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const handleFocusNode = useCallback((nodeId: string) => {
        canvasRef.current?.focusNode(nodeId);
    }, []);
    return (<div className="relative w-full h-full min-h-0 flex-1 bg-transparent overflow-hidden">
      <div className="absolute inset-0 z-0 min-h-0">
        <GraphCanvas ref={canvasRef}/>
      </div>

      <button type="button" onClick={() => router.back()} className="absolute left-4 top-4 z-30 flex items-center gap-2 text-white/60 hover:text-white transition-colors cursor-pointer text-sm font-medium bg-transparent" aria-label="Go back">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
        </svg>
        <span>Back</span>
      </button>

      <button type="button" onClick={() => setChatOpen(v => !v)} className={`absolute right-4 top-4 z-30 flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${chatOpen ? 'bg-[#1a1a1d] border-[var(--color-primary)]/50 text-[var(--color-primary-light)]' : 'bg-[#1a1a1d]/80 border-[#262626] text-white/60 hover:text-white hover:border-white/20'}`} aria-label="Toggle AI Assistant">
        <MessageSquare className="w-3.5 h-3.5"/>
        AI Assistant
      </button>

      <div className={`absolute left-4 top-14 bottom-4 z-20 flex min-h-0 min-w-0 ${explorerCollapsed ? 'w-12 max-w-12' : 'w-64 max-w-64'}`}>
        <FileTreePanel onFocusNode={handleFocusNode} onCollapsedChange={setExplorerCollapsed}/>
      </div>

      <CodePanel explorerSidebarCollapsed={explorerCollapsed}/>

      {chatOpen && (<KGChatPanel orgShortId={orgShortId} repoFullName={repoFullName} mongoRepoId={mongoRepoId}/>)}
    </div>);
}
