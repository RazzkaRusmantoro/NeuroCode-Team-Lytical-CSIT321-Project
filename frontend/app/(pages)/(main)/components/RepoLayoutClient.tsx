'use client';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import DashboardNavbar from '@/app/components/DashboardNavbar';
import RepoSidebar from '@/app/components/RepoSidebar';
import DocumentationSidebar from '../[orgShortId]/repo/[repoName]/documentation/components/DocumentationSidebar';
import DocumentationChatPanel from '../[orgShortId]/repo/[repoName]/documentation/components/DocumentationChatPanel';
import { RepoCacheProvider } from '../[orgShortId]/repo/context/RepoCacheContext';
import { DocumentationProvider, useDocumentation } from '../[orgShortId]/repo/[repoName]/documentation/context/DocumentationContext';
import type { OrganizationWithId } from '@/actions/organization';
import type { SerializedRepository } from '@/lib/models/repository';
function DocumentationSidebarWrapper() {
    const { activeSection, setActiveSection } = useDocumentation();
    return (<DocumentationSidebar activeSection={activeSection} onSectionChange={setActiveSection}/>);
}
interface RepositoryWithId extends SerializedRepository {
    id: string;
}
interface RepoLayoutClientProps {
    userEmail?: string | null;
    userName?: string | null;
    userId?: string | null;
    userImageUrl?: string | null;
    organizations: OrganizationWithId[];
    selectedOrganization: OrganizationWithId | null;
    repositories: RepositoryWithId[];
}
export default function RepoLayoutClient({ userEmail, userName, userId, userImageUrl, organizations, selectedOrganization, repositories, children, }: RepoLayoutClientProps & {
    children: React.ReactNode;
}) {
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
    const [docChatPanelOpen, setDocChatPanelOpen] = useState(true);
    const pathname = usePathname();
    const toggleSidebar = () => {
        setIsSidebarExpanded(!isSidebarExpanded);
    };
    const repoMatch = pathname.match(/\/repo\/([^/]+)/);
    const currentRepoName = repoMatch ? repoMatch[1] : null;
    const selectedRepository = currentRepoName
        ? repositories.find(repo => repo.urlName === currentRepoName) || null
        : null;
    const isDocumentationTitlePage = /\/documentation\/[^/]+$/.test(pathname) &&
        !pathname.includes('/documentation/visual-tree') &&
        !pathname.includes('/documentation/code-reference') &&
        !pathname.includes('/documentation/uml');
    const isUmlPage = pathname.includes('/documentation/uml/');
    const orgShortIdMatch = pathname.match(/\/org-([^/]+)/);
    const orgShortId = orgShortIdMatch ? orgShortIdMatch[1] : undefined;
    return (<RepoCacheProvider>
      <DocumentationProvider>
        <div className="h-screen flex bg-transparent">
        
        {isUmlPage ? null : isDocumentationTitlePage ? (<DocumentationSidebarWrapper />) : (<RepoSidebar isExpanded={isSidebarExpanded} onToggle={toggleSidebar} userName={userName} userEmail={userEmail} userImageUrl={userImageUrl}/>)}

        
        <div className={`flex-1 flex flex-col overflow-hidden relative min-w-0 ${isUmlPage ? 'px-0' : 'px-16'}`}>
          {!isUmlPage && (<DashboardNavbar userEmail={userEmail} userName={userName} userImageUrl={userImageUrl} organizations={organizations} selectedOrganization={selectedOrganization} repositories={repositories} selectedRepository={selectedRepository}/>)}

          
          <main className="flex-1 overflow-hidden min-h-0">
            <div className="h-full">
              {children}
            </div>
          </main>

          
          {isDocumentationTitlePage && !docChatPanelOpen && (<button type="button" onClick={() => setDocChatPanelOpen(true)} className="absolute top-1/2 -translate-y-1/2 right-0 flex items-center gap-2 pl-3 pr-2 py-3 rounded-l-lg bg-[#1a1a1d] border border-r-0 border-[#262626] text-white/90 hover:text-white hover:bg-[#262626] transition-colors cursor-pointer shadow-lg" aria-label="Open AI chat">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"/>
              </svg>
              <span className="text-sm font-medium">Chat</span>
            </button>)}
        </div>

        
        {isDocumentationTitlePage && docChatPanelOpen && orgShortId && currentRepoName && (<DocumentationChatPanel orgContext={orgShortId ? { orgShortId } : undefined} contextId={`repo-doc:${orgShortId}:${currentRepoName}`}/>)}
      </div>
      </DocumentationProvider>
    </RepoCacheProvider>);
}
