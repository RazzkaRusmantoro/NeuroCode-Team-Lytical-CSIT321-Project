import type { Organization } from './organization';
import { getCachedUserById } from './user';
export interface OrgMemberSummary {
    id: string;
    email: string;
    displayName: string;
}
export async function listOrganizationMemberSummaries(organization: Organization): Promise<OrgMemberSummary[]> {
    const memberIds = organization.members || [];
    const rows: OrgMemberSummary[] = [];
    for (const memberId of memberIds) {
        const memberUser = await getCachedUserById(memberId.toString());
        if (!memberUser)
            continue;
        const name = [memberUser.firstName, memberUser.lastName].filter(Boolean).join(' ').trim();
        rows.push({
            id: memberUser._id!.toString(),
            email: memberUser.email,
            displayName: name || memberUser.email || 'Unknown',
        });
    }
    rows.sort((a, b) => a.displayName.localeCompare(b.displayName, undefined, { sensitivity: 'base' }));
    return rows;
}
export function isUserIdInOrganizationMembers(organization: Organization, userId: string): boolean {
    const set = new Set((organization.members || []).map((m) => m.toString()));
    if (organization.ownerId && organization.ownerId.toString() === userId)
        return true;
    return set.has(userId);
}
