import { ObjectId } from 'mongodb';
import { getDb } from '../db';
import { generateUniqueUrlName } from '../utils/slug';
export interface Repository {
    _id?: ObjectId;
    organizationId: ObjectId;
    githubId?: number;
    name: string;
    urlName?: string;
    url: string;
    source: 'github' | 'bitbucket' | 'upload';
    description?: string;
    size?: number;
    lastUpdate?: Date;
    addedAt: Date;
    addedBy?: ObjectId;
}
export interface SerializedRepository {
    _id: string;
    organizationId: string;
    githubId?: number;
    name: string;
    urlName?: string;
    url: string;
    source: 'github' | 'bitbucket' | 'upload';
    description?: string;
    size?: number;
    lastUpdate?: string;
    addedAt: string;
    addedBy?: string;
}
export async function getRepositoriesCollection() {
    const db = await getDb();
    return db.collection<Repository>('repositories');
}
export type CreateRepositoryData = Omit<Repository, '_id' | 'organizationId' | 'addedAt' | 'lastUpdate' | 'urlName' | 'addedBy'> & {
    urlName?: string;
    lastUpdate?: Date | string;
    addedBy?: string;
};
export async function createRepository(organizationId: string, repositoryData: CreateRepositoryData): Promise<Repository> {
    const collection = await getRepositoriesCollection();
    const now = new Date();
    const lastUpdate = repositoryData.lastUpdate
        ? (typeof repositoryData.lastUpdate === 'string' ? new Date(repositoryData.lastUpdate) : repositoryData.lastUpdate)
        : undefined;
    let urlName = repositoryData.urlName;
    if (!urlName) {
        const existingRepos = await getRepositoriesByOrganization(organizationId);
        const existingUrlNames = existingRepos
            .map(repo => repo.urlName)
            .filter((name): name is string => !!name);
        urlName = generateUniqueUrlName(repositoryData.name, organizationId, existingUrlNames);
    }
    const newRepository: Omit<Repository, '_id'> = {
        ...repositoryData,
        urlName,
        lastUpdate,
        organizationId: new ObjectId(organizationId),
        addedAt: now,
        addedBy: repositoryData.addedBy ? new ObjectId(repositoryData.addedBy) : undefined,
    };
    const result = await collection.insertOne(newRepository as Repository);
    return { ...newRepository, _id: result.insertedId } as Repository;
}
export async function getRepositoryById(id: string): Promise<Repository | null> {
    const collection = await getRepositoriesCollection();
    return collection.findOne({ _id: new ObjectId(id) });
}
export async function getRepositoriesByOrganization(organizationId: string): Promise<Repository[]> {
    const collection = await getRepositoriesCollection();
    return collection.find({ organizationId: new ObjectId(organizationId) }).toArray();
}
export async function getRepositoryByGithubIdAndOrganization(githubId: number, organizationId: string): Promise<Repository | null> {
    const collection = await getRepositoriesCollection();
    return collection.findOne({
        githubId,
        organizationId: new ObjectId(organizationId),
    });
}
export async function getRepositoryByUrlNameAndOrganization(urlName: string, organizationId: string): Promise<Repository | null> {
    const collection = await getRepositoriesCollection();
    return collection.findOne({
        urlName,
        organizationId: new ObjectId(organizationId),
    });
}
export async function deleteRepository(id: string): Promise<boolean> {
    const collection = await getRepositoriesCollection();
    const result = await collection.deleteOne({ _id: new ObjectId(id) });
    return result.deletedCount > 0;
}
