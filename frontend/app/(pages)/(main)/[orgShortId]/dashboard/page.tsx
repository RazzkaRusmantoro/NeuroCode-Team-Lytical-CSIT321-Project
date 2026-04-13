import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/session';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoriesByOrganization } from '@/lib/models/repository';
import { generateSlug } from '@/lib/utils/slug';
import DashboardClient from './DashboardClient';
export default async function DashboardPage({ params, }: {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
}) {
    const session = await getCachedSession();
    if (!session?.user?.id)
        redirect('/login');
    const resolvedParams = await Promise.resolve(params);
    const orgSegment = resolvedParams.orgShortId;
    const shortId = orgSegment.startsWith('org-') ? orgSegment.replace('org-', '') : orgSegment;
    const [user, organization] = await Promise.all([
        getCachedUserById(session.user.id),
        getOrganizationByShortId(shortId),
    ]);
    if (!user || !organization)
        redirect('/organizations');
    const userOrg = user.organizations?.find((org) => org.organizationId.toString() === organization._id!.toString());
    if (!userOrg)
        redirect('/organizations');
    const repositories = await getRepositoriesByOrganization(organization._id!.toString());
    const repos = repositories
        .filter((r) => r._id)
        .map((r) => ({
        id: r._id!.toString(),
        name: r.name,
        urlName: r.urlName || generateSlug(r.name),
        description: r.description || null,
        lastUpdate: r.lastUpdate ? new Date(r.lastUpdate).toISOString() : null,
        source: (r.source as string) || 'github',
    }));
    const userDisplayName = `${user.firstName} ${user.lastName}`.trim() || user.email;
    return (<DashboardClient userName={(session.user.name ?? userDisplayName) || 'there'} orgSegment={orgSegment} orgName={userOrg.name || organization.shortId} repos={repos}/>);
}
