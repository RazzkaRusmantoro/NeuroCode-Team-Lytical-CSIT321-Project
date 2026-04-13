import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
const PYTHON_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
type Params = Promise<{
    repoId: string;
}>;
export async function POST(req: NextRequest, { params }: {
    params: Params;
}) {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const { repoId } = await params;
    const body = await req.json();
    const enrichedBody = {
        ...body,
        user_id: session.user.id,
    };
    try {
        const upstream = await fetch(`${PYTHON_URL}/api/knowledge-graph/${encodeURIComponent(repoId)}/agent-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(enrichedBody),
            duplex: 'half',
        });
        if (!upstream.ok) {
            const err = await upstream.json().catch(() => ({}));
            return NextResponse.json({ error: err?.detail || 'Agent request failed' }, { status: upstream.status });
        }
        return new Response(upstream.body, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive',
                'X-Accel-Buffering': 'no',
            },
        });
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
