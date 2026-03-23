import { NextResponse } from 'next/server';
import { StreamClient } from '@stream-io/node-sdk';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
        const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;
        const client = new StreamClient(apiKey as string, secretKey as string);
        
        const token = client.createToken('admin_user'); // Admin token to query
        
        const restUrl = `https://video.stream-io-api.com/video/call/default/2c3e13b5-1ce7-4fbd-a391-2b7fb48690a1/sessions?api_key=${apiKey}`;
        const restResponse = await fetch(restUrl, {
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
                'stream-auth-type': 'jwt'
            }
        });
        const restData = await restResponse.json();

        return NextResponse.json({ sessions: restData });
    } catch (e: any) {
        return NextResponse.json({ error: e.message });
    }
}
