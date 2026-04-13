import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationById } from '@/lib/models/organization';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
export async function getGitHubTokenWithFallback(requestingUserId: string, organizationId: string, repoUrlName: string, testToken?: (token: string, repoFullName: string) => Promise<boolean>): Promise<{
    token: string;
    source: 'user' | 'addedBy' | 'owner';
} | null> {
    const requestingUser = await getCachedUserById(requestingUserId);
    if (!requestingUser) {
        return null;
    }
    const repository = await getRepositoryByUrlNameAndOrganization(repoUrlName, organizationId);
    if (!repository) {
        return null;
    }
    const organization = await getOrganizationById(organizationId);
    if (!organization) {
        return null;
    }
    let repoFullName = '';
    if (repository.url && repository.source === 'github') {
        try {
            const url = new URL(repository.url);
            const pathParts = url.pathname.split('/').filter(part => part);
            if (pathParts.length >= 2) {
                repoFullName = `${pathParts[0]}/${pathParts[1]}`;
            }
        }
        catch (error) {
            console.error('Error parsing repository URL:', error);
        }
    }
    if (requestingUser.github?.accessToken && requestingUser.github.status === 'active') {
        if (!testToken) {
            return { token: requestingUser.github.accessToken, source: 'user' };
        }
        const userTokenWorks = await testToken(requestingUser.github.accessToken, repoFullName);
        if (userTokenWorks) {
            return { token: requestingUser.github.accessToken, source: 'user' };
        }
    }
    if (repository.addedBy) {
        const addedByUser = await getCachedUserById(repository.addedBy.toString());
        if (addedByUser?.github?.accessToken && addedByUser.github.status === 'active') {
            if (!testToken) {
                return { token: addedByUser.github.accessToken, source: 'addedBy' };
            }
            const addedByTokenWorks = await testToken(addedByUser.github.accessToken, repoFullName);
            if (addedByTokenWorks) {
                return { token: addedByUser.github.accessToken, source: 'addedBy' };
            }
        }
    }
    const owner = await getCachedUserById(organization.ownerId.toString());
    if (owner?.github?.accessToken && owner.github.status === 'active') {
        return { token: owner.github.accessToken, source: 'owner' };
    }
    return null;
}
export async function testGitHubTokenAccess(token: string, repoFullName: string): Promise<boolean> {
    try {
        const response = await fetch(`https://api.github.com/repos/${repoFullName}`, {
            headers: {
                Authorization: `token ${token}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        return response.ok;
    }
    catch (error) {
        return false;
    }
}
