import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
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
            return Response.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return Response.json({ error: 'User not found' }, { status: 404 });
        }
        const resolvedParams = await Promise.resolve(params);
        const repoFullName = decodeURIComponent(resolvedParams.repoId);
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
            return Response.json({ error: 'No GitHub access available' }, { status: 401 });
        }
        const path = searchParams.get('path') || '';
        const requestedRef = searchParams.get('ref');
        const githubHeaders = {
            'Authorization': `token ${accessToken}`,
            'Accept': 'application/vnd.github.v3+json',
        };
        let ref = requestedRef;
        if (!ref) {
            const repoMetaResponse = await fetch(`https://api.github.com/repos/${repoFullName}`, { headers: githubHeaders });
            if (repoMetaResponse.ok) {
                const repoMeta = await repoMetaResponse.json();
                ref = repoMeta.default_branch;
            }
            ref = ref || 'main';
        }
        const buildUrl = (r: string) => path
            ? `https://api.github.com/repos/${repoFullName}/contents/${path}?ref=${r}`
            : `https://api.github.com/repos/${repoFullName}/contents?ref=${r}`;
        let response = await fetch(buildUrl(ref), { headers: githubHeaders });
        if (!response.ok && response.status === 404) {
            const fallbacks = ['main', 'master'].filter(b => b !== ref);
            for (const fallback of fallbacks) {
                response = await fetch(buildUrl(fallback), { headers: githubHeaders });
                if (response.ok) {
                    ref = fallback;
                    break;
                }
            }
        }
        if (!response.ok) {
            return Response.json({ error: 'Failed to fetch repository contents' }, { status: response.status });
        }
        const contents = await response.json();
        const formattedContents = Array.isArray(contents)
            ? contents.map((item: any) => ({
                name: item.name,
                path: item.path,
                type: item.type,
                size: item.size || 0,
                sha: item.sha,
                url: item.html_url,
                downloadUrl: item.download_url,
                gitUrl: item.git_url,
            }))
            : [{
                    name: contents.name,
                    path: contents.path,
                    type: contents.type,
                    size: contents.size || 0,
                    sha: contents.sha,
                    url: contents.html_url,
                    downloadUrl: contents.download_url,
                    gitUrl: contents.git_url,
                    content: contents.content,
                    encoding: contents.encoding,
                    language: contents.language || null,
                }];
        return Response.json({ contents: formattedContents });
    }
    catch (error) {
        console.error('Error fetching repository contents:', error);
        return Response.json({ error: 'Internal server error' }, { status: 500 });
    }
}
