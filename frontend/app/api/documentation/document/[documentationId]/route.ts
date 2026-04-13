import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getDocumentationById, deleteDocumentationById } from '@/lib/models/documentation';
import { getRepositoryById } from '@/lib/models/repository';
export async function DELETE(request: NextRequest, { params }: {
    params: Promise<{
        documentationId: string;
    }> | {
        documentationId: string;
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
        const documentationId = resolvedParams.documentationId;
        if (!documentationId) {
            return NextResponse.json({ error: 'documentationId is required' }, { status: 400 });
        }
        const doc = await getDocumentationById(documentationId);
        if (!doc) {
            return NextResponse.json({ error: 'Documentation not found' }, { status: 404 });
        }
        const repository = await getRepositoryById(doc.repositoryId.toString());
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
        const deleted = await deleteDocumentationById(documentationId);
        if (!deleted) {
            return NextResponse.json({ error: 'Failed to delete documentation' }, { status: 500 });
        }
        return NextResponse.json({ success: true });
    }
    catch (error) {
        console.error('[Documentation API] Error deleting documentation:', error);
        return NextResponse.json({
            error: 'Failed to delete documentation',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
