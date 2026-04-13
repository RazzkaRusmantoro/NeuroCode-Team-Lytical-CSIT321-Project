import { redirect } from 'next/navigation';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getUserOrganizations } from '@/actions/organization';
import { getCachedSession } from '@/lib/session';
import { getCachedUserById } from '@/lib/models/user';
import { getRepositoriesByOrganization } from '@/lib/models/repository';
import { getGitHubAvatarUrl } from '@/lib/utils/github-avatar';
import RepoLayoutClient from '../../components/RepoLayoutClient';
export default async function RepoLayout({ children, params }: {
    children: React.ReactNode;
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
}) {
    const session = await getCachedSession();
    if (!session?.user) {
        redirect('/login');
    }
    const resolvedParams = await Promise.resolve(params);
    if (!resolvedParams?.orgShortId) {
        redirect('/organizations');
    }
    const shortId = resolvedParams.orgShortId.startsWith('org-')
        ? resolvedParams.orgShortId.replace('org-', '')
        : resolvedParams.orgShortId;
    const organization = await getOrganizationByShortId(shortId);
    if (!organization) {
        const { organizations } = await getUserOrganizations();
        if (organizations.length > 0) {
            redirect(`/org-${organizations[0].shortId}/dashboard`);
        }
        else {
            redirect('/dashboard');
        }
    }
    const { organizations } = await getUserOrganizations();
    const selectedOrganization = organizations.find(org => org.id === organization._id!.toString()) || null;
    const repositories = await getRepositoriesByOrganization(organization._id!.toString());
    const repositoriesWithId = repositories.map(repo => ({
        _id: repo._id!.toString(),
        id: repo._id!.toString(),
        organizationId: repo.organizationId.toString(),
        githubId: repo.githubId,
        name: repo.name,
        urlName: repo.urlName,
        url: repo.url,
        source: repo.source,
        description: repo.description,
        size: repo.size,
        lastUpdate: repo.lastUpdate ? repo.lastUpdate.toISOString() : undefined,
        addedAt: repo.addedAt.toISOString(),
    }));
    const user = await getCachedUserById(session.user.id);
    const userImageUrl = getGitHubAvatarUrl(user);
    return (<RepoLayoutClient userEmail={session.user.email} userName={session.user.name} userId={session.user.id} userImageUrl={userImageUrl} organizations={organizations} selectedOrganization={selectedOrganization} repositories={repositoriesWithId}>
      {children}
    </RepoLayoutClient>);
}
