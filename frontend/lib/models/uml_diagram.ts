import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export interface UmlDiagramRecord {
    _id: ObjectId;
    organizationId: ObjectId;
    repositoryId: ObjectId;
    type: string;
    name: string;
    slug: string;
    description?: string;
    prompt?: string;
    diagramData?: {
        classes?: unknown[];
        relationships?: unknown[];
    };
    s3Key?: string;
    createdAt: Date;
    updatedAt: Date;
}
export async function getUmlDiagramCollection() {
    const db = await getDb();
    return db.collection<UmlDiagramRecord>('uml_diagrams');
}
export async function getUmlDiagramsByRepository(repositoryId: string): Promise<UmlDiagramRecord[]> {
    const collection = await getUmlDiagramCollection();
    return collection
        .find({ repositoryId: new ObjectId(repositoryId) })
        .sort({ createdAt: -1 })
        .toArray();
}
