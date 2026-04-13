'use server';
import type { NextRequest } from 'next/server';
async function handle(request: NextRequest) {
    const { searchParams } = new URL(request.url);
    const target = searchParams.get('url');
    if (!target) {
        return new Response('Missing url parameter', { status: 400 });
    }
    if (request.method === 'OPTIONS') {
        return new Response(null, {
            status: 204,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
                'Access-Control-Allow-Headers': '*',
            },
        });
    }
    try {
        const upstreamHeaders = new Headers();
        request.headers.forEach((value, key) => {
            const lower = key.toLowerCase();
            if (lower === 'host' || lower === 'origin' || lower === 'referer')
                return;
            upstreamHeaders.set(key, value);
        });
        upstreamHeaders.set('User-Agent', 'neurocode-git-proxy');
        const body = request.method === 'GET' || request.method === 'HEAD'
            ? undefined
            : await request.arrayBuffer();
        const upstream = await fetch(target, {
            method: request.method,
            body,
            headers: upstreamHeaders,
        });
        const headers = new Headers(upstream.headers);
        headers.set('Access-Control-Allow-Origin', '*');
        headers.set('Access-Control-Allow-Headers', '*');
        headers.set('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
        return new Response(upstream.body, {
            status: upstream.status,
            statusText: upstream.statusText,
            headers,
        });
    }
    catch (error) {
        return new Response('Proxy request failed', { status: 502 });
    }
}
export async function GET(request: NextRequest) {
    return handle(request);
}
export async function POST(request: NextRequest) {
    return handle(request);
}
export async function OPTIONS(request: NextRequest) {
    return handle(request);
}
