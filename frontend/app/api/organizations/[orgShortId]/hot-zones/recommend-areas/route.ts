import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getOrganizationByShortId } from '@/lib/models/organization';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
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
        const body = (await request.json().catch(() => ({}))) as {
            query?: string;
            repoUrlNames?: string[];
            topN?: number;
        };
        const query = (body.query || '').trim();
        if (!query) {
            return NextResponse.json({ files: [], symbols: [] });
        }
        const pythonPayload = {
            org_short_id: shortId,
            query,
            repo_url_names: Array.isArray(body.repoUrlNames) ? body.repoUrlNames : null,
            top_n: typeof body.topN === 'number' ? body.topN : 10,
        };
        const resp = await fetch(`${PYTHON_SERVICE_URL}/api/hot-zones/recommend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pythonPayload),
        });
        if (!resp.ok) {
            const errText = await resp.text();
            return NextResponse.json({ error: 'Python hot-zones recommend failed', details: errText }, { status: resp.status });
        }
        const data = await resp.json();
        return NextResponse.json(data);
    }
    catch (e) {
        return NextResponse.json({ error: 'Hot-zones recommend request failed', details: String(e) }, { status: 500 });
    }
}
