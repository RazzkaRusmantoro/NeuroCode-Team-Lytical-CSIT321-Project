import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getOnboardingPathDocBySlug } from '@/lib/models/onboarding_path_doc';
type RouteContext = {
    params: Promise<{
        orgShortId: string;
        pathSlug: string;
    }> | {
        orgShortId: string;
        pathSlug: string;
    };
};
export async function GET(_request: NextRequest, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const { orgShortId, pathSlug } = await Promise.resolve(context.params);
        const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
        const slug = decodeURIComponent(pathSlug);
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const isMember = user.organizations?.some((org) => org.organizationId.toString() === organization._id!.toString());
        if (!isMember) {
            return NextResponse.json({ error: 'Not a member of this organization' }, { status: 403 });
        }
        const docRecord = await getOnboardingPathDocBySlug(organization._id!.toString(), slug);
        if (!docRecord || docRecord.status !== 'completed' || !docRecord.s3Key) {
            return NextResponse.json({ error: 'Path content not generated yet' }, { status: 404 });
        }
        const pythonBackendUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
        const response = await fetch(`${pythonBackendUrl}/api/get-documentation`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                s3_key: docRecord.s3Key,
                s3_bucket: docRecord.s3Bucket || process.env.AWS_S3_BUCKET,
            }),
        });
        if (!response.ok) {
            return NextResponse.json({ error: 'Failed to fetch path content from storage' }, { status: response.status });
        }
        const s3Data = await response.json();
        if (!s3Data.success || !s3Data.content) {
            return NextResponse.json({ error: 'Path content not available' }, { status: 404 });
        }
        const content = JSON.parse(s3Data.content);
        return NextResponse.json({
            success: true,
            documentation: {
                _id: docRecord._id?.toString(),
                title: docRecord.title,
                metadata: content.metadata || {},
                documentation: content.documentation || {},
                code_references: content.code_references || [],
            },
        });
    }
    catch (e) {
        console.error('[GET onboarding path content]', e);
        return NextResponse.json({ error: 'Failed to load path content' }, { status: 500 });
    }
}
