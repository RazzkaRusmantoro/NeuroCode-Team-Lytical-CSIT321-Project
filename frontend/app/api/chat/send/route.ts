import { NextRequest, NextResponse } from 'next/server';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const message = typeof body?.message === 'string' ? body.message.trim() : '';
        const history = Array.isArray(body?.history) ? body.history : [];
        const documentationContent = typeof body?.documentation_content === 'string' ? body.documentation_content : undefined;
        if (!message) {
            return NextResponse.json({ error: 'message is required' }, { status: 400 });
        }
        const response = await fetch(`${PYTHON_SERVICE_URL}/chat/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                history: history.map((m: {
                    role?: string;
                    content?: string;
                }) => ({ role: m.role, content: m.content })),
                ...(documentationContent ? { documentation_content: documentationContent } : {}),
            }),
        });
        if (!response.ok) {
            const errText = await response.text();
            return NextResponse.json({ error: 'Chat service failed', details: errText }, { status: response.status });
        }
        const data = await response.json();
        return NextResponse.json({ reply: data.reply ?? '' });
    }
    catch (e) {
        console.error('[chat/send] Error:', e);
        return NextResponse.json({ error: 'Chat request failed', details: String(e) }, { status: 500 });
    }
}
