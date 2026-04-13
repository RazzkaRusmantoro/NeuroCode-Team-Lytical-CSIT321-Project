import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoriesByOrganization } from '@/lib/models/repository';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
type RiskLevel = 'low' | 'medium' | 'high';
type HotZoneAreaType = 'file' | 'module';
interface HotZoneArea {
    areaType: HotZoneAreaType;
    areaName: string;
    filePath?: string;
    modulePath?: string;
    repositoryId: string;
    repoUrlName: string;
    repositoryName: string;
    repoFullName: string | null;
    riskLevel: RiskLevel;
    whySensitive: string;
    recentActivityCount: number;
    lastMajorChange: string | null;
    frequentContributors: {
        name: string;
        commits: number;
    }[];
    additions?: number;
    deletions?: number;
}
function inferRiskLevel(recentActivityCount: number, additions: number, deletions: number): RiskLevel {
    let score = 0;
    if (recentActivityCount >= 25)
        score += 2;
    else if (recentActivityCount >= 10)
        score += 1;
    const churn = Math.abs(additions) + Math.abs(deletions);
    if (churn >= 2000)
        score += 1;
    else if (churn >= 800)
        score += 0.5;
    if (score >= 3)
        return 'high';
    if (score >= 1.5)
        return 'medium';
    return 'low';
}
function buildWhySensitive(riskLevel: RiskLevel, recentActivityCount: number, contributors: {
    name: string;
    commits: number;
}[], areaType: HotZoneAreaType, areaName: string): string {
    const topContributors = contributors
        .slice(0, 3)
        .map(c => c.name)
        .join(', ');
    const activityDescriptor = recentActivityCount >= 40
        ? 'very frequently changed'
        : recentActivityCount >= 15
            ? 'frequently updated'
            : recentActivityCount > 0
                ? 'actively maintained'
                : 'infrequently touched';
    const riskDescriptor = riskLevel === 'high'
        ? 'central to key flows and fragile if changed incorrectly'
        : riskLevel === 'medium'
            ? 'important to main workflows and should be modified carefully'
            : 'relevant to the product but lower risk for most changes';
    const ownersSuffix = topContributors
        ? ` Most changes come from ${topContributors}.`
        : '';
    const label = areaType === 'file' ? 'file' : 'module';
    return `This ${label} (${areaName}) is ${activityDescriptor} and ${riskDescriptor}.${ownersSuffix}`;
}
export async function GET(request: NextRequest, { params }: {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
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
        const rawOrgShortId = resolvedParams.orgShortId;
        const shortId = rawOrgShortId.startsWith('org-')
            ? rawOrgShortId.replace('org-', '')
            : rawOrgShortId;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const userOrg = user.organizations?.find(org => org.organizationId.toString() === organization._id!.toString());
        if (!userOrg) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        const repositories = await getRepositoriesByOrganization(organization._id!.toString());
        const { searchParams } = new URL(request.url);
        const repoUrlNamesParam = searchParams.get('repoUrlNames');
        const repoUrlNames = repoUrlNamesParam
            ? repoUrlNamesParam
                .split(',')
                .map(s => s.trim())
                .filter(Boolean)
            : [];
        const taskQuery = (searchParams.get('task') || '').trim().toLowerCase();
        const reposToProcess = repoUrlNames.length > 0
            ? repositories.filter(r => r.urlName && repoUrlNames.includes(r.urlName))
            : repositories;
        const hotZones: HotZoneArea[] = [];
        for (const repo of reposToProcess) {
            const repositoryId = repo._id!.toString();
            const repoUrlName = repo.urlName || '';
            const repositoryName = repo.name;
            if (!repoUrlName)
                continue;
            if (repo.source !== 'github' || !repo.url)
                continue;
            let repoFullName: string | null = null;
            try {
                const url = new URL(repo.url);
                const parts = url.pathname.split('/').filter(Boolean);
                if (parts.length >= 2) {
                    repoFullName = `${parts[0]}/${parts[1]}`;
                }
            }
            catch {
                repoFullName = null;
            }
            if (!repoFullName)
                continue;
            const tokenResult = await getGitHubTokenWithFallback(session.user.id, organization._id!.toString(), repoUrlName, testGitHubTokenAccess);
            const accessToken = tokenResult?.token && tokenResult.token.length > 0
                ? tokenResult.token
                : user.github?.accessToken && user.github.status === 'active'
                    ? user.github.accessToken
                    : null;
            if (!accessToken)
                continue;
            const since = new Date();
            since.setDate(since.getDate() - 30);
            const commitsListRes = await fetch(`https://api.github.com/repos/${repoFullName}/commits?per_page=20&since=${since.toISOString()}`, {
                headers: {
                    Authorization: `token ${accessToken}`,
                    Accept: 'application/vnd.github.v3+json',
                },
            });
            if (!commitsListRes.ok)
                continue;
            const commits = (await commitsListRes.json()) as any[];
            if (!Array.isArray(commits) || commits.length === 0)
                continue;
            type FileAgg = {
                recentActivityCount: number;
                lastMajorChange: string | null;
                additions: number;
                deletions: number;
                contributors: Map<string, number>;
            };
            const byFile = new Map<string, FileAgg>();
            for (const c of commits) {
                const sha = c?.sha;
                if (!sha)
                    continue;
                const authorName = c?.commit?.author?.name || c?.author?.login || 'Unknown';
                const commitDate: string | null = c?.commit?.author?.date ?? null;
                const commitRes = await fetch(`https://api.github.com/repos/${repoFullName}/commits/${sha}`, {
                    headers: {
                        Authorization: `token ${accessToken}`,
                        Accept: 'application/vnd.github.v3+json',
                    },
                });
                if (!commitRes.ok)
                    continue;
                const commitData = await commitRes.json();
                const files = Array.isArray(commitData?.files) ? commitData.files : [];
                for (const f of files) {
                    const filename: string | undefined = f?.filename;
                    if (!filename)
                        continue;
                    const additions = Number.isFinite(f?.additions) ? Number(f.additions) : 0;
                    const deletions = Number.isFinite(f?.deletions) ? Number(f.deletions) : 0;
                    const prev = byFile.get(filename);
                    const agg: FileAgg = prev ?? {
                        recentActivityCount: 0,
                        lastMajorChange: null,
                        additions: 0,
                        deletions: 0,
                        contributors: new Map<string, number>(),
                    };
                    agg.recentActivityCount += 1;
                    agg.additions += additions;
                    agg.deletions += deletions;
                    agg.contributors.set(authorName, (agg.contributors.get(authorName) ?? 0) + 1);
                    if (commitDate) {
                        if (!agg.lastMajorChange) {
                            agg.lastMajorChange = commitDate;
                        }
                        else {
                            const prevTs = new Date(agg.lastMajorChange).getTime();
                            const nextTs = new Date(commitDate).getTime();
                            if (!Number.isNaN(nextTs) && (Number.isNaN(prevTs) || nextTs > prevTs)) {
                                agg.lastMajorChange = commitDate;
                            }
                        }
                    }
                    byFile.set(filename, agg);
                }
            }
            const zones = Array.from(byFile.entries())
                .map(([filePath, agg]) => {
                const contributors = Array.from(agg.contributors.entries())
                    .map(([name, commits]) => ({ name, commits }))
                    .sort((a, b) => b.commits - a.commits);
                const riskLevel = inferRiskLevel(agg.recentActivityCount, agg.additions, agg.deletions);
                const whySensitive = buildWhySensitive(riskLevel, agg.recentActivityCount, contributors, 'file', filePath);
                return {
                    areaType: 'file' as const,
                    areaName: filePath,
                    filePath,
                    repositoryId,
                    repoUrlName,
                    repositoryName,
                    repoFullName,
                    riskLevel,
                    whySensitive,
                    recentActivityCount: agg.recentActivityCount,
                    lastMajorChange: agg.lastMajorChange,
                    frequentContributors: contributors.slice(0, 3),
                    additions: agg.additions,
                    deletions: agg.deletions,
                };
            })
                .sort((a, b) => {
                const order: Record<RiskLevel, number> = { high: 0, medium: 1, low: 2 };
                const rd = order[a.riskLevel] - order[b.riskLevel];
                if (rd !== 0)
                    return rd;
                return (b.recentActivityCount ?? 0) - (a.recentActivityCount ?? 0);
            })
                .slice(0, 25);
            const maybeTaskFiltered = taskQuery.length > 0
                ? zones.filter(z => {
                    const file = (z.filePath || '').toLowerCase();
                    const why = (z.whySensitive || '').toLowerCase();
                    return file.includes(taskQuery) || why.includes(taskQuery);
                })
                : zones;
            hotZones.push(...maybeTaskFiltered);
        }
        return NextResponse.json({
            success: true,
            hotZones,
        });
    }
    catch (error) {
        console.error('[Hot Zones API] Error generating hot zones:', error);
        return NextResponse.json({
            error: 'Failed to generate hot zones',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
