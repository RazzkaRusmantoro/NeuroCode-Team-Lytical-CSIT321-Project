'use client';
import { useState, useRef, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import type { SerializedRepository } from '@/lib/models/repository';
import { useLoadingBar } from '../contexts/LoadingBarContext';
interface RepositoryWithId extends SerializedRepository {
    id: string;
}
interface RepositoryDropdownProps {
    repositories: RepositoryWithId[];
    selectedRepository: RepositoryWithId | null;
    onRepositoryChange?: (repo: RepositoryWithId) => void;
}
export default function RepositoryDropdown({ repositories, selectedRepository: initialSelectedRepository, onRepositoryChange, }: RepositoryDropdownProps) {
    const router = useRouter();
    const pathname = usePathname();
    const { startLoading } = useLoadingBar();
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRepository, setSelectedRepository] = useState<RepositoryWithId | null>(initialSelectedRepository);
    useEffect(() => {
        setSelectedRepository(initialSelectedRepository);
    }, [initialSelectedRepository]);
    const filteredRepositories = repositories.filter(repo => repo.name.toLowerCase().includes(searchQuery.toLowerCase()));
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);
    const handleRepositoryChange = (repo: RepositoryWithId) => {
        setSelectedRepository(repo);
        setIsOpen(false);
        setSearchQuery('');
        onRepositoryChange?.(repo);
        const orgMatch = pathname.match(/\/org-([^/]+)/);
        if (orgMatch && repo.urlName) {
            startLoading();
            router.push(`/org-${orgMatch[1]}/repo/${repo.urlName}`);
        }
    };
    return (<div className="relative" ref={dropdownRef}>
      <button type="button" onClick={() => setIsOpen(!isOpen)} className="flex flex-col items-start cursor-pointer">
        <span className="text-sm font-bold text-[var(--color-primary)] mb-1">REPOSITORY</span>
        <div className="flex items-center gap-2">
          <span className="text-sm text-white">
            {selectedRepository?.name || 'No repository'}
          </span>
          <svg className={`w-3 h-3 text-white/70 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"/>
          </svg>
        </div>
      </button>
      <div className={`absolute z-10 mt-2 bg-[#121215] border border-[#262626] rounded shadow-lg overflow-hidden min-w-[280px] transition-all duration-200 ease-in-out ${isOpen
            ? 'opacity-100 translate-y-0 pointer-events-auto'
            : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
        
        <div className="p-3 border-b border-[#262626]">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/>
            </svg>
            <input type="text" placeholder="Find a repository" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-full pl-10 pr-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all" onClick={(e) => e.stopPropagation()}/>
          </div>
        </div>

        
        <div className="py-2 px-2 max-h-64 overflow-y-auto">
          {filteredRepositories.length > 0 ? (filteredRepositories.map((repo) => (<button key={repo.id} type="button" onClick={() => handleRepositoryChange(repo)} className={`w-full px-4 py-2.5 text-left text-sm transition-colors cursor-pointer rounded ${selectedRepository?.id === repo.id
                ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] hover:bg-[var(--color-primary)]/30'
                : 'text-white hover:bg-[#2a2a2a]'}`}>
                {repo.name}
              </button>))) : (<div className="px-4 py-2 text-sm text-white/60 text-center">
              No repositories found
            </div>)}
        </div>

        
        <div className="border-t border-[#262626]">
          <button type="button" onClick={() => {
            const orgMatch = pathname.match(/\/org-([^/]+)/);
            if (orgMatch) {
                startLoading();
                router.push(`/org-${orgMatch[1]}/repositories`);
            }
            setIsOpen(false);
        }} className="w-full px-4 py-2.5 text-left text-sm text-white/70 hover:text-white hover:bg-[#2a2a2a] transition-colors cursor-pointer flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16"/>
            </svg>
            View all repositories
          </button>
        </div>
      </div>
    </div>);
}
