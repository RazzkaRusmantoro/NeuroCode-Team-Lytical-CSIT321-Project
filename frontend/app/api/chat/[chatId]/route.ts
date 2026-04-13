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
export async function GET(request: NextRequest, context: RouteContext) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const { chatId } = await Promise.resolve(context.params);
        if (!chatId) {
            return NextResponse.json({ error: 'chatId required' }, { status: 400 });
        }
        const url = new URL(`${PYTHON_SERVICE_URL}/chat/${encodeURIComponent(chatId)}`);
        url.searchParams.set('user_id', session.user.id);
        const response = await fetch(url.toString());
        if (!response.ok) {
            if (response.status === 404) {
                return NextResponse.json({ error: 'Chat not found' }, { status: 404 });
            }
            const errText = await response.text();
            console.error('[chat/get] Python error:', response.status, errText);
            return NextResponse.json({ error: 'Failed to get chat', details: errText }, { status: response.status });
        }
        const data = await response.json();
        return NextResponse.json(data);
    }
    catch (e) {
        console.error('[chat/get] Error:', e);
        return NextResponse.json({ error: 'Failed to get chat', details: String(e) }, { status: 500 });
    }
}
