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
        const branch = searchParams.get('branch') || 'main';
        const perPage = parseInt(searchParams.get('per_page') || '1', 10);
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
        const response = await fetch(`https://api.github.com/repos/${repoId}/commits?sha=${branch}&per_page=${perPage}`, {
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error: 'Failed to fetch commits', details: error }, { status: response.status });
        }
        const commits = await response.json();
        const formattedCommits = commits.map((commit: any) => ({
            sha: commit.sha,
            message: commit.commit.message,
            author: {
                name: commit.commit.author.name,
                email: commit.commit.author.email,
                date: commit.commit.author.date,
            },
            url: commit.html_url,
        }));
        return NextResponse.json({ commits: formattedCommits });
    }
    catch (error) {
        console.error('Error fetching commits:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
