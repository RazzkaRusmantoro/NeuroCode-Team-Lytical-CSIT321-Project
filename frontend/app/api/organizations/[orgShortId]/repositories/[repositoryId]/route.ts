import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId, removeRepositoryFromOrganization } from '@/lib/models/organization';
import { getRepositoryById, deleteRepository } from '@/lib/models/repository';
import { deleteDocumentationsByRepository } from '@/lib/models/documentation';
import { deleteCodeReferencesByRepository } from '@/lib/models/code_reference';
import { deleteAllVisualTreesForRepository } from '@/lib/models/visual_tree';
import { deletePRCommentsByRepository } from '@/lib/models/pr_comment';
import { deletePullRequestAnalysesByRepository } from '@/lib/models/pull_request_analysis';
type RouteContext = {
    params: Promise<{
        orgShortId: string;
        repositoryId: string;
    }> | {
        orgShortId: string;
        repositoryId: string;
    };
};
export async function DELETE(_request: NextRequest, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const { orgShortId, repositoryId } = await Promise.resolve(context.params);
        const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
        const [user, organization, repo] = await Promise.all([
            getCachedUserById(session.user.id),
            getOrganizationByShortId(shortId),
            getRepositoryById(repositoryId),
        ]);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        if (!organization) {
            return Response.json({ error: 'Organization not found' }, { status: 404 });
        }
        if (!repo) {
            return Response.json({ error: 'Repository not found' }, { status: 404 });
        }
        const isMember = user.organizations?.some((org) => org.organizationId.toString() === organization._id!.toString());
        if (!isMember) {
            return Response.json({ error: 'Not a member of this organization' }, { status: 403 });
        }
        if (repo.organizationId.toString() !== organization._id!.toString()) {
            return Response.json({ error: 'Repository does not belong to this organization' }, { status: 400 });
        }
        const orgIdStr = organization._id!.toString();
        await removeRepositoryFromOrganization(orgIdStr, repositoryId);
        await deleteDocumentationsByRepository(repositoryId);
        await deleteCodeReferencesByRepository(repositoryId);
        await deleteAllVisualTreesForRepository(repositoryId);
        await deletePRCommentsByRepository(repositoryId);
        await deletePullRequestAnalysesByRepository(repositoryId);
        await deleteRepository(repositoryId);
        return Response.json({ ok: true });
    }
    catch (e) {
        console.error('DELETE repository error:', e);
        return Response.json({ error: 'Failed to delete repository' }, { status: 500 });
    }
}
