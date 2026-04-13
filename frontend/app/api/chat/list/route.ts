import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
export async function GET(request: Request) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const { searchParams } = new URL(request.url);
        const contextId = searchParams.get('context_id') ?? undefined;
        const url = new URL(`${PYTHON_SERVICE_URL}/chat/list`);
        url.searchParams.set('user_id', session.user.id);
        if (contextId)
            url.searchParams.set('context_id', contextId);
        const response = await fetch(url.toString());
        if (!response.ok) {
            const errText = await response.text();
            console.error('[chat/list] Python error:', response.status, errText);
            return NextResponse.json({ error: 'Failed to list chats', details: errText }, { status: response.status });
        }
        const data = await response.json();
        return NextResponse.json(data);
    }
    catch (e) {
        console.error('[chat/list] Error:', e);
        return NextResponse.json({ error: 'Failed to list chats', details: String(e) }, { status: 500 });
    }
}
