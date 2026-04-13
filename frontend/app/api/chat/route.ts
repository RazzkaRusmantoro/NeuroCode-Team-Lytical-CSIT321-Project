import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const body = await request.json().catch(() => ({}));
        const title = typeof body?.title === 'string' ? body.title : 'New chat';
        const contextId = typeof body?.context_id === 'string' ? body.context_id : undefined;
        const response = await fetch(`${PYTHON_SERVICE_URL}/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: session.user.id,
                title,
                ...(contextId ? { context_id: contextId } : {}),
            }),
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error('[chat create] Python error:', response.status, errText);
            return NextResponse.json({ error: 'Failed to create chat', details: errText }, { status: response.status });
        }
        const data = await response.json();
        return NextResponse.json({
            chatId: data.chatId ?? data.chat_id,
            chat: data.chat ?? null,
        });
    }
    catch (e) {
        console.error('[chat create] Error:', e);
        return NextResponse.json({ error: 'Failed to create chat', details: String(e) }, { status: 500 });
    }
}
