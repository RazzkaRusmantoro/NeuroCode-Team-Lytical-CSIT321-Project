'use client';
import { useState } from 'react';
import AddRepositoryModal from './AddRepositoryModal';
import type { OrganizationWithId } from '@/actions/organization';
import TextInput from '@/app/components/TextInput';
interface RepositorySearchProps {
    githubAccount?: string | null;
    selectedOrganization: OrganizationWithId | null;
}
export default function RepositorySearch({ githubAccount, selectedOrganization }: RepositorySearchProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const handleAddRepository = () => {
        setIsModalOpen(true);
    };
    const handleCloseModal = () => {
        setIsModalOpen(false);
    };
    return (<>
    <div className="mb-6 flex gap-4">
      <div className="w-[70%]">
        <TextInput type="text" id="repositorySearch" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search repositories..." className="w-full"/>
      </div>
      <button type="button" onClick={handleAddRepository} className="relative px-18 py-3 bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] rounded text-white text-sm font-semibold overflow-hidden transition-all duration-300 cursor-pointer group ml-auto shadow-lg hover:shadow-[0_0_20px_rgba(var(--color-primary-rgb),0.4)] hover:scale-[1.02] active:scale-[0.98]">
        <span className="relative z-[1] flex items-center gap-2.5">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4"/>
          </svg>
          Add Repository
        </span>
        <span className="absolute inset-0 bg-gradient-to-r from-[var(--color-primary-light)] to-[var(--color-primary)] opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-0"></span>
      </button>
    </div>

      <AddRepositoryModal isOpen={isModalOpen} onClose={handleCloseModal} githubAccount={githubAccount} selectedOrganization={selectedOrganization}/>
    </>);
}
