import { ObjectId } from 'mongodb';
import { nanoid } from 'nanoid';
import { getDb } from '../db';
export interface Organization {
    _id?: ObjectId;
    name: string;
    shortId: string;
    ownerId: ObjectId;
    members: ObjectId[];
    repositories?: {
        repositoryId: ObjectId;
        githubId?: number;
        name: string;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
export async function getOrganizationsCollection() {
    const db = await getDb();
    return db.collection<Organization>('organizations');
}
async function generateUniqueShortId(): Promise<string> {
    const collection = await getOrganizationsCollection();
    let shortId: string;
    let exists = true;
    while (exists) {
        shortId = nanoid(5);
        const existing = await collection.findOne({ shortId });
        exists = existing !== null;
    }
    return shortId!;
}
export async function createOrganization(name: string, ownerId: ObjectId): Promise<Organization> {
    const collection = await getOrganizationsCollection();
    const now = new Date();
    const shortId = await generateUniqueShortId();
    const newOrganization: Omit<Organization, '_id'> = {
        name,
        shortId,
        ownerId,
        members: [ownerId],
        createdAt: now,
        updatedAt: now,
    };
    const result = await collection.insertOne(newOrganization as Organization);
    return { ...newOrganization, _id: result.insertedId } as Organization;
}
export async function getOrganizationById(id: string): Promise<Organization | null> {
    const collection = await getOrganizationsCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}
export async function getOrganizationByShortId(shortId: string): Promise<Organization | null> {
    const collection = await getOrganizationsCollection();
    return collection.findOne({ shortId });
}
export async function updateOrganizationName(organizationId: string, newName: string): Promise<boolean> {
    const collection = await getOrganizationsCollection();
    const now = new Date();
    const result = await collection.updateOne({ _id: new ObjectId(organizationId) }, {
        $set: {
            name: newName,
            updatedAt: now,
        },
    });
    return result.modifiedCount > 0;
}
export async function removeRepositoryFromOrganization(organizationId: string, repositoryId: string): Promise<boolean> {
    const collection = await getOrganizationsCollection();
    const now = new Date();
    const result = await collection.updateOne({ _id: new ObjectId(organizationId) }, {
        $pull: { repositories: { repositoryId: new ObjectId(repositoryId) } },
        $set: { updatedAt: now },
    });
    return result.modifiedCount > 0;
}
export async function addRepositoryToOrganization(organizationId: string, repositoryId: ObjectId, githubId: number | undefined, name: string): Promise<boolean> {
    const collection = await getOrganizationsCollection();
    const now = new Date();
    const repository = {
        repositoryId,
        ...(githubId !== undefined && githubId !== 0 && { githubId }),
        name,
    };
    const result = await collection.updateOne({ _id: new ObjectId(organizationId) }, {
        $push: {
            repositories: repository,
        },
        $set: {
            updatedAt: now,
        },
    });
    return result.modifiedCount > 0;
}
