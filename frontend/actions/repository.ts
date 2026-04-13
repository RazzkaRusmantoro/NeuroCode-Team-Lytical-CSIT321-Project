'use server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { createRepository, getRepositoryByGithubIdAndOrganization, getRepositoriesByOrganization } from '@/lib/models/repository';
import { addRepositoryToOrganization, getOrganizationById } from '@/lib/models/organization';
import { getGitHubTokenWithFallback } from '@/lib/utils/github-token';
interface AddRepositoryData {
    githubId?: number;
    name: string;
    urlName?: string;
    url: string;
    source: 'github' | 'bitbucket' | 'upload';
    description?: string;
    size?: number;
    lastUpdate?: Date | string;
}
export async function addRepository(organizationId: string, repositoryData: AddRepositoryData): Promise<{
    success: boolean;
    error?: string;
    repositoryId?: string;
}> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated' };
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        const organization = await getOrganizationById(organizationId);
        if (!organization) {
            return { success: false, error: 'Organization not found' };
        }
        const userOrg = user.organizations?.find(org => org.organizationId.toString() === organizationId);
        if (!userOrg) {
            return { success: false, error: 'Unauthorized: Not a member of this organization' };
        }
        if (repositoryData.githubId) {
            const existingRepo = await getRepositoryByGithubIdAndOrganization(repositoryData.githubId, organizationId);
            if (existingRepo) {
                return { success: false, error: 'Repository already exists in this organization' };
            }
        }
        const repository = await createRepository(organizationId, {
            ...repositoryData,
            addedBy: session.user.id,
        });
        const success = await addRepositoryToOrganization(organizationId, repository._id!, repositoryData.githubId, repositoryData.name);
        if (!success) {
            return { success: false, error: 'Failed to add repository to organization' };
        }
        if (repositoryData.source === 'github' && repository.urlName) {
            try {
                const repoFullName = (() => {
                    try {
                        const url = new URL(repositoryData.url);
                        const pathParts = url.pathname.split('/').filter(Boolean);
                        return pathParts.length >= 2 ? `${pathParts[0]}/${pathParts[1]}` : '';
                    }
                    catch {
                        return '';
                    }
                })();
                if (!repoFullName) {
                    console.warn('[queue-index] Skipping enqueue: could not parse repo_full_name from url', repositoryData.url);
                }
                else {
                    const tokenResult = await getGitHubTokenWithFallback(session.user.id, organizationId, repository.urlName);
                    if (!tokenResult) {
                        console.warn('[queue-index] Skipping enqueue: no GitHub token for repo', repoFullName, 'repositoryId=', repository._id?.toString());
                    }
                    else {
                        const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
                        console.log('[queue-index] Enqueueing index job for', repoFullName, 'repositoryId=', repository._id?.toString());
                        const res = await fetch(`${pythonUrl}/internal/queue-index`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                ...(process.env.INTERNAL_API_KEY && { 'X-Internal-Key': process.env.INTERNAL_API_KEY }),
                            },
                            body: JSON.stringify({
                                github_token: tokenResult.token,
                                repo_full_name: repoFullName,
                                branch: 'main',
                                organization_id: organizationId,
                                organization_short_id: organization.shortId,
                                organization_name: organization.name,
                                repository_id: repository._id!.toString(),
                                repository_name: repository.name,
                            }),
                        });
                        if (res.ok) {
                            const data = await res.json().catch(() => ({}));
                            console.log('[queue-index] Enqueued successfully job_id=', (data as {
                                job_id?: string;
                            }).job_id);
                        }
                        else {
                            console.error('[queue-index] Enqueue failed', res.status, await res.text());
                        }
                    }
                }
            }
            catch (e) {
                console.error('[queue-index] Failed to enqueue index job:', e);
            }
        }
        return { success: true, repositoryId: repository._id!.toString() };
    }
    catch (error: any) {
        console.error('Error adding repository:', error);
        return { success: false, error: error.message || 'Failed to add repository' };
    }
}
export async function getOrganizationRepositories(organizationId: string): Promise<{
    success: boolean;
    repositories?: any[];
    error?: string;
}> {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return { success: false, error: 'Not authenticated' };
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return { success: false, error: 'User not found' };
        }
        const organization = await getOrganizationById(organizationId);
        if (!organization) {
            return { success: false, error: 'Organization not found' };
        }
        const userOrg = user.organizations?.find(org => org.organizationId.toString() === organizationId);
        if (!userOrg) {
            return { success: false, error: 'Unauthorized: Not a member of this organization' };
        }
        const repositories = await getRepositoriesByOrganization(organizationId);
        return {
            success: true,
            repositories: repositories.map(repo => ({
                id: repo._id?.toString(),
                name: repo.name,
                url: repo.url,
                source: repo.source,
                githubId: repo.githubId,
                description: repo.description,
                size: repo.size,
                lastUpdate: repo.lastUpdate,
                addedAt: repo.addedAt,
            }))
        };
    }
    catch (error: any) {
        console.error('Error fetching repositories:', error);
        return { success: false, error: error.message || 'Failed to fetch repositories' };
    }
}
