import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getUserById, getUsersCollection } from '@/lib/models/user';
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const code = searchParams.get('code');
        const error = searchParams.get('error');
        const state = searchParams.get('state');
        if (error) {
            return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(error)}`, request.url));
        }
        if (!code) {
            return NextResponse.redirect(new URL('/settings?error=no_code', request.url));
        }
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.redirect(new URL('/login?error=not_authenticated', request.url));
        }
        const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
            },
            body: JSON.stringify({
                client_id: process.env.GITHUB_CLIENT_ID,
                client_secret: process.env.GITHUB_CLIENT_SECRET,
                code: code,
            }),
        });
        const tokenData = await tokenResponse.json();
        if (tokenData.error) {
            return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent(tokenData.error_description || tokenData.error)}`, request.url));
        }
        const accessToken = tokenData.access_token;
        const userResponse = await fetch('https://api.github.com/user', {
            headers: {
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!userResponse.ok) {
            return NextResponse.redirect(new URL('/settings?error=github_api_error', request.url));
        }
        const githubUser = await userResponse.json();
        const user = await getUserById(session.user.id);
        if (!user) {
            return NextResponse.redirect(new URL('/login?error=user_not_found', request.url));
        }
        const collection = await getUsersCollection();
        await collection.updateOne({ _id: user._id }, {
            $set: {
                github: {
                    providerAccount: githubUser.login,
                    providerUserId: githubUser.id.toString(),
                    accessToken: accessToken,
                    scope: tokenData.scope?.split(',') || [],
                    connectedAt: new Date(),
                    status: 'active' as const,
                },
                updatedAt: new Date(),
            },
        });
        return NextResponse.redirect(new URL('/settings?github_connected=true', request.url));
    }
    catch (error) {
        console.error('GitHub OAuth callback error:', error);
        return NextResponse.redirect(new URL('/settings?error=oauth_error', request.url));
    }
}
