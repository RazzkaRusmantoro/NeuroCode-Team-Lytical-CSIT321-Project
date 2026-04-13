'use client';
import { useState, useMemo, useEffect } from 'react';
import TextInput from '@/app/components/TextInput';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
interface PullRequestsViewerProps {
    repositoryId: string;
    repoFullName: string;
    orgShortId: string;
    repoUrlName: string;
    repoName: string;
}
type FilterType = 'open' | 'closed';
interface PullRequest {
    id: number;
    number: number;
    title: string;
    description: string;
    state: string;
    merged: boolean;
    author: string;
    authorAvatar: string;
    createdAt: string;
    updatedAt: string;
    closedAt: string | null;
    mergedAt: string | null;
    url: string;
    commentsCount: number;
    reviewCommentsCount: number;
    commitsCount: number;
    additions: number;
    deletions: number;
    changedFiles: number;
    baseBranch: string;
    headBranch: string;
    headCommitSha: string;
    baseCommitSha: string;
    headRepo: string;
    baseRepo: string;
}
function renderWithInlineCode(text: string): React.ReactNode {
    if (!text)
        return null;
    const parts: React.ReactNode[] = [];
    const regex = /`([^`]+)`/g;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
        if (match.index > lastIndex) {
            parts.push(text.substring(lastIndex, match.index));
        }
        parts.push(<code key={key++} className="bg-white/10 text-white/90 px-1.5 py-0.5 rounded font-mono text-xs">
        {match[1]}
      </code>);
        lastIndex = regex.lastIndex;
    }
    if (lastIndex < text.length) {
        parts.push(text.substring(lastIndex));
    }
    return parts.length > 0 ? <>{parts}</> : text;
}
export default function PullRequestsViewer({ repositoryId, repoFullName, orgShortId, repoUrlName, repoName, }: PullRequestsViewerProps) {
    const [activeFilter, setActiveFilter] = useState<FilterType>('open');
    const [searchQuery, setSearchQuery] = useState('');
    const [pullRequests, setPullRequests] = useState<PullRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPR, setSelectedPR] = useState<PullRequest | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<'files' | 'commits'>('files');
    const [prFiles, setPrFiles] = useState<any[]>([]);
    const [prCommits, setPrCommits] = useState<any[]>([]);
    const [loadingFiles, setLoadingFiles] = useState(false);
    const [loadingCommits, setLoadingCommits] = useState(false);
    const [selectedFile, setSelectedFile] = useState<string | null>(null);
    const [leftWidth, setLeftWidth] = useState(60);
    const [isResizing, setIsResizing] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [selectedComments, setSelectedComments] = useState<Set<number>>(new Set());
    const [postingComments, setPostingComments] = useState(false);
    const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
    const [prAnalysis, setPrAnalysis] = useState<any>(null);
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisPolling, setAnalysisPolling] = useState(false);
    const [expandedIssues, setExpandedIssues] = useState<Set<number>>(new Set());
    const [postedComments, setPostedComments] = useState<Set<string>>(new Set());
    const [loadingPostedStatus, setLoadingPostedStatus] = useState(false);
    const [notification, setNotification] = useState<{
        message: string;
        type: 'success' | 'error' | 'warning';
    } | null>(null);
    useEffect(() => {
        const fetchPullRequests = async () => {
            setLoading(true);
            setError(null);
            try {
                const encodedRepoFullName = encodeURIComponent(repoFullName);
                const [openResponse, closedResponse] = await Promise.all([
                    fetch(`/api/github/repositories/${encodedRepoFullName}/pull-requests?state=open&orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}`),
                    fetch(`/api/github/repositories/${encodedRepoFullName}/pull-requests?state=closed&orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}`),
                ]);
                if (!openResponse.ok && !closedResponse.ok) {
                    throw new Error('Failed to fetch pull requests');
                }
                const openData = openResponse.ok ? await openResponse.json() : { pullRequests: [] };
                const closedData = closedResponse.ok ? await closedResponse.json() : { pullRequests: [] };
                const allPRs = [...(openData.pullRequests || []), ...(closedData.pullRequests || [])];
                const formattedPRs = allPRs.map((pr: any) => ({
                    ...pr,
                    state: pr.merged ? 'merged' : pr.state,
                }));
                setPullRequests(formattedPRs);
            }
            catch (err) {
                console.error('Error fetching pull requests:', err);
                setError('Failed to load pull requests. Please try again later.');
            }
            finally {
                setLoading(false);
            }
        };
        fetchPullRequests();
    }, [repoFullName, orgShortId, repoUrlName]);
    const fetchPRFiles = async (prNumber: number) => {
        setLoadingFiles(true);
        try {
            const encodedRepoFullName = encodeURIComponent(repoFullName);
            const response = await fetch(`/api/github/repositories/${encodedRepoFullName}/pull-requests/${prNumber}/files?orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}`);
            if (response.ok) {
                const data = await response.json();
                setPrFiles(data.files || []);
            }
        }
        catch (error) {
            console.error('Error fetching PR files:', error);
        }
        finally {
            setLoadingFiles(false);
        }
    };
    const fetchPRCommits = async (prNumber: number) => {
        setLoadingCommits(true);
        try {
            const encodedRepoFullName = encodeURIComponent(repoFullName);
            const response = await fetch(`/api/github/repositories/${encodedRepoFullName}/pull-requests/${prNumber}/commits?orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}`);
            if (response.ok) {
                const data = await response.json();
                setPrCommits(data.commits || []);
            }
        }
        catch (error) {
            console.error('Error fetching PR commits:', error);
        }
        finally {
            setLoadingCommits(false);
        }
    };
    const triggerPRAnalysis = async (prNumber: number) => {
        setAnalysisLoading(true);
        try {
            const encodedRepoFullName = encodeURIComponent(repoFullName);
            const response = await fetch(`/api/pull-requests/${encodedRepoFullName}/${prNumber}/analyze?orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}&repoFullName=${encodeURIComponent(repoFullName)}`, {
                method: 'POST',
            });
            if (response.ok) {
                const data = await response.json();
                setPrAnalysis(data.analysis);
                if (data.status === 'generating') {
                    setAnalysisPolling(true);
                    startAnalysisPolling(prNumber);
                }
                else if (data.status === 'completed') {
                    setAnalysisLoading(false);
                    setAnalysisPolling(false);
                }
            }
        }
        catch (error) {
            console.error('Error triggering PR analysis:', error);
            setAnalysisLoading(false);
        }
    };
    const startAnalysisPolling = (prNumber: number) => {
        const pollInterval = setInterval(async () => {
            try {
                const encodedRepoFullName = encodeURIComponent(repoFullName);
                const response = await fetch(`/api/pull-requests/${encodedRepoFullName}/${prNumber}/analyze?orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}`);
                if (response.ok) {
                    const data = await response.json();
                    setPrAnalysis(data.analysis);
                    if (data.status === 'completed') {
                        setAnalysisLoading(false);
                        setAnalysisPolling(false);
                        clearInterval(pollInterval);
                    }
                    else if (data.status === 'failed') {
                        setAnalysisLoading(false);
                        setAnalysisPolling(false);
                        clearInterval(pollInterval);
                    }
                }
            }
            catch (error) {
                console.error('Error polling analysis:', error);
            }
        }, 2000);
        setTimeout(() => {
            clearInterval(pollInterval);
            setAnalysisPolling(false);
            if (analysisLoading) {
                setAnalysisLoading(false);
            }
        }, 300000);
    };
    useEffect(() => {
        return () => {
            setAnalysisPolling(false);
        };
    }, [selectedPR]);
    const generateCommentHash = (path: string, line: number | null, body: string): string => {
        const str = `${path}:${line}:${body}`;
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
    };
    useEffect(() => {
        if (prAnalysis?.reviewComments && selectedPR && prAnalysis.processingStatus === 'completed') {
            const fetchPostedStatus = async () => {
                setLoadingPostedStatus(true);
                try {
                    const response = await fetch(`/api/github/repositories/${repositoryId}/pull-requests/${selectedPR.number}/comments/status?orgShortId=${orgShortId}&repoUrlName=${repoUrlName}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ comments: prAnalysis.reviewComments }),
                    });
                    if (response.ok) {
                        const result = await response.json();
                        const postedSet = new Set<string>();
                        prAnalysis.reviewComments.forEach((comment: any) => {
                            const hash = generateCommentHash(comment.path, comment.line, comment.body);
                            if (result.postedHashes.includes(hash)) {
                                postedSet.add(hash);
                            }
                        });
                        setPostedComments(postedSet);
                    }
                }
                catch (error) {
                    console.error('Error fetching posted status:', error);
                }
                finally {
                    setLoadingPostedStatus(false);
                }
            };
            fetchPostedStatus();
        }
    }, [prAnalysis, selectedPR, repositoryId, orgShortId, repoUrlName]);
    useEffect(() => {
        if (notification) {
            const timer = setTimeout(() => {
                setNotification(null);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [notification]);
    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isResizing)
                return;
            const modal = document.querySelector('[data-modal-container]') as HTMLElement;
            if (!modal)
                return;
            const rect = modal.getBoundingClientRect();
            const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
            const constrainedWidth = Math.max(20, Math.min(80, newLeftWidth));
            setLeftWidth(constrainedWidth);
        };
        const handleMouseUp = () => {
            setIsResizing(false);
        };
        if (isResizing) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = 'col-resize';
            document.body.style.userSelect = 'none';
        }
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
            document.body.style.cursor = '';
            document.body.style.userSelect = '';
        };
    }, [isResizing]);
    const detectLanguage = (filename: string): string => {
        const extension = filename.split('.').pop()?.toLowerCase();
        const languageMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'tsx',
            'js': 'javascript',
            'jsx': 'jsx',
            'py': 'python',
            'java': 'java',
            'cpp': 'cpp',
            'c': 'c',
            'cs': 'csharp',
            'php': 'php',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'swift': 'swift',
            'kt': 'kotlin',
            'scala': 'scala',
            'sh': 'bash',
            'bash': 'bash',
            'zsh': 'bash',
            'yaml': 'yaml',
            'yml': 'yaml',
            'json': 'json',
            'xml': 'xml',
            'html': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'md': 'markdown',
            'sql': 'sql',
            'vue': 'vue',
            'svelte': 'svelte',
        };
        return extension && languageMap[extension] ? languageMap[extension] : 'text';
    };
    const parseDiff = (patch: string) => {
        if (!patch)
            return [];
        const lines = patch.split('\n');
        const result: Array<{
            type: 'context' | 'add' | 'remove' | 'header';
            content: string;
            oldLine?: number;
            newLine?: number;
        }> = [];
        let oldLine = 0;
        let newLine = 0;
        for (const line of lines) {
            if (line.startsWith('@@')) {
                const match = line.match(/@@ -(\d+),?\d* \+(\d+),?\d* @@/);
                if (match) {
                    oldLine = parseInt(match[1]);
                    newLine = parseInt(match[2]);
                }
                result.push({ type: 'header', content: line });
            }
            else if (line.startsWith('+') && !line.startsWith('+++')) {
                result.push({ type: 'add', content: line.substring(1), newLine: newLine++ });
            }
            else if (line.startsWith('-') && !line.startsWith('---')) {
                result.push({ type: 'remove', content: line.substring(1), oldLine: oldLine++ });
            }
            else if (line.startsWith(' ')) {
                result.push({ type: 'context', content: line.substring(1), oldLine: oldLine++, newLine: newLine++ });
            }
            else {
                result.push({ type: 'context', content: line });
            }
        }
        return result;
    };
    const filteredPullRequests = useMemo(() => {
        let filtered = pullRequests;
        if (activeFilter === 'open') {
            filtered = filtered.filter(pr => pr.state === 'open');
        }
        else if (activeFilter === 'closed') {
            filtered = filtered.filter(pr => pr.state === 'closed' || pr.state === 'merged');
        }
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(pr => pr.title?.toLowerCase().includes(query) ||
                pr.number?.toString().includes(query) ||
                pr.author?.toLowerCase().includes(query));
        }
        filtered.sort((a, b) => {
            const dateA = new Date(a.updatedAt).getTime();
            const dateB = new Date(b.updatedAt).getTime();
            return dateB - dateA;
        });
        return filtered;
    }, [pullRequests, activeFilter, searchQuery]);
    return (<div className="h-full flex flex-col bg-transparent">
      
      {notification && (<div className="fixed top-4 right-4 z-[100] animate-[fadeIn_0.15s_ease-out]">
          <div className={`px-6 py-4 rounded border shadow-2xl flex items-center gap-3 min-w-[300px] max-w-[500px] backdrop-blur-sm ${notification.type === 'success'
                ? 'bg-[#121215] border-green-500/50 text-green-400 shadow-green-500/20'
                : notification.type === 'warning'
                    ? 'bg-[#121215] border-yellow-500/50 text-yellow-400 shadow-yellow-500/20'
                    : 'bg-[#121215] border-red-500/50 text-red-400 shadow-red-500/20'}`}>
            {notification.type === 'success' && (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7"/>
              </svg>)}
            {notification.type === 'error' && (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>)}
            {notification.type === 'warning' && (<svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
              </svg>)}
            <p className="text-sm font-medium flex-1">{notification.message}</p>
            <button onClick={() => setNotification(null)} className="text-current/60 hover:text-current transition-colors cursor-pointer" aria-label="Dismiss notification">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
              </svg>
            </button>
          </div>
        </div>)}
      
      <div className="max-w-screen-2xl mx-auto w-full h-full flex flex-col">
        
        <div className="border-b border-white/10 px-6">
          <div className="flex gap-1">
            <button type="button" onClick={() => setActiveFilter('open')} className={`px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer ${activeFilter === 'open'
            ? 'text-white'
            : 'text-white/60 hover:text-white/80'}`}>
              Open
              {activeFilter === 'open' && (<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"></span>)}
            </button>
            <button type="button" onClick={() => setActiveFilter('closed')} className={`px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer ${activeFilter === 'closed'
            ? 'text-white'
            : 'text-white/60 hover:text-white/80'}`}>
              Closed
              {activeFilter === 'closed' && (<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"></span>)}
            </button>
          </div>
        </div>

        
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-6">
          
          <div className="flex justify-between items-center mb-6 gap-4">
            <h2 className="text-2xl font-bold text-white">Pull Requests</h2>
          </div>

          
          <div>
            
            <div className="w-full">
              <div className="bg-[#121215] border border-[#262626] rounded overflow-hidden">
                
                <div className="px-6 py-4 border-b border-[#262626] bg-[#121215]">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-white">
                      {activeFilter === 'open' ? 'Open Pull Requests' : 'Closed Pull Requests'}
                    </h3>
                    <div className="flex items-center gap-2 text-sm text-white/60">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                      </svg>
                      <span>{filteredPullRequests.length} {filteredPullRequests.length === 1 ? 'request' : 'requests'}</span>
                    </div>
                  </div>
                </div>

                
                <div className="h-[600px] overflow-y-auto custom-scrollbar">
                  {loading ? (<div className="divide-y divide-[#262626]">
                      {[...Array(5)].map((_, index) => (<div key={index} className="px-6 py-5 animate-pulse">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                <div className="h-6 bg-white/10 rounded w-3/4"></div>
                                <div className="h-5 bg-white/10 rounded w-16"></div>
                              </div>
                              <div className="space-y-2 mb-3">
                                <div className="h-4 bg-white/10 rounded w-full"></div>
                                <div className="h-4 bg-white/10 rounded w-5/6"></div>
                              </div>
                              <div className="h-7 bg-white/10 rounded w-48 mb-3"></div>
                              <div className="h-4 bg-white/10 rounded w-32 mb-3"></div>
                              <div className="flex items-center gap-4 flex-wrap">
                                <div className="h-4 bg-white/10 rounded w-12"></div>
                                <div className="h-4 bg-white/10 rounded w-20"></div>
                                <div className="h-4 bg-white/10 rounded w-24"></div>
                                <div className="h-4 bg-white/10 rounded w-16"></div>
                              </div>
                            </div>
                            <div className="h-5 w-5 bg-white/10 rounded flex-shrink-0"></div>
                          </div>
                        </div>))}
                    </div>) : error ? (<div className="flex flex-col items-center justify-center h-full py-20 px-6">
                      <div className="mb-6 p-6 bg-red-500/10 rounded border border-red-500/30">
                        <svg className="w-16 h-16 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">Error loading pull requests</h3>
                      <p className="text-white/60 text-center max-w-md mb-6">{error}</p>
                    </div>) : filteredPullRequests.length === 0 ? (<div className="flex flex-col items-center justify-center h-full py-20 px-6">
                      <div className="mb-6 p-6 bg-[#121215] rounded border border-[#262626]">
                        <svg className="w-16 h-16 text-white/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"/>
                        </svg>
                      </div>
                      <h3 className="text-xl font-semibold text-white mb-2">
                        {activeFilter === 'open' ? 'No open pull requests' : 'No closed pull requests'}
                      </h3>
                      <p className="text-white/60 text-center max-w-md mb-6">
                        {activeFilter === 'open'
                ? 'There are no open pull requests for this repository. Pull requests will appear here when they are created.'
                : 'There are no closed pull requests for this repository.'}
                      </p>
                      {activeFilter === 'open' && (<div className="flex items-center gap-2 px-4 py-2 bg-[#121215] border border-[#262626] rounded text-white/40 text-sm">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                          </svg>
                          <span>Pull requests are created on GitHub</span>
                        </div>)}
                    </div>) : (<div className="divide-y divide-[#262626]">
                      {filteredPullRequests.map((pr, index) => (<div key={pr.id} onClick={() => {
                    setSelectedPR(pr);
                    setIsModalOpen(true);
                    setActiveTab('files');
                    setSelectedFile(null);
                    setPrAnalysis(null);
                    setAnalysisLoading(false);
                    setAnalysisPolling(false);
                    setExpandedIssues(new Set());
                    fetchPRFiles(pr.number);
                    fetchPRCommits(pr.number);
                    triggerPRAnalysis(pr.number);
                }} className="px-6 py-5 hover:bg-[#121215] transition-all duration-200 cursor-pointer group border-l-4 border-transparent hover:border-[var(--color-primary)]">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-3 mb-3">
                                {pr.state === 'open' && (<span className="px-2.5 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded border border-green-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-green-400 rounded"></span>
                                    Open
                                  </span>)}
                                {pr.state === 'closed' && !pr.merged && (<span className="px-2.5 py-1 bg-red-500/20 text-red-400 text-xs font-medium rounded border border-red-500/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-red-400 rounded"></span>
                                    Closed
                                  </span>)}
                                {(pr.state === 'merged' || pr.merged) && (<span className="px-2.5 py-1 bg-[var(--color-primary)]/20 text-[var(--color-primary)] text-xs font-medium rounded border border-[var(--color-primary)]/30 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 bg-[var(--color-primary)] rounded"></span>
                                    Merged
                                  </span>)}
                                <h3 className="text-white font-semibold text-lg group-hover:text-[var(--color-primary)] transition-colors">
                                  {pr.title}
                                </h3>
                              </div>
                              
                              
                              <div className="flex items-center gap-4 flex-wrap text-xs">
                                {pr.headBranch && pr.baseBranch && (<div className="inline-flex items-center gap-2 text-white/60 bg-[#121215] px-3 py-2 rounded border border-[#262626]">
                                    <svg className="w-4 h-4 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"/>
                                  </svg>
                                    <span className="font-mono text-white/70">{pr.headBranch}</span>
                                    <span className="text-white/40">→</span>
                                    <span className="font-mono text-white/70">{pr.baseBranch}</span>
                                  </div>)}
                                {pr.headCommitSha && (<div className="flex items-center gap-2 text-white/50">
                                    <span>Commit:</span>
                                    <span className="font-mono">{pr.headCommitSha.substring(0, 7)}</span>
                                </div>)}
                                {pr.author && (<div className="flex items-center gap-2 text-white/50">
                                    <span>{pr.author}</span>
                                  </div>)}
                                {pr.createdAt && (<div className="flex items-center gap-2 text-white/50">
                                    <span>{new Date(pr.createdAt).toLocaleDateString()}</span>
                                  </div>)}
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <svg className="w-5 h-5 text-white/40 group-hover:text-[var(--color-primary)] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                              </svg>
                            </div>
                          </div>
                        </div>))}
                    </div>)}
                </div>
              </div>
            </div>
              </div>
            </div>
          </div>

      
      {isModalOpen && selectedPR && (<div className="fixed inset-0 z-50 flex items-center justify-center">
          
          <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px] transition-opacity duration-150 animate-[fadeIn_0.15s_ease-out]" onClick={() => {
                setIsModalOpen(false);
                setSelectedPR(null);
            }}/>
          
          
          <div className="relative z-10 bg-[#121215] rounded border border-[#262626] p-8 w-full mx-4 shadow-2xl transition-all duration-300 ease-in-out flex flex-col overflow-hidden max-w-7xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-6">
              <div className="flex items-center gap-4">
                {showSuggestions && (<button onClick={() => setShowSuggestions(false)} className="text-white/60 hover:text-white transition-colors duration-200 cursor-pointer">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7"/>
                    </svg>
                  </button>)}
                <h2 className="text-2xl font-bold text-white">{showSuggestions ? 'AI Suggestions' : selectedPR.title}</h2>
              </div>
              <button onClick={() => {
                setIsModalOpen(false);
                setSelectedPR(null);
                setShowSuggestions(false);
            }} className="text-white/60 hover:text-white transition-colors duration-200 cursor-pointer">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                </svg>
              </button>
            </div>

            
            <div className="relative flex-1 min-h-0 overflow-hidden">
              
              <div className={`transition-all duration-500 ease-in-out h-full ${showSuggestions
                ? 'transform -translate-x-full opacity-0 absolute w-full'
                : 'transform translate-x-0 opacity-100 relative'}`}>
                
                <div className="overflow-hidden flex flex-row h-[600px] gap-0" data-modal-container>
              
              <div className="flex flex-col overflow-hidden border-r border-[#262626]" style={{ width: `${leftWidth}%`, minWidth: '200px', maxWidth: '80%' }}>
                
                <div className="border-b border-[#262626] px-6">
                  <div className="flex gap-1">
                    <button type="button" onClick={() => setActiveTab('files')} className={`px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer ${activeTab === 'files'
                ? 'text-white'
                : 'text-white/60 hover:text-white/80'}`}>
                      Files Changed
                      {activeTab === 'files' && (<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"></span>)}
                    </button>
                    <button type="button" onClick={() => setActiveTab('commits')} className={`px-6 py-3 text-sm font-medium transition-all duration-200 relative cursor-pointer ${activeTab === 'commits'
                ? 'text-white'
                : 'text-white/60 hover:text-white/80'}`}>
                      Commits
                      {activeTab === 'commits' && (<span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[var(--color-primary)]"></span>)}
                    </button>
                  </div>
                </div>

                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                  {activeTab === 'files' && (<div>
                      {loadingFiles ? (<div className="space-y-4">
                          {[...Array(4)].map((_, idx) => (<div key={idx} className="border border-[#262626] rounded overflow-hidden animate-pulse">
                              <div className="px-6 py-4 bg-[#121215] border-b border-[#262626]">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                    <div className="h-5 w-12 bg-[#262626]/50 rounded"></div>
                                    <div className="h-4 w-48 bg-[#262626]/50 rounded"></div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="h-4 w-16 bg-[#262626]/50 rounded"></div>
                                    <div className="h-4 w-16 bg-[#262626]/50 rounded"></div>
                                  </div>
                                </div>
                              </div>
                              <div className="p-4 bg-[#1a1a1a]">
                                <div className="space-y-2">
                                  <div className="h-4 w-full bg-[#262626]/50 rounded"></div>
                                  <div className="h-4 w-5/6 bg-[#262626]/50 rounded"></div>
                                  <div className="h-4 w-4/6 bg-[#262626]/50 rounded"></div>
                                </div>
                              </div>
                            </div>))}
                        </div>) : prFiles.length === 0 ? (<div className="text-center py-20 text-white/60">No files changed</div>) : (<div className="space-y-4">
                          {prFiles.map((file, index) => {
                        const isExpanded = selectedFile === file.filename;
                        return (<div key={index} className="border border-[#262626] rounded overflow-hidden">
                                
                                <div className="px-6 py-4 bg-[#121215] border-b border-[#262626] cursor-pointer hover:bg-[#1a1a1a] transition-colors" onClick={() => setSelectedFile(isExpanded ? null : file.filename)}>
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <span className={`text-xs px-2 py-1 rounded ${file.status === 'added' ? 'bg-green-500/20 text-green-400' :
                                file.status === 'removed' ? 'bg-red-500/20 text-red-400' :
                                    'bg-blue-500/20 text-blue-400'}`}>
                                        {file.status}
                                      </span>
                                      <span className="text-white font-medium">{file.filename}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <div className="flex items-center gap-4 text-sm text-white/60">
                                        <span className="text-green-400">+{file.additions}</span>
                                        <span className="text-red-400">-{file.deletions}</span>
                                      </div>
                                      <svg className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                                      </svg>
                                    </div>
                                  </div>
                                </div>

                                
                                {isExpanded && file.patch && (() => {
                                const language = detectLanguage(file.filename);
                                return (<div className="bg-[#1a1a1a] overflow-x-auto">
                                      {parseDiff(file.patch).map((line, lineIndex) => {
                                        if (line.type === 'header') {
                                            return (<div key={lineIndex} className="border-t border-b border-[#262626] bg-[#121215] py-2 px-4">
                                              <span className="text-white/40 text-xs font-mono">{line.content}</span>
                                            </div>);
                                        }
                                        return (<div key={lineIndex} className={`font-mono text-sm flex ${line.type === 'add' ? 'bg-green-500/10' :
                                                line.type === 'remove' ? 'bg-red-500/10' :
                                                    ''}`} style={{ minHeight: '24px' }}>
                                            
                                            <div className={`min-w-[3rem] w-auto text-right pr-3 py-1 text-xs border-r border-[#262626] bg-[#1a1a1a] flex-shrink-0 ${line.type === 'remove' ? 'bg-red-500/20' :
                                                ''}`} style={{
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                lineHeight: '24px',
                                                paddingLeft: '8px'
                                            }}>
                                              {line.type === 'remove' || line.type === 'context' ? line.oldLine || '' : ''}
                                            </div>
                                            
                                            <div className={`min-w-[3rem] w-auto text-right pr-3 py-1 text-xs border-r border-[#262626] bg-[#1a1a1a] flex-shrink-0 ${line.type === 'add' ? 'bg-green-500/20' :
                                                ''}`} style={{
                                                color: 'rgba(255, 255, 255, 0.4)',
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'flex-end',
                                                lineHeight: '24px',
                                                paddingLeft: '8px'
                                            }}>
                                              {line.type === 'add' || line.type === 'context' ? line.newLine || '' : ''}
                                            </div>
                                            
                                            <div className={`flex-1 px-4 py-1 ${line.type === 'add' ? 'bg-green-500/10' :
                                                line.type === 'remove' ? 'bg-red-500/10' :
                                                    'bg-[#1a1a1a]'}`} style={{
                                                fontSize: '14px',
                                                lineHeight: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                overflow: 'hidden'
                                            }}>
                                              {line.type === 'add' && <span className="text-green-400 mr-1 flex-shrink-0">+</span>}
                                              {line.type === 'remove' && <span className="text-red-400 mr-1 flex-shrink-0">-</span>}
                                              <span style={{ display: 'inline-block', width: '100%' }}>
                                                <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{
                                                margin: 0,
                                                padding: 0,
                                                background: 'transparent',
                                                fontSize: '14px',
                                                lineHeight: '24px',
                                                display: 'inline',
                                            }} PreTag="span" CodeTag="span">
                                                  {line.content}
                                                </SyntaxHighlighter>
                                              </span>
                                            </div>
                                          </div>);
                                    })}
                                    </div>);
                            })()}
                              </div>);
                    })}
                        </div>)}
                    </div>)}
                  {activeTab === 'commits' && (<div className="h-full overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] p-6">
                      {loadingCommits ? (<div className="flex items-center justify-center py-20">
                          <div className="animate-spin">
                            <svg className="w-8 h-8 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                            </svg>
                          </div>
                        </div>) : prCommits.length === 0 ? (<div className="text-center py-20 text-white/60">No commits</div>) : (<div className="divide-y divide-[#262626]">
                          {prCommits.map((commit, index) => (<div key={index} className="py-4 hover:bg-[#121215] transition-colors rounded px-2">
                              <div className="flex items-start gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="font-mono text-sm text-[var(--color-primary)]">{commit.sha.substring(0, 7)}</span>
                                    <span className="text-white font-medium">{commit.message.split('\n')[0]}</span>
                                  </div>
                                  <div className="flex items-center gap-4 text-sm text-white/60">
                                    {commit.author.avatarUrl && (<img src={commit.author.avatarUrl} alt={commit.author.name} className="w-5 h-5 rounded"/>)}
                                    <span>{commit.author.name || commit.author.login}</span>
                                    <span>{new Date(commit.author.date).toLocaleDateString()}</span>
                                  </div>
                                </div>
                              </div>
                            </div>))}
                        </div>)}
                    </div>)}
                </div>
              </div>

              
              <div className="w-[1px] bg-[#262626] relative group" style={{ flexShrink: 0 }}>
                
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-12 flex items-center justify-center bg-[#121215] border border-[#262626] rounded cursor-col-resize hover:border-[var(--color-primary)] hover:bg-[#1a1a1a] transition-colors" onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
            }}>
                  <div className="flex gap-1">
                    <div className="w-0.5 h-3 bg-white/30 rounded"></div>
                    <div className="w-0.5 h-3 bg-white/30 rounded"></div>
                    <div className="w-0.5 h-3 bg-white/30 rounded"></div>
                  </div>
                </div>
                
                <div className="absolute inset-y-0 -left-2 -right-2 cursor-col-resize" onMouseDown={(e) => {
                e.preventDefault();
                setIsResizing(true);
            }}/>
              </div>

              
              <div className="flex flex-col overflow-hidden h-[550px]" style={{ width: `${100 - leftWidth}%`, minWidth: '200px' }}>
                {analysisLoading || analysisPolling ? (<div className="flex flex-col items-center justify-center h-full p-8">
                    <div className="mb-4">
                      <div className="animate-spin">
                        <svg className="w-12 h-12 text-[var(--color-primary)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"/>
                        </svg>
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2">Analyzing Pull Request</h3>
                    <p className="text-sm text-white/60 text-center max-w-sm">
                      Generating AI-powered insights, risk assessment, and impact analysis...
                    </p>
                  </div>) : prAnalysis && prAnalysis.processingStatus === 'completed' ? (<div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
                    
                    {prAnalysis.riskAssessment && (<div className="p-6 border-b border-[#262626]">
                        <div className="flex items-center justify-end gap-3">
                          <button onClick={() => {
                        setShowSuggestions(true);
                    }} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-[#171717] hover:bg-[#1a1a1a] rounded transition-all border border-[#262626] hover:border-[#3a3a3a] cursor-pointer">
                            <span>View Suggestions</span>
                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                            </svg>
                          </button>
                        </div>
                      </div>)}

                    
                    {prAnalysis.issues && prAnalysis.issues.length > 0 && (<div className="p-6 border-b border-[#262626] bg-red-500/5">
                        <div className="flex items-center gap-2 mb-4">
                          <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                          </svg>
                          <h4 className="text-sm font-bold text-red-400 uppercase tracking-wide">Issues Detected ({prAnalysis.issues.length})</h4>
                        </div>
                        <div className="space-y-3">
                          {prAnalysis.issues.map((issue: any, idx: number) => {
                        const isExpanded = expandedIssues.has(idx);
                        return (<div key={idx} className={`p-4 rounded border-2 transition-all ${issue.severity === 'critical' ? 'bg-red-500/10 border-red-500/50' :
                                issue.severity === 'high' ? 'bg-orange-500/10 border-orange-500/50' :
                                    issue.severity === 'medium' ? 'bg-yellow-500/10 border-yellow-500/50' :
                                        'bg-blue-500/10 border-blue-500/50'}`}>
                                <div className="flex items-start justify-between gap-3 mb-3">
                                  <div className="flex items-center gap-2 flex-1">
                                    <span className={`px-2 py-1 rounded text-xs font-bold ${issue.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                                issue.severity === 'high' ? 'bg-orange-500/20 text-orange-400' :
                                    issue.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400' :
                                        'bg-blue-500/20 text-blue-400'}`}>
                                      {issue.severity.toUpperCase()}
                                    </span>
                                    <span className="text-xs font-medium text-white/60 uppercase">{issue.type.replace('_', ' ')}</span>
                                  </div>
                                  {issue.file && (<span className="text-xs text-white/50 font-mono flex-shrink-0">{issue.file.split('/').pop()}</span>)}
                                </div>
                                
                                
                                <div className="flex items-start gap-2 mb-2">
                                  <div className="flex-1">
                                    <p className="text-sm font-semibold text-white">
                                      {issue.description}
                                    </p>
                                  </div>
                                  <button onClick={() => {
                                const newExpanded = new Set(expandedIssues);
                                if (isExpanded) {
                                    newExpanded.delete(idx);
                                }
                                else {
                                    newExpanded.add(idx);
                                }
                                setExpandedIssues(newExpanded);
                            }} className="flex-shrink-0 p-1.5 hover:bg-white/5 rounded transition-colors group cursor-pointer" aria-label={isExpanded ? "Collapse details" : "Expand details"}>
                                    <svg className={`w-4 h-4 text-white/40 group-hover:text-white/60 transition-all duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                                    </svg>
                                  </button>
                                </div>
                                
                                
                                {isExpanded && issue.explanation && (<div className="mt-3 pt-3 border-t border-white/10">
                                    <p className="text-xs text-white/70 leading-relaxed">{issue.explanation}</p>
                                  </div>)}
                                
                                
                                {isExpanded && (<div className="mt-3 pt-3 border-t border-white/10 flex flex-wrap gap-3 text-xs text-white/50">
                                    {issue.location && (<span className="font-mono">📍 {issue.location}</span>)}
                                    {issue.file && (<span className="font-mono">📄 {issue.file}</span>)}
                                  </div>)}
                              </div>);
                    })}
                        </div>
                      </div>)}

                    
                    {prAnalysis.description && (<div className="p-6 border-b border-[#262626]">
                        <h4 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-5">Description</h4>
                        
                        
                        {prAnalysis.description.title && (<div className="mb-6">
                            <h5 className="text-sm font-semibold text-white mb-2">{prAnalysis.description.title}</h5>
                            {prAnalysis.description.overview && (<p className="text-sm text-white/80 leading-relaxed">{renderWithInlineCode(prAnalysis.description.overview)}</p>)}
                          </div>)}
                        
                        
                        {prAnalysis.description.detailedChanges && prAnalysis.description.detailedChanges.length > 0 && (<div className="mb-6">
                            <h5 className="text-sm font-semibold text-white mb-4">Detailed Changes</h5>
                            {prAnalysis.description.detailedChanges.map((fileChange: any, fileIdx: number) => (<div key={fileIdx} className="mb-5 last:mb-0">
                                <h6 className="text-sm font-medium text-white/90 mb-3">
                                  Updates to <code className="text-xs bg-white/5 px-2 py-1 rounded font-mono">{fileChange.file}</code>
                                </h6>
                                {fileChange.sections && fileChange.sections.map((section: any, sectionIdx: number) => (<div key={sectionIdx} className="mb-4 pl-4 border-l border-white/10">
                                    <div className="text-sm font-medium text-white/90 mb-3">{renderWithInlineCode(section.title)}</div>
                                    
                                    
                                    {section.keyChanges && section.keyChanges.length > 0 && (<div className="mb-3">
                                        <p className="text-xs font-medium text-white/60 mb-2">Key changes:</p>
                                        <ul className="space-y-1.5">
                                          {section.keyChanges.map((change: string, changeIdx: number) => (<li key={changeIdx} className="flex items-start gap-2 text-sm text-white/70">
                                              <span className="text-white/40 mt-1 flex-shrink-0">•</span>
                                              <span className="leading-relaxed">{renderWithInlineCode(change)}</span>
                                            </li>))}
                                        </ul>
                                      </div>)}
                                    
                                    
                                    {section.impact && (<div className="mb-3">
                                        <p className="text-xs font-medium text-white/60 mb-1">Impact:</p>
                                        <p className="text-sm text-white/80 leading-relaxed">{renderWithInlineCode(section.impact)}</p>
                                      </div>)}
                                    
                                    
                                    {section.codeSnippets && section.codeSnippets.length > 0 && (<div className="mt-3 space-y-2">
                                        {section.codeSnippets.map((snippet: any, snippetIdx: number) => {
                                        const lines = snippet.code.split('\n');
                                        return (<div key={snippetIdx} className="bg-white/5 rounded border border-white/10 overflow-x-auto">
                                              <div className="min-w-full">
                                                {lines.map((line: string, lineIdx: number) => {
                                                const isAdded = line.startsWith('+') && !line.startsWith('+++');
                                                const isRemoved = line.startsWith('-') && !line.startsWith('---');
                                                return (<div key={lineIdx} className={`${isAdded ? 'bg-green-500/20 text-green-300' :
                                                        isRemoved ? 'bg-red-500/20 text-red-300' :
                                                            'text-white/70'} font-mono text-xs whitespace-pre`} style={{
                                                        display: 'block',
                                                        width: '100%',
                                                        minWidth: '100%',
                                                        boxSizing: 'border-box'
                                                    }}>
                                                      <span style={{ display: 'inline-block', minWidth: '100%' }}>
                                                        {line || '\u00A0'}
                                                      </span>
                                                    </div>);
                                            })}
                                              </div>
                                            </div>);
                                    })}
                                      </div>)}
                                  </div>))}
                              </div>))}
                          </div>)}
                        
                        
                        {prAnalysis.description.architecturalImplications && (<div className="mb-6">
                            <h5 className="text-sm font-semibold text-white mb-3">Architectural Implications</h5>
                            
                            {typeof prAnalysis.description.architecturalImplications === 'object' ? (<div className="space-y-3">
                                {prAnalysis.description.architecturalImplications.approach && (<div>
                                    <p className="text-xs font-medium text-white/60 mb-1">Approach</p>
                                    <p className="text-sm text-white/80 leading-relaxed">{renderWithInlineCode(prAnalysis.description.architecturalImplications.approach)}</p>
                                  </div>)}
                                
                                {prAnalysis.description.architecturalImplications.benefits && prAnalysis.description.architecturalImplications.benefits.length > 0 && (<div>
                                    <p className="text-xs font-medium text-white/60 mb-2">Benefits</p>
                                    <ul className="space-y-1.5">
                                      {prAnalysis.description.architecturalImplications.benefits.map((benefit: string, idx: number) => (<li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                                          <span className="text-white/40 mt-1 flex-shrink-0">•</span>
                                          <span className="leading-relaxed">{renderWithInlineCode(benefit)}</span>
                                        </li>))}
                                    </ul>
                                  </div>)}
                                
                                {prAnalysis.description.architecturalImplications.systemEvolution && (<div>
                                    <p className="text-xs font-medium text-white/60 mb-1">System Evolution</p>
                                    <p className="text-sm text-white/80 leading-relaxed">{renderWithInlineCode(prAnalysis.description.architecturalImplications.systemEvolution)}</p>
                                  </div>)}
                                
                                {prAnalysis.description.architecturalImplications.layerConsistency && (<div>
                                    <p className="text-xs font-medium text-white/60 mb-1">Layer Consistency</p>
                                    <p className="text-sm text-white/80 leading-relaxed">{renderWithInlineCode(prAnalysis.description.architecturalImplications.layerConsistency)}</p>
                                  </div>)}
                              </div>) : (<p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
                                {prAnalysis.description.architecturalImplications}
                              </p>)}
                          </div>)}
                        
                        
                        {prAnalysis.description.overallAssessment && (<div>
                            <h5 className="text-sm font-semibold text-white mb-3">Overall Assessment</h5>
                            
                            {typeof prAnalysis.description.overallAssessment === 'object' ? (<div className="space-y-3">
                                {prAnalysis.description.overallAssessment.prType && (<div>
                                    <p className="text-xs font-medium text-white/60 mb-1">PR Type</p>
                                    <p className="text-sm text-white/90">{prAnalysis.description.overallAssessment.prType}</p>
                                  </div>)}
                                
                                {prAnalysis.description.overallAssessment.keyBenefits && prAnalysis.description.overallAssessment.keyBenefits.length > 0 && (<div>
                                    <p className="text-xs font-medium text-white/60 mb-2">Key Benefits</p>
                                    <ul className="space-y-1.5">
                                      {prAnalysis.description.overallAssessment.keyBenefits.map((benefit: string, idx: number) => (<li key={idx} className="flex items-start gap-2 text-sm text-white/80">
                                          <span className="text-white/40 mt-1 flex-shrink-0">•</span>
                                          <span className="leading-relaxed">{renderWithInlineCode(benefit)}</span>
                                        </li>))}
                                    </ul>
                                  </div>)}
                                
                                {prAnalysis.description.overallAssessment.riskLevel && (<div>
                                    <p className="text-xs font-medium text-white/60 mb-1">Risk Level</p>
                                    <p className="text-sm text-white/80 leading-relaxed">{renderWithInlineCode(prAnalysis.description.overallAssessment.riskLevel)}</p>
                                  </div>)}
                                
                                {prAnalysis.description.overallAssessment.breakingChanges && (<div className="p-3 bg-yellow-500/10 rounded border border-yellow-500/20">
                                    <p className="text-xs font-medium text-yellow-300 mb-1">Breaking Changes</p>
                                    <p className="text-sm text-white/80 leading-relaxed">{renderWithInlineCode(prAnalysis.description.overallAssessment.breakingChanges)}</p>
                                  </div>)}
                                
                                {prAnalysis.description.overallAssessment.issuesSummary && (<div className="p-3 bg-red-500/10 rounded border border-red-500/20">
                                    <p className="text-xs font-medium text-red-300 mb-1">Issues Summary</p>
                                    <p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">{renderWithInlineCode(prAnalysis.description.overallAssessment.issuesSummary)}</p>
                                  </div>)}
                              </div>) : (<p className="text-sm text-white/80 leading-relaxed whitespace-pre-line">
                                {renderWithInlineCode(prAnalysis.description.overallAssessment)}
                              </p>)}
                          </div>)}
                      </div>)}

                    
                    {prAnalysis.dependencies && prAnalysis.dependencies.direct && prAnalysis.dependencies.direct.length > 0 && (<div className="p-6">
                        <h4 className="text-xs font-medium text-white/50 uppercase tracking-wide mb-3">Affected Files</h4>
                        <p className="text-xs text-white/60 mb-3">
                          {prAnalysis.dependencies.affectedFiles || prAnalysis.dependencies.direct.length} file(s) modified
                        </p>
                        <div className="space-y-1.5">
                          {prAnalysis.dependencies.direct.slice(0, 8).map((file: string, idx: number) => (<div key={idx} className="text-xs text-white/70 font-mono bg-[#171717]/30 px-3 py-2 rounded border border-[#262626]/50">
                              {file}
                            </div>))}
                        </div>
                      </div>)}
                  </div>) : (<div className="flex flex-col items-center justify-center h-full p-8 text-center">
                    <div className="mb-4 p-4 bg-[#171717]/50 rounded border border-[#262626]">
                      <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                      </svg>
                    </div>
                    <p className="text-sm text-white/60">Analysis will appear here</p>
                  </div>)}
              </div>
            </div>
              </div>

              
              <div className={`transition-all duration-500 ease-in-out h-full ${showSuggestions
                ? 'transform translate-x-0 opacity-100 relative'
                : 'transform translate-x-full opacity-0 absolute w-full'}`}>
                <div className="h-[600px] overflow-y-auto custom-scrollbar p-8">
                  {prAnalysis?.reviewComments && prAnalysis.reviewComments.length > 0 ? (<div className="space-y-6">
                      <div className="flex items-center justify-between mb-6">
                        <div>
                          <h3 className="text-xl font-bold text-white mb-2">AI-Generated Review Comments</h3>
                          <p className="text-sm text-white/60">
                            Select comments to post to GitHub PR. {selectedComments.size} of {prAnalysis.reviewComments.length} selected.
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => {
                    const selectableIndices = prAnalysis.reviewComments
                        .map((comment: any, idx: number) => {
                        const hash = generateCommentHash(comment.path, comment.line, comment.body);
                        return postedComments.has(hash) ? null : idx;
                    })
                        .filter((idx: number | null) => idx !== null) as number[];
                    if (selectedComments.size === selectableIndices.length && selectableIndices.length > 0) {
                        setSelectedComments(new Set());
                    }
                    else {
                        setSelectedComments(new Set(selectableIndices));
                    }
                }} className="px-4 py-2 text-sm font-medium text-white bg-[#171717] hover:bg-[#1a1a1a] rounded transition-all border border-[#262626] hover:border-[#3a3a3a] cursor-pointer">
                            {(() => {
                    const selectableCount = prAnalysis.reviewComments.filter((comment: any, idx: number) => {
                        const hash = generateCommentHash(comment.path, comment.line, comment.body);
                        return !postedComments.has(hash);
                    }).length;
                    return selectedComments.size === selectableCount && selectableCount > 0 ? 'Deselect All' : 'Select All';
                })()}
                          </button>
                          <button onClick={async () => {
                    if (selectedComments.size === 0)
                        return;
                    setPostingComments(true);
                    try {
                        const selectedIndices = Array.from(selectedComments);
                        const commentsToPost = selectedIndices.map(idx => prAnalysis.reviewComments[idx]);
                        const response = await fetch(`/api/github/repositories/${repositoryId}/pull-requests/${selectedPR.number}/comments?orgShortId=${orgShortId}&repoUrlName=${repoUrlName}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ comments: commentsToPost }),
                        });
                        if (!response.ok) {
                            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                            setNotification({
                                message: `Failed to post comments: ${errorData.error || 'Unknown error'}`,
                                type: 'error'
                            });
                            return;
                        }
                        const result = await response.json();
                        if (result.success) {
                            if (result.errors && result.errors.length > 0) {
                                setNotification({
                                    message: `Posted ${result.posted} comment(s) successfully, but ${result.errors.length} failed.`,
                                    type: 'warning'
                                });
                                console.error('Comment posting errors:', result.errors);
                            }
                            else {
                                setNotification({
                                    message: `Successfully posted ${result.posted} comment(s) to GitHub!`,
                                    type: 'success'
                                });
                            }
                            setSelectedComments(new Set());
                            const statusResponse = await fetch(`/api/github/repositories/${repositoryId}/pull-requests/${selectedPR.number}/comments/status?orgShortId=${orgShortId}&repoUrlName=${repoUrlName}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ comments: prAnalysis.reviewComments }),
                            });
                            if (statusResponse.ok) {
                                const statusResult = await statusResponse.json();
                                const postedSet = new Set<string>();
                                prAnalysis.reviewComments.forEach((comment: any) => {
                                    const hash = generateCommentHash(comment.path, comment.line, comment.body);
                                    if (statusResult.postedHashes.includes(hash)) {
                                        postedSet.add(hash);
                                    }
                                });
                                setPostedComments(postedSet);
                            }
                        }
                        else {
                            setNotification({
                                message: `Failed to post comments: ${result.error || 'Unknown error'}`,
                                type: 'error'
                            });
                        }
                    }
                    catch (error: any) {
                        console.error('Error posting comments:', error);
                        setNotification({
                            message: `Error posting comments: ${error.message}`,
                            type: 'error'
                        });
                    }
                    finally {
                        setPostingComments(false);
                    }
                }} disabled={selectedComments.size === 0 || postingComments} className="px-4 py-2 text-sm font-medium text-white bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">
                            {postingComments ? 'Posting...' : `Post ${selectedComments.size} Comment(s)`}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-4">
                        {prAnalysis.reviewComments.map((comment: any, idx: number) => {
                    const commentHash = generateCommentHash(comment.path, comment.line, comment.body);
                    const isPosted = postedComments.has(commentHash);
                    return (<div key={idx} className={`p-4 rounded border transition-all ${isPosted
                            ? 'border-green-500/50 bg-green-500/5 opacity-75'
                            : selectedComments.has(idx)
                                ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                                : 'border-[#262626] bg-[#171717]/50'}`}>
                              <div className="flex items-start gap-3">
                                {isPosted ? (<div className="mt-1 w-5 h-5 flex items-center justify-center rounded border border-green-500/50 bg-green-500/20 flex-shrink-0" title="Already posted to GitHub">
                                    <svg className="w-3.5 h-3.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                                    </svg>
                                  </div>) : (<button type="button" onClick={() => {
                                const newSelected = new Set(selectedComments);
                                if (selectedComments.has(idx)) {
                                    newSelected.delete(idx);
                                }
                                else {
                                    newSelected.add(idx);
                                }
                                setSelectedComments(newSelected);
                            }} className={`mt-1 w-5 h-5 flex items-center justify-center rounded border transition-all cursor-pointer flex-shrink-0 ${selectedComments.has(idx)
                                ? 'bg-[var(--color-primary)] border-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] hover:border-[var(--color-primary-hover)]'
                                : 'bg-[#171717] border-[#262626] hover:border-[#3a3a3a] hover:bg-[#1a1a1a]'}`} aria-label={selectedComments.has(idx) ? 'Deselect comment' : 'Select comment'}>
                                    {selectedComments.has(idx) && (<svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/>
                                      </svg>)}
                                  </button>)}
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  {isPosted && (<span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs font-medium rounded border border-green-500/50">
                                      Posted
                                    </span>)}
                                  <span className={`px-2 py-1 rounded text-xs font-medium ${comment.severity === 'critical' ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                            comment.severity === 'high' ? 'bg-orange-500/20 text-orange-400 border border-orange-500/50' :
                                comment.severity === 'medium' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50' :
                                    'bg-blue-500/20 text-blue-400 border border-blue-500/50'}`}>
                                    {comment.severity.toUpperCase()}
                                  </span>
                                  <span className="text-xs text-white/60">{comment.issueType}</span>
                                  {comment.line !== null && (<span className="text-xs text-white/40">Line {comment.line}</span>)}
                                </div>
                                <div className="text-sm text-white/80 font-mono mb-2">{comment.path}</div>
                                <div className="text-sm text-white/90 whitespace-pre-wrap mb-3">{comment.body}</div>
                                {comment.codeSnippet && (<div>
                                    <button onClick={() => {
                                const newExpanded = new Set(expandedComments);
                                if (newExpanded.has(idx)) {
                                    newExpanded.delete(idx);
                                }
                                else {
                                    newExpanded.add(idx);
                                }
                                setExpandedComments(newExpanded);
                            }} className="flex items-center gap-2 text-xs text-white/60 hover:text-white/80 transition-colors cursor-pointer mb-2">
                                      <svg className={`w-4 h-4 transition-transform ${expandedComments.has(idx) ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                                      </svg>
                                      {expandedComments.has(idx) ? 'Hide' : 'Show'} code snippet
                                    </button>
                                    {expandedComments.has(idx) && (() => {
                                const snippetLines = comment.codeSnippet.split('\n');
                                const parsedLines = snippetLines.map((line: string) => {
                                    if (line.startsWith('+') && !line.startsWith('+++')) {
                                        return { type: 'add' as const, content: line.substring(1) };
                                    }
                                    else if (line.startsWith('-') && !line.startsWith('---')) {
                                        return { type: 'remove' as const, content: line.substring(1) };
                                    }
                                    else if (line.startsWith(' ')) {
                                        return { type: 'context' as const, content: line.substring(1) };
                                    }
                                    else if (line.startsWith('@@')) {
                                        return { type: 'header' as const, content: line };
                                    }
                                    else {
                                        return { type: 'context' as const, content: line };
                                    }
                                });
                                const language = detectLanguage(comment.path || '');
                                return (<div className="mt-2 bg-[#1a1a1a] border border-[#262626] rounded overflow-x-auto">
                                          {parsedLines.map((line: any, lineIdx: number) => {
                                        if (line.type === 'header') {
                                            return (<div key={lineIdx} className="border-t border-b border-[#262626] bg-[#121215] py-2 px-4">
                                                  <span className="text-white/40 text-xs font-mono">{line.content}</span>
                                                </div>);
                                        }
                                        return (<div key={lineIdx} className={`font-mono text-sm flex ${line.type === 'add' ? 'bg-green-500/10' :
                                                line.type === 'remove' ? 'bg-red-500/10' :
                                                    ''}`} style={{ minHeight: '24px' }}>
                                                
                                                <div className={`flex-1 px-4 py-1 ${line.type === 'add' ? 'bg-green-500/10' :
                                                line.type === 'remove' ? 'bg-red-500/10' :
                                                    'bg-[#1a1a1a]'}`} style={{
                                                fontSize: '14px',
                                                lineHeight: '24px',
                                                display: 'flex',
                                                alignItems: 'center',
                                                overflow: 'hidden'
                                            }}>
                                                  {line.type === 'add' && <span className="text-green-400 mr-1 flex-shrink-0">+</span>}
                                                  {line.type === 'remove' && <span className="text-red-400 mr-1 flex-shrink-0">-</span>}
                                                  <span style={{ display: 'inline-block', width: '100%' }}>
                                                    <SyntaxHighlighter language={language} style={vscDarkPlus} customStyle={{
                                                margin: 0,
                                                padding: 0,
                                                background: 'transparent',
                                                fontSize: '14px',
                                                lineHeight: '24px',
                                                display: 'inline',
                                            }} PreTag="span" CodeTag="span">
                                                      {line.content}
                                                    </SyntaxHighlighter>
                                                  </span>
                                                </div>
                                              </div>);
                                    })}
                                        </div>);
                            })()}
                                  </div>)}
                              </div>
                            </div>
                          </div>);
                })}
                      </div>
                    </div>) : prAnalysis?.processingStatus === 'completed' ? (<div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="mb-4 p-4 bg-[#171717]/50 rounded border border-[#262626]">
                        <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"/>
                        </svg>
                      </div>
                      <p className="text-sm text-white/60">
                        No review comments generated for this PR.
                      </p>
                    </div>) : (<div className="flex flex-col items-center justify-center h-full p-8">
                      <div className="w-full space-y-6">
                        {[...Array(3)].map((_, idx) => (<div key={idx} className="p-4 rounded border border-[#262626] bg-[#171717]/50 animate-pulse">
                            <div className="flex items-start gap-3">
                              <div className="mt-1 w-5 h-5 bg-[#262626]/50 rounded flex-shrink-0"></div>
                              <div className="flex-1 space-y-3">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="h-5 w-16 bg-[#262626]/50 rounded"></div>
                                  <div className="h-4 w-24 bg-[#262626]/50 rounded"></div>
                                  <div className="h-4 w-20 bg-[#262626]/50 rounded"></div>
                                </div>
                                <div className="h-4 w-64 bg-[#262626]/50 rounded"></div>
                                <div className="space-y-2">
                                  <div className="h-4 w-full bg-[#262626]/50 rounded"></div>
                                  <div className="h-4 w-5/6 bg-[#262626]/50 rounded"></div>
                                  <div className="h-4 w-4/6 bg-[#262626]/50 rounded"></div>
                                </div>
                              </div>
                            </div>
                          </div>))}
                      </div>
                    </div>)}
                </div>
              </div>
            </div>
          </div>
        </div>)}
    </div>);
}
