import { NextResponse } from 'next/server';
import OpenAI from 'openai';

export const runtime = 'nodejs';

export async function POST(req: Request) {
    try {
        const openaiKey = process.env.OPENAI_API_KEY;
        if (!openaiKey) {
            return NextResponse.json({ error: 'Missing OPENAI_API_KEY' }, { status: 500 });
        }

        const openai = new OpenAI({ apiKey: openaiKey });

        // Parse the multipart form data
        const formData = await req.formData();
        const audioFile = formData.get('audio') as File | null;

        if (!audioFile) {
            return NextResponse.json({ error: 'No audio file provided' }, { status: 400 });
        }

        // Send to Whisper
        const transcription = await openai.audio.transcriptions.create({
            file: audioFile,
            model: 'whisper-1',
            response_format: 'verbose_json',
            temperature: 0.0,
            prompt: 'This is a real-time voice transcription.',
        });

        return NextResponse.json({
            text: transcription.text || '',
            detectedLanguage: transcription.language || 'unknown',
        });
    } catch (error: any) {
        console.error('[live-transcribe] Error:', error);
        return NextResponse.json(
            { error: error.message || 'Transcription failed' },
            { status: 500 }
        );
    }
}
