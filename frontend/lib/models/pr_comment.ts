import { ObjectId } from 'mongodb';
import { getDb } from '../db';
export interface PRComment {
    _id?: ObjectId;
    organizationId: ObjectId;
    repositoryId: ObjectId;
    prNumber: number;
    commentHash: string;
    path: string;
    line: number | null;
    side: 'LEFT' | 'RIGHT' | null;
    body: string;
    severity?: string;
    issueType?: string;
    posted: boolean;
    postedAt?: Date;
    githubCommentId?: number;
    githubCommentUrl?: string;
    postError?: string;
    postAttempts: number;
    postedBy?: ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export async function getPRCommentsCollection() {
    const db = await getDb();
    return db.collection<PRComment>('pr_comments');
}
function generateCommentHash(path: string, line: number | null, body: string): string {
    const str = `${path}:${line}:${body}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0').substring(0, 16);
}
export async function markCommentAsPosted(organizationId: string, repositoryId: string, prNumber: number, comment: {
    path: string;
    line: number | null;
    side: 'LEFT' | 'RIGHT' | null;
    body: string;
    severity?: string;
    issueType?: string;
}, githubCommentId: number, githubCommentUrl: string, postedBy?: string): Promise<PRComment> {
    const collection = await getPRCommentsCollection();
    const commentHash = generateCommentHash(comment.path, comment.line, comment.body);
    const now = new Date();
    const update: Partial<PRComment> = {
        posted: true,
        postedAt: now,
        githubCommentId,
        githubCommentUrl,
        postAttempts: 1,
        updatedAt: now,
    };
    if (postedBy) {
        update.postedBy = new ObjectId(postedBy);
    }
    const result = await collection.findOneAndUpdate({
        organizationId: new ObjectId(organizationId),
        repositoryId: new ObjectId(repositoryId),
        prNumber: prNumber,
        commentHash: commentHash,
    }, {
        $set: update,
        $setOnInsert: {
            organizationId: new ObjectId(organizationId),
            repositoryId: new ObjectId(repositoryId),
            prNumber: prNumber,
            commentHash: commentHash,
            path: comment.path,
            line: comment.line,
            side: comment.side,
            body: comment.body,
            severity: comment.severity,
            issueType: comment.issueType,
            posted: true,
            postedAt: now,
            githubCommentId,
            githubCommentUrl,
            postAttempts: 1,
            createdAt: now,
            updatedAt: now,
        },
    }, {
        upsert: true,
        returnDocument: 'after',
    });
    return result as PRComment;
}
export async function markCommentPostFailed(organizationId: string, repositoryId: string, prNumber: number, comment: {
    path: string;
    line: number | null;
    side: 'LEFT' | 'RIGHT' | null;
    body: string;
}, error: string): Promise<void> {
    const collection = await getPRCommentsCollection();
    const commentHash = generateCommentHash(comment.path, comment.line, comment.body);
    const now = new Date();
    await collection.updateOne({
        organizationId: new ObjectId(organizationId),
        repositoryId: new ObjectId(repositoryId),
        prNumber: prNumber,
        commentHash: commentHash,
    }, {
        $set: {
            postError: error,
            updatedAt: now,
        },
        $inc: {
            postAttempts: 1,
        },
        $setOnInsert: {
            organizationId: new ObjectId(organizationId),
            repositoryId: new ObjectId(repositoryId),
            prNumber: prNumber,
            commentHash: commentHash,
            path: comment.path,
            line: comment.line,
            side: comment.side,
            body: comment.body,
            posted: false,
            postAttempts: 1,
            createdAt: now,
            updatedAt: now,
        },
    }, {
        upsert: true,
    });
}
export async function getPostedComments(organizationId: string, repositoryId: string, prNumber: number): Promise<PRComment[]> {
    const collection = await getPRCommentsCollection();
    return collection
        .find({
        organizationId: new ObjectId(organizationId),
        repositoryId: new ObjectId(repositoryId),
        prNumber: prNumber,
        posted: true,
    })
        .toArray();
}
export async function isCommentPosted(organizationId: string, repositoryId: string, prNumber: number, comment: {
    path: string;
    line: number | null;
    body: string;
}): Promise<boolean> {
    const collection = await getPRCommentsCollection();
    const commentHash = generateCommentHash(comment.path, comment.line, comment.body);
    const existing = await collection.findOne({
        organizationId: new ObjectId(organizationId),
        repositoryId: new ObjectId(repositoryId),
        prNumber: prNumber,
        commentHash: commentHash,
        posted: true,
    });
    return !!existing;
}
export async function getCommentsPostedStatus(organizationId: string, repositoryId: string, prNumber: number, comments: Array<{
    path: string;
    line: number | null;
    body: string;
}>): Promise<Set<string>> {
    const collection = await getPRCommentsCollection();
    const commentHashes = comments.map(c => generateCommentHash(c.path, c.line, c.body));
    const posted = await collection
        .find({
        organizationId: new ObjectId(organizationId),
        repositoryId: new ObjectId(repositoryId),
        prNumber: prNumber,
        commentHash: { $in: commentHashes },
        posted: true,
    })
        .toArray();
    return new Set(posted.map(c => c.commentHash));
}
export async function deletePRCommentsByRepository(repositoryId: string): Promise<number> {
    const collection = await getPRCommentsCollection();
    const result = await collection.deleteMany({
        repositoryId: new ObjectId(repositoryId),
    });
    return result.deletedCount;
}
