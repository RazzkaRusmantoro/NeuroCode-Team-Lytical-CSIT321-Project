import { getCachedUserById } from '@/lib/models/user';
import { redirect } from 'next/navigation';
import { getCachedSession } from '@/lib/session';
import { getOrganizationByShortId } from '@/lib/models/organization';
import ManagementClient, { type MemberRow } from './ManagementClient';
const ROLE_ORDER: Record<'owner' | 'admin' | 'member', number> = {
    owner: 0,
    admin: 1,
    member: 2,
};
function formatDateJoined(date: Date): string {
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}
type PageProps = {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
};
export default async function ManagementPage({ params }: PageProps) {
    const session = await getCachedSession();
    if (!session?.user?.id) {
        redirect('/login');
    }
    const user = await getCachedUserById(session.user.id);
    if (!user) {
        redirect('/login');
    }
    const resolvedParams = await Promise.resolve(params);
    const shortId = resolvedParams.orgShortId.startsWith('org-')
        ? resolvedParams.orgShortId.replace('org-', '')
        : resolvedParams.orgShortId;
    const organization = await getOrganizationByShortId(shortId);
    if (!organization) {
        redirect('/organizations');
    }
    const userOrg = user.organizations?.find((org) => org.organizationId.toString() === organization._id!.toString());
    if (!userOrg) {
        redirect('/organizations');
    }
    const orgIdStr = organization._id!.toString();
    const members: MemberRow[] = [];
    for (const memberId of organization.members || []) {
        const memberUser = await getCachedUserById(memberId.toString());
        if (!memberUser)
            continue;
        const orgEntry = memberUser.organizations?.find((o) => o.organizationId.toString() === orgIdStr);
        const role = orgEntry?.role ?? 'member';
        const joinedAt = orgEntry?.joinedAt ?? memberUser.createdAt ?? new Date();
        members.push({
            id: memberUser._id!.toString(),
            name: [memberUser.firstName, memberUser.lastName].filter(Boolean).join(' ') || 'Unknown',
            email: memberUser.email,
            role,
            dateJoined: formatDateJoined(joinedAt instanceof Date ? joinedAt : new Date(joinedAt)),
        });
    }
    members.sort((a, b) => ROLE_ORDER[a.role] - ROLE_ORDER[b.role]);
    return (<ManagementClient members={members} orgShortId={shortId} orgId={organization._id!.toString()} orgName={organization.name} currentUserId={user._id!.toString()} currentUserRole={userOrg.role}/>);
}
