import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import { getCommentsPostedStatus } from '@/lib/models/pr_comment';
export async function POST(request: NextRequest, { params }: {
    params: Promise<{
        repoId: string;
        prNumber: string;
    }> | {
        repoId: string;
        prNumber: string;
    };
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const resolvedParams = await Promise.resolve(params);
        const { repoId, prNumber } = resolvedParams;
        const prNumberInt = parseInt(prNumber, 10);
        if (isNaN(prNumberInt)) {
            return NextResponse.json({ error: 'Invalid PR number' }, { status: 400 });
        }
        const { searchParams } = new URL(request.url);
        const orgShortId = searchParams.get('orgShortId');
        const repoUrlName = searchParams.get('repoUrlName');
        if (!orgShortId || !repoUrlName) {
            return NextResponse.json({ error: 'orgShortId and repoUrlName are required' }, { status: 400 });
        }
        const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const repository = await getRepositoryByUrlNameAndOrganization(repoUrlName, organization._id!.toString());
        if (!repository) {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }
        const body = await request.json().catch(() => ({}));
        const { comments } = body;
        if (!Array.isArray(comments) || comments.length === 0) {
            return NextResponse.json({ postedHashes: [] });
        }
        const postedHashes = await getCommentsPostedStatus(organization._id!.toString(), repository._id!.toString(), prNumberInt, comments);
        return NextResponse.json({ postedHashes: Array.from(postedHashes) });
    }
    catch (error: any) {
        console.error('Error fetching comment status:', error);
        return NextResponse.json({ error: error.message || 'Failed to fetch comment status' }, { status: 500 });
    }
}
