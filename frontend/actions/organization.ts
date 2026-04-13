'use server';
import { getUserById, getUsersCollection } from '@/lib/models/user';
import { getOrganizationsCollection, createOrganization } from '@/lib/models/organization';
import { getCachedSession } from '@/lib/session';
import { ObjectId } from 'mongodb';
import { sendOrgInviteEmail } from '@/lib/email/invite';
import { createInviteToken } from '@/lib/models/invite_token';
export interface OrganizationWithId {
    id: string;
    shortId: string;
    name: string;
    role: 'owner' | 'member' | 'admin';
    ownerId: string;
}
export async function createNewOrganization(name: string, inviteEmails: string[] = []): Promise<{
    success?: boolean;
    shortId?: string;
    error?: string;
}> {
    try {
        const session = await getCachedSession();
        if (!session?.user?.id)
            return { error: 'Unauthorized' };
        const userId = new ObjectId(session.user.id);
        const user = await getUserById(session.user.id);
        const inviterName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Someone';
        const org = await createOrganization(name.trim(), userId);
        const usersCollection = await getUsersCollection();
        const now = new Date();
        await usersCollection.updateOne({ _id: userId }, {
            $push: {
                organizations: {
                    organizationId: org._id!,
                    name: org.name,
                    role: 'owner' as const,
                    joinedAt: now,
                },
            },
            $set: { updatedAt: now },
        });
        if (inviteEmails.length > 0) {
            await Promise.allSettled(inviteEmails.map(async (email) => {
                const token = await createInviteToken(org._id!, org.shortId, org.name, userId, email);
                await sendOrgInviteEmail(email, org.name, inviterName, token);
            }));
        }
        return { success: true, shortId: org.shortId };
    }
    catch (error: any) {
        return { error: error.message || 'Failed to create organization' };
    }
}
export async function kickMember(orgId: string, targetUserId: string): Promise<{
    success?: boolean;
    error?: string;
}> {
    try {
        const session = await getCachedSession();
        if (!session?.user?.id)
            return { error: 'Unauthorized' };
        const actorId = session.user.id;
        if (actorId === targetUserId)
            return { error: 'You cannot kick yourself' };
        const actor = await getUserById(actorId);
        const actorOrg = actor?.organizations?.find((o) => o.organizationId.toString() === orgId);
        if (!actorOrg || actorOrg.role === 'member')
            return { error: 'Insufficient permissions' };
        const target = await getUserById(targetUserId);
        const targetOrg = target?.organizations?.find((o) => o.organizationId.toString() === orgId);
        if (!targetOrg)
            return { error: 'User not found in organization' };
        if (actorOrg.role === 'admin' && targetOrg.role !== 'member') {
            return { error: 'Admins can only kick members' };
        }
        if (targetOrg.role === 'owner')
            return { error: 'Cannot kick the owner' };
        const now = new Date();
        const usersCollection = await getUsersCollection();
        const orgsCollection = await getOrganizationsCollection();
        await Promise.all([
            usersCollection.updateOne({ _id: new ObjectId(targetUserId) }, {
                $pull: { organizations: { organizationId: new ObjectId(orgId) } } as any,
                $set: { updatedAt: now },
            }),
            orgsCollection.updateOne({ _id: new ObjectId(orgId) }, {
                $pull: { members: new ObjectId(targetUserId) } as any,
                $set: { updatedAt: now },
            }),
        ]);
        return { success: true };
    }
    catch (error: any) {
        return { error: error.message || 'Failed to kick member' };
    }
}
export async function setMemberRole(orgId: string, targetUserId: string, newRole: 'admin' | 'member'): Promise<{
    success?: boolean;
    error?: string;
}> {
    try {
        const session = await getCachedSession();
        if (!session?.user?.id)
            return { error: 'Unauthorized' };
        const actorId = session.user.id;
        const actor = await getUserById(actorId);
        const actorOrg = actor?.organizations?.find((o) => o.organizationId.toString() === orgId);
        if (!actorOrg || actorOrg.role !== 'owner')
            return { error: 'Only the owner can change roles' };
        const target = await getUserById(targetUserId);
        const targetOrg = target?.organizations?.find((o) => o.organizationId.toString() === orgId);
        if (!targetOrg)
            return { error: 'User not found in organization' };
        if (targetOrg.role === 'owner')
            return { error: 'Cannot change the owner\'s role' };
        const usersCollection = await getUsersCollection();
        await usersCollection.updateOne({ _id: new ObjectId(targetUserId), 'organizations.organizationId': new ObjectId(orgId) }, { $set: { 'organizations.$.role': newRole, updatedAt: new Date() } });
        return { success: true };
    }
    catch (error: any) {
        return { error: error.message || 'Failed to update role' };
    }
}
export async function sendOrgInvite(orgId: string, orgShortId: string, orgName: string, email: string): Promise<{
    success?: boolean;
    error?: string;
}> {
    try {
        const session = await getCachedSession();
        if (!session?.user?.id)
            return { error: 'Unauthorized' };
        const user = await getUserById(session.user.id);
        const inviterName = user ? `${user.firstName} ${user.lastName}`.trim() : 'Someone';
        const invitedBy = new ObjectId(session.user.id);
        const token = await createInviteToken(new ObjectId(orgId), orgShortId, orgName, invitedBy, email.trim());
        await sendOrgInviteEmail(email.trim(), orgName, inviterName, token);
        return { success: true };
    }
    catch (error: any) {
        return { error: error.message || 'Failed to send invite' };
    }
}
export async function getUserOrganizations(): Promise<{
    organizations: OrganizationWithId[];
    error?: string;
}> {
    try {
        const session = await getCachedSession();
        if (!session?.user?.id) {
            return { organizations: [], error: 'Unauthorized' };
        }
        const user = await getUserById(session.user.id);
        if (!user || !user.organizations || user.organizations.length === 0) {
            return { organizations: [] };
        }
        const collection = await getOrganizationsCollection();
        const organizationIds = user.organizations.map(org => org.organizationId);
        const orgDocs = await collection
            .find({ _id: { $in: organizationIds } })
            .toArray();
        const orgMap = new Map(orgDocs.map(org => [org._id!.toString(), org]));
        const organizationsWithId: OrganizationWithId[] = user.organizations.map(userOrg => {
            const orgDoc = orgMap.get(userOrg.organizationId.toString());
            return {
                id: userOrg.organizationId.toString(),
                shortId: orgDoc?.shortId || '',
                name: userOrg.name,
                role: userOrg.role,
                ownerId: orgDoc?.ownerId.toString() || '',
            };
        });
        return { organizations: organizationsWithId };
    }
    catch (error: any) {
        return { organizations: [], error: error.message || 'Failed to fetch organizations' };
    }
}
