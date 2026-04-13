'use client';
import { useState, useEffect, useRef } from 'react';
import { useRepoCache } from '../../context/RepoCacheContext';
import FileTreeWrapper from './FileTreeWrapper';
import FileContentViewer from './FileContentViewer';
interface FileTreeItem {
    name: string;
    path: string;
    type: 'file' | 'dir';
    size: number;
    sha: string;
    url: string;
    downloadUrl: string | null;
    gitUrl: string;
    content?: string;
    language?: string;
}
interface RepositoryViewerProps {
    repoFullName: string;
    orgShortId: string;
    repoUrlName: string;
    repoName: string;
}
interface Branch {
    name: string;
    sha: string;
    protected: boolean;
}
interface Commit {
    sha: string;
    message: string;
    author: {
        name: string;
        email: string;
        date: string;
    };
    url: string;
}
export default function RepositoryViewer({ repoFullName, orgShortId, repoUrlName, repoName }: RepositoryViewerProps) {
    const cache = useRepoCache();
    const [selectedFile, setSelectedFile] = useState<FileTreeItem | null>(null);
    const [showFileTree, setShowFileTree] = useState(true);
    const [breadcrumbPath, setBreadcrumbPath] = useState<string[]>([]);
    const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
    const [branchSearchQuery, setBranchSearchQuery] = useState('');
    const branchDropdownRef = useRef<HTMLDivElement>(null);
    const branches = cache.cache.branches;
    const selectedBranch = cache.cache.selectedBranch;
    const recentCommit = cache.cache.recentCommits.get(selectedBranch) || null;
    useEffect(() => {
        setBreadcrumbPath([]);
        setSelectedFile(null);
        setShowFileTree(true);
    }, [selectedBranch]);
    useEffect(() => {
        const lastFetched = cache.cache.lastFetched.branches;
        const isExpired = !lastFetched || Date.now() - lastFetched > 5 * 60 * 1000;
        if (cache.cache.branches.length > 0 && !isExpired) {
            if (cache.cache.selectedBranch === 'main' && cache.cache.branches.length > 0) {
                const mainBranch = cache.cache.branches.find((b: Branch) => b.name === 'main') ||
                    cache.cache.branches.find((b: Branch) => b.name === 'master') ||
                    cache.cache.branches[0];
                if (mainBranch && cache.cache.selectedBranch !== mainBranch.name) {
                    cache.setSelectedBranch(mainBranch.name);
                }
            }
            return;
        }
        let isMounted = true;
        const fetchBranches = async () => {
            try {
                const response = await fetch(`/api/github/repositories/${encodeURIComponent(repoFullName)}/branches?orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}`);
                if (response.ok && isMounted) {
                    const data = await response.json();
                    const fetchedBranches = data.branches || [];
                    cache.setBranches(fetchedBranches);
                    if (fetchedBranches.length > 0) {
                        const mainBranch = fetchedBranches.find((b: Branch) => b.name === 'main') ||
                            fetchedBranches.find((b: Branch) => b.name === 'master') ||
                            fetchedBranches[0];
                        if (isMounted && cache.cache.selectedBranch === 'main') {
                            cache.setSelectedBranch(mainBranch.name);
                        }
                    }
                }
            }
            catch (error) {
                if (isMounted) {
                    console.error('Error fetching branches:', error);
                }
            }
        };
        if (repoFullName) {
            fetchBranches();
        }
        return () => {
            isMounted = false;
        };
    }, [repoFullName, orgShortId, repoUrlName, cache]);
    useEffect(() => {
        if (!selectedBranch)
            return;
        const cachedCommit = cache.cache.recentCommits.get(selectedBranch);
        const lastFetched = cache.cache.lastFetched[`commit:${selectedBranch}`];
        const isExpired = !lastFetched || Date.now() - lastFetched > 5 * 60 * 1000;
        if (cachedCommit && !isExpired) {
            return;
        }
        let isMounted = true;
        const fetchRecentCommit = async () => {
            try {
                const response = await fetch(`/api/github/repositories/${encodeURIComponent(repoFullName)}/commits?branch=${selectedBranch}&per_page=1&orgShortId=${encodeURIComponent(orgShortId)}&repoUrlName=${encodeURIComponent(repoUrlName)}`);
                if (response.ok && isMounted) {
                    const data = await response.json();
                    if (data.commits && data.commits.length > 0) {
                        cache.setRecentCommit(selectedBranch, data.commits[0]);
                    }
                }
            }
            catch (error) {
                if (isMounted) {
                    console.error('Error fetching recent commit:', error);
                }
            }
        };
        if (repoFullName && selectedBranch) {
            fetchRecentCommit();
        }
        return () => {
            isMounted = false;
        };
    }, [repoFullName, selectedBranch, orgShortId, repoUrlName, cache]);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (branchDropdownRef.current && !branchDropdownRef.current.contains(event.target as Node)) {
                setIsBranchDropdownOpen(false);
                setBranchSearchQuery('');
            }
        };
        if (isBranchDropdownOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isBranchDropdownOpen]);
    const filteredBranches = branches.filter(branch => branch.name.toLowerCase().includes(branchSearchQuery.toLowerCase()));
    const getBreadcrumbDisplay = () => {
        if (selectedFile && selectedFile.content) {
            const pathParts = selectedFile.path.split('/');
            return [repoName, ...pathParts];
        }
        else if (breadcrumbPath.length > 0) {
            return [repoName, ...breadcrumbPath];
        }
        else {
            return [repoName];
        }
    };
    const breadcrumbItems = getBreadcrumbDisplay();
    const handleBreadcrumbClick = (index: number) => {
        if (index === 0) {
            setBreadcrumbPath([]);
            setSelectedFile(null);
            setShowFileTree(true);
        }
        else {
            const newPath = breadcrumbItems.slice(1, index);
            setBreadcrumbPath(newPath);
            setSelectedFile(null);
            setShowFileTree(true);
        }
    };
    return (<div className="h-full max-h-[1000px] flex gap-6 py-6 max-w-screen-2xl mx-auto w-full">
      
      <div className="flex-1 bg-[#121215] border border-[#262626] rounded overflow-hidden flex flex-col min-h-0">
        {selectedFile && selectedFile.content ? (<>
            <div className="px-4 py-3 border-b border-[#262626] flex-shrink-0 flex items-center justify-between bg-[#121215]">
              
              <div className="flex items-center gap-2 text-sm">
                {breadcrumbItems.map((item: string, index: number) => (<div key={index} className="flex items-center gap-2">
                    {index > 0 && (<span className="text-white/40 mx-1">/</span>)}
                    <button onClick={() => handleBreadcrumbClick(index)} className={`text-sm transition-colors ${index === breadcrumbItems.length - 1
                    ? 'text-white font-semibold'
                    : 'text-white/60 hover:text-white cursor-pointer'}`}>
                      {item}
                    </button>
                  </div>))}
              </div>
              <div className="flex items-center gap-4">
                
                <div className="relative w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input type="text" placeholder="Search files..." className="w-full pl-10 pr-3 py-1.5 bg-[#1a1a1a] border border-[#262626] rounded-md text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"/>
                </div>
                
                {recentCommit && (<div className="flex items-center gap-2 text-white/60 text-xs">
                    <span className="truncate max-w-[200px]">{recentCommit.message.split('\n')[0]}</span>
                    <span className="text-white/40">•</span>
                    <span>{recentCommit.sha.substring(0, 7)}</span>
                  </div>)}
                
                
                <div className="relative" ref={branchDropdownRef}>
                  <button onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-[#262626]/50 hover:bg-[#262626]/70 border border-[#262626] rounded-md text-sm text-white transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span>{selectedBranch}</span>
                    <svg className={`w-3 h-3 transition-transform duration-200 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                  
                  
                  <div className={`absolute right-0 mt-2 w-48 bg-[#121215] border border-[#262626] rounded shadow-lg overflow-hidden z-10 transition-all duration-200 ease-in-out ${isBranchDropdownOpen
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                    
                    <div className="p-3 border-b border-[#262626]">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input type="text" placeholder="Find a branch" value={branchSearchQuery} onChange={(e) => setBranchSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all" onClick={(e) => e.stopPropagation()}/>
                      </div>
                    </div>

                    
                    <div className="py-2 px-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {filteredBranches.length > 0 ? (filteredBranches.map((branch) => (<button key={branch.name} onClick={() => {
                    cache.setSelectedBranch(branch.name);
                    setIsBranchDropdownOpen(false);
                    setBranchSearchQuery('');
                }} className={`w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer rounded ${selectedBranch === branch.name
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30'
                    : 'text-white hover:bg-[#2a2a2a]'}`}>
                            {branch.name}
                          </button>))) : (<div className="px-4 py-2 text-sm text-white/60 text-center">
                          No branches found
                        </div>)}
                    </div>
                  </div>
                </div>
                
                <button onClick={() => {
                setSelectedFile(null);
                setShowFileTree(true);
            }} className="text-white/60 hover:text-white transition-colors text-sm">
                  Back to Files
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <FileContentViewer content={selectedFile.content} fileName={selectedFile.name} language={selectedFile.language}/>
            </div>
          </>) : (<>
            <div className="px-4 py-3 border-b border-white/10 flex-shrink-0 bg-white/[0.03] flex items-center justify-between">
              
              <div className="flex items-center gap-2 text-sm">
                {breadcrumbItems.map((item: string, index: number) => (<div key={index} className="flex items-center gap-2">
                    {index > 0 && (<span className="text-white/40 mx-1">/</span>)}
                    <button onClick={() => handleBreadcrumbClick(index)} className={`text-sm transition-colors ${index === breadcrumbItems.length - 1
                    ? 'text-white font-semibold'
                    : 'text-white/60 hover:text-white cursor-pointer'}`}>
                      {item}
                    </button>
                  </div>))}
              </div>
              <div className="flex items-center gap-4">
                
                <div className="relative w-64">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                  </svg>
                  <input type="text" placeholder="Search files..." className="w-full pl-10 pr-3 py-1.5 bg-[#1a1a1a] border border-[#262626] rounded-md text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"/>
                </div>
                
                {recentCommit && (<div className="flex items-center gap-2 text-white/60 text-xs">
                    <span className="truncate max-w-[200px]">{recentCommit.message.split('\n')[0]}</span>
                    <span className="text-white/40">•</span>
                    <span>{recentCommit.sha.substring(0, 7)}</span>
                  </div>)}
                
                
                <div className="relative" ref={branchDropdownRef}>
                  <button onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)} className="flex items-center gap-2 px-3 py-1.5 bg-[#262626]/50 hover:bg-[#262626]/70 border border-[#262626] rounded-md text-sm text-white transition-colors cursor-pointer">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"/>
                    </svg>
                    <span>{selectedBranch}</span>
                    <svg className={`w-3 h-3 transition-transform duration-200 ${isBranchDropdownOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
                    </svg>
                  </button>
                  
                  
                  <div className={`absolute right-0 mt-2 w-48 bg-[#121215] border border-[#262626] rounded shadow-lg overflow-hidden z-10 transition-all duration-200 ease-in-out ${isBranchDropdownOpen
                ? 'opacity-100 translate-y-0 pointer-events-auto'
                : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                    
                    <div className="p-3 border-b border-[#262626]">
                      <div className="relative">
                        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
                        </svg>
                        <input type="text" placeholder="Find a branch" value={branchSearchQuery} onChange={(e) => setBranchSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all" onClick={(e) => e.stopPropagation()}/>
                      </div>
                    </div>

                    
                    <div className="py-2 px-2 max-h-64 overflow-y-auto custom-scrollbar">
                      {filteredBranches.length > 0 ? (filteredBranches.map((branch) => (<button key={branch.name} onClick={() => {
                    cache.setSelectedBranch(branch.name);
                    setIsBranchDropdownOpen(false);
                    setBranchSearchQuery('');
                }} className={`w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer rounded ${selectedBranch === branch.name
                    ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30'
                    : 'text-white hover:bg-[#2a2a2a]'}`}>
                            {branch.name}
                          </button>))) : (<div className="px-4 py-2 text-sm text-white/60 text-center">
                          No branches found
                        </div>)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-hidden min-h-0">
              <FileTreeWrapper repoFullName={repoFullName} orgShortId={orgShortId} repoUrlName={repoUrlName} selectedBranch={selectedBranch} currentPath={breadcrumbPath} onPathChange={setBreadcrumbPath} onFileSelect={(file) => {
                setSelectedFile(file);
                setShowFileTree(false);
                const pathParts = file.path.split('/');
                setBreadcrumbPath(pathParts.slice(0, -1));
            }}/>
            </div>
          </>)}
      </div>

      
    </div>);
}
