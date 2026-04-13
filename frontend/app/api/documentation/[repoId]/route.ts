import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import { getOrganizationByShortId } from '@/lib/models/organization';
export async function POST(request: NextRequest, { params }: {
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
        const body = await request.json();
        const { scope = 'repository', target, branch = 'main', orgShortId, repoUrlName } = body;
        if (!orgShortId || !repoUrlName) {
            return Response.json({ error: 'orgShortId and repoUrlName are required' }, { status: 400 });
        }
        const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return Response.json({ error: 'Organization not found' }, { status: 404 });
        }
        const repository = await getRepositoryByUrlNameAndOrganization(repoUrlName, organization._id!.toString());
        if (!repository) {
            return Response.json({ error: 'Repository not found' }, { status: 404 });
        }
        const tokenResult = await getGitHubTokenWithFallback(session.user.id, organization._id!.toString(), repoUrlName, testGitHubTokenAccess);
        if (!tokenResult?.token) {
            return Response.json({ error: 'No GitHub access available' }, { status: 401 });
        }
        const accessToken = tokenResult.token;
        const files = await fetchRepositoryFiles(repoFullName, accessToken, branch);
        if (files.length === 0) {
            return Response.json({ error: 'No files found in repository' }, { status: 404 });
        }
        return Response.json({
            success: false,
            message: 'Code parsing functionality is currently disabled. Tree-sitter has been removed.',
            filesFetched: files.length,
        });
    }
    catch (error) {
        return Response.json({ error: 'Failed to parse repository', message: (error as Error).message }, { status: 500 });
    }
}
async function fetchRepositoryFiles(repoFullName: string, accessToken: string, branch: string, path: string = ''): Promise<Array<{
    path: string;
    content: string;
    language: string;
}>> {
    console.log(`[fetchRepositoryFiles] Starting fetch for ${repoFullName} (branch: ${branch}, path: ${path || 'root'})`);
    const files: Array<{
        path: string;
        content: string;
        language: string;
    }> = [];
    const maxFiles = 50;
    const supportedLanguages = ['typescript', 'javascript', 'python', 'java', 'go', 'rust', 'cpp', 'c'];
    async function fetchPath(currentPath: string): Promise<void> {
        if (files.length >= maxFiles)
            return;
        const apiUrl = currentPath
            ? `https://api.github.com/repos/${repoFullName}/contents/${currentPath}?ref=${branch}`
            : `https://api.github.com/repos/${repoFullName}/contents?ref=${branch}`;
        const response = await fetch(apiUrl, {
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!response.ok) {
            console.error(`Failed to fetch ${currentPath}:`, response.status);
            return;
        }
        const contents = await response.json();
        const items = Array.isArray(contents) ? contents : [contents];
        for (const item of items) {
            if (files.length >= maxFiles)
                break;
            if (item.type === 'file') {
                const language = item.language?.toLowerCase() || '';
                if (supportedLanguages.includes(language) || item.name.endsWith('.ts') || item.name.endsWith('.tsx') || item.name.endsWith('.js') || item.name.endsWith('.jsx')) {
                    if (item.download_url) {
                        try {
                            const fileResponse = await fetch(item.download_url);
                            if (fileResponse.ok) {
                                const content = await fileResponse.text();
                                files.push({
                                    path: item.path,
                                    content,
                                    language: item.language || 'typescript',
                                });
                                if (files.length % 10 === 0) {
                                    console.log(`[fetchRepositoryFiles] Fetched ${files.length} files so far...`);
                                }
                            }
                        }
                        catch (error) {
                            console.error(`[fetchRepositoryFiles] Failed to fetch content for ${item.path}:`, error);
                        }
                    }
                }
            }
            else if (item.type === 'dir') {
                if (!item.name.startsWith('.') && item.name !== 'node_modules' && item.name !== 'dist' && item.name !== 'build') {
                    await fetchPath(item.path);
                }
            }
        }
    }
    await fetchPath(path);
    console.log(`[fetchRepositoryFiles] ✓ Completed: ${files.length} files fetched`);
    return files;
}
