import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
export interface InviteToken {
    _id?: ObjectId;
    token: string;
    organizationId: ObjectId;
    orgShortId: string;
    orgName: string;
    invitedBy: ObjectId;
    email: string;
    expiresAt: Date;
    usedAt?: Date;
    createdAt: Date;
}
export async function getInviteTokensCollection() {
    const db = await getDb();
    return db.collection<InviteToken>('invite_tokens');
}
export async function createInviteToken(organizationId: ObjectId, orgShortId: string, orgName: string, invitedBy: ObjectId, email: string): Promise<string> {
    const collection = await getInviteTokensCollection();
    const token = nanoid(32);
    const now = new Date();
    await collection.insertOne({
        token,
        organizationId,
        orgShortId,
        orgName,
        invitedBy,
        email,
        expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000),
        createdAt: now,
    });
    return token;
}
export async function getInviteToken(token: string): Promise<InviteToken | null> {
    const collection = await getInviteTokensCollection();
    return collection.findOne({ token, usedAt: { $exists: false }, expiresAt: { $gt: new Date() } });
}
export async function markInviteTokenUsed(token: string): Promise<void> {
    const collection = await getInviteTokensCollection();
    await collection.updateOne({ token }, { $set: { usedAt: new Date() } });
}
