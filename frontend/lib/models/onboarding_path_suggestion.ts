import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export interface SuggestedPathModule {
    id: string;
    name: string;
    summaryDescription: string;
    order: number;
}
export interface SuggestedLearningPath {
    id: string;
    title: string;
    summaryDescription: string;
    modules: SuggestedPathModule[];
}
export interface OnboardingPathSuggestionsDoc {
    _id?: ObjectId;
    organizationId: ObjectId;
    generatedAt: Date;
    paths: SuggestedLearningPath[];
}
const COLLECTION_NAME = 'onboarding_path_suggestions';
export async function getOnboardingPathSuggestionsCollection() {
    const db = await getDb();
    return db.collection<OnboardingPathSuggestionsDoc>(COLLECTION_NAME);
}
export async function getSuggestedPathsByOrganization(organizationId: string): Promise<{
    paths: SuggestedLearningPath[];
    generatedAt: Date | null;
}> {
    const collection = await getOnboardingPathSuggestionsCollection();
    const doc = await collection.findOne({ organizationId: new ObjectId(organizationId) });
    if (!doc || !doc.paths || doc.paths.length === 0) {
        return { paths: [], generatedAt: null };
    }
    return {
        paths: doc.paths,
        generatedAt: doc.generatedAt,
    };
}
export async function upsertSuggestedPathsForOrganization(organizationId: string, paths: SuggestedLearningPath[]): Promise<{
    paths: SuggestedLearningPath[];
    generatedAt: Date;
}> {
    const collection = await getOnboardingPathSuggestionsCollection();
    const now = new Date();
    await collection.updateOne({ organizationId: new ObjectId(organizationId) }, {
        $set: {
            organizationId: new ObjectId(organizationId),
            generatedAt: now,
            paths,
        },
    }, { upsert: true });
    return { paths, generatedAt: now };
}
