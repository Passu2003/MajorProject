import { NextResponse } from 'next/server';
import { StreamClient } from '@stream-io/node-sdk';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET() {
    try {
        const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
        const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;
        
        if (!apiKey || !secretKey) {
            return NextResponse.json({ error: 'Missing Stream Video API Keys' }, { status: 500 });
        }

        const client = new StreamClient(apiKey, secretKey);
        
        // Fetch the 30 most recent calls
        const response = await client.video.queryCalls({
            sort: [{ field: 'created_at', direction: -1 }],
            limit: 30
        });

        const calls = response.calls.map(callData => {
            const call = callData.call;
            const members = callData.members || [];
            console.log(`[Call ${call.id}] Members:`, members.map(m => m.user?.name || m.user_id));
            if (call.session) {
                console.log(`[Call ${call.id}] Session Participants:`, Object.keys(call.session.participants || {}).length);
            }
            // Parse custom title if available, fallback to ID
            const customTitle = call.custom?.title || "Meeting Room " + call.id.substring(0, 8);
            
            // Calculate duration if the call ended
            let durationStr = "Live";
            if (call.starts_at && call.ended_at) {
                const start = new Date(call.starts_at);
                const end = new Date(call.ended_at);
                const diffMs = end.getTime() - start.getTime();
                const mins = Math.floor(diffMs / 60000);
                durationStr = `${mins} min`;
            } else if (call.starts_at) {
                const start = new Date(call.starts_at);
                const diffMs = new Date().getTime() - start.getTime();
                const mins = Math.floor(diffMs / 60000);
                durationStr = `${mins} min (Ongoing)`;
            }

            // Determine if the call is actually active right now
            // A call is only truly 'Active' if it hasn't formally ended AND it has an active session with participants
            const hasActiveParticipants = call.session?.participants && call.session.participants.length > 0;
            const isCompleted = call.ended_at || !hasActiveParticipants;

            return {
                id: call.id,
                title: customTitle,
                type: "meeting",
                date: new Date(call.created_at).toLocaleString(),
                status: isCompleted ? "Completed" : "Active",
                duration: durationStr,
                participants: call.session?.participants?.map((p: any) => ({
                    user_id: p.user?.id,
                    name: p.user?.name || "Anonymous",
                    image: p.user?.image,
                    joined_at: p.joined_at
                })) || []
            };
        });

        return NextResponse.json({ calls });
    } catch (error: any) {
        console.error("Stream calls error:", error);
        return NextResponse.json({ error: 'Failed to fetch calls API' }, { status: 500 });
    }
}
