import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { isUserIdInOrganizationMembers } from '@/lib/models/organization_members';
import { createTaskCompassTask, listTaskCompassTasksForOrganization, type TaskCompassTask, type TaskCompassTaskPriority, type TaskCompassTaskStatus, type TaskCompassTaskType, } from '@/lib/models/task_compass_task';
const TASK_TYPES: TaskCompassTaskType[] = ['bug', 'story', 'task'];
const PRIORITIES: TaskCompassTaskPriority[] = ['high', 'medium', 'low'];
const STATUSES: TaskCompassTaskStatus[] = ['backlog', 'todo', 'in-progress', 'to-test', 'completed'];
async function serializeTask(doc: TaskCompassTask) {
    const assignee = await getCachedUserById(doc.assigneeUserId.toString());
    const name = assignee
        ? [assignee.firstName, assignee.lastName].filter(Boolean).join(' ').trim()
        : '';
    return {
        id: doc._id!.toString(),
        title: doc.title,
        description: doc.description ?? undefined,
        type: doc.type,
        priority: doc.priority,
        status: doc.status,
        points: doc.points,
        repositories: doc.repositories,
        assigneeUserId: doc.assigneeUserId.toString(),
        assignee: name || assignee?.email || 'Unknown',
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
    }> | {
        orgShortId: string;
    };
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const resolvedParams = await Promise.resolve(params);
        const access = await resolveOrgAccess(resolvedParams.orgShortId, session.user.id);
        if ('error' in access) {
            return NextResponse.json(access.body, { status: access.error });
        }
        const docs = await listTaskCompassTasksForOrganization(access.organization._id!);
        const tasks = await Promise.all(docs.map(serializeTask));
        return NextResponse.json({ tasks });
    }
    catch (e) {
        console.error('[task-compass tasks GET]', e);
        return NextResponse.json({ error: 'Failed to load tasks' }, { status: 500 });
    }
}
export async function POST(request: NextRequest, { params }: {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const resolvedParams = await Promise.resolve(params);
        const access = await resolveOrgAccess(resolvedParams.orgShortId, session.user.id);
        if ('error' in access) {
            return NextResponse.json(access.body, { status: access.error });
        }
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const title = typeof body.title === 'string' ? body.title.trim() : '';
        if (!title) {
            return NextResponse.json({ error: 'Title is required' }, { status: 400 });
        }
        const assigneeRaw = typeof body.assigneeUserId === 'string' ? body.assigneeUserId.trim() : '';
        if (!assigneeRaw || !ObjectId.isValid(assigneeRaw)) {
            return NextResponse.json({ error: 'Valid assigneeUserId is required' }, { status: 400 });
        }
        if (!isUserIdInOrganizationMembers(access.organization, assigneeRaw)) {
            return NextResponse.json({ error: 'Assignee is not a member of this organization' }, { status: 400 });
        }
        const type = TASK_TYPES.includes(body.type as TaskCompassTaskType) ? (body.type as TaskCompassTaskType) : 'task';
        const priority = PRIORITIES.includes(body.priority as TaskCompassTaskPriority)
            ? (body.priority as TaskCompassTaskPriority)
            : 'medium';
        const status = STATUSES.includes(body.status as TaskCompassTaskStatus)
            ? (body.status as TaskCompassTaskStatus)
            : 'backlog';
        const description = typeof body.description === 'string' ? body.description.trim() || undefined : undefined;
        let points: number | undefined;
        if (body.points !== undefined && body.points !== null && body.points !== '') {
            const n = Number(body.points);
            if (!Number.isFinite(n) || n < 0) {
                return NextResponse.json({ error: 'Invalid story points' }, { status: 400 });
            }
            points = n;
        }
        let repositories: string[] | undefined;
        if (Array.isArray(body.repositories)) {
            repositories = body.repositories
                .filter((r): r is string => typeof r === 'string')
                .map((r) => r.trim())
                .filter(Boolean);
            if (repositories.length === 0)
                repositories = undefined;
        }
        const created = await createTaskCompassTask({
            organizationId: access.organization._id!,
            title,
            description,
            type,
            priority,
            status,
            points,
            repositories,
            assigneeUserId: new ObjectId(assigneeRaw),
            createdBy: new ObjectId(session.user.id),
        });
        return NextResponse.json({ task: await serializeTask(created) });
    }
    catch (e) {
        console.error('[task-compass tasks POST]', e);
        return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }
}
