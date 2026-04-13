import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getRepositoryById } from '@/lib/models/repository';
import { cancelVisualTreeGeneration } from '@/lib/models/visual_tree';
export async function POST(request: NextRequest, { params }: {
    params: Promise<{
        repositoryId: string;
    }> | {
        repositoryId: string;
    };
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const resolvedParams = await Promise.resolve(params);
        const repositoryId = resolvedParams.repositoryId;
        const repository = await getRepositoryById(repositoryId);
        if (!repository) {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }
        const userOrg = user.organizations?.find((org: {
            organizationId: {
                toString: () => string;
            };
        }) => org.organizationId.toString() === repository.organizationId.toString());
        if (!userOrg) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        const { cancelled } = await cancelVisualTreeGeneration(repositoryId);
        return NextResponse.json({ success: true, cancelled });
    }
    catch (error) {
        console.error('[Visual Tree API] Cancel error:', error);
        return NextResponse.json({
            error: 'Failed to cancel generation',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
