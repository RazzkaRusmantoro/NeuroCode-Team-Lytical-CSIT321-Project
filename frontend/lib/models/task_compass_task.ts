import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export type TaskCompassTaskType = 'bug' | 'story' | 'task';
export type TaskCompassTaskPriority = 'high' | 'medium' | 'low';
export type TaskCompassTaskStatus = 'backlog' | 'todo' | 'in-progress' | 'to-test' | 'completed';
export interface TaskCompassTask {
    _id?: ObjectId;
    organizationId: ObjectId;
    title: string;
    description?: string;
    type: TaskCompassTaskType;
    priority: TaskCompassTaskPriority;
    status: TaskCompassTaskStatus;
    points?: number;
    repositories?: string[];
    assigneeUserId: ObjectId;
    createdBy: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export async function getTaskCompassTasksCollection() {
    const db = await getDb();
    return db.collection<TaskCompassTask>('task_compass_tasks');
}
export async function listTaskCompassTasksForOrganization(organizationId: ObjectId): Promise<TaskCompassTask[]> {
    const col = await getTaskCompassTasksCollection();
    return col.find({ organizationId }).sort({ updatedAt: -1 }).toArray();
}
export async function getTaskCompassTaskById(organizationId: ObjectId, taskId: ObjectId): Promise<TaskCompassTask | null> {
    const col = await getTaskCompassTasksCollection();
    return col.findOne({ _id: taskId, organizationId });
}
export async function createTaskCompassTask(doc: Omit<TaskCompassTask, '_id' | 'createdAt' | 'updatedAt'>): Promise<TaskCompassTask> {
    const col = await getTaskCompassTasksCollection();
    const now = new Date();
    const insert: Omit<TaskCompassTask, '_id'> = {
        ...doc,
        createdAt: now,
        updatedAt: now,
    };
    const r = await col.insertOne(insert as TaskCompassTask);
    return { ...insert, _id: r.insertedId } as TaskCompassTask;
}
export async function updateTaskCompassTask(organizationId: ObjectId, taskId: ObjectId, patch: Partial<Pick<TaskCompassTask, 'title' | 'description' | 'type' | 'priority' | 'status' | 'points' | 'repositories' | 'assigneeUserId'>>): Promise<TaskCompassTask | null> {
    const col = await getTaskCompassTasksCollection();
    const now = new Date();
    const $set: Record<string, unknown> = { updatedAt: now };
    const $unset: Record<string, ''> = {};
    for (const key of Object.keys(patch) as (keyof typeof patch)[]) {
        const v = patch[key];
        if (key === 'points' && v === undefined && Object.prototype.hasOwnProperty.call(patch, 'points')) {
            $unset.points = '';
            continue;
        }
        if (v !== undefined) {
            $set[key as string] = v;
        }
    }
    const update: Record<string, unknown> = { $set };
    if (Object.keys($unset).length > 0)
        update.$unset = $unset;
    const updated = await col.findOneAndUpdate({ _id: taskId, organizationId }, update, { returnDocument: 'after' });
    return updated ?? null;
}
export async function deleteTaskCompassTask(organizationId: ObjectId, taskId: ObjectId): Promise<boolean> {
    const col = await getTaskCompassTasksCollection();
    const r = await col.deleteOne({ _id: taskId, organizationId });
    return r.deletedCount > 0;
}
