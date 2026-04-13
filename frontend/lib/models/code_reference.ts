import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export interface CodeReference {
    _id?: ObjectId;
    organizationId: ObjectId;
    repositoryId: ObjectId;
    referenceId: string;
    name: string;
    type: 'function' | 'class' | 'method' | 'module';
    module?: string;
    filePath?: string;
    description: string;
    signature?: string;
    parameters?: Array<{
        name: string;
        type: string;
        required: boolean;
        default?: any;
        description: string;
    }>;
    returns?: {
        type: string;
        description: string;
    };
    examples?: Array<{
        code: string;
        description: string;
    }>;
    seeAlso?: string[];
    createdAt: Date;
    updatedAt: Date;
}
export async function getCodeReferencesCollection() {
    const db = await getDb();
    return db.collection<CodeReference>('code_references');
}
export async function getCodeReferencesByIds(repositoryId: string, referenceIds: string[], organizationId?: string): Promise<CodeReference[]> {
    const collection = await getCodeReferencesCollection();
    const query: any = {
        repositoryId: new ObjectId(repositoryId),
        referenceId: { $in: referenceIds },
    };
    if (organizationId) {
        query.organizationId = new ObjectId(organizationId);
    }
    return collection.find(query).toArray();
}
export async function getCodeReferencesByRepository(repositoryId: string, organizationId?: string): Promise<CodeReference[]> {
    const collection = await getCodeReferencesCollection();
    const query: any = {
        repositoryId: new ObjectId(repositoryId),
    };
    if (organizationId) {
        query.organizationId = new ObjectId(organizationId);
    }
    return collection.find(query).sort({ name: 1 }).toArray();
}
export async function deleteCodeReferencesByRepository(repositoryId: string): Promise<number> {
    const collection = await getCodeReferencesCollection();
    const result = await collection.deleteMany({
        repositoryId: new ObjectId(repositoryId),
    });
    return result.deletedCount;
}
