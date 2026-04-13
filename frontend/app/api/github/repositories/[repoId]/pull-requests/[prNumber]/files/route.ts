import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { getOrganizationByShortId } from '@/lib/models/organization';
export async function GET(request: NextRequest, { params }: {
    params: Promise<{
        repoId: string;
        prNumber: string;
    }> | {
        repoId: string;
        prNumber: string;
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
        const prNumber = resolvedParams.prNumber;
        const { searchParams } = new URL(request.url);
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
        const response = await fetch(`https://api.github.com/repos/${repoId}/pulls/${prNumber}/files`, {
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            const error = await response.text();
            return NextResponse.json({ error: 'Failed to fetch PR files', details: error }, { status: response.status });
        }
        const files = await response.json();
        const formattedFiles = files.map((file: any) => ({
            filename: file.filename,
            status: file.status,
            additions: file.additions,
            deletions: file.deletions,
            changes: file.changes,
            blobUrl: file.blob_url,
            rawUrl: file.contents_url,
            patch: file.patch || '',
            previousFilename: file.previous_filename || null,
        }));
        return NextResponse.json({ files: formattedFiles });
    }
    catch (error) {
        console.error('Error fetching PR files:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
