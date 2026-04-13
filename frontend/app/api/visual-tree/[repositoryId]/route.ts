import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getRepositoryById } from '@/lib/models/repository';
import { getLatestVisualTree, getLatestCompletedVisualTree, deleteAllVisualTreesForRepository, } from '@/lib/models/visual_tree';
export async function GET(request: NextRequest, { params }: {
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
        const latest = await getLatestVisualTree(repositoryId);
        if (!latest) {
            return NextResponse.json({ success: true, status: 'none', tree: null });
        }
        if (latest.status === 'generating') {
            const elapsed = Date.now() - new Date(latest.createdAt).getTime();
            const STALE_THRESHOLD_MS = 135 * 60 * 1000;
            if (elapsed > STALE_THRESHOLD_MS && latest._id) {
                const { failVisualTree } = await import('@/lib/models/visual_tree');
                await failVisualTree(latest._id.toString(), 'Generation timed out');
                const completed = await getLatestCompletedVisualTree(repositoryId);
                return NextResponse.json({
                    success: true,
                    status: 'failed',
                    error: 'Generation timed out — please try again',
                    tree: completed ? await fetchTreeFromS3(completed) : null,
                    ...(completed ? { metadata: buildMetadata(completed) } : {}),
                });
            }
            return NextResponse.json({
                success: true,
                status: 'generating',
                startedAt: latest.createdAt?.toISOString(),
                elapsedMs: elapsed,
            });
        }
        if (latest.status === 'failed') {
            if (latest.errorMessage === 'Cancelled by user') {
                return NextResponse.json({ success: true, status: 'none', tree: null });
            }
            const completed = await getLatestCompletedVisualTree(repositoryId);
            if (completed && completed.s3Key) {
                const tree = await fetchTreeFromS3(completed);
                if (tree) {
                    return NextResponse.json({
                        success: true,
                        status: 'completed',
                        lastError: latest.errorMessage,
                        tree,
                        metadata: buildMetadata(completed),
                    });
                }
            }
            return NextResponse.json({
                success: true,
                status: 'failed',
                error: latest.errorMessage,
                tree: null,
            });
        }
        if (!latest.s3Key) {
            return NextResponse.json({ success: true, status: 'none', tree: null });
        }
        const userOrg = user.organizations?.find((org: any) => org.organizationId.toString() === latest.organizationId.toString());
        if (!userOrg) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        const tree = await fetchTreeFromS3(latest);
        if (!tree) {
            return NextResponse.json({ error: 'Failed to fetch tree content from S3' }, { status: 500 });
        }
        return NextResponse.json({
            success: true,
            status: 'completed',
            tree,
            metadata: buildMetadata(latest),
        });
    }
    catch (error) {
        console.error('[Visual Tree API] Error:', error);
        return NextResponse.json({
            error: 'Failed to fetch visual tree',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
export async function DELETE(request: NextRequest, { params }: {
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
        const { deletedCount } = await deleteAllVisualTreesForRepository(repositoryId);
        return NextResponse.json({ success: true, deletedCount });
    }
    catch (error) {
        console.error('[Visual Tree API] Delete error:', error);
        return NextResponse.json({
            error: 'Failed to delete documentation',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
function buildMetadata(doc: any) {
    return {
        _id: doc._id?.toString(),
        branch: doc.branch,
        contentSize: doc.contentSize,
        createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
        updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
    };
}
async function fetchTreeFromS3(doc: {
    s3Key?: string;
    s3Bucket?: string;
}) {
    if (!doc.s3Key)
        return null;
    try {
        const pythonBackendUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
        const s3Response = await fetch(`${pythonBackendUrl}/api/get-documentation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ s3_key: doc.s3Key, s3_bucket: doc.s3Bucket }),
        });
        if (!s3Response.ok)
            return null;
        const s3Data = await s3Response.json();
        if (!s3Data.success)
            return null;
        return JSON.parse(s3Data.content);
    }
    catch (err) {
        console.error('[Visual Tree API] S3 fetch error:', err);
        return null;
    }
}
