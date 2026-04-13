'use client';
import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLoadingBar } from '@/app/contexts/LoadingBarContext';
interface RepositoryCardProps {
    id: string;
    name: string;
    urlName: string;
    url: string;
    orgShortId: string;
    source?: 'github' | 'bitbucket' | 'upload';
    addedAt: Date | string;
    size?: string;
    lastUpdate?: Date | string;
    description?: string;
    onBeforeNavigate?: () => boolean;
    isDraggable?: boolean;
    showActions?: boolean;
}
export default function RepositoryCard({ id, name, urlName, url, orgShortId, source, addedAt, size, lastUpdate, description, onBeforeNavigate, isDraggable, showActions = true }: RepositoryCardProps) {
    const router = useRouter();
    const { startLoading } = useLoadingBar();
    const [menuOpen, setMenuOpen] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const addedDate = typeof addedAt === 'string' ? new Date(addedAt) : addedAt;
    const updateDate = lastUpdate ? (typeof lastUpdate === 'string' ? new Date(lastUpdate) : lastUpdate) : addedDate;
    const sizeDisplay = size || 'N/A';
    useEffect(() => {
        if (!menuOpen)
            return;
        const close = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                setMenuOpen(false);
            }
        };
        document.addEventListener('click', close);
        return () => document.removeEventListener('click', close);
    }, [menuOpen]);
    const handleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        if (onBeforeNavigate && !onBeforeNavigate())
            return;
        startLoading();
        router.push(`/org-${orgShortId}/repo/${urlName}`);
    };
    const handleDelete = async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setMenuOpen(false);
        setDeleting(true);
        try {
            const res = await fetch(`/api/organizations/org-${orgShortId}/repositories/${id}`, { method: 'DELETE' });
            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                alert(data?.error ?? 'Failed to delete repository');
                return;
            }
            router.refresh();
        }
        catch {
            alert('Failed to delete repository');
        }
        finally {
            setDeleting(false);
        }
    };
    return (<div onClick={handleClick} className="h-full min-h-0 group relative border border-[#262626] rounded p-6 hover:border-[var(--color-primary)]/50 transition-all duration-300 overflow-hidden flex flex-col bg-[#262626]/50 cursor-pointer" onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = `0 0 25px rgba(var(--color-primary-rgb), 0.3)`;
            e.currentTarget.style.transform = 'translateY(-2px)';
        }} onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.transform = 'translateY(0)';
        }}>
      
      {showActions && (<div ref={menuRef} className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
          <button type="button" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((o) => !o); }} className="p-1.5 rounded text-white/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer" aria-label="Repository options" disabled={deleting}>
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
              <circle cx="12" cy="5" r="1.5"/>
              <circle cx="12" cy="12" r="1.5"/>
              <circle cx="12" cy="19" r="1.5"/>
            </svg>
          </button>
          {menuOpen && (<div className="absolute right-0 top-full mt-1 px-1.5 py-1.5 min-w-[120px] rounded border border-[#262626] bg-[#171717] shadow-lg z-20">
              <button type="button" onClick={handleDelete} disabled={deleting} className="w-full text-left px-3 py-2 rounded text-sm text-red-400 hover:bg-white/10 disabled:opacity-50 cursor-pointer">
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>)}
        </div>)}

      
      <h2 className="text-2xl font-bold text-white mb-3 group-hover:text-[var(--color-primary)] transition-colors duration-300 pr-8">
        {name}
      </h2>

      
      <div className="w-fit inline-block pl-3 pr-7 py-1 rounded text-sm font-medium mt-2 mb-3 bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
        /{urlName}
      </div>

      
      {description && (<p className="text-sm text-white/70 mb-4 line-clamp-3">
          {description}
        </p>)}

      
      <div className="flex-grow"></div>

      
      <hr className="border-[#262626] mb-3 mt-4"/>

      
      <div className="flex justify-between items-center text-xs text-white/50">
        <span>Size: {sizeDisplay}</span>
        <span>Last Update: {updateDate.toLocaleDateString()}</span>
      </div>

      
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--color-primary)]/0 to-[var(--color-primary)]/0 group-hover:from-[var(--color-primary)]/5 group-hover:to-transparent transition-all duration-300 pointer-events-none rounded"/>
    </div>);
}
