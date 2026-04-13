import { unstable_cache } from 'next/cache';
import { getRepositoriesByOrganization } from '@/lib/models/repository';
import { generateSlug } from '@/lib/utils/slug';
export type RepositoryOption = {
    id: string;
    name: string;
    urlName: string;
    hasUrlName: boolean;
};
export async function getCachedRepositoryOptionsByOrganizationId(organizationId: string): Promise<RepositoryOption[]> {
    const cached = unstable_cache(async () => {
        const repositories = await getRepositoriesByOrganization(organizationId);
        return repositories
            .filter(r => r._id)
            .map(r => ({
            id: r._id!.toString(),
            name: r.name,
            urlName: r.urlName || generateSlug(r.name),
            hasUrlName: Boolean(r.urlName),
        }))
            .sort((a, b) => a.name.localeCompare(b.name));
    }, ['org-repository-options', organizationId], {
        revalidate: 300,
        tags: [`org-repository-options:${organizationId}`],
    });
    return cached();
}
