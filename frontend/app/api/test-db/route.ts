import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
export async function GET() {
    try {
        console.log('Testing database connection...');
        const db = await getDb();
        const result = await db.admin().ping();
        const stats = await db.stats();
        return NextResponse.json({
            success: true,
            message: 'MongoDB connection successful!',
            ping: result,
            database: db.databaseName,
            collections: await db.listCollections().toArray(),
            stats: {
                collections: stats.collections,
                dataSize: stats.dataSize,
            },
        });
    }
    catch (error: any) {
        return NextResponse.json({
            success: false,
            error: error.message,
            details: error.toString(),
        }, { status: 500 });
    }
}
