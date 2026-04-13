import { getCachedUserById } from '@/lib/models/user';
import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/session';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import RepositoryViewer from './components/RepositoryViewer';
export default async function RepositoryPage({ params }: {
    params: Promise<{
        orgShortId: string;
        repoName: string;
    }> | {
        orgShortId: string;
        repoName: string;
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
    const repoName = resolvedParams.repoName;
    const organization = await getOrganizationByShortId(shortId);
    if (!organization) {
        redirect('/organizations');
    }
    const userOrg = user.organizations?.find(org => org.organizationId.toString() === organization._id!.toString());
    if (!userOrg) {
        redirect('/organizations');
    }
    const repository = await getRepositoryByUrlNameAndOrganization(repoName, organization._id!.toString());
    if (!repository) {
        redirect(`/org-${shortId}/repositories`);
    }
    let repoFullName = '';
    if (repository.url && repository.source === 'github') {
        try {
            const url = new URL(repository.url);
            const pathParts = url.pathname.split('/').filter(part => part);
            if (pathParts.length >= 2) {
                repoFullName = `${pathParts[0]}/${pathParts[1]}`;
            }
        }
        catch (error) {
            console.error('Error parsing repository URL:', error);
        }
    }
    return (<>
      {repoFullName ? (<RepositoryViewer repoFullName={repoFullName} orgShortId={shortId} repoUrlName={repoName} repoName={repository.name}/>) : (<div className="h-full flex items-center justify-center">
          <div className="px-4 py-8 text-center text-white/60 text-sm">
            Repository not found
          </div>
        </div>)}
    </>);
}
