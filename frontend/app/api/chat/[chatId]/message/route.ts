import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
type RouteContext = {
    params: Promise<{
        chatId: string;
    }> | {
        chatId: string;
    };
};
export async function POST(request: NextRequest, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const { chatId } = await Promise.resolve(context.params);
        if (!chatId) {
            return NextResponse.json({ error: 'chatId required' }, { status: 400 });
        }
        const body = await request.json();
        const message = typeof body?.message === 'string' ? body.message.trim() : '';
        const documentationContent = typeof body?.documentation_content === 'string' ? body.documentation_content : undefined;
        if (!message) {
            return NextResponse.json({ error: 'message is required and must be a non-empty string' }, { status: 400 });
        }
        const response = await fetch(`${PYTHON_SERVICE_URL}/chat/${encodeURIComponent(chatId)}/message`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message,
                user_id: session.user.id,
                ...(documentationContent ? { documentation_content: documentationContent } : {}),
            }),
        });
        if (!response.ok) {
            const errText = await response.text();
            console.error('[chat/message] Python error:', response.status, errText);
            return NextResponse.json({ error: 'Chat service failed', details: errText }, { status: response.status });
        }
        const data = await response.json();
        return NextResponse.json({
            reply: data.reply ?? '',
            chat: data.chat ?? null,
        });
    }
    catch (e) {
        console.error('[chat/message] Error:', e);
        return NextResponse.json({ error: 'Chat request failed', details: String(e) }, { status: 500 });
    }
}
