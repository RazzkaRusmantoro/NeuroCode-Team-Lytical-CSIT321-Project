import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getRepositoryById } from '@/lib/models/repository';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const INTERNAL_KEY = process.env.INTERNAL_API_KEY || '';
type Params = Promise<{
    repoId: string;
}>;
export async function POST(req: NextRequest, { params }: {
    params: Params;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { repoId } = await params;
    const body = await req.json().catch(() => ({}));
    const { repoFullName, branch = 'main' } = body as {
        repoFullName?: string;
        branch?: string;
    };
    if (!repoFullName) {
        return NextResponse.json({ error: 'repoFullName is required' }, { status: 400 });
    }
    const repository = await getRepositoryById(repoId);
    if (!repository) {
        return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
    }
    const user = await getCachedUserById(session.user.id);
    if (!user) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    const tokenResult = await getGitHubTokenWithFallback(session.user.id, repository.organizationId?.toString() ?? '', repository.urlName ?? '', testGitHubTokenAccess);
    if (!tokenResult?.token) {
        return NextResponse.json({ error: 'No GitHub access available' }, { status: 401 });
    }
    try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (INTERNAL_KEY)
            headers['X-Internal-Key'] = INTERNAL_KEY;
        const upstream = await fetch(`${PYTHON_URL}/internal/queue-kg-build`, {
            method: 'POST',
            headers,
            body: JSON.stringify({
                github_token: tokenResult.token,
                repo_full_name: repoFullName,
                repo_id: repoId,
                branch,
            }),
        });
        if (!upstream.ok) {
            const err = await upstream.json().catch(() => ({}));
            return NextResponse.json({ error: err?.detail || 'Failed to queue KG build' }, { status: upstream.status });
        }
        return NextResponse.json(await upstream.json());
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
