'use client';
import TextInput from './TextInput';
interface OrganizationSearchProps {
    searchQuery: string;
    onSearchChange: (query: string) => void;
    onAddOrganization: () => void;
}
export default function OrganizationSearch({ searchQuery, onSearchChange, onAddOrganization }: OrganizationSearchProps) {
    return (<div className="mb-6 flex gap-4">
      <div className="w-[70%]">
        <TextInput type="text" id="organizationSearch" value={searchQuery} onChange={(e) => onSearchChange(e.target.value)} placeholder="Search organizations..." className="w-full"/>
      </div>
      <button type="button" onClick={onAddOrganization} className="relative px-18 py-2.5 bg-transparent border-2 border-[var(--color-primary)] rounded text-[var(--color-primary)] text-sm font-medium overflow-hidden transition-all duration-300 cursor-pointer group ml-auto z-0 hover:border-[var(--color-primary-light)]">
        <span className="relative z-[1] flex items-center gap-2 transition-colors duration-300 group-hover:text-white">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4"/>
          </svg>
          New Organization
        </span>
        <span className="absolute inset-0 bg-[var(--color-primary)] transform scale-x-0 origin-left transition-transform duration-300 group-hover:scale-x-100 z-0"></span>
      </button>
    </div>);
}
