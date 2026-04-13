import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getCodeReferencesByRepository } from '@/lib/models/code_reference';
import { getRepositoryById } from '@/lib/models/repository';
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
        const userOrg = user.organizations?.find(org => org.organizationId.toString() === repository.organizationId.toString());
        if (!userOrg) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        const codeReferences = await getCodeReferencesByRepository(repositoryId, repository.organizationId.toString());
        const serializedRefs = codeReferences.map(ref => ({
            _id: ref._id?.toString(),
            referenceId: ref.referenceId,
            name: ref.name,
            type: ref.type,
            module: ref.module,
            filePath: ref.filePath,
            description: ref.description,
            signature: ref.signature,
            parameters: ref.parameters,
            returns: ref.returns,
            examples: ref.examples,
            seeAlso: ref.seeAlso,
            code: (ref as any).code,
        }));
        return NextResponse.json({
            success: true,
            codeReferences: serializedRefs,
        });
    }
    catch (error) {
        console.error('[Code References API] Error fetching code references:', error);
        return NextResponse.json({
            error: 'Failed to fetch code references',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
