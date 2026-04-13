import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getDocumentationCollection, getDocumentationsByRepository } from '@/lib/models/documentation';
import { getUmlDiagramsByRepository } from '@/lib/models/uml_diagram';
import { getRepositoryById } from '@/lib/models/repository';
import { slugify } from '@/lib/utils/slug';
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
        const [documentations, umlDiagrams] = await Promise.all([
            getDocumentationsByRepository(repositoryId),
            getUmlDiagramsByRepository(repositoryId),
        ]);
        const collection = await getDocumentationCollection();
        const backfillOps = documentations
            .filter(doc => doc._id && doc.title && !doc.slug)
            .map(doc => {
            const derived = doc.title ? slugify(doc.title) : '';
            if (!derived)
                return null;
            return collection.updateOne({ _id: doc._id }, { $set: { slug: derived, updatedAt: new Date() } });
        })
            .filter(Boolean) as Promise<any>[];
        if (backfillOps.length > 0) {
            await Promise.all(backfillOps);
        }
        const serializedDocs = documentations
            .filter(doc => doc.organizationId && doc.repositoryId)
            .map(doc => ({
            _id: doc._id?.toString(),
            organizationId: doc.organizationId ? doc.organizationId.toString() : null,
            repositoryId: doc.repositoryId ? doc.repositoryId.toString() : null,
            scope: doc.scope,
            target: doc.target || null,
            prompt: doc.prompt || null,
            title: doc.title || null,
            description: doc.description || null,
            slug: doc.slug || (doc.title ? slugify(doc.title) : null),
            s3Key: doc.s3Key,
            s3Bucket: doc.s3Bucket,
            contentSize: doc.contentSize,
            version: doc.version,
            isLatest: doc.isLatest,
            branch: doc.branch,
            documentationType: doc.documentationType || null,
            createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
            createdBy: doc.createdBy ? doc.createdBy.toString() : null,
        }));
        const serializedUml = umlDiagrams.map(doc => ({
            _id: doc._id?.toString(),
            name: doc.name,
            slug: doc.slug,
            type: doc.type,
            description: doc.description ?? null,
            prompt: doc.prompt || null,
            createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
            updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
        }));
        return NextResponse.json({
            success: true,
            documentations: serializedDocs,
            umlDiagrams: serializedUml,
            count: serializedDocs.length,
        });
    }
    catch (error) {
        console.error('[Documentation API] Error fetching documentations:', error);
        return NextResponse.json({
            error: 'Failed to fetch documentations',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
