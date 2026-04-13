import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { listOrganizationMemberSummaries } from '@/lib/models/organization_members';
export async function GET(_request: Request, { params }: {
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
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const resolvedParams = await Promise.resolve(params);
        const raw = resolvedParams.orgShortId;
        const shortId = raw.startsWith('org-') ? raw.replace('org-', '') : raw;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const userOrg = user.organizations?.find((org) => org.organizationId.toString() === organization._id!.toString());
        if (!userOrg) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        const members = await listOrganizationMemberSummaries(organization);
        return NextResponse.json({ members });
    }
    catch (e) {
        console.error('[org members GET]', e);
        return NextResponse.json({ error: 'Failed to load members' }, { status: 500 });
    }
}
