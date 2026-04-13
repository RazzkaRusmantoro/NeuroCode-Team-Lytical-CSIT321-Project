'use client';
import { useState, useEffect, useCallback, useMemo, type FormEvent } from 'react';
import { useSession } from 'next-auth/react';
import { setTaskCompassResult, getTaskCompassResultForTask, deleteTaskCompassResult } from '@/lib/task_compass_storage';
import type { OrgMemberSummary } from '@/lib/models/organization_members';
import Dropdown from '@/app/components/Dropdown';
import { MoreHorizontal, Plus, Bug, Bookmark, CheckSquare, ArrowUp, ArrowRight, ArrowDown, Search, GitBranch, AlertTriangle, FileCode, Play, Users, Shield, Loader2, } from 'lucide-react';
type PageProps = {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
};
type Priority = 'high' | 'medium' | 'low';
type TaskType = 'bug' | 'story' | 'task';
type Status = 'backlog' | 'todo' | 'in-progress' | 'to-test' | 'completed';
const COLUMNS: {
    id: Status;
    title: string;
}[] = [
    { id: 'backlog', title: 'Backlog' },
    { id: 'todo', title: 'To Do' },
    { id: 'in-progress', title: 'In Progress' },
    { id: 'to-test', title: 'To Test' },
    { id: 'completed', title: 'Completed' },
];
const TASK_COMPASS_TYPE_OPTIONS = [
    { value: 'task', label: 'Task' },
    { value: 'story', label: 'Story' },
    { value: 'bug', label: 'Bug' },
] as const;
const TASK_COMPASS_PRIORITY_OPTIONS = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' },
] as const;
const TASK_COMPASS_STATUS_OPTIONS = COLUMNS.map((c) => ({
    value: c.id,
    label: c.title,
}));
interface Task {
    id: string;
    title: string;
    type: TaskType;
    priority: Priority;
    status: Status;
    assigneeUserId: string;
    assignee: string;
    points?: number;
    description?: string;
    repositories?: string[];
}
type TaskSavePayload = {
    id?: string;
    title: string;
    description?: string;
    type: TaskType;
    priority: Priority;
    status: Status;
    points?: number;
    repositories?: string[];
    assigneeUserId: string;
};
type RiskLevel = 'low' | 'medium' | 'high';
type CautionLabel = 'caution' | 'manual approval';
type FileBadge = 'core' | 'helper' | 'config' | 'UI' | 'route' | 'service' | 'schema' | 'test';
interface CompassContext {
    area: string;
    riskLevel: RiskLevel;
    cautionAreas: {
        file: string;
        reason: string;
        label: CautionLabel;
    }[];
    relevantFiles: {
        file: string;
        reason: string;
        badge: FileBadge;
    }[];
    entryPoints: {
        target: string;
        reason: string;
    }[];
    ownership: {
        name: string;
        role: string;
        type: 'owner' | 'contributor' | 'reviewer';
    }[];
}
function orgApiBase(orgShortId: string) {
    return `/api/organizations/org-${encodeURIComponent(orgShortId)}`;
}
function normalizeOwnershipRow(raw: unknown): CompassContext['ownership'][number] {
    if (!raw || typeof raw !== 'object') {
        return { name: 'Unknown', role: '', type: 'contributor' };
    }
    const o = raw as Record<string, unknown>;
    const name = typeof o.name === 'string' ? o.name : 'Unknown';
    const role = typeof o.role === 'string' ? o.role : '';
    const t = typeof o.type === 'string' ? o.type : 'contributor';
    const type = t === 'owner' || t === 'reviewer' || t === 'contributor' ? t : 'contributor';
    return { name, role, type };
}
function analysisRecordToCompass(analysis: {
    area?: string;
    riskLevel?: string;
    cautionAreas?: unknown;
    relevantFiles?: unknown;
    entryPoints?: unknown;
    ownership?: unknown;
}): CompassContext {
    const riskLevel = (['low', 'medium', 'high'] as const).includes(analysis.riskLevel as RiskLevel)
        ? (analysis.riskLevel as RiskLevel)
        : 'medium';
    const cautionAreas = Array.isArray(analysis.cautionAreas)
        ? analysis.cautionAreas.map((row): CompassContext['cautionAreas'][number] => {
            if (!row || typeof row !== 'object') {
                return { file: '', reason: '', label: 'caution' };
            }
            const r = row as Record<string, unknown>;
            const label = r.label === 'manual approval' ? 'manual approval' : 'caution';
            return {
                file: typeof r.file === 'string' ? r.file : '',
                reason: typeof r.reason === 'string' ? r.reason : '',
                label,
            };
        })
        : [];
    const badges: FileBadge[] = ['core', 'helper', 'config', 'UI', 'route', 'service', 'schema', 'test'];
    const relevantFiles = Array.isArray(analysis.relevantFiles)
        ? analysis.relevantFiles.map((row): CompassContext['relevantFiles'][number] => {
            if (!row || typeof row !== 'object') {
                return { file: '', reason: '', badge: 'helper' };
            }
            const r = row as Record<string, unknown>;
            const b = typeof r.badge === 'string' && badges.includes(r.badge as FileBadge) ? (r.badge as FileBadge) : 'helper';
            return {
                file: typeof r.file === 'string' ? r.file : '',
                reason: typeof r.reason === 'string' ? r.reason : '',
                badge: b,
            };
        })
        : [];
    const entryPoints = Array.isArray(analysis.entryPoints)
        ? analysis.entryPoints.map((row): CompassContext['entryPoints'][number] => {
            if (!row || typeof row !== 'object') {
                return { target: '', reason: '' };
            }
            const r = row as Record<string, unknown>;
            return {
                target: typeof r.target === 'string' ? r.target : '',
                reason: typeof r.reason === 'string' ? r.reason : '',
            };
        })
        : [];
    const ownership = Array.isArray(analysis.ownership)
        ? analysis.ownership.map(normalizeOwnershipRow)
        : [];
    return {
        area: typeof analysis.area === 'string' ? analysis.area : 'Unknown',
        riskLevel,
        cautionAreas,
        relevantFiles,
        entryPoints,
        ownership,
    };
}
function getTypeIcon(type: TaskType) {
    switch (type) {
        case 'bug': return <Bug className="w-3.5 h-3.5 text-red-400"/>;
        case 'story': return <Bookmark className="w-3.5 h-3.5 text-green-400"/>;
        case 'task': return <CheckSquare className="w-3.5 h-3.5 text-blue-400"/>;
    }
}
function getPriorityIcon(priority: Priority) {
    switch (priority) {
        case 'high': return <ArrowUp className="w-3.5 h-3.5 text-red-400"/>;
        case 'medium': return <ArrowRight className="w-3.5 h-3.5 text-amber-400"/>;
        case 'low': return <ArrowDown className="w-3.5 h-3.5 text-blue-400"/>;
    }
}
function parseRepoInput(s: string): string[] {
    return s.split(/[\n,]+/).map(x => x.trim()).filter(Boolean);
}
function TaskFormModal({ open, onClose, initialStatus, editingTask, orgMembers, currentUserId, membersLoading, onSave, }: {
    open: boolean;
    onClose: () => void;
    initialStatus: Status;
    editingTask: Task | null;
    orgMembers: OrgMemberSummary[];
    currentUserId: string;
    membersLoading: boolean;
    onSave: (payload: TaskSavePayload) => Promise<void>;
}) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [type, setType] = useState<TaskType>('task');
    const [priority, setPriority] = useState<Priority>('medium');
    const [status, setStatus] = useState<Status>('backlog');
    const [points, setPoints] = useState('');
    const [reposInput, setReposInput] = useState('');
    const [assigneeUserId, setAssigneeUserId] = useState('');
    const [formError, setFormError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const assigneeOptions = useMemo(() => orgMembers.map((m) => ({
        value: m.id,
        label: `${m.displayName} (${m.email})`,
    })), [orgMembers]);
    useEffect(() => {
        if (!open)
            return;
        if (editingTask) {
            setTitle(editingTask.title);
            setDescription(editingTask.description || '');
            setType(editingTask.type);
            setPriority(editingTask.priority);
            setStatus(editingTask.status);
            setPoints(editingTask.points != null ? String(editingTask.points) : '');
            setReposInput((editingTask.repositories || []).join(', '));
            setAssigneeUserId(editingTask.assigneeUserId);
        }
        else {
            setTitle('');
            setDescription('');
            setType('task');
            setPriority('medium');
            setStatus(initialStatus);
            setPoints('');
            setReposInput('');
            setAssigneeUserId(currentUserId || '');
        }
        setFormError('');
        setSubmitting(false);
    }, [open, editingTask, initialStatus, currentUserId]);
    useEffect(() => {
        if (!open || editingTask || orgMembers.length === 0)
            return;
        const ids = new Set(orgMembers.map((m) => m.id));
        setAssigneeUserId((prev) => {
            if (prev && ids.has(prev))
                return prev;
            if (currentUserId && ids.has(currentUserId))
                return currentUserId;
            return orgMembers[0].id;
        });
    }, [open, editingTask, orgMembers, currentUserId]);
    if (!open)
        return null;
    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        const t = title.trim();
        if (!t) {
            setFormError('Title is required.');
            return;
        }
        if (!assigneeUserId) {
            setFormError('Choose an assignee.');
            return;
        }
        let pts: number | undefined;
        if (points.trim()) {
            const n = Number(points);
            if (!Number.isFinite(n) || n < 0) {
                setFormError('Story points must be a valid non-negative number.');
                return;
            }
            pts = n;
        }
        const repositories = parseRepoInput(reposInput);
        const payload: TaskSavePayload = {
            id: editingTask?.id,
            title: t,
            description: description.trim() || undefined,
            type,
            priority,
            status,
            points: pts,
            repositories: repositories.length > 0 ? repositories : undefined,
            assigneeUserId,
        };
        setSubmitting(true);
        setFormError('');
        try {
            await onSave(payload);
        }
        catch (err) {
            setFormError(err instanceof Error ? err.message : 'Something went wrong');
        }
        finally {
            setSubmitting(false);
        }
    };
    return (<div className="fixed inset-0 z-[60] flex items-start justify-center overflow-y-auto bg-black/60 backdrop-blur-sm px-4 py-12" onClick={onClose} aria-modal="true" role="dialog">
      <div className="relative my-auto w-full max-w-lg overflow-visible rounded-lg border border-[#333] bg-[#141414] shadow-xl" onClick={(ev) => ev.stopPropagation()}>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="flex items-start justify-between gap-3">
            <h2 className="text-lg font-semibold text-white">{editingTask ? 'Edit task' : 'New task'}</h2>
            <button type="button" onClick={onClose} className="rounded-md border border-transparent px-2 py-1 text-xs text-white/50 hover:border-[#333] hover:bg-[#1f1f1f] hover:text-white/80 shrink-0">
              Cancel
            </button>
          </div>

          {formError && (<p className="text-xs text-red-400/90">{formError}</p>)}

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/40 mb-1.5">Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full rounded-md border border-[#262626] bg-[#121215] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent" placeholder="Short summary"/>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/40 mb-1.5">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} className="w-full rounded-md border border-[#262626] bg-[#121215] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent resize-y min-h-[96px]" placeholder="Context for Task Compass analysis (optional)"/>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/40 mb-1.5">Type</label>
              <Dropdown options={[...TASK_COMPASS_TYPE_OPTIONS]} value={type} onChange={(v) => setType(v as TaskType)} placeholder="Select type" menuZClass="z-[200]"/>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/40 mb-1.5">Priority</label>
              <Dropdown options={[...TASK_COMPASS_PRIORITY_OPTIONS]} value={priority} onChange={(v) => setPriority(v as Priority)} placeholder="Select priority" menuZClass="z-[200]"/>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/40 mb-1.5">Status</label>
              <Dropdown options={TASK_COMPASS_STATUS_OPTIONS} value={status} onChange={(v) => setStatus(v as Status)} placeholder="Select status" menuZClass="z-[200]"/>
            </div>
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/40 mb-1.5">Story points</label>
              <input value={points} onChange={(e) => setPoints(e.target.value)} inputMode="decimal" className="w-full rounded-md border border-[#262626] bg-[#121215] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent" placeholder="Optional"/>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/40 mb-1.5">Repositories</label>
            <input value={reposInput} onChange={(e) => setReposInput(e.target.value)} className="w-full rounded-md border border-[#262626] bg-[#121215] px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent" placeholder="e.g. neurocode, neurocode-python (optional)"/>
            <p className="mt-1 text-[11px] text-white/35">Comma-separated. Should match repository url names in your org to scope analysis.</p>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wide text-white/40 mb-1.5">Assignee</label>
            <Dropdown options={assigneeOptions} value={assigneeUserId} onChange={setAssigneeUserId} placeholder={membersLoading ? 'Loading members…' : orgMembers.length === 0 ? 'No members found' : 'Select assignee'} disabled={membersLoading || orgMembers.length === 0} menuZClass="z-[200]"/>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} disabled={submitting} className="rounded-md border border-[#333] bg-[#1a1a1a] px-4 py-2 text-sm text-white/70 hover:text-white transition-colors disabled:opacity-50">
              Cancel
            </button>
            <button type="submit" disabled={submitting || membersLoading || orgMembers.length === 0} className="rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/15 px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25 transition-colors disabled:opacity-50">
              {submitting ? 'Saving…' : editingTask ? 'Save' : 'Add task'}
            </button>
          </div>
        </form>
      </div>
    </div>);
}
function TaskDetailsModal({ task, orgShortId, onClose, onEdit, onDelete, }: {
    task: Task;
    orgShortId: string;
    onClose: () => void;
    onEdit?: (task: Task) => void;
    onDelete?: (task: Task) => void;
}) {
    const [compassCtx, setCompassCtx] = useState<CompassContext | null>(null);
    const [savedAnalysisLoading, setSavedAnalysisLoading] = useState(true);
    const [compassLoading, setCompassLoading] = useState(false);
    const [compassError, setCompassError] = useState<string | null>(null);
    const [lastAnalyzedAt, setLastAnalyzedAt] = useState<string | null>(null);
    useEffect(() => {
        let cancelled = false;
        setSavedAnalysisLoading(true);
        setCompassError(null);
        (async () => {
            try {
                if (orgShortId) {
                    const r = await fetch(`${orgApiBase(orgShortId)}/task-compass/tasks/${encodeURIComponent(task.id)}/analysis`, { credentials: 'include' });
                    const j = await r.json().catch(() => ({}));
                    if (!cancelled && r.ok && j?.analysis) {
                        setCompassCtx(analysisRecordToCompass(j.analysis));
                        setLastAnalyzedAt(typeof j.analysis.analyzedAt === 'string' ? j.analysis.analyzedAt : null);
                        return;
                    }
                }
            }
            catch {
            }
            if (cancelled)
                return;
            const cached = getTaskCompassResultForTask(orgShortId, task.id);
            if (cached?.area != null) {
                setCompassCtx(analysisRecordToCompass({
                    area: cached.area,
                    riskLevel: cached.riskLevel,
                    cautionAreas: cached.cautionAreas,
                    relevantFiles: cached.relevantFiles,
                    entryPoints: cached.entryPoints,
                    ownership: cached.ownership,
                }));
                setLastAnalyzedAt(cached.analyzedAt ?? null);
            }
            else {
                setCompassCtx(null);
                setLastAnalyzedAt(null);
            }
        })().finally(() => {
            if (!cancelled)
                setSavedAnalysisLoading(false);
        });
        return () => {
            cancelled = true;
        };
    }, [orgShortId, task.id]);
    const runQdrantSummarize = useCallback(async () => {
        setCompassLoading(true);
        setCompassError(null);
        try {
            const res = await fetch('/api/task-compass/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    orgShortId,
                    taskId: task.id,
                    taskTitle: task.title,
                    taskDescription: task.description || null,
                    taskType: task.type,
                    repositories: task.repositories || null,
                }),
            });
            if (!res.ok) {
                throw new Error(`Analysis failed (${res.status})`);
            }
            const raw: unknown = await res.json();
            const ctx = analysisRecordToCompass(raw as Record<string, unknown>);
            setCompassCtx(ctx);
            const analyzedAt = new Date().toISOString();
            setLastAnalyzedAt(analyzedAt);
            setTaskCompassResult(orgShortId, {
                taskId: task.id,
                taskTitle: task.title,
                area: ctx.area,
                riskLevel: ctx.riskLevel,
                cautionAreas: ctx.cautionAreas,
                relevantFiles: ctx.relevantFiles,
                entryPoints: ctx.entryPoints,
                ownership: ctx.ownership,
                analyzedAt,
            });
        }
        catch (e) {
            console.error('[task-details] analyze:', e);
            setCompassError(e instanceof Error ? e.message : String(e));
        }
        finally {
            setCompassLoading(false);
        }
    }, [orgShortId, task]);
    const panelBusy = savedAnalysisLoading || compassLoading;
    return (<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-2 py-6 sm:px-4 sm:py-10" onClick={onClose} aria-modal="true" role="dialog">
      <div className="relative my-auto flex w-full max-w-5xl max-h-[min(92vh,calc(100vh-3rem))] flex-col overflow-hidden rounded-lg border border-[#333] bg-[#141414] shadow-xl md:flex-row md:items-stretch" onClick={(e) => e.stopPropagation()}>
        <div className="custom-scrollbar min-h-0 min-w-0 flex-1 overflow-y-auto border-[#262626] p-5 md:max-w-[min(100%,26rem)] md:border-r md:p-6">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1 text-xs font-medium text-white/40">{task.id}</div>
              <h2 className="text-lg font-semibold text-white">{task.title}</h2>
            </div>
            <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
              {onEdit && (<button type="button" onClick={() => onEdit(task)} className="rounded-md border border-[#333] bg-[#1a1a1a] px-2.5 py-1 text-xs text-white/70 hover:text-white hover:border-[var(--color-primary)]/40 transition-colors">
                  Edit
                </button>)}
              {onDelete && (<button type="button" onClick={() => onDelete(task)} className="rounded-md border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs text-red-300 hover:bg-red-500/15 transition-colors">
                  Delete
                </button>)}
              <button type="button" onClick={onClose} className="rounded-md border border-transparent px-2 py-1 text-xs text-white/50 hover:border-[#333] hover:bg-[#1f1f1f] hover:text-white/80">
                Close
              </button>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1 rounded-full bg-[#1a1a1a] px-2 py-1 text-white/60">
              <span className="text-white/40">Type</span>
              <span className="font-medium capitalize">{task.type}</span>
            </div>
            <div className="flex items-center gap-1 rounded-full bg-[#1a1a1a] px-2 py-1 text-white/60">
              <span className="text-white/40">Priority</span>
              <span className="flex items-center gap-1 font-medium capitalize">
                {getPriorityIcon(task.priority)}
                <span>{task.priority}</span>
              </span>
            </div>
            {typeof task.points === 'number' && (<div className="flex items-center gap-1 rounded-full bg-[#1a1a1a] px-2 py-1 text-white/60">
                <span className="text-white/40">Story points</span>
                <span className="font-medium">{task.points}</span>
              </div>)}
            <div className="flex items-center gap-1 rounded-full bg-[#1a1a1a] px-2 py-1 text-white/60">
              <span className="text-white/40">Status</span>
              <span className="font-medium capitalize">{task.status.replace('-', ' ')}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-[#1a1a1a] px-2 py-1 text-white/60">
              <span className="text-white/40">Assignee</span>
              {task.assignee ? (<div className="flex items-center gap-1 rounded-full bg-[var(--color-primary)]/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary)]" title={`Assignee: ${task.assignee}`}>
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[var(--color-primary)]/20">
                    {getAssigneeInitials(task.assignee)}
                  </span>
                  <span>{task.assignee}</span>
                </div>) : (<span className="text-white/40">Unassigned</span>)}
            </div>
          </div>

          <div className="mt-4 grid gap-6 md:grid-cols-1">
            <div>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-white/40">Description</h3>
              <div className="rounded-md border border-[#262626] bg-[#151515] p-3 text-sm text-white/70">
                {task.description || (<span className="text-white/40">No description.</span>)}
              </div>
            </div>

            <div className="space-y-3 text-xs text-white/60">
              <div>
                <div className="mb-1 font-semibold uppercase tracking-wide text-white/40">People</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Reporter</span>
                    <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[11px] text-white/70">
                      —
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Assignee</span>
                    <span className="rounded-full bg-[#1a1a1a] px-2 py-0.5 text-[11px] text-white/70">
                      {task.assignee || 'Unassigned'}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-1 font-semibold uppercase tracking-wide text-white/40">Meta</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span>Key</span>
                    <span className="text-white/80">{task.id}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Type</span>
                    <span className="capitalize">{task.type}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Priority</span>
                    <span className="capitalize">{task.priority}</span>
                  </div>
                </div>
              </div>

              {task.repositories && task.repositories.length > 0 && (<div>
                  <div className="mb-1 font-semibold uppercase tracking-wide text-white/40">Repositories</div>
                  <div className="flex flex-wrap gap-1.5">
                    {task.repositories.map((repo) => (<span key={repo} className="inline-flex items-center gap-1 rounded bg-[#1a1a1a] border border-[#262626] px-1.5 py-0.5 text-[11px] text-white/60">
                        <GitBranch className="w-2.5 h-2.5"/>
                        {repo}
                      </span>))}
                  </div>
                </div>)}
            </div>
          </div>
        </div>

        <div className="custom-scrollbar flex min-h-[220px] min-w-0 flex-1 flex-col border-t border-[#262626] bg-[#121212] p-5 md:max-h-none md:border-t-0 md:p-6">
          <div className="flex shrink-0 flex-col gap-3 border-b border-[#262626] pb-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">Saved code context</h3>
              <p className="mt-1 text-[11px] text-white/35 leading-relaxed">
                Written to your org after each run. Includes ownership, caution areas, files, and entry points.
              </p>
              {lastAnalyzedAt && !panelBusy && (<p className="mt-1 text-[11px] text-white/30">
                  Last saved: {formatAnalyzedAt(lastAnalyzedAt)}
                </p>)}
            </div>
            <button type="button" onClick={runQdrantSummarize} disabled={compassLoading || !orgShortId || savedAnalysisLoading} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/15 px-3 py-2 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
              {compassLoading ? (<>
                  <Loader2 className="w-3.5 h-3.5 animate-spin"/>
                  Working…
                </>) : (<>
                  <Search className="w-3.5 h-3.5"/>
                  Summarize & find code
                </>)}
            </button>
          </div>

          {compassError && (<p className="mt-3 text-xs text-red-400/90">{compassError}</p>)}

          <div className={`min-h-0 flex-1 overflow-y-auto pt-4 ${panelBusy ? 'opacity-60' : ''}`}>
            {savedAnalysisLoading && !compassCtx && (<p className="text-sm text-white/35">Loading saved analysis…</p>)}

            {!savedAnalysisLoading && compassCtx && (<div className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center rounded-full bg-[#1a1a1a] border border-[#262626] px-2.5 py-0.5 text-[11px] text-white/50">
                    {compassCtx.area}
                  </span>
                  <RiskBadge level={compassCtx.riskLevel}/>
                </div>
                <CompassInsightsBlocks ctx={compassCtx}/>
              </div>)}

            {!savedAnalysisLoading && !compassCtx && !compassLoading && !compassError && (<p className="text-sm text-white/35">
                Run analysis to map this ticket to relevant files and entry points. Results are saved for this task.
              </p>)}
          </div>
        </div>
      </div>
    </div>);
}
function BoardCard({ task, onClick }: {
    task: Task;
    onClick: () => void;
}) {
    return (<button type="button" onClick={onClick} className="bg-[#262626] border border-[#333] hover:border-[var(--color-primary)]/50 hover:bg-[#2a2a2a] transition-colors rounded-md p-3 shadow-sm cursor-pointer text-left group w-full">
      <div className="flex justify-between items-start mb-2">
        <span className="text-xs font-medium text-white/50 group-hover:text-white/70 transition-colors">{task.id}</span>
        <span className="text-white/40 hover:text-white/80 opacity-0 group-hover:opacity-100 transition-opacity">
          <MoreHorizontal className="w-4 h-4"/>
        </span>
      </div>
      
      <p className="text-sm text-white mb-4 line-clamp-3">{task.title}</p>
      
      <div className="flex items-center justify-between mt-auto">
        <div className="flex items-center gap-2">
          <div title={`Type: ${task.type}`}>{getTypeIcon(task.type)}</div>
          <div title={`Priority: ${task.priority}`}>{getPriorityIcon(task.priority)}</div>
          {task.points && (<span className="text-[10px] font-medium text-white/50 bg-[#1a1a1a] px-1.5 py-0.5 rounded-full" title="Story Points">
              {task.points}
            </span>)}
        </div>
        
        {task.assignee ? (<div className="w-5 h-5 rounded-full bg-[var(--color-primary)]/20 border border-[var(--color-primary)]/30 flex items-center justify-center text-[10px] font-bold text-[var(--color-primary)]" title={`Assignee: ${task.assignee}`}>
            {getAssigneeInitials(task.assignee)}
          </div>) : (<div className="w-5 h-5 rounded-full bg-[#1a1a1a] border border-[#333] border-dashed flex items-center justify-center text-white/30" title="Unassigned">
            <span className="sr-only">Unassigned</span>
          </div>)}
      </div>
    </button>);
}
function RiskBadge({ level }: {
    level: RiskLevel;
}) {
    const styles: Record<RiskLevel, string> = {
        low: 'bg-green-500/10 text-green-400 border-green-500/20',
        medium: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
        high: 'bg-red-500/10 text-red-400 border-red-500/20',
    };
    return (<span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold capitalize ${styles[level]}`}>
      {level === 'high' && <AlertTriangle className="mr-1 w-3 h-3"/>}
      {level} risk
    </span>);
}
function FileBadgeTag({ badge }: {
    badge: FileBadge;
}) {
    const colors: Record<FileBadge, string> = {
        core: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
        helper: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
        config: 'bg-slate-500/10 text-slate-400 border-slate-500/20',
        UI: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
        route: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
        service: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
        schema: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
        test: 'bg-pink-500/10 text-pink-400 border-pink-500/20',
    };
    return (<span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[10px] font-medium ${colors[badge]}`}>
      {badge}
    </span>);
}
function SectionHeader({ icon, title }: {
    icon: React.ReactNode;
    title: string;
}) {
    return (<div className="flex items-center gap-2 mb-3">
      <div className="flex items-center justify-center w-6 h-6 rounded bg-[#1a1a1a] border border-[#262626] text-white/40">
        {icon}
      </div>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-white/50">{title}</h3>
    </div>);
}
function formatAnalyzedAt(iso: string): string {
    try {
        const d = new Date(iso);
        const now = new Date();
        const diffMs = now.getTime() - d.getTime();
        const diffM = Math.floor(diffMs / 60000);
        const diffH = Math.floor(diffMs / 3600000);
        const diffD = Math.floor(diffMs / 86400000);
        if (diffM < 1)
            return 'Just now';
        if (diffM < 60)
            return `${diffM}m ago`;
        if (diffH < 24)
            return `${diffH}h ago`;
        if (diffD < 7)
            return `${diffD}d ago`;
        return d.toLocaleString();
    }
    catch {
        return iso;
    }
}
function CompassInsightsBlocks({ ctx }: {
    ctx: CompassContext;
}) {
    return (<>
      {ctx.cautionAreas.length > 0 && (<div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <SectionHeader icon={<AlertTriangle className="w-3.5 h-3.5"/>} title="Areas to Proceed with Caution"/>
          <div className="space-y-2">
            {ctx.cautionAreas.map((item, i) => (<div key={i} className="flex items-start gap-3 rounded-md border border-[#1e1e1e] bg-[#171717] px-3 py-2.5">
                <FileCode className="mt-0.5 w-3.5 h-3.5 shrink-0 text-amber-400/60"/>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs text-white/70 font-mono">{item.file}</code>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${item.label === 'manual approval'
                    ? 'bg-red-500/10 text-red-400 border-red-500/20'
                    : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                      {item.label === 'manual approval' && <Shield className="mr-0.5 w-2.5 h-2.5"/>}
                      {item.label}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-white/40 leading-relaxed">{item.reason}</p>
                </div>
              </div>))}
          </div>
        </div>)}

      {ctx.relevantFiles.length > 0 && (<div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <SectionHeader icon={<FileCode className="w-3.5 h-3.5"/>} title="Relevant Files"/>
          <div className="space-y-2">
            {ctx.relevantFiles.map((item, i) => (<div key={i} className="flex items-start gap-3 rounded-md border border-[#1e1e1e] bg-[#171717] px-3 py-2.5">
                <FileCode className="mt-0.5 w-3.5 h-3.5 shrink-0 text-white/25"/>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <code className="text-xs text-white/70 font-mono truncate">{item.file}</code>
                    <FileBadgeTag badge={item.badge}/>
                  </div>
                  <p className="mt-1 text-xs text-white/40 leading-relaxed">{item.reason}</p>
                </div>
              </div>))}
          </div>
        </div>)}

      {ctx.entryPoints.length > 0 && (<div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <SectionHeader icon={<Play className="w-3.5 h-3.5"/>} title="Entry Points"/>
          <div className="space-y-2">
            {ctx.entryPoints.map((item, i) => (<div key={i} className="flex items-start gap-3 rounded-md border border-[#1e1e1e] bg-[#171717] px-3 py-2.5">
                <Play className="mt-0.5 w-3 h-3 shrink-0 text-[var(--color-primary)]/60"/>
                <div className="min-w-0 flex-1">
                  <code className="text-xs text-white/70 font-mono">{item.target}</code>
                  <p className="mt-1 text-xs text-white/40 leading-relaxed">{item.reason}</p>
                </div>
              </div>))}
          </div>
        </div>)}

      {ctx.ownership.length > 0 && (<div className="rounded-lg border border-[#262626] bg-[#141414] p-5">
          <SectionHeader icon={<Users className="w-3.5 h-3.5"/>} title="Ownership & Context"/>
          <p className="text-[11px] text-white/30 mb-3 -mt-1">People to contact for questions about this area</p>
          <div className="space-y-2">
            {ctx.ownership.map((person, i) => {
                const typeColors: Record<string, string> = {
                    owner: 'bg-[var(--color-primary)]/15 text-[var(--color-primary)] border-[var(--color-primary)]/25',
                    contributor: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                    reviewer: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                };
                const typeClass = typeColors[person.type] ?? 'bg-slate-500/10 text-slate-300 border-slate-500/20';
                const initials = person.name
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((w) => w[0])
                    .slice(0, 2)
                    .join('')
                    .toUpperCase();
                return (<div key={i} className="flex items-center gap-3 rounded-md border border-[#1e1e1e] bg-[#171717] px-3 py-2.5">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#1a1a1a] border border-[#333] text-[11px] font-bold text-white/50">
                      {initials || '?'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-white/80 leading-tight">{person.name}</p>
                      <p className="text-[11px] text-white/35 leading-relaxed mt-0.5">{person.role}</p>
                    </div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize shrink-0 ${typeClass}`}>
                      {person.type}
                    </span>
                  </div>);
            })}
          </div>
        </div>)}
    </>);
}
function BoardView({ tasks, orgShortId, onCreateInColumn, onEditTask, onDeleteTask, }: {
    tasks: Task[];
    orgShortId: string;
    onCreateInColumn: (status: Status) => void;
    onEditTask: (task: Task) => void;
    onDeleteTask: (task: Task) => void;
}) {
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    return (<div className="flex h-[calc(100vh-220px)] gap-4 overflow-x-auto pb-4 pt-2 -mx-4 px-4 custom-scrollbar">
      {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);
            return (<div key={col.id} className="flex flex-col w-[300px] flex-shrink-0 bg-[#171717] rounded-lg border border-[#262626]">
            
            <div className="flex items-center justify-between p-3 border-b border-[#262626] bg-[#1a1a1a] rounded-t-lg sticky top-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold text-white/90">{col.title}</h3>
                <span className="text-xs font-medium text-white/40 bg-[#262626] px-1.5 py-0.5 rounded-full">
                  {columnTasks.length}
                </span>
              </div>
              <div className="flex gap-1">
                <button type="button" title="Add task to this column" onClick={() => onCreateInColumn(col.id)} className="p-1 text-white/40 hover:text-white/80 hover:bg-[#262626] rounded transition-colors cursor-pointer">
                  <Plus className="w-4 h-4"/>
                </button>
                <button type="button" className="p-1 text-white/40 hover:text-white/80 hover:bg-[#262626] rounded transition-colors cursor-pointer" aria-hidden>
                  <MoreHorizontal className="w-4 h-4"/>
                </button>
              </div>
            </div>

            
            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
              {columnTasks.map((task) => (<BoardCard key={task.id} task={task} onClick={() => setSelectedTask(task)}/>))}

              {columnTasks.length === 0 && (<div className="flex flex-col items-center justify-center h-24 border-2 border-dashed border-[#262626] rounded-md text-white/30 text-xs">
                  No tasks
                </div>)}
            </div>

            
            <div className="p-2 pt-0 mt-auto">
              <button type="button" onClick={() => onCreateInColumn(col.id)} className="w-full flex items-center gap-2 px-2 py-1.5 text-sm text-white/50 hover:text-white/90 hover:bg-[#262626] rounded transition-colors group cursor-pointer">
                <Plus className="w-3.5 h-3.5 text-white/40 group-hover:text-white/80"/>
                Add task
              </button>
            </div>
          </div>);
        })}

      {selectedTask && (<TaskDetailsModal task={selectedTask} orgShortId={orgShortId} onClose={() => setSelectedTask(null)} onEdit={(t) => {
                setSelectedTask(null);
                onEditTask(t);
            }} onDelete={(t) => {
                onDeleteTask(t);
                setSelectedTask(null);
            }}/>)}
    </div>);
}
function getAssigneeInitials(assignee: string): string {
    const s = assignee.trim();
    if (!s)
        return 'Me';
    const parts = s.split(/\s+/).filter(Boolean);
    if (parts.length >= 2)
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
    if (s.includes('@'))
        return s.slice(0, 2).toUpperCase();
    return s.slice(0, 2).toUpperCase();
}
export default function TaskCompassPage({ params }: PageProps) {
    const { data: session } = useSession();
    const [orgShortId, setOrgShortId] = useState('');
    const [tasks, setTasks] = useState<Task[]>([]);
    const [tasksLoading, setTasksLoading] = useState(false);
    const [tasksError, setTasksError] = useState<string | null>(null);
    const [orgMembers, setOrgMembers] = useState<OrgMemberSummary[]>([]);
    const [membersLoading, setMembersLoading] = useState(false);
    const [taskFormOpen, setTaskFormOpen] = useState(false);
    const [formInitialStatus, setFormInitialStatus] = useState<Status>('backlog');
    const [editingTask, setEditingTask] = useState<Task | null>(null);
    const currentUserId = session?.user?.id ?? '';
    const loadTasks = useCallback(async () => {
        if (!orgShortId)
            return;
        setTasksLoading(true);
        setTasksError(null);
        try {
            const r = await fetch(`${orgApiBase(orgShortId)}/task-compass/tasks`, { credentials: 'include' });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) {
                throw new Error(data?.error || 'Failed to load tasks');
            }
            setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        }
        catch (e) {
            setTasksError(e instanceof Error ? e.message : 'Failed to load tasks');
            setTasks([]);
        }
        finally {
            setTasksLoading(false);
        }
    }, [orgShortId]);
    const loadMembers = useCallback(async () => {
        if (!orgShortId)
            return;
        setMembersLoading(true);
        try {
            const r = await fetch(`${orgApiBase(orgShortId)}/members`, { credentials: 'include' });
            const data = await r.json().catch(() => ({}));
            if (r.ok && Array.isArray(data.members)) {
                setOrgMembers(data.members);
            }
            else {
                setOrgMembers([]);
            }
        }
        finally {
            setMembersLoading(false);
        }
    }, [orgShortId]);
    useEffect(() => {
        Promise.resolve(params).then((p) => {
            const raw = p.orgShortId || '';
            setOrgShortId(raw.startsWith('org-') ? raw.replace('org-', '') : raw);
        });
    }, [params]);
    useEffect(() => {
        if (!orgShortId) {
            setTasks([]);
            setOrgMembers([]);
            return;
        }
        void loadTasks();
        void loadMembers();
    }, [orgShortId, loadTasks, loadMembers]);
    const openCreateTask = useCallback((status: Status = 'backlog') => {
        setEditingTask(null);
        setFormInitialStatus(status);
        setTaskFormOpen(true);
    }, []);
    const openEditTask = useCallback((task: Task) => {
        setEditingTask(task);
        setFormInitialStatus(task.status);
        setTaskFormOpen(true);
    }, []);
    const closeTaskForm = useCallback(() => {
        setTaskFormOpen(false);
        setEditingTask(null);
    }, []);
    const handleSaveTaskPayload = useCallback(async (payload: TaskSavePayload) => {
        if (!orgShortId)
            throw new Error('No organization');
        const base = orgApiBase(orgShortId);
        const body = {
            title: payload.title,
            description: payload.description,
            type: payload.type,
            priority: payload.priority,
            status: payload.status,
            points: payload.points,
            repositories: payload.repositories,
            assigneeUserId: payload.assigneeUserId,
        };
        if (payload.id) {
            const r = await fetch(`${base}/task-compass/tasks/${encodeURIComponent(payload.id)}`, {
                method: 'PATCH',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) {
                throw new Error(data?.error || data?.message || 'Failed to update task');
            }
        }
        else {
            const r = await fetch(`${base}/task-compass/tasks`, {
                method: 'POST',
                credentials: 'include',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await r.json().catch(() => ({}));
            if (!r.ok) {
                throw new Error(data?.error || data?.message || 'Failed to create task');
            }
        }
        await loadTasks();
        closeTaskForm();
    }, [orgShortId, loadTasks, closeTaskForm]);
    const handleDeleteTask = useCallback(async (task: Task) => {
        if (!orgShortId)
            return;
        const r = await fetch(`${orgApiBase(orgShortId)}/task-compass/tasks/${encodeURIComponent(task.id)}`, {
            method: 'DELETE',
            credentials: 'include',
        });
        if (r.ok) {
            deleteTaskCompassResult(orgShortId, task.id);
            await loadTasks();
        }
    }, [orgShortId, loadTasks]);
    return (<div className="mx-auto max-w-screen-2xl">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-1">
        <h1 className="text-3xl font-bold text-white">Task Compass</h1>
        <button type="button" onClick={() => openCreateTask('backlog')} className="inline-flex items-center justify-center gap-2 rounded-md border border-[var(--color-primary)]/40 bg-[var(--color-primary)]/15 px-4 py-2 text-sm font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/25 transition-colors shrink-0 self-start sm:self-auto">
          <Plus className="w-4 h-4"/>
          Add task
        </button>
      </div>

      {tasksError && (<div className="mb-4 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
          {tasksError}
        </div>)}

      <TaskFormModal open={taskFormOpen} onClose={closeTaskForm} initialStatus={formInitialStatus} editingTask={editingTask} orgMembers={orgMembers} currentUserId={currentUserId} membersLoading={membersLoading} onSave={handleSaveTaskPayload}/>

      <div className="mt-6 pt-2">
        {tasksLoading && (<p className="text-sm text-white/40 mb-4">Loading tasks…</p>)}
        <BoardView tasks={tasks} orgShortId={orgShortId} onCreateInColumn={openCreateTask} onEditTask={openEditTask} onDeleteTask={handleDeleteTask}/>
      </div>
    </div>);
}
