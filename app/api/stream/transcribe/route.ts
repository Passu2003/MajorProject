import { NextResponse } from 'next/server';
import { StreamClient } from '@stream-io/node-sdk';
import OpenAI from 'openai';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { pipeline } from 'stream';
import { promisify } from 'util';

// Set the path to the ffmpeg binary
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { call_id, recording_url } = body;

        if (!call_id || !recording_url) {
            return NextResponse.json({ error: 'Missing call_id or recording_url' }, { status: 400 });
        }

        const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
        const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;
        const openaiKey = process.env.OPENAI_API_KEY;

        if (!apiKey || !secretKey || !openaiKey) {
            return NextResponse.json({ error: 'Missing API Keys' }, { status: 500 });
        }

        const client = new StreamClient(apiKey, secretKey);
        const call = client.video.call('default', call_id);
        const openai = new OpenAI({ apiKey: openaiKey });

        // 1. Download the MP4 recording
        console.log(`[Transcribe] Downloading recording from ${recording_url}`);
        const mp4Path = path.join(os.tmpdir(), `${call_id}_recording.mp4`);
        const mp3Path = path.join(os.tmpdir(), `${call_id}_audio.mp3`);

        try {
            const response = await fetch(recording_url);
            if (!response.ok) throw new Error(`Failed to fetch recording: ${response.statusText}`);
            if (!response.body) throw new Error("No response body");

            const fileStream = fs.createWriteStream(mp4Path);
            // @ts-ignore
            const streamPipeline = promisify(require('stream').pipeline);
            await streamPipeline(response.body, fileStream);
            console.log(`[Transcribe] Saved MP4 to ${mp4Path}`);
        } catch (downloadErr) {
            console.error("Download Error:", downloadErr);
            return NextResponse.json({ error: 'Failed to download recording file' }, { status: 500 });
        }

        // 2. Extract MP3 using FFmpeg
        console.log(`[Transcribe] Extracting audio to ${mp3Path}`);
        await new Promise((resolve, reject) => {
            ffmpeg(mp4Path)
                .outputOptions([
                    '-vn',           // No video
                    '-acodec libmp3lame', // Use MP3 codec
                    '-ac 1',         // Mono audio
                    '-ab 16k',       // 16 kbps bitrate (extremely small, suitable for speech)
                    '-ar 16000'      // 16 kHz sample rate (good for Whisper)
                ])
                .save(mp3Path)
                .on('end', () => resolve(true))
                .on('error', (err: Error) => reject(err));
        });
        console.log(`[Transcribe] Audio extraction complete.`);

        // 3. Send MP3 to OpenAI Whisper
        console.log(`[Transcribe] Sending audio to OpenAI Whisper API...`);
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(mp3Path),
            model: "whisper-1",
            response_format: "text", // We just need plain text
        });

        const transcriptText = transcription as unknown as string; // text response
        console.log(`[Transcribe] Transcription received. Length: ${transcriptText.length} chars.`);

        // 4. Send Transcript to GPT for Summary
        console.log(`[Transcribe] Generating AI Summary...`);
        const summaryResponse = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "You are a helpful AI Meeting Assistant. Summarize the following meeting transcript. Format as professional meeting minutes using Markdown, including sections for: Executive Summary, Key Decisions, Action Items, and Notable Discussion Points. Do not include introductory/outro filler text." },
                { role: "user", content: `Meeting Audio Transcript:\n${transcriptText || "No audio detected."}` }
            ],
            temperature: 0.7,
        });

        const aiSummary = summaryResponse.choices[0].message.content;

        // 5. Save to Stream custom state
        console.log(`[Transcribe] Updating Stream call state...`);
        await call.update({
            custom: {
                // If there's an existing summary from chat, we overwrite or keep. Let's overwrite with the better audio one.
                aiSummary: aiSummary,
                audioTranscript: transcriptText
            }
        });

        // 6. Cleanup temp files
        try {
            if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
            if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
            console.log(`[Transcribe] Cleaned up temporary files.`);
        } catch (cleanupErr) {
            console.error("Cleanup Error (non-fatal):", cleanupErr);
        }

        return NextResponse.json({ success: true, message: "Transcription completed successfully." });

    } catch (error: any) {
        console.error("Transcription pipeline error:", error);
        return NextResponse.json({ error: error.message || 'Transcription failed' }, { status: 500 });
    }
}
