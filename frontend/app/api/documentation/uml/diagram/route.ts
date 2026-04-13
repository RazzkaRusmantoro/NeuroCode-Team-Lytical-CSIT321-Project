import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import { getOrganizationByShortId } from '@/lib/models/organization';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
export async function GET(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const { searchParams } = new URL(request.url);
        const orgShortId = searchParams.get('orgShortId');
        const repoUrlName = searchParams.get('repoUrlName');
        const slug = searchParams.get('slug');
        if (!orgShortId || !repoUrlName || !slug) {
            return NextResponse.json({ error: 'orgShortId, repoUrlName, and slug are required' }, { status: 400 });
        }
        const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const repository = await getRepositoryByUrlNameAndOrganization(repoUrlName, organization._id!.toString());
        if (!repository) {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }
        const url = new URL(`${PYTHON_SERVICE_URL}/api/uml-diagram`);
        url.searchParams.set('organization_id', organization._id!.toString());
        url.searchParams.set('repository_id', repository._id!.toString());
        url.searchParams.set('slug', slug);
        const pythonResponse = await fetch(url.toString());
        if (!pythonResponse.ok) {
            const err = await pythonResponse.text();
            return NextResponse.json({ error: pythonResponse.status === 404 ? 'Diagram not found' : err }, { status: pythonResponse.status });
        }
        const data = await pythonResponse.json();
        return NextResponse.json(data);
    }
    catch (error) {
        console.error('[UML Diagram Fetch Error]', error);
        return NextResponse.json({
            error: 'Failed to fetch UML diagram',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
