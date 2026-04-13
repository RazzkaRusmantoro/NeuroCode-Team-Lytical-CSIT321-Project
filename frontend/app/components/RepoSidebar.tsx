'use client';
import { useState, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import { useLoadingBar } from '../contexts/LoadingBarContext';
interface RepoSidebarProps {
    isExpanded: boolean;
    onToggle: () => void;
    userName?: string | null;
    userEmail?: string | null;
    userImageUrl?: string | null;
}
const BUTTON_BASE_CLASSES = 'w-full text-left pl-4 py-3 text-sm rounded transition-colors duration-200 flex items-center gap-3.5 cursor-pointer';
const BUTTON_ACTIVE_CLASSES = 'text-white bg-[#2a2a2a]/50 font-bold';
const BUTTON_INACTIVE_CLASSES = 'text-white/60 hover:text-white hover:bg-[#2a2a2a]/50';
function Icon({ iconPath, className = 'w-5 h-5' }: {
    iconPath: string | string[];
    className?: string;
}) {
    const paths = Array.isArray(iconPath) ? iconPath : [iconPath];
    return (<svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {paths.map((path, index) => (<path key={index} strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={path}/>))}
    </svg>);
}
export default function RepoSidebar({ isExpanded, onToggle, userName: propUserName, userEmail: propUserEmail, userImageUrl, }: RepoSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { data: session } = useSession();
    const { startLoading } = useLoadingBar();
    const [isMinimized, setIsMinimized] = useState(false);
    const userName = propUserName ?? session?.user?.name;
    const userEmail = propUserEmail ?? session?.user?.email;
    const orgMatch = pathname.match(/\/org-([^/]+)/);
    const orgShortId = orgMatch ? `org-${orgMatch[1]}` : null;
    const repoMatch = pathname.match(/\/repo\/([^/]+)/);
    const repoName = repoMatch ? repoMatch[1] : null;
    const activeItem = useMemo(() => {
        if (pathname?.includes('/visual-tree')) {
            return 'Visual Tree';
        }
        if (pathname?.includes('/code-reference')) {
            return 'Code Reference';
        }
        if (pathname?.includes('/documentation/uml')) {
            return 'UML Diagrams';
        }
        if (pathname?.includes('/knowledge-graph')) {
            return 'Knowledge Graph';
        }
        if (pathname?.includes('/documentation')) {
            return 'Documentation';
        }
        return 'Code Viewer';
    }, [pathname]);
    const handleBackToRepositories = useCallback(() => {
        if (orgShortId) {
            startLoading();
            router.push(`/${orgShortId}/repositories`);
        }
    }, [router, orgShortId, startLoading]);
    const handleSettingsClick = useCallback(() => {
        startLoading();
        router.push('/settings');
    }, [router, startLoading]);
    const handleCodeViewerClick = useCallback(() => {
        if (orgShortId && repoName) {
            startLoading();
            router.push(`/${orgShortId}/repo/${repoName}`);
        }
    }, [router, orgShortId, repoName, startLoading]);
    const handleDocumentationClick = useCallback(() => {
        if (orgShortId && repoName) {
            startLoading();
            router.push(`/${orgShortId}/repo/${repoName}/documentation`);
        }
    }, [router, orgShortId, repoName, startLoading]);
    const handleUmlDiagramsClick = useCallback(() => {
        if (orgShortId && repoName) {
            startLoading();
            router.push(`/${orgShortId}/repo/${repoName}/documentation/uml`);
        }
    }, [router, orgShortId, repoName, startLoading]);
    const handleKnowledgeGraphClick = useCallback(() => {
        if (orgShortId && repoName) {
            startLoading();
            router.push(`/${orgShortId}/repo/${repoName}/knowledge-graph`);
        }
    }, [router, orgShortId, repoName, startLoading]);
    const handleVisualTreeClick = useCallback(() => {
        if (orgShortId && repoName) {
            startLoading();
            router.push(`/${orgShortId}/repo/${repoName}/visual-tree`);
        }
    }, [router, orgShortId, repoName, startLoading]);
    const handleCodeReferenceClick = useCallback(() => {
        if (orgShortId && repoName) {
            startLoading();
            router.push(`/${orgShortId}/repo/${repoName}/code-reference`);
        }
    }, [router, orgShortId, repoName, startLoading]);
    const userInitials = useMemo(() => {
        if (!userName)
            return 'U';
        const parts = userName.trim().split(' ');
        if (parts.length >= 2) {
            return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
        }
        return userName[0]?.toUpperCase() || 'U';
    }, [userName]);
    return (<aside className={`h-full bg-[#121215] border-r border-[#262626] transition-all duration-300 ${isMinimized ? 'w-20' : 'w-80'}`}>
      <div className="flex flex-col h-full">
        
        <div className={`flex items-center ${isMinimized ? 'justify-center' : 'justify-between'} p-4 ${isMinimized ? 'px-4' : 'pl-8 pr-4'}`}>
          {!isMinimized && (<img src="/Full-logo.png" alt="Logo" className="h-10 w-auto"/>)}
          <button type="button" onClick={() => setIsMinimized(!isMinimized)} className="p-1.5 hover:bg-white/10 rounded transition-colors duration-200 cursor-pointer" aria-label="Minimize sidebar">
            <svg className="w-5 h-5 text-white/70 hover:text-white transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isMinimized ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"}/>
            </svg>
          </button>
        </div>

        
        <div className="border-t border-[#262626]"></div>

        
        <div className={`${isMinimized ? 'px-2' : 'px-4'} pt-5`}>
          {isMinimized ? (<button type="button" className="w-full py-2 flex items-center justify-center bg-[#1a1a1a] border border-[#262626] rounded hover:bg-[#1a1a1a]/80 transition-colors duration-200 cursor-pointer" aria-label="Search">
              <svg className="w-4 h-4 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
            </button>) : (<div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
              </svg>
              <input type="text" placeholder="Search..." className="w-full pl-10 pr-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"/>
            </div>)}
        </div>

        
        {orgShortId && (<div className={`${isMinimized ? 'px-2' : 'px-4'} pt-5 pb-2`}>
            <button onClick={handleBackToRepositories} className="w-full text-left pl-4 py-3 text-sm rounded transition-colors duration-200 flex items-center gap-3.5 cursor-pointer text-white/60 hover:text-white hover:bg-[#2a2a2a]/50">
              <Icon iconPath="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Back to Repositories</span>
            </button>
          </div>)}

        
        <nav className={`flex-1 flex flex-col overflow-y-auto sidebar-scrollbar ${isMinimized ? 'px-2' : 'px-4'} pt-5 py-2`}>
          
          <div className="pb-5">
            {!isMinimized && <h3 className="text-xs text-white/60 pl-4 mb-3 tracking-wide">REPOSITORY</h3>}
            <ul className="space-y-2.5">
              <li>
                <button onClick={handleCodeViewerClick} className={`${BUTTON_BASE_CLASSES} ${activeItem === 'Code Viewer' ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
                  <Icon iconPath="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"/>
                  <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Code Viewer</span>
                </button>
              </li>
              <li>
                <button onClick={handleDocumentationClick} className={`${BUTTON_BASE_CLASSES} ${activeItem === 'Documentation' ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
                  <Icon iconPath="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                  <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Documentation</span>
                </button>
              </li>
              <li>
                <button onClick={handleUmlDiagramsClick} className={`${BUTTON_BASE_CLASSES} ${activeItem === 'UML Diagrams' ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
                  <Icon iconPath="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z"/>
                  <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>UML Diagrams</span>
                </button>
              </li>
              <li>
                <button onClick={handleKnowledgeGraphClick} className={`${BUTTON_BASE_CLASSES} ${activeItem === 'Knowledge Graph' ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
                  <Icon iconPath="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
                  <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Knowledge Graph</span>
                </button>
              </li>
              <li>
                <button onClick={handleVisualTreeClick} className={`${BUTTON_BASE_CLASSES} ${activeItem === 'Visual Tree' ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
                  <Icon iconPath="M8.684 13.342C8.885 12.938 9 12.482 9 12c0-.482-.115-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"/>
                  <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Visual Tree</span>
                </button>
              </li>
              <li>
                <button onClick={handleCodeReferenceClick} className={`${BUTTON_BASE_CLASSES} ${activeItem === 'Code Reference' ? BUTTON_ACTIVE_CLASSES : BUTTON_INACTIVE_CLASSES}`}>
                  <Icon iconPath="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"/>
                  <span className={`transition-all duration-300 ${isMinimized ? 'opacity-0 w-0 overflow-hidden' : 'opacity-100 w-auto'}`}>Code Reference</span>
                </button>
              </li>
            </ul>
          </div>
        </nav>

        
        <div className={`${isMinimized ? 'px-2' : 'px-4'} py-4`}>
          <div className={`flex items-center ${isMinimized ? 'justify-center' : 'gap-3'} p-3`}>
            
            <div className="flex-shrink-0">
              {userImageUrl ? (<img src={userImageUrl} alt="Profile" className="w-10 h-10 rounded object-cover shadow-sm"/>) : (<img src="/Pfp-placeholder.png" alt="Profile" className="w-10 h-10 rounded object-cover shadow-sm"/>)}
            </div>
            
            {!isMinimized && (<div className="flex-1 min-w-0">
                <p className="text-white text-sm font-medium truncate">
                  {userName || 'User'}
                </p>
              </div>)}
            
            {!isMinimized && (<button onClick={handleSettingsClick} className="flex-shrink-0 p-1.5 hover:bg-white/10 rounded-md transition-all duration-200 cursor-pointer group">
                <Icon iconPath={[
                "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z",
                "M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            ]} className="w-5 h-5 text-white/70 group-hover:text-white transition-colors duration-200"/>
              </button>)}
          </div>
        </div>
      </div>
    </aside>);
}
