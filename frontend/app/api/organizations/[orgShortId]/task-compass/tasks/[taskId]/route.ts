import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { isUserIdInOrganizationMembers } from '@/lib/models/organization_members';
import { deleteTaskCompassTask, updateTaskCompassTask, type TaskCompassTask, type TaskCompassTaskPriority, type TaskCompassTaskStatus, type TaskCompassTaskType, } from '@/lib/models/task_compass_task';
import { deleteTaskCompassAnalysisForTask } from '@/lib/models/task_compass_analysis';
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
export async function PATCH(request: NextRequest, { params }: {
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
        const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
        const patch: Partial<Pick<TaskCompassTask, 'title' | 'description' | 'type' | 'priority' | 'status' | 'points' | 'repositories' | 'assigneeUserId'>> = {};
        if (typeof body.title === 'string') {
            const t = body.title.trim();
            if (!t)
                return NextResponse.json({ error: 'Title cannot be empty' }, { status: 400 });
            patch.title = t;
        }
        if (typeof body.description === 'string') {
            patch.description = body.description.trim() || undefined;
        }
        if (body.type !== undefined && TASK_TYPES.includes(body.type as TaskCompassTaskType)) {
            patch.type = body.type as TaskCompassTaskType;
        }
        if (body.priority !== undefined && PRIORITIES.includes(body.priority as TaskCompassTaskPriority)) {
            patch.priority = body.priority as TaskCompassTaskPriority;
        }
        if (body.status !== undefined && STATUSES.includes(body.status as TaskCompassTaskStatus)) {
            patch.status = body.status as TaskCompassTaskStatus;
        }
        if (body.points !== undefined) {
            if (body.points === null || body.points === '') {
                (patch as {
                    points?: number;
                }).points = undefined;
            }
            else {
                const n = Number(body.points);
                if (!Number.isFinite(n) || n < 0) {
                    return NextResponse.json({ error: 'Invalid story points' }, { status: 400 });
                }
                patch.points = n;
            }
        }
        if (body.repositories !== undefined) {
            if (!Array.isArray(body.repositories)) {
                return NextResponse.json({ error: 'repositories must be an array' }, { status: 400 });
            }
            const repos = body.repositories
                .filter((r): r is string => typeof r === 'string')
                .map((r) => r.trim())
                .filter(Boolean);
            patch.repositories = repos.length ? repos : undefined;
        }
        if (body.assigneeUserId !== undefined) {
            const aid = typeof body.assigneeUserId === 'string' ? body.assigneeUserId.trim() : '';
            if (!aid || !ObjectId.isValid(aid)) {
                return NextResponse.json({ error: 'Invalid assigneeUserId' }, { status: 400 });
            }
            if (!isUserIdInOrganizationMembers(access.organization, aid)) {
                return NextResponse.json({ error: 'Assignee is not a member of this organization' }, { status: 400 });
            }
            patch.assigneeUserId = new ObjectId(aid);
        }
        if (Object.keys(patch).length === 0) {
            return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
        }
        const updated = await updateTaskCompassTask(access.organization._id!, new ObjectId(taskId), patch);
        if (!updated) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        return NextResponse.json({ task: await serializeTask(updated) });
    }
    catch (e) {
        console.error('[task-compass tasks PATCH]', e);
        return NextResponse.json({ error: 'Failed to update task' }, { status: 500 });
    }
}
export async function DELETE(_request: NextRequest, { params }: {
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
        const oid = new ObjectId(taskId);
        const ok = await deleteTaskCompassTask(access.organization._id!, oid);
        if (!ok) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }
        await deleteTaskCompassAnalysisForTask(access.organization._id!, oid).catch(() => undefined);
        return NextResponse.json({ success: true });
    }
    catch (e) {
        console.error('[task-compass tasks DELETE]', e);
        return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }
}
