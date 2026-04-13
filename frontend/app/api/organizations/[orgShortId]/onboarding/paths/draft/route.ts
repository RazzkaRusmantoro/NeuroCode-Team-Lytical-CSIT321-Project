import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoriesByOrganization } from '@/lib/models/repository';
import { getSuggestedPathsByOrganization } from '@/lib/models/onboarding_path_suggestion';
import { upsertOnboardingPathDoc } from '@/lib/models/onboarding_path_doc';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { slugify } from '@/lib/utils/slug';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
type RouteContext = {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
};
function getRepoFullNameFromUrl(repoUrl: string | null | undefined): string | null {
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
export async function POST(request: NextRequest, context: RouteContext) {
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
        const body = await request.json().catch(() => ({}));
        const pathIds: string[] = Array.isArray(body.pathIds) ? body.pathIds : [];
        if (pathIds.length === 0) {
            return NextResponse.json({ error: 'pathIds required' }, { status: 400 });
        }
        const orgIdStr = organization._id!.toString();
        const { paths: suggestedPaths } = await getSuggestedPathsByOrganization(orgIdStr);
        const pathMap = new Map(suggestedPaths.map((p) => [p.id, p]));
        const repositories = await getRepositoriesByOrganization(orgIdStr);
        const repositoriesPayload = await Promise.all(repositories
            .filter((r) => r.source === 'github' && r.url && r.urlName)
            .map(async (r) => {
            const repoFullName = getRepoFullNameFromUrl(r.url ?? null);
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
        const completed: string[] = [];
        for (const pathId of pathIds) {
            const path = pathMap.get(pathId);
            if (!path)
                continue;
            const pathSlug = slugify(path.title) || pathId;
            await upsertOnboardingPathDoc(orgIdStr, {
                pathId,
                pathSlug,
                title: path.title,
                status: 'pending',
            });
            const pathPayload = {
                path_id: path.id,
                title: path.title,
                summary_description: path.summaryDescription ?? '',
                modules: (path.modules ?? []).map((m) => ({
                    id: m.id,
                    name: m.name,
                    summary_description: m.summaryDescription ?? '',
                    order: m.order ?? 0,
                })),
            };
            const pythonRes = await fetch(`${PYTHON_SERVICE_URL}/api/onboarding/generate-path-doc`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organization_name: organization.name,
                    organization_short_id: organization.shortId,
                    organization_id: orgIdStr,
                    repositories: repos,
                    branch: 'main',
                    path: pathPayload,
                }),
            });
            if (!pythonRes.ok) {
                const errText = await pythonRes.text();
                console.error('[draft] Python generate-path-doc error:', pythonRes.status, errText);
                continue;
            }
            const data = (await pythonRes.json()) as {
                success?: boolean;
                s3_key?: string;
                s3_bucket?: string;
                content_size?: number;
            };
            if (data.success && data.s3_key) {
                await upsertOnboardingPathDoc(orgIdStr, {
                    pathId,
                    pathSlug,
                    title: path.title,
                    status: 'completed',
                    s3Key: data.s3_key,
                    s3Bucket: data.s3_bucket,
                    contentSize: data.content_size,
                    generatedAt: new Date(),
                });
                completed.push(pathId);
            }
        }
        return NextResponse.json({
            success: true,
            pathIds: completed,
        });
    }
    catch (e) {
        console.error('[POST onboarding paths draft]', e);
        return NextResponse.json({ error: 'Failed to draft paths' }, { status: 500 });
    }
}
