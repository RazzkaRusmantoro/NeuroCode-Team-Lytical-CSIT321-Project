import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getDocumentationCollection } from '@/lib/models/documentation';
import { getCodeReferencesByIds } from '@/lib/models/code_reference';
import { slugify } from '@/lib/utils/slug';
export async function GET(request: NextRequest, { params }: {
    params: Promise<{
        title: string;
    }> | {
        title: string;
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
        const identifier = decodeURIComponent(resolvedParams.title);
        const collection = await getDocumentationCollection();
        let documentation = await collection.findOne({ slug: identifier });
        if (!documentation) {
            documentation = await collection.findOne({ title: identifier });
            if (documentation?.title && !documentation.slug) {
                const derived = slugify(documentation.title);
                if (derived) {
                    await collection.updateOne({ _id: documentation._id }, { $set: { slug: derived, updatedAt: new Date() } });
                    documentation = { ...documentation, slug: derived };
                }
            }
        }
        if (!documentation) {
            const orgIds = (user.organizations || []).map((org: any) => org.organizationId).filter(Boolean);
            if (orgIds.length > 0) {
                const cursor = collection
                    .find({ organizationId: { $in: orgIds }, title: { $exists: true } }, { projection: { _id: 1, title: 1, slug: 1 } })
                    .limit(2000);
                for await (const doc of cursor) {
                    if (!doc?.title)
                        continue;
                    if (slugify(doc.title) === identifier) {
                        documentation = await collection.findOne({ _id: doc._id });
                        if (documentation?.title && !documentation.slug) {
                            await collection.updateOne({ _id: documentation._id }, { $set: { slug: identifier, updatedAt: new Date() } });
                            documentation = { ...documentation, slug: identifier };
                        }
                        break;
                    }
                }
            }
        }
        if (!documentation) {
            return NextResponse.json({ error: 'Documentation not found' }, { status: 404 });
        }
        const userOrg = user.organizations?.find(org => org.organizationId.toString() === documentation.organizationId.toString());
        if (!userOrg) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        const pythonBackendUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
        try {
            const response = await fetch(`${pythonBackendUrl}/api/get-documentation`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    s3_key: documentation.s3Key,
                    s3_bucket: documentation.s3Bucket,
                }),
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch from S3: ${response.statusText}`);
            }
            const s3Data = await response.json();
            if (!s3Data.success) {
                return NextResponse.json({ error: s3Data.error || s3Data.detail || 'Failed to fetch documentation content' }, { status: response.status });
            }
            const content = JSON.parse(s3Data.content);
            let codeReferencesDetails: any[] = [];
            if (content.code_references && content.code_references.length > 0) {
                try {
                    codeReferencesDetails = await getCodeReferencesByIds(documentation.repositoryId.toString(), content.code_references, documentation.organizationId.toString());
                    codeReferencesDetails = codeReferencesDetails.map(ref => ({
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
                        code: ref.code,
                    }));
                }
                catch (codeRefError) {
                    console.error('[Documentation API] Error fetching code references:', codeRefError);
                }
            }
            return NextResponse.json({
                success: true,
                documentation: {
                    _id: documentation._id?.toString(),
                    title: documentation.title,
                    metadata: content.metadata || {},
                    documentation: content.documentation || {},
                    code_references: codeReferencesDetails.length > 0 ? codeReferencesDetails : content.code_references || [],
                },
            });
        }
        catch (s3Error) {
            console.error('[Documentation API] Error fetching from S3:', s3Error);
            return NextResponse.json({
                error: 'Failed to fetch documentation content from S3',
                message: s3Error instanceof Error ? s3Error.message : 'Unknown error',
            }, { status: 500 });
        }
    }
    catch (error) {
        console.error('[Documentation API] Error fetching documentation content:', error);
        return NextResponse.json({
            error: 'Failed to fetch documentation content',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
