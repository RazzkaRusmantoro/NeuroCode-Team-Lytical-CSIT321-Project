const README_MAX_CHARS = 4000;
const ROOT_ENTRIES_MAX = 40;
export interface RepoContextResult {
    readmeExcerpt: string | null;
    rootEntries: string[];
}
export async function fetchRepoContext(repoFullName: string, accessToken: string, branch: string = 'main'): Promise<RepoContextResult> {
    const headers = {
        Authorization: `token ${accessToken}`,
        Accept: 'application/vnd.github.v3+json',
    };
    const result: RepoContextResult = { readmeExcerpt: null, rootEntries: [] };
    try {
        const readmeRes = await fetch(`https://api.github.com/repos/${repoFullName}/readme?ref=${branch}`, { headers });
        if (readmeRes.ok) {
            const data = (await readmeRes.json()) as {
                content?: string;
                encoding?: string;
            };
            if (data.content && data.encoding === 'base64') {
                const raw = Buffer.from(data.content, 'base64').toString('utf-8');
                const excerpt = raw.slice(0, README_MAX_CHARS);
                result.readmeExcerpt = excerpt + (raw.length > README_MAX_CHARS ? '\n...[truncated]' : '');
            }
        }
    }
    catch {
    }
    try {
        const contentsRes = await fetch(`https://api.github.com/repos/${repoFullName}/contents?ref=${branch}`, { headers });
        if (contentsRes.ok) {
            const contents = (await contentsRes.json()) as {
                name?: string;
            }[];
            if (Array.isArray(contents)) {
                result.rootEntries = contents
                    .map((c) => c.name)
                    .filter((n): n is string => typeof n === 'string')
                    .slice(0, ROOT_ENTRIES_MAX);
            }
        }
    }
    catch {
    }
    return result;
}
export function getRepoFullNameFromUrl(repoUrl: string): string | null {
    if (!repoUrl)
        return null;
    try {
        const url = new URL(repoUrl);
        const pathParts = url.pathname.split('/').filter(Boolean);
        if (pathParts.length >= 2) {
            const owner = pathParts[0];
            const repo = pathParts[1].replace(/\.git$/, '');
            return `${owner}/${repo}`;
        }
    }
    catch {
    }
    return null;
}
