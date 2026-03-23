import { NextResponse } from 'next/server';
import { StreamClient } from '@stream-io/node-sdk';

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;

export async function GET(req: Request) {
    if (!apiKey || !secretKey) {
        return NextResponse.json({ error: 'Stream API keys unconfigured' }, { status: 500 });
    }

    try {
        const url = new URL(req.url);
        const callId = url.searchParams.get('id');

        if (!callId) {
            return NextResponse.json({ error: 'Missing call id' }, { status: 400 });
        }

        const client = new StreamClient(apiKey, secretKey);
        const call = client.video.call('default', callId);
        
        // 1. Get raw call state
        const state = await call.get();
        
        // 2. Get recordings explicitly
        const recordingsResponse = await call.listRecordings();

        // 3. See if we have anything labeled transcript or caption
        return NextResponse.json({ 
            call_state: state.call,
            recordings: recordingsResponse.recordings,
            session_id: state.call.session_id,
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
