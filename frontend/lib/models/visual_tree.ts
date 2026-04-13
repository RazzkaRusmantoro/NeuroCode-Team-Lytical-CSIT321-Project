import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export type VisualTreeStatus = 'generating' | 'completed' | 'failed';
export interface VisualTree {
    _id?: ObjectId;
    organizationId: ObjectId;
    repositoryId: ObjectId;
    status: VisualTreeStatus;
    s3Key?: string;
    s3Bucket?: string;
    contentSize?: number;
    branch: string;
    errorMessage?: string;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: ObjectId;
}
export async function getVisualTreeCollection() {
    const db = await getDb();
    return db.collection<VisualTree>('visual_trees');
}
export async function createVisualTreeJob(repositoryId: string, data: {
    organizationId: string;
    branch: string;
    createdBy?: string;
}): Promise<VisualTree> {
    const collection = await getVisualTreeCollection();
    const now = new Date();
    const doc: Omit<VisualTree, '_id'> = {
        organizationId: new ObjectId(data.organizationId),
        repositoryId: new ObjectId(repositoryId),
        status: 'generating',
        branch: data.branch,
        createdAt: now,
        updatedAt: now,
        ...(data.createdBy ? { createdBy: new ObjectId(data.createdBy) } : {}),
    };
    const result = await collection.insertOne(doc as VisualTree);
    return { ...doc, _id: result.insertedId } as VisualTree;
}
export async function completeVisualTree(jobId: string, data: {
    s3Key: string;
    s3Bucket: string;
    contentSize: number;
}): Promise<void> {
    const collection = await getVisualTreeCollection();
    await collection.updateOne({ _id: new ObjectId(jobId) }, {
        $set: {
            status: 'completed' as VisualTreeStatus,
            s3Key: data.s3Key,
            s3Bucket: data.s3Bucket,
            contentSize: data.contentSize,
            updatedAt: new Date(),
        },
    });
}
export async function failVisualTree(jobId: string, errorMessage: string): Promise<void> {
    const collection = await getVisualTreeCollection();
    await collection.updateOne({ _id: new ObjectId(jobId) }, {
        $set: {
            status: 'failed' as VisualTreeStatus,
            errorMessage,
            updatedAt: new Date(),
        },
    });
}
export async function getLatestVisualTree(repositoryId: string, organizationId?: string): Promise<VisualTree | null> {
    const collection = await getVisualTreeCollection();
    const query: any = { repositoryId: new ObjectId(repositoryId) };
    if (organizationId) {
        query.organizationId = new ObjectId(organizationId);
    }
    return collection.findOne(query, { sort: { createdAt: -1 } });
}
export async function getLatestCompletedVisualTree(repositoryId: string): Promise<VisualTree | null> {
    const collection = await getVisualTreeCollection();
    return collection.findOne({ repositoryId: new ObjectId(repositoryId), status: 'completed' }, { sort: { createdAt: -1 } });
}
export async function deleteAllVisualTreesForRepository(repositoryId: string): Promise<{
    deletedCount: number;
}> {
    const collection = await getVisualTreeCollection();
    const result = await collection.deleteMany({
        repositoryId: new ObjectId(repositoryId),
    });
    return { deletedCount: result.deletedCount };
}
export async function cancelVisualTreeGeneration(repositoryId: string): Promise<{
    cancelled: boolean;
}> {
    const latest = await getLatestVisualTree(repositoryId);
    if (!latest || latest.status !== 'generating' || !latest._id) {
        return { cancelled: false };
    }
    await failVisualTree(latest._id.toString(), 'Cancelled by user');
    return { cancelled: true };
}
