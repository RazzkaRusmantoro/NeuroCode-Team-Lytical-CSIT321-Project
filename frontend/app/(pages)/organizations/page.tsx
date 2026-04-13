import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/session';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubAvatarUrl } from '@/lib/utils/github-avatar';
import { getUserOrganizations } from '@/actions/organization';
import OrganizationsNavbar from '@/app/components/OrganizationsNavbar';
import OrganizationsPageClient from './components/OrganizationsPageClient';
export default async function OrganizationsPage() {
    const session = await getCachedSession();
    if (!session?.user) {
        redirect('/login');
    }
    const user = session.user.id ? await getCachedUserById(session.user.id) : null;
    const userImageUrl = getGitHubAvatarUrl(user);
    const { organizations } = await getUserOrganizations();
    return (<>
      <OrganizationsNavbar userEmail={session.user.email} userName={session.user.name} userImageUrl={userImageUrl}/>
      <OrganizationsPageClient organizations={organizations}/>
    </>);
}
