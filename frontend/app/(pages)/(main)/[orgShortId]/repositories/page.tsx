import { getCachedUserById } from '@/lib/models/user';
import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/session';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoriesByOrganization } from '@/lib/models/repository';
import { generateSlug } from '@/lib/utils/slug';
import RepositorySearch from './components/RepositorySearch';
import RepositoriesGrid from './components/RepositoriesGrid';
export default async function RepositoriesPage({ params }: {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
}) {
    const session = await getCachedSession();
    if (!session?.user?.id) {
        redirect('/login');
    }
    const user = await getCachedUserById(session.user.id);
    if (!user) {
        redirect('/login');
    }
    const resolvedParams = await Promise.resolve(params);
    const shortId = resolvedParams.orgShortId.startsWith('org-')
        ? resolvedParams.orgShortId.replace('org-', '')
        : resolvedParams.orgShortId;
    const organization = await getOrganizationByShortId(shortId);
    if (!organization) {
        redirect('/organizations');
    }
    const userOrg = user.organizations?.find(org => org.organizationId.toString() === organization._id!.toString());
    if (!userOrg) {
        redirect('/organizations');
    }
    const isGitHubConnected = user.github && user.github.status === 'active';
    const githubAccount = user.github?.providerAccount || null;
    const repositories = await getRepositoriesByOrganization(organization._id!.toString());
    const formattedRepositories = repositories
        .filter(repo => repo._id)
        .map(repo => ({
        id: repo._id!.toString(),
        name: repo.name,
        urlName: repo.urlName || generateSlug(repo.name),
        url: repo.url,
        source: repo.source,
        description: repo.description,
        size: repo.size,
        lastUpdate: repo.lastUpdate,
        addedAt: repo.addedAt,
    }));
    const selectedOrganization = {
        id: organization._id!.toString(),
        shortId: organization.shortId,
        name: userOrg.name,
        role: userOrg.role,
        ownerId: organization.ownerId.toString(),
    };
    return (<div className="mx-auto max-w-screen-2xl">
      <h1 className="text-3xl font-bold text-white mb-10">Repositories</h1>
      
      <RepositorySearch githubAccount={githubAccount} selectedOrganization={selectedOrganization}/>

      
      <div className="mt-10">
        {formattedRepositories.length > 0 ? (<RepositoriesGrid repositories={formattedRepositories.map((repo) => ({
                id: repo.id,
                name: repo.name,
                urlName: repo.urlName,
                url: repo.url,
                source: repo.source,
                description: repo.description,
                size: repo.size ? `${(repo.size / 1024).toFixed(2)} MB` : undefined,
                lastUpdate: repo.lastUpdate,
                addedAt: repo.addedAt,
            }))} orgShortId={shortId}/>) : (<div className="mt-6 p-8 bg-[#171717]/50 backdrop-blur-sm border border-[#262626] rounded text-center">
            <p className="text-white/70">
              {selectedOrganization
                ? 'No repositories found. Add a repository to get started.'
                : 'No organization selected. Please select an organization to view repositories.'}
            </p>
          </div>)}
      </div>
    </div>);
}
