import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { getOrganizationByShortId } from '@/lib/models/organization';
export async function GET(request: NextRequest, { params }: {
    params: Promise<{
        repoId: string;
    }> | {
        repoId: string;
    };
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const resolvedParams = await Promise.resolve(params);
        const repoId = resolvedParams.repoId;
        const { searchParams } = new URL(request.url);
        const state = searchParams.get('state') || 'open';
        const perPage = parseInt(searchParams.get('per_page') || '30', 10);
        const orgShortId = searchParams.get('orgShortId');
        const repoUrlName = searchParams.get('repoUrlName');
        let accessToken: string | null = null;
        if (orgShortId && repoUrlName) {
            const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
            const organization = await getOrganizationByShortId(shortId);
            if (organization) {
                const tokenResult = await getGitHubTokenWithFallback(session.user.id, organization._id!.toString(), repoUrlName, testGitHubTokenAccess);
                if (tokenResult) {
                    accessToken = tokenResult.token;
                }
            }
        }
        if (!accessToken && user.github?.accessToken && user.github.status === 'active') {
            accessToken = user.github.accessToken;
        }
        if (!accessToken) {
            return NextResponse.json({ error: 'No GitHub access available' }, { status: 401 });
        }
        const response = await fetch(`https://api.github.com/repos/${repoId}/pulls?state=${state}&per_page=${perPage}&sort=updated&direction=desc`, {
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error: 'Failed to fetch pull requests', details: error }, { status: response.status });
        }
        const pullRequests = await response.json();
        const formattedPullRequests = pullRequests.map((pr: any) => ({
            id: pr.id,
            number: pr.number,
            title: pr.title,
            description: pr.body || '',
            state: pr.state,
            merged: pr.merged || false,
            author: pr.user?.login || 'Unknown',
            authorAvatar: pr.user?.avatar_url || '',
            createdAt: pr.created_at,
            updatedAt: pr.updated_at,
            closedAt: pr.closed_at,
            mergedAt: pr.merged_at,
            url: pr.html_url,
            commentsCount: pr.comments || 0,
            reviewCommentsCount: pr.review_comments || 0,
            commitsCount: pr.commits || 0,
            additions: pr.additions || 0,
            deletions: pr.deletions || 0,
            changedFiles: pr.changed_files || 0,
            baseBranch: pr.base?.ref || '',
            headBranch: pr.head?.ref || '',
            headCommitSha: pr.head?.sha || '',
            baseCommitSha: pr.base?.sha || '',
            headRepo: pr.head?.repo?.full_name || '',
            baseRepo: pr.base?.repo?.full_name || '',
        }));
        return NextResponse.json({ pullRequests: formattedPullRequests });
    }
    catch (error) {
        console.error('Error fetching pull requests:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
