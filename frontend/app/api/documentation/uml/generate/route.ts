import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import { getOrganizationByShortId } from '@/lib/models/organization';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
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
        const { repoFullName, orgShortId, repoUrlName, branch = 'main', prompt, diagramType = 'class', } = body;
        if (!repoFullName || !orgShortId || !repoUrlName || !prompt?.trim()) {
            return NextResponse.json({ error: 'repoFullName, orgShortId, repoUrlName, and prompt are required' }, { status: 400 });
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
        const pythonResponse = await fetch(`${PYTHON_SERVICE_URL}/api/generate-uml`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                github_token: tokenResult.token,
                repo_full_name: repoFullName,
                branch,
                prompt: prompt.trim(),
                diagram_type: diagramType,
                organization_id: organization._id!.toString(),
                organization_short_id: organization.shortId,
                organization_name: organization.name,
                repository_id: repository._id!.toString(),
                repository_name: repository.name,
                top_k: 20,
            }),
        });
        if (!pythonResponse.ok) {
            const errorText = await pythonResponse.text();
            console.error('[Python UML Error]', errorText);
            return NextResponse.json({ error: 'Python service error', details: errorText }, { status: pythonResponse.status });
        }
        const result = await pythonResponse.json();
        return NextResponse.json(result);
    }
    catch (error) {
        console.error('[UML Generate Error]', error);
        return NextResponse.json({
            error: 'Failed to generate UML diagram',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
