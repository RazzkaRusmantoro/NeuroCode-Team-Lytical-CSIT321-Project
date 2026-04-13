import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        if (!user.github || user.github.status !== 'active') {
            return Response.json({ error: 'GitHub not connected' }, { status: 400 });
        }
        const accessToken = user.github.accessToken;
        const response = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated', {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            return Response.json({ error: 'Failed to fetch repositories' }, { status: response.status });
        }
        const repos = await response.json();
        const formattedRepos = repos.map((repo: any) => ({
            id: repo.id,
            name: repo.name,
            fullName: repo.full_name,
            description: repo.description,
            private: repo.private,
            url: repo.html_url,
            language: repo.language,
            stars: repo.stargazers_count,
            forks: repo.forks_count,
            updatedAt: repo.updated_at,
            createdAt: repo.created_at,
            defaultBranch: repo.default_branch,
            size: repo.size,
            openIssues: repo.open_issues_count,
            watchers: repo.watchers_count,
            topics: repo.topics || [],
            license: repo.license?.name || null,
            archived: repo.archived || false,
            disabled: repo.disabled || false,
            fork: repo.fork || false,
            homepage: repo.homepage || null,
            owner: {
                login: repo.owner?.login || '',
                avatarUrl: repo.owner?.avatar_url || '',
                url: repo.owner?.html_url || '',
            },
        }));
        return Response.json({ repositories: formattedRepos });
    }
    catch (error) {
        console.error('Error fetching GitHub repositories:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
