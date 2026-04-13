export function getGitHubAvatarUrl(user: {
    github?: {
        status: string;
        providerUserId?: string;
    };
} | null): string | null {
    if (!user?.github?.providerUserId || user.github.status !== 'active')
        return null;
    return `https://avatars.githubusercontent.com/u/${user.github.providerUserId}`;
}
