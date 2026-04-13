import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
type Params = Promise<{
    repoId: string;
}>;
export async function GET(_req: NextRequest, { params }: {
    params: Params;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { repoId } = await params;
    try {
        const upstream = await fetch(`${PYTHON_URL}/api/knowledge-graph/${encodeURIComponent(repoId)}`, { next: { revalidate: 0 } });
        if (!upstream.ok) {
            const err = await upstream.json().catch(() => ({}));
            return NextResponse.json({ error: err?.detail || 'Failed to fetch knowledge graph' }, { status: upstream.status });
        }
        return NextResponse.json(await upstream.json());
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
