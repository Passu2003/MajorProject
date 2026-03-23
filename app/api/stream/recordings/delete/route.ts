import { StreamClient } from '@stream-io/node-sdk';
import { NextResponse } from 'next/server';

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;

export async function POST(req: Request) {
    if (!apiKey || !secretKey) {
        return NextResponse.json({ error: 'Stream API keys unconfigured' }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { call_id, session_id, filename } = body;
        
        if (!call_id || !session_id || !filename) {
            return NextResponse.json({ error: 'Missing required Stream identifiers to delete cloud object' }, { status: 400 });
        }

        const client = new StreamClient(apiKey, secretKey);
        const call = client.video.call('default', call_id);
        
        // Connect to Stream Cloud and permanently delete this artifact session
        await call.deleteRecording(session_id);
        
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('Error deleting Stream recording:', error);
        return NextResponse.json({ error: 'Failed to completely delete recording from cloud bucket' }, { status: 500 });
    }
}
