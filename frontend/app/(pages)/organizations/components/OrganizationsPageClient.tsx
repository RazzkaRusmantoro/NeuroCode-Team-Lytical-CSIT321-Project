'use client';
import { useState, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import OrganizationSearch from '../../../components/OrganizationSearch';
import type { OrganizationWithId } from '@/actions/organization';
import CreateOrganizationModal from './CreateOrganizationModal';
interface OrganizationsPageClientProps {
    organizations: OrganizationWithId[];
}
export default function OrganizationsPageClient({ organizations: initialOrganizations }: OrganizationsPageClientProps) {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchQuery, setSearchQuery] = useState('');
    const [showCreateModal, setShowCreateModal] = useState(false);
    useEffect(() => {
        if (searchParams.get('create') === 'true') {
            setShowCreateModal(true);
            router.replace('/organizations');
        }
    }, [searchParams, router]);
    const filteredOrganizations = useMemo(() => {
        if (!searchQuery.trim())
            return initialOrganizations;
        return initialOrganizations.filter(org => org.name.toLowerCase().includes(searchQuery.toLowerCase()));
    }, [initialOrganizations, searchQuery]);
    const handleAddOrganization = () => {
        setShowCreateModal(true);
    };
    const handleOrganizationClick = (org: OrganizationWithId) => {
        router.push(`/org-${org.shortId}/dashboard`);
    };
    return (<div className="mx-auto max-w-screen-2xl px-40">
      {showCreateModal && <CreateOrganizationModal onClose={() => setShowCreateModal(false)}/>}
      <h1 className="text-3xl font-bold text-white mb-10">Organizations</h1>
      
      <OrganizationSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} onAddOrganization={handleAddOrganization}/>

      
      <div className="mt-10">
        {filteredOrganizations.length > 0 ? (<div className="flex flex-col gap-4">
            {filteredOrganizations.map((org) => (<div key={org.id} onClick={() => handleOrganizationClick(org)} className="bg-[#121215] backdrop-blur-sm border border-[#262626] rounded-lg px-6 py-4 hover:bg-[#262626]/50 hover:border-[#2a2a2a] transition-all duration-200 cursor-pointer flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="text-white font-medium text-lg">{org.name}</div>
                  {org.role === 'owner' && (<span className="inline-block px-3 py-1 rounded-lg text-xs font-medium capitalize bg-[var(--color-primary)]/20 text-[var(--color-primary)] border border-[var(--color-primary)]/30">
                      {org.role}
                    </span>)}
                </div>
                <svg className="w-5 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
                </svg>
              </div>))}
          </div>) : (<div className="mt-6 p-8 bg-[#171717]/50 backdrop-blur-sm border border-[#262626] rounded-lg text-center">
            <p className="text-white/70">
              {searchQuery
                ? 'No organizations found matching your search.'
                : 'You don\'t have any organizations yet.'}
            </p>
            {!searchQuery && (<p className="text-white/50 text-sm mt-2">
                Create an organization to get started.
              </p>)}
          </div>)}
      </div>
    </div>);
}
