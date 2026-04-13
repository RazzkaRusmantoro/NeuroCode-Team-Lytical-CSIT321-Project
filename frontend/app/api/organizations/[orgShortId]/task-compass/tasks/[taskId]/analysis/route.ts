import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getTaskCompassAnalysisForTask } from '@/lib/models/task_compass_analysis';
function serializeAnalysis(doc: NonNullable<Awaited<ReturnType<typeof getTaskCompassAnalysisForTask>>>) {
    return {
        taskId: doc.taskId.toString(),
        taskTitle: doc.taskTitle,
        area: doc.area,
        riskLevel: doc.riskLevel,
        cautionAreas: doc.cautionAreas,
        relevantFiles: doc.relevantFiles,
        entryPoints: doc.entryPoints,
        ownership: doc.ownership,
        analyzedAt: doc.analyzedAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
    };
}
async function resolveOrgAccess(rawOrgShortId: string, sessionUserId: string) {
    const user = await getCachedUserById(sessionUserId);
    if (!user)
        return { error: 404 as const, body: { error: 'User not found' } };
    const shortId = rawOrgShortId.startsWith('org-') ? rawOrgShortId.replace('org-', '') : rawOrgShortId;
    const organization = await getOrganizationByShortId(shortId);
    if (!organization)
        return { error: 404 as const, body: { error: 'Organization not found' } };
    const userOrg = user.organizations?.find((org) => org.organizationId.toString() === organization._id!.toString());
    if (!userOrg)
        return { error: 403 as const, body: { error: 'Access denied' } };
    return { user, organization };
}
export async function GET(_request: NextRequest, { params }: {
    params: Promise<{
        orgShortId: string;
        taskId: string;
    }> | {
        orgShortId: string;
        taskId: string;
    };
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const resolvedParams = await Promise.resolve(params);
        const { orgShortId, taskId } = resolvedParams;
        if (!ObjectId.isValid(taskId)) {
            return NextResponse.json({ error: 'Invalid task id' }, { status: 400 });
        }
        const access = await resolveOrgAccess(orgShortId, session.user.id);
        if ('error' in access) {
            return NextResponse.json(access.body, { status: access.error });
        }
        const doc = await getTaskCompassAnalysisForTask(access.organization._id!, new ObjectId(taskId));
        if (!doc) {
            return NextResponse.json({ analysis: null }, { status: 200 });
        }
        return NextResponse.json({ analysis: serializeAnalysis(doc) });
    }
    catch (e) {
        console.error('[task-compass analysis GET]', e);
        return NextResponse.json({ error: 'Failed to load analysis' }, { status: 500 });
    }
}
