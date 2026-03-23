import { StreamClient } from '@stream-io/node-sdk';
import { NextResponse } from 'next/server';

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;

export const dynamic = 'force-dynamic';

export async function GET() {
    if (!apiKey || !secretKey) {
        return NextResponse.json({ error: 'Stream API keys unconfigured' }, { status: 500 });
    }

    try {
        const client = new StreamClient(apiKey, secretKey);
        
        // This queries across the entire application for video calls
        // Since we didn't specify a particular user, we can fetch all recordings globally or filter by calls
        const response = await client.video.queryCalls({
            filter_conditions: {
                // You could add filters here, e.g., created_by_user_id: "your_user_id"
                // For now, we query all non-empty calls
            },
            limit: 25,
            sort: [{ field: 'created_at', direction: -1 }]
        });
        console.log(`[Stream API] Found ${response.calls.length} total calls in the workspace.`);

        // We need to iterate over calls and fetch their recordings
        const allRecordings: any[] = [];
        
        for (const callData of response.calls) {
            try {
                // Stream requires us to fetch recordings per call ID
                const call = client.video.call('default', callData.call.id);
                // @ts-ignore - The Node SDK types differ slightly across versions, but this method exists
                const recordingsResponse = await call.listRecordings();
                
                console.log(`[Stream API] Call ${callData.call.id} has ${recordingsResponse.recordings?.length || 0} recordings.`);

                if (recordingsResponse.recordings && recordingsResponse.recordings.length > 0) {
                    recordingsResponse.recordings.forEach((rec: any) => {
                        let durationStr = 'Cloud Recording';
                        if (rec.start_time && rec.end_time) {
                            const start = new Date(rec.start_time).getTime();
                            const end = new Date(rec.end_time).getTime();
                            const diff = Math.max(0, Math.floor((end - start) / 1000));
                            const mins = Math.floor(diff / 60);
                            const secs = diff % 60;
                            durationStr = `${mins}:${secs.toString().padStart(2, '0')}`;
                        }

                        allRecordings.push({
                            id: rec.filename, // Stream returns a unique filename
                            url: rec.url,
                            title: `Recording - ${callData.call.id.slice(0, 16)}...`,
                            date: rec.start_time,
                            duration: durationStr,
                            size: rec.size || 0, // Fallback if size isn't directly exposed
                            call_id: callData.call.id,
                            session_id: rec.session_id || callData.call.session?.id,
                            raw: null
                        });
                    });
                }
            } catch (innerError) {
                console.warn(`Failed to fetch recordings for call ${callData.call.id}:`, innerError);
            }
        }

        return NextResponse.json({ recordings: allRecordings });
    } catch (error) {
        console.error('Error fetching stream recordings:', error);
        return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
    }
}
