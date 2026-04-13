import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getSuggestedPathsByOrganization } from '@/lib/models/onboarding_path_suggestion';
type RouteContext = {
    params: Promise<{
        orgShortId: string;
    }> | {
        orgShortId: string;
    };
};
export async function GET(_request: Request, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const { orgShortId } = await Promise.resolve(context.params);
        const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const isMember = user.organizations?.some((org) => org.organizationId.toString() === organization._id!.toString());
        if (!isMember) {
            return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
        }
        const { paths, generatedAt } = await getSuggestedPathsByOrganization(organization._id!.toString());
        return NextResponse.json({
            success: true,
            paths,
            generatedAt: generatedAt ? generatedAt.toISOString() : null,
        });
    }
    catch (e) {
        console.error('[GET suggested-paths]', e);
        return NextResponse.json({ error: 'Failed to load suggested paths' }, { status: 500 });
    }
}
