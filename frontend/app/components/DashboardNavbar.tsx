'use client';
import OrganizationDropdown from './OrganizationDropdown';
import RepositoryDropdown from './RepositoryDropdown';
import ProfileDropdown from './ProfileDropdown';
import type { OrganizationWithId } from '@/actions/organization';
import type { SerializedRepository } from '@/lib/models/repository';
interface RepositoryWithId extends SerializedRepository {
    id: string;
}
interface DashboardNavbarProps {
    userEmail?: string | null;
    userName?: string | null;
    userImageUrl?: string | null;
    organizations: OrganizationWithId[];
    selectedOrganization: OrganizationWithId | null;
    repositories?: RepositoryWithId[];
    selectedRepository?: RepositoryWithId | null;
}
export default function DashboardNavbar({ userEmail, userName, userImageUrl, organizations, selectedOrganization, repositories, selectedRepository, }: DashboardNavbarProps) {
    const showRepositoryDropdown = repositories && repositories.length > 0;
    return (<nav className="w-full" style={{ fontFamily: 'var(--font-poppins)' }}>
      <div className="flex items-center py-8">
        <div className="flex items-center gap-6 w-full max-w-screen-2xl mx-auto">
          
          <OrganizationDropdown organizations={organizations} selectedOrganization={selectedOrganization}/>
          
          
          {showRepositoryDropdown && (<svg className="w-6 h-5 text-white/70" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7"/>
            </svg>)}

          
          {showRepositoryDropdown && (<RepositoryDropdown repositories={repositories} selectedRepository={selectedRepository || null}/>)}
          
          
          <div className="flex items-center gap-4 ml-auto">
            <ProfileDropdown userEmail={userEmail} userName={userName} userImageUrl={userImageUrl}/>
          </div>
        </div>
      </div>
    </nav>);
}
