import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export async function POST(req: Request) {
    try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
        }

        const { text, voice } = await req.json();

        if (!text) {
            return NextResponse.json({ error: 'Missing text' }, { status: 400 });
        }

        const openai = new OpenAI({ apiKey: openaiKey });

        const ttsResponse = await openai.audio.speech.create({
            model: 'tts-1',
            voice: voice || 'alloy',
            input: text,
            response_format: 'mp3',
            speed: 1.1, // Slightly faster for more natural subtitle-pacing
        });

        // Return the audio as a binary stream
        const audioBuffer = Buffer.from(await ttsResponse.arrayBuffer());

        return new Response(audioBuffer, {
            status: 200,
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Length': audioBuffer.length.toString(),
            },
        });
    } catch (error: any) {
        console.error('[tts] Error:', error);
        return NextResponse.json(
            { error: error.message || 'TTS generation failed' },
            { status: 500 }
        );
    }
}
