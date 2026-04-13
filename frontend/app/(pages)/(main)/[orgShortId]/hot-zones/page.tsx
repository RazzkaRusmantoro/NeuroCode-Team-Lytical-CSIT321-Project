import { getCachedUserById } from '@/lib/models/user';
import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/session';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getCachedRepositoryOptionsByOrganizationId } from '@/lib/cache/repositoryOptions';
import HotZonesDashboard from './components/HotZonesDashboard';
type PageProps = {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
};
export default async function HotZonesPage({ params }: PageProps) {
    const session = await getCachedSession();
    if (!session?.user?.id) {
        redirect('/login');
    }
    const user = await getCachedUserById(session.user.id);
    if (!user) {
        redirect('/login');
    }
    const resolvedParams = await Promise.resolve(params);
    const rawOrgShortId = resolvedParams.orgShortId;
    const shortId = rawOrgShortId.startsWith('org-')
        ? rawOrgShortId.replace('org-', '')
        : rawOrgShortId;
    const organization = await getOrganizationByShortId(shortId);
    if (!organization) {
        redirect('/organizations');
    }
    const userOrg = user.organizations?.find(org => org.organizationId.toString() === organization._id!.toString());
    if (!userOrg) {
        redirect('/organizations');
    }
    const repositoryOptions = await getCachedRepositoryOptionsByOrganizationId(organization._id!.toString());
    return <HotZonesDashboard orgShortId={shortId} repositories={repositoryOptions}/>;
}
