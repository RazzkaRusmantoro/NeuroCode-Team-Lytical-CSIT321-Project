'use client';
import { useMemo, useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { slugify } from '@/lib/utils/slug';
import { useLoadingBar } from '@/app/contexts/LoadingBarContext';
import type { DocumentationListItem } from './DocumentationViewer';
const UML_TYPE_LABELS: Record<string, string> = {
    class: 'Class',
    sequence: 'Sequence',
    useCase: 'Use Case',
    use_case: 'Use Case',
    state: 'State',
};
const UML_TYPE_STYLES: Record<string, string> = {
    class: 'bg-amber-500/20 text-amber-400 border-amber-400/40',
    sequence: 'bg-sky-500/20 text-sky-400 border-sky-400/40',
    useCase: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40',
    use_case: 'bg-emerald-500/20 text-emerald-400 border-emerald-400/40',
    state: 'bg-violet-500/20 text-violet-400 border-violet-400/40',
};
function UmlTypeLabel({ type }: {
    type: string;
}) {
    const label = UML_TYPE_LABELS[type] ?? (type ? type.replace(/_/g, ' ') : 'UML');
    const style = UML_TYPE_STYLES[type] ?? 'bg-gray-500/20 text-gray-400 border-gray-400/40';
    return (<span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider border ${style}`}>
      {label}
    </span>);
}
interface DocumentationListProps {
    items: DocumentationListItem[];
    loading: boolean;
    error: string | null;
    searchQuery: string;
    onSearchChange: (query: string) => void;
    orgShortId: string;
    repoUrlName: string;
    onDocumentationDeleted?: (documentationId: string) => void;
}
export default function DocumentationList({ items, loading, error, searchQuery, onSearchChange, orgShortId, repoUrlName, onDocumentationDeleted, }: DocumentationListProps) {
    const router = useRouter();
    const { startLoading } = useLoadingBar();
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
    const [deleteError, setDeleteError] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setOpenMenuId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);
    const openDeleteConfirm = (e: React.MouseEvent, documentationId: string) => {
        e.stopPropagation();
        setOpenMenuId(null);
        setDeleteError(null);
        setPendingDeleteId(documentationId);
    };
    const closeDeleteConfirm = () => {
        setPendingDeleteId(null);
        setDeleteError(null);
    };
    const handleConfirmDelete = async () => {
        if (!pendingDeleteId)
            return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            const res = await fetch(`/api/documentation/document/${pendingDeleteId}`, { method: 'DELETE' });
            const data = await res.json();
            if (!res.ok)
                throw new Error(data.error || 'Failed to delete');
            closeDeleteConfirm();
            onDocumentationDeleted?.(pendingDeleteId);
        }
        catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Failed to delete documentation');
        }
        finally {
            setIsDeleting(false);
        }
    };
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
        });
    };
    const filteredItems = useMemo(() => {
        if (!searchQuery.trim())
            return items;
        const query = searchQuery.toLowerCase();
        return items.filter(item => {
            if (item.kind === 'doc') {
                const doc = item.doc;
                return (doc.title?.toLowerCase().includes(query) ||
                    doc.description?.toLowerCase().includes(query) ||
                    doc.prompt?.toLowerCase().includes(query) ||
                    doc.target?.toLowerCase().includes(query) ||
                    doc.branch.toLowerCase().includes(query));
            }
            const uml = item.uml;
            return (uml.name?.toLowerCase().includes(query) ||
                uml.description?.toLowerCase().includes(query) ||
                uml.prompt?.toLowerCase().includes(query) ||
                uml.type?.toLowerCase().includes(query));
        });
    }, [items, searchQuery]);
    const handleItemClick = (item: DocumentationListItem) => {
        startLoading();
        if (item.kind === 'uml') {
            router.push(`/org-${orgShortId}/repo/${repoUrlName}/documentation/uml/${encodeURIComponent(item.uml.slug)}`);
            return;
        }
        const doc = item.doc;
        if (!doc.title) {
            console.error('Documentation has no title');
            return;
        }
        const slug = doc.slug || slugify(doc.title);
        router.push(`/org-${orgShortId}/repo/${repoUrlName}/documentation/${encodeURIComponent(slug)}`);
    };
    if (loading) {
        return (<div className="flex flex-col gap-4">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((i) => (<div key={i} className="w-full">
            <div className="flex flex-col w-full">
              <div className="h-6 bg-white/10 rounded mb-2 animate-pulse w-full"></div>
              <div className="h-4 bg-white/10 rounded mb-2 w-2/3 animate-pulse"></div>
              <div className="h-4 bg-white/10 rounded mb-4 w-[85%] animate-pulse"></div>
              <div className="pt-4 border-t border-white/10">
                <div className="h-3 bg-white/10 rounded w-1/2 animate-pulse"></div>
              </div>
            </div>
          </div>))}
      </div>);
    }
    if (error) {
        return (<div className="bg-red-500/10 border border-red-500/50 rounded p-4">
        <p className="text-red-400 text-sm">{error}</p>
      </div>);
    }
    if (filteredItems.length === 0) {
        return (<div className="text-center py-12">
        <p className="text-white/60 mb-2">
          {searchQuery ? 'No documentations match your search' : 'No documentation found'}
        </p>
        <p className="text-white/40 text-sm">
          {searchQuery ? 'Try a different search term' : 'Generate documentation to get started.'}
        </p>
      </div>);
    }
    return (<>
    <div className="pb-4" ref={menuRef}>
      <div className="flex flex-col gap-6">
        {filteredItems.map((item) => {
            const itemId = item.kind === 'doc' ? item.doc._id : `uml-${item.uml._id}`;
            const isDoc = item.kind === 'doc';
            const menuOpen = openMenuId === itemId;
            return (<div key={itemId} className="w-full group flex items-start gap-2">
              <div onClick={() => handleItemClick(item)} className="flex-1 min-w-0 cursor-pointer hover:text-[var(--color-primary)] transition-colors">
                <div className="flex flex-col h-full">
                  {isDoc ? (<>
                      {item.doc.title && (<h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors flex items-center gap-2 flex-wrap">
                          <span>{item.doc.title}</span>
                          {item.doc.documentationType === 'api' && (<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-400/40">
                              API/Code
                            </span>)}
                          {item.doc.documentationType === 'architecture' && (<span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium uppercase tracking-wider bg-violet-500/20 text-violet-400 border border-violet-400/40">
                              High-Level System
                            </span>)}
                        </h3>)}
                      {item.doc.description && (<p className="text-white/50 text-sm mb-3 line-clamp-3">
                          {item.doc.description}
                        </p>)}
                      {item.doc.target && (<p className="text-white/50 text-sm mb-4 font-mono truncate">
                          {item.doc.target}
                        </p>)}
                      <div className="mt-auto pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs text-white/40">
                          <span>{formatDate(item.doc.createdAt)}</span>
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </div>
                    </>) : (<>
                      <h3 className="text-white font-semibold text-lg mb-2 line-clamp-2 group-hover:text-[var(--color-primary)] transition-colors flex items-center gap-2 flex-wrap">
                        <span>{item.uml.name}</span>
                        <UmlTypeLabel type={item.uml.type}/>
                      </h3>
                      {(item.uml.description ?? item.uml.prompt) && (<p className="text-white/50 text-sm mb-3 line-clamp-3">
                          {item.uml.description ?? item.uml.prompt}
                        </p>)}
                      <div className="mt-auto pt-4 border-t border-white/10">
                        <div className="flex items-center justify-between text-xs text-white/40">
                          <span>{formatDate(item.uml.createdAt)}</span>
                          <svg className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                          </svg>
                        </div>
                      </div>
                    </>)}
                </div>
              </div>
              {isDoc && (<div className="relative flex-shrink-0">
                  <button type="button" onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(menuOpen ? null : itemId);
                    }} className="p-1.5 rounded-md text-white/50 hover:text-white hover:bg-white/10 transition-colors" aria-label="More options">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <circle cx="12" cy="5" r="1.5"/>
                      <circle cx="12" cy="12" r="1.5"/>
                      <circle cx="12" cy="19" r="1.5"/>
                    </svg>
                  </button>
                  {menuOpen && (<div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] py-1 bg-[#212121] border border-[#424242] rounded-md shadow-lg" onClick={(e) => e.stopPropagation()}>
                      <button type="button" onClick={(e) => openDeleteConfirm(e, item.doc._id)} className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-white/10 transition-colors">
                        Delete
                      </button>
                    </div>)}
                </div>)}
            </div>);
        })}
      </div>
    </div>

    {pendingDeleteId && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={closeDeleteConfirm}>
        <div className="absolute inset-0 bg-black/60" aria-hidden/>
        <div className="relative z-10 w-full max-w-sm rounded-lg border border-[#424242] bg-[#212121] p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
          {deleteError ? (<>
              <p className="text-red-400 text-sm mb-4">{deleteError}</p>
              <div className="flex justify-end">
                <button type="button" onClick={closeDeleteConfirm} className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors">
                  Close
                </button>
              </div>
            </>) : (<>
              <p className="text-white text-sm mb-5">
                Delete this documentation? This cannot be undone.
              </p>
              <div className="flex justify-end gap-2">
                <button type="button" onClick={closeDeleteConfirm} disabled={isDeleting} className="px-4 py-2 rounded-md bg-white/10 text-white hover:bg-white/20 transition-colors disabled:opacity-50">
                  Cancel
                </button>
                <button type="button" onClick={handleConfirmDelete} disabled={isDeleting} className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50">
                  {isDeleting ? 'Deleting…' : 'Delete'}
                </button>
              </div>
            </>)}
        </div>
      </div>)}
    </>);
}
