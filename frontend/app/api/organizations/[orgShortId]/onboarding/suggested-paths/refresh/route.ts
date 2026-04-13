import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoriesByOrganization } from '@/lib/models/repository';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { upsertSuggestedPathsForOrganization } from '@/lib/models/onboarding_path_suggestion';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
type RouteContext = {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
};
function getRepoFullNameFromUrl(repoUrl: string): string | null {
    if (!repoUrl)
        return null;
    try {
        const url = new URL(repoUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
            return `${pathParts[0]}/${pathParts[1].replace(/\.git$/, '')}`;
        }
    }
    catch {
    }
    return null;
}
export async function POST(_request: Request, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const { orgShortId } = await Promise.resolve(context.params);
        const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const isMember = user.organizations?.some((org) => org.organizationId.toString() === organization._id!.toString());
        if (!isMember) {
            return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
        }
        const repositories = await getRepositoriesByOrganization(organization._id!.toString());
        const orgIdStr = organization._id!.toString();
        const repositoriesPayload = await Promise.all(repositories
            .filter((r) => r.source === 'github' && r.url && r.urlName)
            .map(async (r) => {
            const repoFullName = getRepoFullNameFromUrl(r.url!);
            const tokenResult = await getGitHubTokenWithFallback(session.user.id, orgIdStr, r.urlName!, testGitHubTokenAccess);
            if (!repoFullName || !tokenResult?.token)
                return null;
            return {
                repo_full_name: repoFullName,
                repository_name: r.name,
                repository_id: r._id?.toString(),
                github_token: tokenResult.token,
            };
        }));
        const repos = repositoriesPayload.filter((r): r is NonNullable<typeof r> => r != null);
        if (repos.length === 0) {
            await upsertSuggestedPathsForOrganization(orgIdStr, []);
            return NextResponse.json({
                success: true,
                paths: [],
                generatedAt: new Date().toISOString(),
            });
        }
        const pythonRes = await fetch(`${PYTHON_SERVICE_URL}/api/onboarding/suggested-paths`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                organization_name: organization.name,
                organization_short_id: organization.shortId,
                organization_id: orgIdStr,
                repositories: repos,
                branch: 'main',
            }),
        });
        if (!pythonRes.ok) {
            const errText = await pythonRes.text();
            console.error('[suggested-paths/refresh] Python error:', pythonRes.status, errText);
            return NextResponse.json({ error: 'Failed to generate suggestions from Python service' }, { status: pythonRes.status >= 500 ? 502 : 400 });
        }
        const data = (await pythonRes.json()) as {
            success?: boolean;
            paths?: Array<{
                id: string;
                title: string;
                summaryDescription: string;
                modules: Array<{
                    id: string;
                    name: string;
                    summaryDescription: string;
                    order: number;
                }>;
            }>;
        };
        const paths = Array.isArray(data.paths) ? data.paths : [];
        const { paths: savedPaths, generatedAt } = await upsertSuggestedPathsForOrganization(orgIdStr, paths);
        return NextResponse.json({
            success: true,
            paths: savedPaths,
            generatedAt: generatedAt.toISOString(),
        });
    }
    catch (e) {
        console.error('[POST suggested-paths/refresh]', e);
        const message = e instanceof Error ? e.message : 'Failed to generate suggestions';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
