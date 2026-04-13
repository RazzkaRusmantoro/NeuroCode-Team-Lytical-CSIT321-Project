import { ObjectId } from 'mongodb';
import { cache } from 'react';
import { getDb } from '../db';
import { createOrganization } from './organization';
export interface User {
    _id?: ObjectId;
    email: string;
    password?: string;
    firstName: string;
    lastName: string;
    authProviders: ('credentials' | 'google' | 'github')[];
    personalization?: {
        primaryGoal?: string;
        role?: string;
    };
    github?: {
        providerAccount: string;
        providerUserId: string;
        accessToken: string;
        scope?: string[];
        connectedAt: Date;
        status: 'active' | 'expired' | 'revoked';
    };
    organizations?: {
        organizationId: ObjectId;
        name: string;
        role: 'owner' | 'member' | 'admin';
        joinedAt: Date;
    }[];
    createdAt: Date;
    updatedAt: Date;
}
export async function getUsersCollection() {
    const db = await getDb();
    return db.collection<User>('users');
}
export async function createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt' | 'organizations'>): Promise<User> {
    const collection = await getUsersCollection();
    const now = new Date();
    const newUser: Omit<User, '_id'> = {
        ...userData,
        authProviders: userData.authProviders || ['credentials'],
        organizations: [],
        createdAt: now,
        updatedAt: now,
    };
    const result = await collection.insertOne(newUser as User);
    const insertedUser = { ...newUser, _id: result.insertedId } as User;
    const defaultOrgName = `${userData.firstName}'s Organization`;
    const defaultOrg = await createOrganization(defaultOrgName, result.insertedId);
    const userOrg = {
        organizationId: defaultOrg._id!,
        name: defaultOrgName,
        role: 'owner' as const,
        joinedAt: now,
    };
    await collection.updateOne({ _id: result.insertedId }, {
        $set: {
            organizations: [userOrg],
            updatedAt: new Date(),
        },
    });
    return { ...insertedUser, organizations: [userOrg] };
}
export async function createOrUpdateOAuthUser(email: string, name: string, provider: 'google' | 'github' = 'google'): Promise<User> {
    const collection = await getUsersCollection();
    const now = new Date();
    const nameParts = name.trim().split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';
    const existingUser = await getUserByEmail(email);
    if (existingUser) {
        const currentProviders = existingUser.authProviders || [];
        const updatedProviders = currentProviders.includes(provider)
            ? currentProviders
            : [...currentProviders, provider];
        const updateData: Partial<User> = {
            updatedAt: now,
            authProviders: updatedProviders,
        };
        if (!existingUser.firstName && firstName) {
            updateData.firstName = firstName;
        }
        if (!existingUser.lastName && lastName) {
            updateData.lastName = lastName;
        }
        await collection.updateOne({ email }, { $set: updateData });
        return {
            ...existingUser,
            firstName: existingUser.firstName || firstName,
            lastName: existingUser.lastName || lastName,
            authProviders: updatedProviders,
            updatedAt: now,
        };
    }
    const newUser: Omit<User, '_id'> = {
        email,
        firstName,
        lastName,
        authProviders: [provider],
        organizations: [],
        createdAt: now,
        updatedAt: now,
    };
    const result = await collection.insertOne(newUser as User);
    const insertedUser = { ...newUser, _id: result.insertedId } as User;
    const defaultOrgName = `${firstName}'s Organization`;
    const defaultOrg = await createOrganization(defaultOrgName, result.insertedId);
    const userOrg = {
        organizationId: defaultOrg._id!,
        name: defaultOrgName,
        role: 'owner' as const,
        joinedAt: now,
    };
    await collection.updateOne({ _id: result.insertedId }, {
        $set: {
            organizations: [userOrg],
            updatedAt: new Date(),
        },
    });
    return { ...insertedUser, organizations: [userOrg] };
}
export async function getUserByEmail(email: string): Promise<User | null> {
    const collection = await getUsersCollection();
    return collection.findOne({ email });
}
export async function getUserById(id: string): Promise<User | null> {
    const collection = await getUsersCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}
export const getCachedUserById = cache(async (id: string): Promise<User | null> => {
    return await getUserById(id);
});
export async function addAuthProviderToUser(email: string, provider: 'credentials' | 'google' | 'github'): Promise<User | null> {
    const collection = await getUsersCollection();
    const now = new Date();
    const user = await getUserByEmail(email);
    if (!user) {
        return null;
    }
    const currentProviders = user.authProviders || [];
    if (currentProviders.includes(provider)) {
        return user;
    }
    const updatedProviders = [...currentProviders, provider];
    await collection.updateOne({ email }, {
        $set: {
            authProviders: updatedProviders,
            updatedAt: now
        }
    });
    return {
        ...user,
        authProviders: updatedProviders,
        updatedAt: now,
    };
}
