import { NextRequest, NextResponse } from 'next/server';
export async function POST(request: NextRequest) {
    const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
    try {
        const body = await request.json();
        const upstream = await fetch(`${pythonUrl}/api/knowledge-graph`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        const data = await upstream.json();
        if (!upstream.ok) {
            return NextResponse.json({ error: data?.detail || 'Knowledge graph build failed' }, { status: upstream.status });
        }
        return NextResponse.json(data);
    }
    catch (error) {
        return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
    }
}
