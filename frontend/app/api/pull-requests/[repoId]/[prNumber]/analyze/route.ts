import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getCachedUserById } from '@/lib/models/user';
import { getGitHubTokenWithFallback, testGitHubTokenAccess } from '@/lib/utils/github-token';
import { getOrganizationByShortId } from '@/lib/models/organization';
import { getRepositoryByUrlNameAndOrganization } from '@/lib/models/repository';
import { createOrGetPRAnalysis, updatePRAnalysisStatus, updatePRAnalysis, getPRAnalysis, isPRAnalysisGenerating, } from '@/lib/models/pull_request_analysis';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
export async function POST(request: NextRequest, { params }: {
    params: Promise<{
        repoId: string;
        prNumber: string;
    }> | {
        repoId: string;
        prNumber: string;
    };
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await getCachedUserById(session.user.id);
        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }
        const resolvedParams = await Promise.resolve(params);
        const repoId = resolvedParams.repoId;
        const prNumber = parseInt(resolvedParams.prNumber);
        if (isNaN(prNumber)) {
            return NextResponse.json({ error: 'Invalid PR number' }, { status: 400 });
        }
        const { searchParams } = new URL(request.url);
        const orgShortId = searchParams.get('orgShortId');
        const repoUrlName = searchParams.get('repoUrlName');
        const repoFullName = searchParams.get('repoFullName');
        if (!orgShortId || !repoUrlName || !repoFullName) {
            return NextResponse.json({ error: 'orgShortId, repoUrlName, and repoFullName are required' }, { status: 400 });
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
        const accessToken = tokenResult.token;
        const isGenerating = await isPRAnalysisGenerating(repository._id!.toString(), prNumber);
        if (isGenerating) {
            const existing = await getPRAnalysis(repository._id!.toString(), prNumber);
            return NextResponse.json({
                status: 'generating',
                analysis: existing,
            });
        }
        const existingAnalysis = await getPRAnalysis(repository._id!.toString(), prNumber);
        if (existingAnalysis && existingAnalysis.processingStatus === 'completed') {
            return NextResponse.json({
                status: 'completed',
                analysis: existingAnalysis,
            });
        }
        const prResponse = await fetch(`https://api.github.com/repos/${repoFullName}/pulls/${prNumber}`, {
            headers: {
                Authorization: `token ${accessToken}`,
                Accept: 'application/vnd.github.v3+json',
            },
        });
        if (!prResponse.ok) {
            return NextResponse.json({ error: 'Failed to fetch PR from GitHub' }, { status: prResponse.status });
        }
        const prData = await prResponse.json();
        const prAnalysisDoc = await createOrGetPRAnalysis(repository._id!.toString(), {
            organizationId: organization._id!.toString(),
            prNumber: prNumber,
            prId: prData.id.toString(),
            title: prData.title || '',
            body: prData.body || '',
            state: prData.merged ? 'merged' : (prData.state as 'open' | 'closed'),
            author: prData.user?.login || 'Unknown',
            authorAvatar: prData.user?.avatar_url || '',
            baseBranch: prData.base?.ref || 'main',
            headBranch: prData.head?.ref || '',
            headCommitSha: prData.head?.sha || '',
            prUpdatedAt: new Date(prData.updated_at),
            processingStatus: 'pending',
        });
        if (prAnalysisDoc.processingStatus === 'generating') {
            return NextResponse.json({
                status: 'generating',
                analysis: prAnalysisDoc,
            });
        }
        await updatePRAnalysisStatus(repository._id!.toString(), prNumber, 'generating');
        const pythonRequest = fetch(`${PYTHON_SERVICE_URL}/api/analyze-pull-request`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                github_token: accessToken,
                repo_full_name: repoFullName,
                pr_number: prNumber,
                organization_id: organization._id!.toString(),
                organization_short_id: organization.shortId,
                organization_name: organization.name,
                repository_id: repository._id!.toString(),
                repository_name: repository.name,
            }),
        }).then(async (response) => {
            if (!response.ok) {
                const error = await response.text();
                console.error('[Python Service Error]', error);
                await updatePRAnalysisStatus(repository._id!.toString(), prNumber, 'failed', error);
                return;
            }
            const result = await response.json();
            if (result.success) {
                await updatePRAnalysis(repository._id!.toString(), prNumber, {
                    description: result.description || {},
                    issues: result.issues || [],
                    riskAssessment: result.riskAssessment,
                    dependencies: result.dependencies,
                    fileAnalysis: result.fileAnalysis,
                    reviewComments: result.reviewComments || [],
                    chunksUsed: result.chunksUsed,
                });
            }
            else {
                await updatePRAnalysisStatus(repository._id!.toString(), prNumber, 'failed', result.error || 'Analysis failed');
            }
        }).catch(async (error) => {
            console.error('[Python Service Error]', error);
            await updatePRAnalysisStatus(repository._id!.toString(), prNumber, 'failed', error.message || 'Failed to connect to analysis service');
        });
        return NextResponse.json({
            status: 'generating',
            analysis: {
                ...prAnalysisDoc,
                processingStatus: 'generating' as const,
            },
        });
    }
    catch (error) {
        console.error('Error analyzing pull request:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
export async function GET(request: NextRequest, { params }: {
    params: Promise<{
        repoId: string;
        prNumber: string;
    }> | {
        repoId: string;
        prNumber: string;
    };
}) {
    try {
        const session = await getServerSession(authOptions);
        if (!session?.user?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const resolvedParams = await Promise.resolve(params);
        const repoId = resolvedParams.repoId;
        const prNumber = parseInt(resolvedParams.prNumber);
        if (isNaN(prNumber)) {
            return NextResponse.json({ error: 'Invalid PR number' }, { status: 400 });
        }
        const { searchParams } = new URL(request.url);
        const repoUrlName = searchParams.get('repoUrlName');
        if (!repoUrlName) {
            return NextResponse.json({ error: 'repoUrlName is required' }, { status: 400 });
        }
        const orgShortId = searchParams.get('orgShortId');
        if (!orgShortId) {
            return NextResponse.json({ error: 'orgShortId is required' }, { status: 400 });
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
        const analysis = await getPRAnalysis(repository._id!.toString(), prNumber);
        if (!analysis) {
            return NextResponse.json({ error: 'Analysis not found' }, { status: 404 });
        }
        return NextResponse.json({
            status: analysis.processingStatus,
            analysis: analysis,
        });
    }
    catch (error) {
        console.error('Error fetching PR analysis:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
