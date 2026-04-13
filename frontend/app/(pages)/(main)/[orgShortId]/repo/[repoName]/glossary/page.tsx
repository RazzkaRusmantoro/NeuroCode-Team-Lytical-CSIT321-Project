import { getCachedUserById } from '@/lib/models/user';
import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/session';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import GlossaryViewer from '../documentation/components/GlossaryViewer';
export default async function GlossaryPage({ params }: {
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
    return (<GlossaryViewer repositoryId={repository._id!.toString()} orgShortId={shortId} repoUrlName={repoName} repoName={repository.name}/>);
}
