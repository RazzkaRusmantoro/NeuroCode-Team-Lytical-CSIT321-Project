import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { ObjectId } from 'mongodb';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { createDocumentation, ensureUniqueDocumentationTitleAndSlug } from '@/lib/models/documentation';
import { slugify } from '@/lib/utils/slug';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME || '';
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const body = await request.json();
        const { repoFullName, orgShortId, repoUrlName, branch = 'main', scope = 'repository', target, prompt, documentationType, aiAgentDocKind, aiAgentExtraInstructions, } = body;
        if (!repoFullName || !orgShortId || !repoUrlName) {
            return NextResponse.json({ error: 'repoFullName, orgShortId, and repoUrlName are required' }, { status: 400 });
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
        const tokenResult = await getGitHubTokenWithFallback(session.user.id, organization._id!.toString(), repoUrlName, testGitHubTokenAccess);
        if (!tokenResult?.token) {
            return NextResponse.json({ error: 'No GitHub access available' }, { status: 401 });
        }
        const accessToken = tokenResult.token;
        let pythonEndpoint = '/api/generate-documentation';
        let requestBody: any = {
            github_token: accessToken,
            repo_full_name: repoFullName,
            branch: branch,
            scope: scope,
            organization_id: organization._id!.toString(),
            organization_short_id: organization.shortId,
            organization_name: organization.name,
            repository_id: repository._id!.toString(),
            repository_name: repository.name,
        };
        if (scope === 'custom' && prompt) {
            pythonEndpoint = '/api/generate-docs-rag';
            requestBody.prompt = prompt;
            if (documentationType) {
                requestBody.documentation_type = documentationType;
            }
            if (documentationType === 'aiAgent') {
                if (aiAgentDocKind)
                    requestBody.ai_agent_doc_kind = aiAgentDocKind;
                if (aiAgentExtraInstructions)
                    requestBody.ai_agent_extra_instructions = aiAgentExtraInstructions;
            }
        }
        else {
            if (target) {
                requestBody.target = target;
            }
        }
        const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}${pythonEndpoint}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });
        if (!pythonResponse.ok) {
            const errorText = await pythonResponse.text();
            console.error('[Python Service Error]', errorText);
            return NextResponse.json({
                error: 'Python service error',
                details: errorText
            }, { status: pythonResponse.status });
        }
        const result = await pythonResponse.json();
        if (result.success && result.s3) {
            try {
                const docScope = (scope === 'custom' && prompt) ? 'custom' : scope;
                const rawTitle = result.title || (prompt ? `${prompt.slice(0, 60)}${prompt.length > 60 ? '...' : ''}` : 'Documentation');
                const { title: uniqueTitle, slug: uniqueSlug } = await ensureUniqueDocumentationTitleAndSlug(repository._id!.toString(), organization._id!.toString(), rawTitle, result.title ? slugify(result.title) : undefined);
                const version = 1;
                const isLatest = true;
                const documentation = await createDocumentation(repository._id!.toString(), {
                    organizationId: organization._id!.toString(),
                    scope: docScope as 'file' | 'module' | 'repository' | 'custom',
                    target: target || undefined,
                    prompt: prompt || undefined,
                    title: uniqueTitle,
                    slug: uniqueSlug,
                    description: result.description || undefined,
                    s3Key: result.s3.s3_key,
                    s3Bucket: result.s3.s3_bucket,
                    contentSize: result.s3.content_size,
                    version: version,
                    isLatest: isLatest,
                    branch: branch,
                    code_reference_ids: result.code_reference_ids || undefined,
                    glossary_term_ids: result.glossary_term_ids || undefined,
                    documentationType: result.documentation_type ?? documentationType ?? undefined,
                    aiAgentDocKind: result.ai_agent_doc_kind ?? aiAgentDocKind ?? undefined,
                    createdBy: new ObjectId(session.user.id),
                    filePaths: result.file_paths ?? [],
                    needsSync: false,
                    isUpdating: false,
                });
                console.log(`[Documentation] Saved to MongoDB with ID: ${documentation._id}, title: ${uniqueTitle}, slug: ${uniqueSlug}`);
                return NextResponse.json({
                    success: true,
                    documentationId: documentation._id!.toString(),
                    title: uniqueTitle,
                    slug: uniqueSlug,
                    ...result,
                });
            }
            catch (dbError) {
                console.error('[Documentation] Failed to save to MongoDB:', dbError);
                return NextResponse.json({
                    success: true,
                    warning: 'Documentation uploaded to S3 but failed to save metadata to MongoDB',
                    ...result,
                });
            }
        }
        return NextResponse.json({
            success: true,
            ...result,
        });
    }
    catch (error) {
        console.error('[Documentation Generation Error]', error);
        return NextResponse.json({
            error: 'Failed to generate documentation',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
