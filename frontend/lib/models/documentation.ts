import { ObjectId } from 'mongodb';
import { getDb } from '../db';
import { slugify } from '@/lib/utils/slug';
export interface Documentation {
    _id?: ObjectId;
    organizationId: ObjectId;
    repositoryId: ObjectId;
    scope: 'file' | 'module' | 'repository' | 'custom';
    target?: string;
    prompt?: string;
    title?: string;
    description?: string;
    slug?: string;
    s3Key: string;
    s3Bucket: string;
    contentSize: number;
    content?: string;
    version: number;
    isLatest: boolean;
    branch: string;
    code_reference_ids?: string[];
    glossary_term_ids?: string[];
    documentationType?: string;
    aiAgentDocKind?: string;
    filePaths?: string[];
    needsSync?: boolean;
    isUpdating?: boolean;
    createdAt: Date;
    updatedAt: Date;
    createdBy?: ObjectId;
}
export async function getDocumentationCollection() {
    const db = await getDb();
    return db.collection<Documentation>('documentation');
}
export async function ensureUniqueDocumentationTitleAndSlug(repositoryId: string, organizationId: string, title: string, slug?: string | null): Promise<{
    title: string;
    slug: string;
}> {
    const existing = await getDocumentationsByRepository(repositoryId, organizationId);
    const existingTitles = new Set(existing.map((d) => (d.title || '').trim()).filter(Boolean));
    const existingSlugs = new Set(existing.map((d) => (d.slug || (d.title ? slugify(d.title) : '')).trim()).filter(Boolean));
    const baseTitle = (title || 'Documentation').trim();
    const baseSlug = (slug || slugify(baseTitle) || 'documentation').trim();
    let finalTitle = baseTitle;
    let finalSlug = baseSlug;
    let n = 1;
    while (existingTitles.has(finalTitle) || existingSlugs.has(finalSlug)) {
        n += 1;
        finalTitle = `${baseTitle} (${n})`;
        finalSlug = `${baseSlug}-${n}`;
    }
    return { title: finalTitle, slug: finalSlug };
}
export async function createDocumentation(repositoryId: string, documentationData: Omit<Documentation, '_id' | 'repositoryId' | 'organizationId' | 'createdAt' | 'updatedAt'> & {
    organizationId: string;
}): Promise<Documentation> {
    const collection = await getDocumentationCollection();
    const now = new Date();
    const derivedSlug = documentationData.title && documentationData.title.trim()
        ? slugify(documentationData.title)
        : undefined;
    const newDocumentation: Omit<Documentation, '_id'> = {
        ...documentationData,
        organizationId: new ObjectId(documentationData.organizationId),
        repositoryId: new ObjectId(repositoryId),
        slug: documentationData.slug ?? derivedSlug,
        createdAt: now,
        updatedAt: now,
    };
    const result = await collection.insertOne(newDocumentation as Documentation);
    return { ...newDocumentation, _id: result.insertedId } as Documentation;
}
export async function getDocumentationByRepository(repositoryId: string, scope?: 'file' | 'module' | 'repository' | 'custom', target?: string, isLatest?: boolean): Promise<Documentation | null> {
    const collection = await getDocumentationCollection();
    const query: any = { repositoryId: new ObjectId(repositoryId) };
    if (scope) {
        query.scope = scope;
    }
    if (target) {
        query.target = target;
    }
    if (isLatest !== undefined) {
        query.isLatest = isLatest;
    }
    return collection.findOne(query, { sort: { createdAt: -1 } });
}
export async function getDocumentationsByRepository(repositoryId: string, organizationId?: string, isLatest?: boolean): Promise<Documentation[]> {
    const collection = await getDocumentationCollection();
    const query: any = { repositoryId: new ObjectId(repositoryId) };
    if (organizationId) {
        query.organizationId = new ObjectId(organizationId);
    }
    if (isLatest !== undefined) {
        query.isLatest = isLatest;
    }
    return collection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
}
export async function getDocumentationById(documentationId: string): Promise<Documentation | null> {
    const collection = await getDocumentationCollection();
    return collection.findOne({ _id: new ObjectId(documentationId) });
}
export async function deleteDocumentationById(documentationId: string): Promise<boolean> {
    const collection = await getDocumentationCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(documentationId) });
    return result.deletedCount === 1;
}
export async function getDocumentationsByOrganization(organizationId: string, isLatest?: boolean): Promise<Documentation[]> {
    const collection = await getDocumentationCollection();
    const query: any = { organizationId: new ObjectId(organizationId) };
    if (isLatest !== undefined) {
        query.isLatest = isLatest;
    }
    return collection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
}
export async function getDocumentationsByCodeReference(repositoryId: string, referenceId: string, organizationId?: string): Promise<Documentation[]> {
    const collection = await getDocumentationCollection();
    const query: any = {
        repositoryId: new ObjectId(repositoryId),
        code_reference_ids: referenceId
    };
    if (organizationId) {
        query.organizationId = new ObjectId(organizationId);
    }
    return collection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
}
export async function getDocumentationsByGlossaryTerm(repositoryId: string, termId: string, organizationId?: string): Promise<Documentation[]> {
    const collection = await getDocumentationCollection();
    const query: any = {
        repositoryId: new ObjectId(repositoryId),
        glossary_term_ids: termId
    };
    if (organizationId) {
        query.organizationId = new ObjectId(organizationId);
    }
    return collection
        .find(query)
        .sort({ createdAt: -1 })
        .toArray();
}
export async function deleteDocumentationsByRepository(repositoryId: string): Promise<number> {
    const collection = await getDocumentationCollection();
    const result = await collection.deleteMany({
        repositoryId: new ObjectId(repositoryId),
    });
    return result.deletedCount;
}
