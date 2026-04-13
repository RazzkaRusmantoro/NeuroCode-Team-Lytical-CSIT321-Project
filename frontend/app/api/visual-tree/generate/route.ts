import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { createVisualTreeJob, completeVisualTree, failVisualTree, } from '@/lib/models/visual_tree';
import http from 'http';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
const GENERATION_TIMEOUT_MS = 130 * 60 * 1000;
function postJson(url: string, payload: Record<string, any>): Promise<any> {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const parsed = new URL(url);
        const req = http.request({
            hostname: parsed.hostname,
            port: parsed.port || 80,
            path: parsed.pathname,
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(body),
            },
            timeout: GENERATION_TIMEOUT_MS,
        }, (res) => {
            const chunks: Buffer[] = [];
            res.on('data', (chunk) => chunks.push(chunk));
            res.on('end', () => {
                const raw = Buffer.concat(chunks).toString();
                if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
                    try {
                        resolve(JSON.parse(raw));
                    }
                    catch {
                        reject(new Error(`Invalid JSON from Python service: ${raw.slice(0, 200)}`));
                    }
                }
                else {
                    reject(new Error(`Python service returned ${res.statusCode}: ${raw.slice(0, 500)}`));
                }
            });
        });
        req.on('timeout', () => {
            req.destroy();
            reject(new Error(`Request timed out after ${GENERATION_TIMEOUT_MS / 60000} minutes`));
        });
        req.on('error', (err) => reject(err));
        req.write(body);
        req.end();
    });
}
async function runGeneration(jobId: string, pythonPayload: Record<string, any>) {
    try {
        const result = await postJson(`${PYTHON_SERVICE_URL}/api/generate-visual-tree`, pythonPayload);
        if (result.success && result.s3) {
            await completeVisualTree(jobId, {
                s3Key: result.s3.s3_key,
                s3Bucket: result.s3.s3_bucket,
                contentSize: result.s3.content_size,
            });
            console.log(`[Visual Tree] Generation completed for job ${jobId}`);
        }
        else {
            await failVisualTree(jobId, result.error || result.message || 'Unknown error from Python service');
        }
    }
    catch (error: any) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[Visual Tree] Generation failed for job ${jobId}:`, msg);
        await failVisualTree(jobId, msg.slice(0, 500));
    }
}
export async function POST(request: NextRequest) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const body = await request.json();
        const { repoFullName, orgShortId, repoUrlName, branch = 'main' } = body;
        if (!repoFullName || !orgShortId || !repoUrlName) {
            return NextResponse.json({ error: 'repoFullName, orgShortId, and repoUrlName are required' }, { status: 400 });
        }
        const shortId = orgShortId.startsWith('org-') ? orgShortId.replace('org-', '') : orgShortId;
        const organization = await getOrganizationByShortId(shortId);
        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }
        const repository = await getRepositoryByUrlNameAndOrganization(repoUrlName, organization._id!.toString());
        if (!repository) {
            return NextResponse.json({ error: 'Repository not found' }, { status: 404 });
        }
        const tokenResult = await getGitHubTokenWithFallback(session.user.id, organization._id!.toString(), repoUrlName, testGitHubTokenAccess);
        if (!tokenResult?.token) {
            return NextResponse.json({ error: 'No GitHub access available' }, { status: 401 });
        }
        const job = await createVisualTreeJob(repository._id!.toString(), {
            organizationId: organization._id!.toString(),
            branch,
            createdBy: session.user.id,
        });
        const pythonPayload = {
            github_token: tokenResult.token,
            repo_full_name: repoFullName,
            branch,
            organization_id: organization._id!.toString(),
            organization_short_id: organization.shortId,
            organization_name: organization.name,
            repository_id: repository._id!.toString(),
            repository_name: repository.name,
        };
        runGeneration(job._id!.toString(), pythonPayload).catch((err) => console.error('[Visual Tree] Background generation error:', err));
        return NextResponse.json({
            success: true,
            status: 'generating',
            jobId: job._id!.toString(),
        });
    }
    catch (error) {
        console.error('[Visual Tree Generation Error]', error);
        return NextResponse.json({
            error: 'Failed to start visual tree generation',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
