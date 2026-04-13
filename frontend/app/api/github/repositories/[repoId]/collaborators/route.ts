import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
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
        const resolvedParams = await Promise.resolve(params);
        const repoId = resolvedParams.repoId;
        const repoFullName = decodeURIComponent(repoId);
        const response = await fetch(`https://api.github.com/repos/${repoFullName}/collaborators`, {
            headers: {
                'Authorization': `token ${accessToken}`,
                'Accept': 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            return Response.json({ error: 'Failed to fetch collaborators' }, { status: response.status });
        }
        const collaborators = await response.json();
        const formattedCollaborators = collaborators.map((collab: any) => ({
            id: collab.id,
            login: collab.login,
            avatarUrl: collab.avatar_url,
            url: collab.html_url,
            permissions: collab.permissions,
        }));
        return Response.json({ collaborators: formattedCollaborators });
    }
    catch (error) {
        console.error('Error fetching collaborators:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
