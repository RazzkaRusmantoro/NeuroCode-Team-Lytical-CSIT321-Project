import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { revalidateTag } from 'next/cache';
export async function POST(_request: NextRequest, { params }: {
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
        const rawOrgShortId = resolvedParams.orgShortId;
        const shortId = rawOrgShortId.startsWith('org-')
            ? rawOrgShortId.replace('org-', '')
            : rawOrgShortId;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const userOrg = user.organizations?.find(org => org.organizationId.toString() === organization._id!.toString());
        if (!userOrg) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }
        revalidateTag(`org-repository-options:${organization._id!.toString()}`, 'default');
        return NextResponse.json({ success: true });
    }
    catch (e) {
        return NextResponse.json({ error: 'Failed to revalidate repositories cache', details: String(e) }, { status: 500 });
    }
}
