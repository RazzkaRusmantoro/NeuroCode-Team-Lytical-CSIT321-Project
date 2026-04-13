import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export interface TaskCompassAnalysisOwnership {
    name: string;
    role: string;
    type: 'owner' | 'contributor' | 'reviewer' | string;
}
export interface TaskCompassAnalysis {
    _id?: ObjectId;
    organizationId: ObjectId;
    taskId: ObjectId;
    taskTitle?: string;
    area: string;
    riskLevel: string;
    cautionAreas: {
        file: string;
        reason: string;
        label: string;
    }[];
    relevantFiles: {
        file: string;
        reason: string;
        badge: string;
    }[];
    entryPoints: {
        target: string;
        reason: string;
    }[];
    ownership: TaskCompassAnalysisOwnership[];
    analyzedAt: Date;
    updatedAt: Date;
}
export async function getTaskCompassAnalysisCollection() {
    const db = await getDb();
    return db.collection<TaskCompassAnalysis>('task_compass_analysis');
}
export async function getTaskCompassAnalysisForTask(organizationId: ObjectId, taskId: ObjectId): Promise<TaskCompassAnalysis | null> {
    const col = await getTaskCompassAnalysisCollection();
    return col.findOne({ organizationId, taskId });
}
export async function upsertTaskCompassAnalysis(organizationId: ObjectId, taskId: ObjectId, payload: {
    taskTitle?: string;
    area: string;
    riskLevel: string;
    cautionAreas: TaskCompassAnalysis['cautionAreas'];
    relevantFiles: TaskCompassAnalysis['relevantFiles'];
    entryPoints: TaskCompassAnalysis['entryPoints'];
    ownership: TaskCompassAnalysis['ownership'];
}): Promise<TaskCompassAnalysis> {
    const col = await getTaskCompassAnalysisCollection();
    const now = new Date();
    const doc = {
        organizationId,
        taskId,
        taskTitle: payload.taskTitle,
        area: payload.area,
        riskLevel: payload.riskLevel,
        cautionAreas: payload.cautionAreas ?? [],
        relevantFiles: payload.relevantFiles ?? [],
        entryPoints: payload.entryPoints ?? [],
        ownership: payload.ownership ?? [],
        analyzedAt: now,
        updatedAt: now,
    };
    await col.updateOne({ organizationId, taskId }, {
        $set: doc,
    }, { upsert: true });
    const saved = await col.findOne({ organizationId, taskId });
    if (!saved) {
        throw new Error('Failed to read task compass analysis after upsert');
    }
    return saved;
}
export async function deleteTaskCompassAnalysisForTask(organizationId: ObjectId, taskId: ObjectId): Promise<boolean> {
    const col = await getTaskCompassAnalysisCollection();
    const r = await col.deleteOne({ organizationId, taskId });
    return r.deletedCount > 0;
}
