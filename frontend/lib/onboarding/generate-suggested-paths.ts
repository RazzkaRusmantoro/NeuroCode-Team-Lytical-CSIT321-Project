import Anthropic from '@anthropic-ai/sdk';
import { nanoid } from 'nanoid';
import type { SuggestedLearningPath, SuggestedPathModule } from '@/lib/models/onboarding_path_suggestion';
export interface OrgSummaryInput {
    organizationName: string;
    repositories: {
        name: string;
        description?: string;
        urlName?: string;
        readmeExcerpt?: string | null;
        rootEntries?: string[];
    }[];
}
const SYSTEM_PROMPT = `You are an expert at onboarding new developers. You will be given an organization name and, for each repository, real content: the README (or excerpt) and the root-level files and folders. Your job is to suggest onboarding learning paths that are GROUNDED ONLY in this provided content.

STRICT RULES:
- Suggest paths and modules ONLY when they are clearly supported by the repository content you are given. For example: if a README describes a "Getting started" or "Setup" section, you may suggest a module about that; if it lists scripts or commands, you may suggest a module about running the project.
- Do NOT invent or assume resources that are not in the content: no "Wiki", "Knowledge Base", "Central Documentation Hub", "Documentation site", or similar unless the README or repo structure explicitly mentions one.
- Do NOT make up project-specific names, tools, or processes that are not written in the README or implied by the root entries (e.g. folder names like "docs/", "src/", "tests/").
- Each path title and summaryDescription must refer to something that actually appears in or is clearly implied by the repo content. Each module name and summaryDescription must map to a real section, script, folder, or topic present in the data.
- If a repo has little or no README content, suggest only paths/modules that are justified by the repo name, description, or root entries (e.g. "Overview of repo X" with modules that reflect the actual folder/file names).
- Do NOT suggest generic topics like "Frontend 101" or "Auth 101". Keep everything specific to what the provided repos contain.
- Each path must have exactly 7 to 10 modules.
- Output only valid JSON.`;
function formatRepoBlock(repo: {
    name: string;
    description?: string;
    readmeExcerpt?: string | null;
    rootEntries?: string[];
}): string {
    const lines: string[] = [`## Repository: ${repo.name}`];
    if (repo.description)
        lines.push(`Description (from GitHub): ${repo.description}`);
    if (repo.rootEntries?.length)
        lines.push(`Root-level entries: ${repo.rootEntries.join(', ')}`);
    if (repo.readmeExcerpt) {
        lines.push('README content (excerpt):');
        lines.push('---');
        lines.push(repo.readmeExcerpt);
        lines.push('---');
    }
    else {
        lines.push('(No README content available for this repo.)');
    }
    return lines.join('\n');
}
const USER_PROMPT_TEMPLATE = (orgName: string, repos: {
    name: string;
    description?: string;
    readmeExcerpt?: string | null;
    rootEntries?: string[];
}[]) => {
    const repoBlocks = repos.map(formatRepoBlock).join('\n\n');
    return `Organization: ${orgName}

Below is the actual content we have for each repository (README excerpt and root-level files/folders). Use ONLY this information. Do not invent wikis, knowledge bases, or documentation hubs.

${repoBlocks}

Generate 4 to 8 onboarding learning paths. Each path must have:
- title: short, specific to what you see in the repos above (e.g. "Local setup for [repo names]", "Repo overview and structure")
- summaryDescription: 1-2 sentences that reference actual content (sections, scripts, or structure from the READMEs/repos)
- modules: array of 7 to 10 modules. Each module:
  - name: short title that matches something real in the content (a section, a script, a folder, a step)
  - summaryDescription: 1-2 sentences tied to what is actually in the repos
  - order: number from 1 to N

Do not suggest any path or module that is not clearly grounded in the repository content above. Return a single JSON object with one key "paths" whose value is an array of path objects. No markdown, no code fence. Example shape:
{"paths":[{"title":"...","summaryDescription":"...","modules":[{"name":"...","summaryDescription":"...","order":1},...]},...]}`;
};
interface LLMPathItem {
    title: string;
    summaryDescription: string;
    modules: {
        name: string;
        summaryDescription: string;
        order: number;
    }[];
}
interface LLMResponse {
    paths: LLMPathItem[];
}
function parseLLMResponse(text: string): LLMPathItem[] {
    const trimmed = text.trim().replace(/^```json?\s*|\s*```$/g, '');
    const parsed = JSON.parse(trimmed) as LLMResponse;
    if (!parsed || !Array.isArray(parsed.paths)) {
        throw new Error('Invalid LLM response: missing paths array');
    }
    return parsed.paths;
}
function toSuggestedPaths(llmPaths: LLMPathItem[]): SuggestedLearningPath[] {
    return llmPaths.map((p) => {
        const pathId = nanoid(10);
        const modules: SuggestedPathModule[] = (p.modules || [])
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .slice(0, 10)
            .map((m, idx) => ({
            id: nanoid(8),
            name: m.name || `Module ${idx + 1}`,
            summaryDescription: m.summaryDescription || '',
            order: m.order ?? idx + 1,
        }));
        return {
            id: pathId,
            title: p.title || 'Onboarding path',
            summaryDescription: p.summaryDescription || '',
            modules: modules.length >= 7 ? modules : modules,
        };
    });
}
export async function generateSuggestedPaths(input: OrgSummaryInput): Promise<SuggestedLearningPath[]> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        throw new Error('ANTHROPIC_API_KEY is not set');
    }
    const userPrompt = USER_PROMPT_TEMPLATE(input.organizationName, input.repositories);
    console.log('[onboarding/suggested-paths] LLM input:', JSON.stringify({ organizationName: input.organizationName, repositories: input.repositories }, null, 2));
    console.log('[onboarding/suggested-paths] LLM user prompt (first 2k chars):', userPrompt.slice(0, 2000));
    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 8192,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
    });
    const block = message.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') {
        throw new Error('No text in LLM response');
    }
    const llmPaths = parseLLMResponse(block.text);
    const paths = toSuggestedPaths(llmPaths);
    return paths;
}
