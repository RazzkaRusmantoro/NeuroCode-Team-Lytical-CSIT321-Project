'use client';
import { usePathname } from 'next/navigation';
import MainLayoutClient from './MainLayoutClient';
import OnboardingPathLayoutClient from './OnboardingPathLayoutClient';
import type { OrganizationWithId } from '@/actions/organization';
interface ConditionalLayoutWrapperProps {
    userEmail?: string | null;
    userName?: string | null;
    userId?: string | null;
    userImageUrl?: string | null;
    organizations: OrganizationWithId[];
    selectedOrganization: OrganizationWithId | null;
    children: React.ReactNode;
}
export default function ConditionalLayoutWrapper({ userEmail, userName, userId, userImageUrl, organizations, selectedOrganization, children, }: ConditionalLayoutWrapperProps) {
    const pathname = usePathname();
    const isRepoRoute = pathname?.includes('/repo/');
    const isOnboardingPathDetail = pathname != null && /\/onboarding\/[^/]+$/.test(pathname);
    if (isRepoRoute) {
        return <>{children}</>;
    }
    if (isOnboardingPathDetail) {
        return (<OnboardingPathLayoutClient userEmail={userEmail} userName={userName} userId={userId} userImageUrl={userImageUrl} organizations={organizations} selectedOrganization={selectedOrganization}>
        {children}
      </OnboardingPathLayoutClient>);
    }
    return (<MainLayoutClient userEmail={userEmail} userName={userName} userId={userId} userImageUrl={userImageUrl} organizations={organizations} selectedOrganization={selectedOrganization}>
      {children}
    </MainLayoutClient>);
}
