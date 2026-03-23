import { StreamClient } from '@stream-io/node-sdk';
import { NextRequest, NextResponse } from 'next/server';

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;

// CORS headers for Ngrok support
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS(req: NextRequest) {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
    if (!apiKey || !secretKey) {
        return NextResponse.json({ error: 'Stream keys are not configured' }, { status: 500, headers: corsHeaders });
    }

    try {
        const body = await req.json();
        const userId = body.userId;

        if (!userId) {
            return NextResponse.json({ error: 'User ID is required' }, { status: 400, headers: corsHeaders });
        }

        const client = new StreamClient(apiKey, secretKey);

        // Generate an authentication token for the given user, expiring in 1 hour
        const token = client.generateUserToken({ user_id: userId });

        return NextResponse.json({ token }, { headers: corsHeaders });
    } catch (error) {
        console.error('Error generating stream token:', error);
        return NextResponse.json({ error: 'Failed to generate token' }, { status: 500, headers: corsHeaders });
    }
}
