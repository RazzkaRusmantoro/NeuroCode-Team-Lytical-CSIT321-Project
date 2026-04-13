import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getInviteToken, markInviteTokenUsed } from '@/lib/models/invite_token';
import { getUsersCollection, getUserById } from '@/lib/models/user';
import { getOrganizationsCollection } from '@/lib/models/organization';
import { ObjectId } from 'mongodb';
type PageProps = {
    searchParams: Promise<{
        token?: string;
    }>;
};
export default async function InvitePage({ searchParams }: PageProps) {
    const { token } = await searchParams;
    if (!token)
        redirect('/');
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        redirect(`/login?callbackUrl=${encodeURIComponent(`/invite?token=${token}`)}`);
    }
    const invite = await getInviteToken(token);
    if (!invite) {
        return <InviteError message="This invite link is invalid or has expired."/>;
    }
    const userId = new ObjectId(session.user.id);
    const user = await getUserById(session.user.id);
    const alreadyMember = user?.organizations?.some((o) => o.organizationId.toString() === invite.organizationId.toString());
    if (!alreadyMember) {
        const now = new Date();
        const usersCollection = await getUsersCollection();
        const orgsCollection = await getOrganizationsCollection();
        await Promise.all([
            usersCollection.updateOne({ _id: userId }, {
                $push: {
                    organizations: {
                        organizationId: invite.organizationId,
                        name: invite.orgName,
                        role: 'member' as const,
                        joinedAt: now,
                    },
                },
                $set: { updatedAt: now },
            }),
            orgsCollection.updateOne({ _id: invite.organizationId }, {
                $addToSet: { members: userId },
                $set: { updatedAt: now },
            }),
        ]);
        await markInviteTokenUsed(token);
    }
    redirect(`/org-${invite.orgShortId}/dashboard`);
}
function InviteError({ message }: {
    message: string;
}) {
    return (<div className="min-h-screen flex items-center justify-center px-4">
            <div className="text-center max-w-sm">
                <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-4">
                    <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
                    </svg>
                </div>
                <h1 className="text-lg font-semibold text-white mb-2">Invite Invalid</h1>
                <p className="text-sm text-white/50 mb-6">{message}</p>
                <a href="/login" className="text-sm text-[var(--color-primary-light)] hover:underline">
                    Go to login →
                </a>
            </div>
        </div>);
}
