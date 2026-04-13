import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import GoogleProvider from 'next-auth/providers/google';
import { getUserByEmail, createOrUpdateOAuthUser, addAuthProviderToUser } from '@/lib/models/user';
import bcrypt from 'bcryptjs';
export const authOptions: NextAuthOptions = {
    providers: [
        CredentialsProvider({
            name: 'Credentials',
            credentials: {
                email: { label: 'Email', type: 'email' },
                password: { label: 'Password', type: 'password' },
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    return null;
                }
                const user = await getUserByEmail(credentials.email as string);
                if (!user || !user.password) {
                    return null;
                }
                const isPasswordValid = await bcrypt.compare(credentials.password as string, user.password);
                if (!isPasswordValid) {
                    return null;
                }
                await addAuthProviderToUser(user.email, 'credentials');
                return {
                    id: user._id?.toString() || '',
                    email: user.email,
                    name: `${user.firstName} ${user.lastName}`,
                };
            },
        }),
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || '',
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
        }),
    ],
    pages: {
        signIn: '/login',
    },
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === 'google' && user.email && user.name) {
                try {
                    const dbUser = await createOrUpdateOAuthUser(user.email, user.name, 'google');
                    user.id = dbUser._id?.toString() || '';
                    return true;
                }
                catch (error) {
                    console.error('Error creating/updating OAuth user:', error);
                    return false;
                }
            }
            if (account?.provider === 'github' && user.email && user.name) {
                try {
                    const dbUser = await createOrUpdateOAuthUser(user.email, user.name, 'github');
                    user.id = dbUser._id?.toString() || '';
                    return true;
                }
                catch (error) {
                    console.error('Error creating/updating OAuth user:', error);
                    return false;
                }
            }
            if (account?.provider === 'credentials') {
                return true;
            }
            return true;
        },
        async jwt({ token, user, account }) {
            if (user) {
                token.id = user.id;
                if (account?.provider === 'google' && user.email && !token.id) {
                    const dbUser = await getUserByEmail(user.email);
                    if (dbUser) {
                        token.id = dbUser._id?.toString() || '';
                    }
                }
            }
            if (token.email && !token.id) {
                const dbUser = await getUserByEmail(token.email as string);
                if (dbUser) {
                    token.id = dbUser._id?.toString() || '';
                }
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
            }
            return session;
        },
    },
    session: {
        strategy: 'jwt' as const,
    },
    secret: process.env.NEXTAUTH_SECRET,
};
const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
