import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export type ProcessingStatus = 'pending' | 'generating' | 'completed' | 'failed';
export type RiskLevel = 'low' | 'medium' | 'high' | 'very high' | 'critical';
export interface PullRequestAnalysis {
    _id?: ObjectId;
    organizationId: ObjectId;
    repositoryId: ObjectId;
    prNumber: number;
    prId: string;
    title: string;
    body?: string;
    state: 'open' | 'closed' | 'merged';
    author: string;
    authorAvatar?: string;
    baseBranch: string;
    headBranch: string;
    headCommitSha: string;
    prUpdatedAt: Date;
    processingStatus: ProcessingStatus;
    processingError?: string;
    description?: {
        title?: string;
        overview?: string;
        detailedChanges?: Array<{
            file: string;
            sections: Array<{
                title: string;
                keyChanges: string[];
                impact: string;
                codeSnippets?: Array<{
                    code: string;
                    language?: string;
                }>;
            }>;
        }>;
        architecturalImplications?: {
            approach?: string;
            benefits?: string[];
            systemEvolution?: string;
            layerConsistency?: string;
        };
        overallAssessment?: {
            prType?: string;
            keyBenefits?: string[];
            riskLevel?: string;
            breakingChanges?: string;
            issuesSummary?: string;
        };
    };
    issues?: Array<{
        type: string;
        severity: 'low' | 'medium' | 'high' | 'critical';
        file: string;
        description: string;
        explanation: string;
        location?: string;
    }>;
    riskAssessment?: {
        level: RiskLevel;
        score: number;
        factors: string[];
        breakingChanges: string[];
        explanation: string;
    };
    dependencies?: {
        direct: string[];
        indirect: string[];
        affectedFiles: number;
    };
    codeQuality?: {
        score: number;
        metrics: {
            complexityChange?: number;
            testCoverage?: number;
            maintainability?: number;
        };
        issues: string[];
    };
    fileAnalysis?: Array<{
        filePath: string;
        status: 'added' | 'modified' | 'removed';
        changes: string;
        explanation: string;
        riskLevel: RiskLevel;
    }>;
    reviewComments?: Array<{
        path: string;
        line: number | null;
        side: 'LEFT' | 'RIGHT' | null;
        body: string;
        severity: 'critical' | 'high' | 'medium' | 'low';
        issueType: string;
        codeSnippet?: string;
    }>;
    analyzedAt?: Date;
    analyzedBy?: ObjectId;
    analysisTime?: number;
    chunksUsed?: number;
    isLatest: boolean;
    createdAt: Date;
    updatedAt: Date;
}
export async function getPullRequestAnalysisCollection() {
    const db = await getDb();
    return db.collection<PullRequestAnalysis>('pull_requests');
}
export async function createOrGetPRAnalysis(repositoryId: string, analysisData: Omit<PullRequestAnalysis, '_id' | 'repositoryId' | 'organizationId' | 'createdAt' | 'updatedAt' | 'isLatest'> & {
    organizationId: string;
}): Promise<PullRequestAnalysis> {
    const collection = await getPullRequestAnalysisCollection();
    const now = new Date();
    const existing = await collection.findOne({
        repositoryId: new ObjectId(repositoryId),
        prNumber: analysisData.prNumber,
        isLatest: true
    });
    if (existing) {
        return existing;
    }
    const newAnalysis: Omit<PullRequestAnalysis, '_id'> = {
        ...analysisData,
        organizationId: new ObjectId(analysisData.organizationId),
        repositoryId: new ObjectId(repositoryId),
        processingStatus: 'pending',
        isLatest: true,
        createdAt: now,
        updatedAt: now,
    };
    const result = await collection.insertOne(newAnalysis as PullRequestAnalysis);
    return { ...newAnalysis, _id: result.insertedId } as PullRequestAnalysis;
}
export async function getPRAnalysis(repositoryId: string, prNumber: number, isLatest: boolean = true): Promise<PullRequestAnalysis | null> {
    const collection = await getPullRequestAnalysisCollection();
    const query: any = {
        repositoryId: new ObjectId(repositoryId),
        prNumber: prNumber,
    };
    if (isLatest) {
        query.isLatest = true;
    }
    return collection.findOne(query, { sort: { createdAt: -1 } });
}
export async function updatePRAnalysisStatus(repositoryId: string, prNumber: number, status: ProcessingStatus, error?: string): Promise<void> {
    const collection = await getPullRequestAnalysisCollection();
    await collection.updateOne({
        repositoryId: new ObjectId(repositoryId),
        prNumber: prNumber,
        isLatest: true
    }, {
        $set: {
            processingStatus: status,
            processingError: error,
            updatedAt: new Date(),
        }
    });
}
export async function updatePRAnalysis(repositoryId: string, prNumber: number, analysisData: {
    description?: PullRequestAnalysis['description'];
    issues?: PullRequestAnalysis['issues'];
    riskAssessment?: PullRequestAnalysis['riskAssessment'];
    dependencies?: PullRequestAnalysis['dependencies'];
    codeQuality?: PullRequestAnalysis['codeQuality'];
    fileAnalysis?: PullRequestAnalysis['fileAnalysis'];
    reviewComments?: PullRequestAnalysis['reviewComments'];
    analysisTime?: number;
    chunksUsed?: number;
}): Promise<void> {
    const collection = await getPullRequestAnalysisCollection();
    await collection.updateOne({
        repositoryId: new ObjectId(repositoryId),
        prNumber: prNumber,
        isLatest: true
    }, {
        $set: {
            ...analysisData,
            processingStatus: 'completed',
            analyzedAt: new Date(),
            updatedAt: new Date(),
        }
    });
}
export async function isPRAnalysisGenerating(repositoryId: string, prNumber: number): Promise<boolean> {
    const analysis = await getPRAnalysis(repositoryId, prNumber);
    return analysis?.processingStatus === 'generating';
}
export async function getPRAnalysesByRepository(repositoryId: string, organizationId?: string, isLatest?: boolean): Promise<PullRequestAnalysis[]> {
    const collection = await getPullRequestAnalysisCollection();
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
export async function deletePullRequestAnalysesByRepository(repositoryId: string): Promise<number> {
    const collection = await getPullRequestAnalysisCollection();
    const result = await collection.deleteMany({
        repositoryId: new ObjectId(repositoryId),
    });
    return result.deletedCount;
}
