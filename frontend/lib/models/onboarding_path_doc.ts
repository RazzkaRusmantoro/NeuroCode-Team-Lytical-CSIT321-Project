import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export type OnboardingPathDocStatus = 'pending' | 'completed' | 'failed';
export interface OnboardingPathDocRecord {
    _id?: ObjectId;
    organizationId: ObjectId;
    pathId: string;
    pathSlug: string;
    title: string;
    status: OnboardingPathDocStatus;
    s3Key?: string;
    s3Bucket?: string;
    contentSize?: number;
    generatedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
const COLLECTION_NAME = 'onboarding_path_docs';
export async function getOnboardingPathDocsCollection() {
    const db = await getDb();
    return db.collection<OnboardingPathDocRecord>(COLLECTION_NAME);
}
export async function getGeneratedPathSlugsByOrganization(organizationId: string, status?: OnboardingPathDocStatus): Promise<{
    pathIds: string[];
    pathSlugs: string[];
}> {
    const collection = await getOnboardingPathDocsCollection();
    const query: {
        organizationId: ObjectId;
        status?: OnboardingPathDocStatus;
    } = {
        organizationId: new ObjectId(organizationId),
    };
    if (status)
        query.status = status;
    const docs = await collection.find(query).project({ pathId: 1, pathSlug: 1 }).toArray();
    return {
        pathIds: docs.map((d) => d.pathId),
        pathSlugs: docs.map((d) => d.pathSlug),
    };
}
export async function getOnboardingPathDocBySlug(organizationId: string, pathSlug: string): Promise<OnboardingPathDocRecord | null> {
    const collection = await getOnboardingPathDocsCollection();
    return collection.findOne({
        organizationId: new ObjectId(organizationId),
        pathSlug,
    });
}
export async function upsertOnboardingPathDoc(organizationId: string, data: {
    pathId: string;
    pathSlug: string;
    title: string;
    status: OnboardingPathDocStatus;
    s3Key?: string;
    s3Bucket?: string;
    contentSize?: number;
    generatedAt?: Date;
}): Promise<OnboardingPathDocRecord> {
    const collection = await getOnboardingPathDocsCollection();
    const now = new Date();
    await collection.updateOne({
        organizationId: new ObjectId(organizationId),
        pathId: data.pathId,
    }, {
        $set: {
            ...data,
            organizationId: new ObjectId(organizationId),
            updatedAt: now,
            ...(data.generatedAt ? { generatedAt: data.generatedAt } : {}),
        },
        $setOnInsert: {
            createdAt: now,
        },
    }, { upsert: true });
    const doc = await collection.findOne({
        organizationId: new ObjectId(organizationId),
        pathId: data.pathId,
    });
    return doc as OnboardingPathDocRecord;
}
