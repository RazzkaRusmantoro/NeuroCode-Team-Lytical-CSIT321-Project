'use client';
import { Send, Search, MoreHorizontal, CheckCircle2, AlertCircle, ShieldCheck, ShieldOff, UserMinus } from 'lucide-react';
import { useState, useCallback, useTransition, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { Checkbox } from '@/components/ui/checkbox';
import { sendOrgInvite, kickMember, setMemberRole } from '@/actions/organization';
const ACCENT = 'var(--color-primary)';
export type MemberRow = {
    id: string;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'member';
    dateJoined: string;
};
function RoleBadge({ role }: {
    role: 'owner' | 'admin' | 'member';
}) {
    const styles = role === 'owner'
        ? 'bg-[var(--color-primary)]/20 text-[var(--color-primary)] border-[var(--color-primary)]/40'
        : role === 'admin'
            ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
            : 'bg-white/10 text-white/80 border-[#262626]';
    return (<span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium border capitalize ${styles}`}>
            {role}
        </span>);
}
function Avatar({ name, className }: {
    name: string;
    className?: string;
}) {
    const initials = name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase();
    return (<div className={`flex items-center justify-center rounded-md bg-[#2a2a2a] border border-[#262626] text-white/90 font-semibold text-sm ${className ?? 'w-9 h-9'}`}>
            {initials}
        </div>);
}
interface MemberMenuProps {
    member: MemberRow;
    orgId: string;
    currentUserRole: 'owner' | 'admin' | 'member';
    currentUserId: string;
    onAction: () => void;
}
function MemberMenu({ member, orgId, currentUserRole, currentUserId, onAction }: MemberMenuProps) {
    const [open, setOpen] = useState(false);
    const [menuStyle, setMenuStyle] = useState<{
        top: number;
        left: number;
    }>({ top: 0, left: 0 });
    const [isPending, startTransition] = useTransition();
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error';
        msg: string;
    } | null>(null);
    const btnRef = useRef<HTMLButtonElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const router = useRouter();
    useEffect(() => {
        if (!open)
            return;
        const handleOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node) &&
                btnRef.current && !btnRef.current.contains(e.target as Node))
                setOpen(false);
        };
        const handleScroll = () => setOpen(false);
        document.addEventListener('mousedown', handleOutside);
        window.addEventListener('scroll', handleScroll, true);
        return () => {
            document.removeEventListener('mousedown', handleOutside);
            window.removeEventListener('scroll', handleScroll, true);
        };
    }, [open]);
    const canKick = member.id !== currentUserId &&
        member.role !== 'owner' &&
        (currentUserRole === 'owner' || (currentUserRole === 'admin' && member.role === 'member'));
    const canMakeAdmin = currentUserRole === 'owner' && member.role === 'member' && member.id !== currentUserId;
    const canRemoveAdmin = currentUserRole === 'owner' && member.role === 'admin' && member.id !== currentUserId;
    if (!canKick && !canMakeAdmin && !canRemoveAdmin)
        return null;
    const handleOpen = () => {
        if (!btnRef.current)
            return;
        const rect = btnRef.current.getBoundingClientRect();
        setMenuStyle({ top: rect.bottom + 6, left: rect.right - 176 });
        setOpen((v) => !v);
    };
    const run = (action: () => Promise<{
        success?: boolean;
        error?: string;
    }>) => {
        setFeedback(null);
        startTransition(async () => {
            const res = await action();
            if (res.success) {
                setOpen(false);
                onAction();
                router.refresh();
            }
            else {
                setFeedback({ type: 'error', msg: res.error || 'Something went wrong' });
                setTimeout(() => setFeedback(null), 3000);
            }
        });
    };
    const menu = open ? (<div ref={menuRef} style={{ position: 'fixed', top: menuStyle.top, left: menuStyle.left, zIndex: 9999, width: 176 }} className="bg-[#1a1a1a] border border-[#333] rounded-lg shadow-xl py-1 overflow-hidden">
            {feedback && (<p className={`px-3 py-1.5 text-xs ${feedback.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                    {feedback.msg}
                </p>)}
            {canMakeAdmin && (<button type="button" onClick={() => run(() => setMemberRole(orgId, member.id, 'admin'))} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-amber-400 hover:bg-[#262626] transition-colors cursor-pointer">
                    <ShieldCheck className="w-4 h-4"/> Make admin
                </button>)}
            {canRemoveAdmin && (<button type="button" onClick={() => run(() => setMemberRole(orgId, member.id, 'member'))} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-white/70 hover:bg-[#262626] transition-colors cursor-pointer">
                    <ShieldOff className="w-4 h-4"/> Remove admin
                </button>)}
            {canKick && (canMakeAdmin || canRemoveAdmin) && (<div className="border-t border-[#333] my-1"/>)}
            {canKick && (<button type="button" onClick={() => run(() => kickMember(orgId, member.id))} className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer">
                    <UserMinus className="w-4 h-4"/> Kick member
                </button>)}
        </div>) : null;
    return (<>
            <button ref={btnRef} type="button" onClick={handleOpen} disabled={isPending} className="p-2 rounded-lg text-white/50 hover:text-white hover:bg-[#2a2a2a] transition-colors disabled:opacity-40" aria-label="Manage member">
                <MoreHorizontal className="w-4 h-4"/>
            </button>
            {typeof document !== 'undefined' && menu && createPortal(menu, document.body)}
        </>);
}
interface ManagementClientProps {
    members: MemberRow[];
    orgShortId: string;
    orgId: string;
    orgName: string;
    currentUserId: string;
    currentUserRole: 'owner' | 'admin' | 'member';
}
export default function ManagementClient({ members, orgShortId, orgId, orgName, currentUserId, currentUserRole }: ManagementClientProps) {
    const [inviteEmail, setInviteEmail] = useState('');
    const [memberSearch, setMemberSearch] = useState('');
    const [selectedMemberIds, setSelectedMemberIds] = useState<Set<string>>(new Set());
    const [inviteStatus, setInviteStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [inviteError, setInviteError] = useState('');
    const [isPending, startTransition] = useTransition();
    const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';
    const filteredMembers = memberSearch.trim()
        ? members.filter((m) => m.name.toLowerCase().includes(memberSearch.trim().toLowerCase()) ||
            m.email.toLowerCase().includes(memberSearch.trim().toLowerCase()))
        : members;
    const selectableIds = filteredMembers
        .filter((m) => m.id !== currentUserId &&
        m.role !== 'owner' &&
        (currentUserRole === 'owner' || (currentUserRole === 'admin' && m.role === 'member')))
        .map((m) => m.id);
    const toggleMember = useCallback((id: string) => {
        setSelectedMemberIds((prev) => {
            const next = new Set(prev);
            if (next.has(id))
                next.delete(id);
            else
                next.add(id);
            return next;
        });
    }, []);
    const toggleSelectAll = useCallback((checked: boolean | 'indeterminate') => {
        setSelectedMemberIds((prev) => {
            const next = new Set(prev);
            if (checked === true)
                selectableIds.forEach((id) => next.add(id));
            else
                selectableIds.forEach((id) => next.delete(id));
            return next;
        });
    }, [selectableIds]);
    const handleSendInvite = () => {
        const email = inviteEmail.trim();
        if (!email)
            return;
        setInviteStatus('idle');
        setInviteError('');
        startTransition(async () => {
            const result = await sendOrgInvite(orgId, orgShortId, orgName, email);
            if (result.success) {
                setInviteEmail('');
                setInviteStatus('success');
                setTimeout(() => setInviteStatus('idle'), 3000);
            }
            else {
                setInviteError(result.error || 'Failed to send invite');
                setInviteStatus('error');
                setTimeout(() => setInviteStatus('idle'), 4000);
            }
        });
    };
    const allSelectableChecked = selectableIds.length > 0 && selectableIds.every((id) => selectedMemberIds.has(id));
    return (<div className="mx-auto max-w-screen-2xl">
            <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white mb-1">Management</h1>
                    <p className="text-white/60">Manage your team members or invite people by email</p>
                </div>
            </div>

            <div className="border-t border-[#262626] mb-8"/>

            <section className="mb-8">
                {canManage && (<div className="pb-6 mb-6 border-b border-[#262626]">
                        <h2 className="text-lg font-semibold text-white mb-1">Invite by email</h2>
                        <p className="text-sm text-white/60 mb-4">Enter their address — we&apos;ll email them an invite to join this organization.</p>
                        <div className="max-w-xl flex flex-col gap-1.5">
                            <div className="flex items-center gap-2 bg-[#1a1a1a] border border-[#262626] rounded-lg overflow-hidden px-2 py-1.5">
                                <input type="email" placeholder="Email address" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleSendInvite()} disabled={isPending} className="flex-1 min-w-0 bg-transparent px-1 py-1.5 text-white text-sm placeholder-white/40 focus:outline-none disabled:opacity-50"/>
                                <button type="button" onClick={handleSendInvite} disabled={isPending || !inviteEmail.trim()} className="shrink-0 px-3 py-1.5 rounded-md text-sm font-medium text-white transition-all duration-200 cursor-pointer border-0 origin-right hover:scale-x-105 flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-x-100" style={{ background: ACCENT }}>
                                    <Send className="w-4 h-4"/>
                                    {isPending ? 'Sending…' : 'Send invite'}
                                </button>
                            </div>
                            {inviteStatus === 'success' && (<p className="flex items-center gap-1.5 text-xs text-green-400">
                                    <CheckCircle2 className="w-3.5 h-3.5"/> Invite sent successfully
                                </p>)}
                            {inviteStatus === 'error' && (<p className="flex items-center gap-1.5 text-xs text-red-400">
                                    <AlertCircle className="w-3.5 h-3.5"/> {inviteError}
                                </p>)}
                        </div>
                    </div>)}

                <h2 className="text-lg font-semibold text-white mb-1">Team members</h2>
                <p className="text-sm text-white/60 mb-4">View and manage people in this organization</p>
                <div className="relative mb-4 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none"/>
                    <input type="text" placeholder="Search..." value={memberSearch} onChange={(e) => setMemberSearch(e.target.value)} className="w-full pl-10 pr-3 py-2 bg-[#1a1a1a] border border-[#262626] rounded text-white text-sm placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent transition-all"/>
                </div>

                <div className="bg-[#262626]/50 border border-[#262626] rounded-md overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="border-b border-[#262626]">
                                    {canManage && (<th className="w-12 py-4 pl-6 pr-2 text-left">
                                            <Checkbox checked={allSelectableChecked} onCheckedChange={toggleSelectAll} disabled={selectableIds.length === 0} aria-label="Select all"/>
                                        </th>)}
                                    <th className="text-left py-4 px-6 text-xs font-medium text-white uppercase tracking-wider">Member</th>
                                    <th className="text-left py-4 px-6 text-xs font-medium text-white uppercase tracking-wider">Email</th>
                                    <th className="text-left py-4 px-6 text-xs font-medium text-white uppercase tracking-wider">Role</th>
                                    <th className="text-left py-4 px-6 text-xs font-medium text-white uppercase tracking-wider">Date joined</th>
                                    {canManage && <th className="w-12 py-4 px-6"/>}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-[#262626]">
                                {filteredMembers.map((member) => {
            const isSelectable = selectableIds.includes(member.id);
            return (<tr key={member.id} className="hover:bg-[#121215]/50 transition-colors">
                                            {canManage && (<td className="py-4 pl-6 pr-2 w-12">
                                                    {isSelectable ? (<Checkbox checked={selectedMemberIds.has(member.id)} onCheckedChange={() => toggleMember(member.id)} aria-label={`Select ${member.name}`}/>) : (<span className="w-4 h-4 block"/>)}
                                                </td>)}
                                            <td className="py-4 px-6">
                                                <div className="flex items-center gap-3">
                                                    <Avatar name={member.name}/>
                                                    <span className="font-medium text-white">{member.name}</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-6 text-sm text-white/70">{member.email}</td>
                                            <td className="py-4 px-6"><RoleBadge role={member.role}/></td>
                                            <td className="py-4 px-6 text-sm text-white/70">{member.dateJoined}</td>
                                            {canManage && (<td className="py-4 px-6 w-12">
                                                    <MemberMenu member={member} orgId={orgId} currentUserRole={currentUserRole} currentUserId={currentUserId} onAction={() => setSelectedMemberIds((prev) => {
                        const next = new Set(prev);
                        next.delete(member.id);
                        return next;
                    })}/>
                                                </td>)}
                                        </tr>);
        })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </section>
        </div>);
}
