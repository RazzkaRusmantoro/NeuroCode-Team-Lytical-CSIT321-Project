import { NextRequest, NextResponse } from 'next/server';
const PYTHON_SERVICE_URL = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';
export async function GET(request: NextRequest) {
    try {
        const response = await fetch(`${PYTHON_SERVICE_URL}/health`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            },
            signal: AbortSignal.timeout(5000),
        });
        if (!response.ok) {
            return NextResponse.json({
                status: 'unhealthy',
                service: 'python-service',
                url: PYTHON_SERVICE_URL,
                error: `HTTP ${response.status}`,
            }, { status: 503 });
        }
        const data = await response.json();
        return NextResponse.json({
            status: 'healthy',
            service: 'python-service',
            url: PYTHON_SERVICE_URL,
            ...data,
        });
    }
    catch (error) {
        return NextResponse.json({
            status: 'unhealthy',
            service: 'python-service',
            url: PYTHON_SERVICE_URL,
            error: error instanceof Error ? error.message : 'Connection failed',
        }, { status: 503 });
    }
}
