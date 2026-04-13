'use client';
import ProfileDropdown from './ProfileDropdown';
interface OrganizationsNavbarProps {
    userEmail?: string | null;
    userName?: string | null;
    userImageUrl?: string | null;
}
export default function OrganizationsNavbar({ userEmail, userName, userImageUrl, }: OrganizationsNavbarProps) {
    return (<nav className="w-full" style={{ fontFamily: 'var(--font-poppins)' }}>
      <div className="flex items-center py-8">
        <div className="flex items-center gap-12 w-full max-w-screen-2xl mx-auto px-40">
          
          <div className="flex items-center">
            <img src="/Full-logo.png" alt="NeuroCode Logo" className="h-12 w-auto"/>
          </div>
          
          
          <div className="flex items-center gap-4 ml-auto">
            <ProfileDropdown userEmail={userEmail} userName={userName} userImageUrl={userImageUrl}/>
          </div>
        </div>
      </div>
    </nav>);
}
