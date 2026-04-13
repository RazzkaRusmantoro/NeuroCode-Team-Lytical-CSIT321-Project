'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useDocumentation } from '../context/DocumentationContext';
import { useLoadingBar } from '@/app/contexts/LoadingBarContext';
interface SidebarItem {
    id: string;
    label: string;
    subItems?: SidebarItem[];
}
interface DocumentationSidebarProps {
    activeSection: string | null;
    onSectionChange: (section: string) => void;
}
export default function DocumentationSidebar({ activeSection, onSectionChange }: DocumentationSidebarProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { documentation } = useDocumentation();
    const { startLoading } = useLoadingBar();
    const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
    const orgMatch = pathname.match(/\/org-([^/]+)/);
    const orgShortId = orgMatch ? `org-${orgMatch[1]}` : null;
    const repoMatch = pathname.match(/\/repo\/([^/]+)/);
    const repoName = repoMatch ? repoMatch[1] : null;
    const isOnboardingPath = pathname.includes('/onboarding/');
    const handleBackToDocumentations = useCallback(() => {
        if (isOnboardingPath && orgShortId) {
            startLoading();
            router.push(`/${orgShortId}/onboarding`);
        }
        else if (orgShortId && repoName) {
            startLoading();
            router.push(`/${orgShortId}/repo/${repoName}/documentation`);
        }
    }, [router, orgShortId, repoName, startLoading, isOnboardingPath]);
    const pathSegments = pathname.split('/').filter(Boolean);
    const docSegmentIndex = pathSegments.indexOf('documentation');
    const isDocIndexRoute = docSegmentIndex >= 0 && docSegmentIndex === pathSegments.length - 1;
    const isUmlRoute = pathname.includes('/documentation/uml/');
    const showSidebarSkeleton = !documentation || isDocIndexRoute || isUmlRoute;
    const sidebarItems: SidebarItem[] = documentation?.sections
        ? documentation.sections.map((section) => ({
            id: section.id,
            label: `${section.id}. ${section.title}`,
            subItems: section.subsections?.map((subsection) => ({
                id: subsection.id,
                label: `${subsection.id}. ${subsection.title}`,
            })),
        }))
        : [];
    if (documentation?.code_references && documentation.code_references.length > 0) {
        const codeRefSubItems = documentation.code_references.map((ref) => {
            if (typeof ref === 'string') {
                return {
                    id: `code-ref-${ref}`,
                    label: ref,
                };
            }
            else {
                const refName = ref.name || ref.referenceId || 'Unknown';
                const refId = ref.referenceId || ref.name || 'unknown';
                return {
                    id: `code-ref-${refId}`,
                    label: refName,
                };
            }
        });
        sidebarItems.push({
            id: 'code-references',
            label: 'Code References',
            subItems: codeRefSubItems
        });
    }
    useEffect(() => {
        const expanded = new Set<string>();
        if (documentation?.sections) {
            const sectionsWithSubs = documentation.sections
                .filter((s) => s.subsections && s.subsections.length > 0)
                .map((s) => s.id);
            sectionsWithSubs.forEach(id => expanded.add(id));
        }
        if (documentation?.code_references && documentation.code_references.length > 0) {
            expanded.add('code-references');
        }
        setExpandedItems(expanded);
    }, [documentation]);
    const toggleExpand = (itemId: string) => {
        setExpandedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(itemId)) {
                newSet.delete(itemId);
            }
            else {
                newSet.add(itemId);
            }
            return newSet;
        });
    };
    const isExpanded = (itemId: string) => expandedItems.has(itemId);
    return (<aside className="w-80 bg-[#121215] border-r border-[#262626] flex-shrink-0 h-full overflow-y-auto sidebar-scrollbar">
      <div className="flex flex-col h-full">
        
        <div className="flex items-center justify-between p-4 pl-8 pr-4">
          <img src="/Full-logo.png" alt="Logo" className="h-10 w-auto"/>
        </div>

        
        <div className="border-t border-[#262626]"></div>

        
        <div className="px-4 pt-4">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Search..." className="w-full pl-10 pr-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"/>
          </div>
        </div>

        
        {orgShortId && (repoName || isOnboardingPath) && (<div className="px-4 pt-4 pb-3">
            <button onClick={handleBackToDocumentations} className="w-full text-left pl-4 py-2.5 text-sm rounded transition-colors duration-200 flex items-center gap-3 cursor-pointer text-white/60 hover:text-white hover:bg-[#2a2a2a]/50">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
              </svg>
              <span>{isOnboardingPath ? 'Back to Onboarding' : 'Back to Documentations'}</span>
            </button>
          </div>)}

        <div className="p-6 flex-1 flex flex-col">
          <h2 className="text-white font-semibold text-sm mb-4 uppercase tracking-wider">
            Navigation
          </h2>
          <nav className="space-y-1 flex-1 overflow-y-auto sidebar-scrollbar">
            {showSidebarSkeleton ? (<div className="animate-pulse space-y-2">
                {Array.from({ length: 20 }).map((_, i) => (<div key={i} className="h-9 bg-white/10 rounded flex-shrink-0" style={{ width: i % 2 === 0 ? '85%' : '70%', marginLeft: i % 3 === 1 ? '1rem' : 0 }}/>))}
              </div>) : sidebarItems.map((item) => {
            const hasSubItems = item.subItems && item.subItems.length > 0;
            const isItemExpanded = isExpanded(item.id);
            return (<div key={item.id}>
                  <button onClick={() => {
                    if (hasSubItems) {
                        toggleExpand(item.id);
                    }
                    else {
                        onSectionChange(item.id);
                        if (item.id === 'code-references') {
                            const element = document.getElementById('code-references-section');
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                        else {
                            const element = document.getElementById(`section-${item.id}`);
                            if (element) {
                                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                            }
                        }
                    }
                }} className={`w-full text-left px-3 py-2 text-sm transition-colors rounded flex items-center justify-between cursor-pointer ${hasSubItems
                    ? 'text-white/60 hover:text-white hover:bg-white/5'
                    : activeSection === item.id
                        ? 'bg-[var(--color-primary)]/20 text-white border-l-2 border-[var(--color-primary)] pl-2.5'
                        : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                    <span>{item.label}</span>
                    {hasSubItems && (<svg className={`w-4 h-4 transition-transform duration-200 ${isItemExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7"/>
                      </svg>)}
                  </button>
                  
                  {hasSubItems && isItemExpanded && (<div className="pl-4 mt-1">
                      {item.subItems!.map((subItem) => (<button key={subItem.id} onClick={() => {
                            onSectionChange(subItem.id);
                            if (subItem.id.startsWith('code-ref-')) {
                                const refId = subItem.id.replace('code-ref-', '');
                                const element = document.getElementById(`code-ref-${refId}`);
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }
                            else {
                                const element = document.getElementById(`subsection-${subItem.id}`);
                                if (element) {
                                    element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                }
                            }
                        }} className={`w-full text-left px-3 py-2 text-sm transition-colors rounded cursor-pointer ${activeSection === subItem.id
                            ? 'bg-[var(--color-primary)]/20 text-white border-l-2 border-[var(--color-primary)] pl-2.5'
                            : 'text-white/60 hover:text-white hover:bg-white/5'}`}>
                          {subItem.label}
                        </button>))}
                    </div>)}
                </div>);
        })}
          </nav>
        </div>
      </div>
    </aside>);
}
