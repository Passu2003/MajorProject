import { NextResponse } from 'next/server';
import { StreamClient } from '@stream-io/node-sdk';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { call_id, chatLogs, notes } = body;

        if (!call_id) {
            return NextResponse.json({ error: 'Missing call_id' }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
        const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || !secretKey) {
            return NextResponse.json({ error: 'Missing Stream Video API Keys' }, { status: 500 });
        }

        let aiSummary = "";
        
        // Generate AI Summary if there was meaningful chat or notes
        if (openaiKey && ((chatLogs && chatLogs.length > 0) || (notes && notes.length > 10))) {
            const transcriptText = (chatLogs || []).map((m: any) => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.sender}: ${m.text}`).join('\n');
            const prompt = `You are a helpful AI Meeting Assistant. Summarize the following meeting based on the chat transcript and personal notes provided. Format as professional meeting minutes using Markdown, including sections for: Executive Summary, Key Decisions, Action Items, and Notable Discussion Points. Do not include introductory/outro filler text.

Meeting Chat Transcript:
${transcriptText || "No chat messages."}

Private Organizer Notes:
${notes || "No notes taken."}`;

            try {
                const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${openaiKey}`
                    },
                    body: JSON.stringify({
                        model: 'gpt-4o-mini',
                        messages: [{ role: 'user', content: prompt }],
                        temperature: 0.7,
                    })
                });

                if (aiResponse.ok) {
                    const aiData = await aiResponse.json();
                    aiSummary = aiData.choices[0].message.content;
                } else {
                    console.error("OpenAI Error:", await aiResponse.text());
                }
            } catch (aiErr) {
                console.error("Failed to reach OpenAI:", aiErr);
            }
        }

        const client = new StreamClient(apiKey, secretKey);
        const call = client.video.call('default', call_id);
        
        // Push the custom data object up to the active Stream Call
        await call.update({
            custom: {
                chatLogs: chatLogs || [],
                notes: notes || "",
                aiSummary: aiSummary || "Not enough data to generate an AI summary."
            }
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Error saving meeting history:", error);
        return NextResponse.json({ error: 'Failed to save meeting history' }, { status: 500 });
    }
}
