const { StreamClient } = require('@stream-io/node-sdk');
const OpenAI = require('openai');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { pipeline } = require('stream/promises');

require('dotenv').config({ path: '.env.local' });

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;
const openaiKey = process.env.OPENAI_API_KEY;

async function debugTranscription() {
    if (!apiKey || !secretKey || !openaiKey) {
        console.error("Missing keys!");
        return;
    }

    const client = new StreamClient(apiKey, secretKey);
    const openai = new OpenAI({ apiKey: openaiKey });

    try {
        // 1. Find a recent call with a recording
        console.log("Searching for recent recordings...");
        const response = await client.video.queryCalls({
            limit: 10,
            sort: [{ field: 'created_at', direction: -1 }]
        });

        let targetCallId = null;
        let recordingUrl = null;

        for (const callData of response.calls) {
            const call = client.video.call('default', callData.call.id);
            try {
                const recs = await call.listRecordings();
                if (recs.recordings && recs.recordings.length > 0) {
                    targetCallId = callData.call.id;
                    recordingUrl = recs.recordings[0].url;
                    break;
                }
            } catch (e) {
                // Ignore calls without recordings
            }
        }

        if (!targetCallId || !recordingUrl) {
            console.log("No recordings found in the last 10 calls. Please record a new meeting in the app first.");
            return;
        }

        console.log(`Found recording for call ${targetCallId}`);
        console.log(`URL: ${recordingUrl.substring(0, 50)}...`);

        // 2. Download
        const mp4Path = path.join(os.tmpdir(), `debug_${targetCallId}.mp4`);
        const mp3Path = path.join(os.tmpdir(), `debug_${targetCallId}.mp3`);
        
        console.log(`Downloading to ${mp4Path}...`);
        const fetchResponse = await fetch(recordingUrl);
        if (!fetchResponse.ok) throw new Error(`Fetch failed: ${fetchResponse.statusText}`);
        
        const fileStream = fs.createWriteStream(mp4Path);
        await pipeline(fetchResponse.body, fileStream);
        console.log("Download complete. File size:", fs.statSync(mp4Path).size);

        // 3. Extract
        console.log(`Extracting MP3 to ${mp3Path} via FFmpeg (${ffmpegInstaller.path})...`);
        await new Promise((resolve, reject) => {
            ffmpeg(mp4Path)
                .outputOptions([
                    '-vn',
                    '-acodec libmp3lame',
                    '-ac 1',
                    '-ab 16k',
                    '-ar 16000'
                ])
                .save(mp3Path)
                .on('end', () => resolve(true))
                .on('error', (err, stdout, stderr) => {
                    console.error("FFmpeg stdout:", stdout);
                    console.error("FFmpeg stderr:", stderr);
                    reject(err);
                });
        });
        console.log("Extraction complete. MP3 size:", fs.statSync(mp3Path).size);

        // 4. Whisper
        console.log("Sending to Whisper...");
        const transcription = await openai.audio.transcriptions.create({
            file: fs.createReadStream(mp3Path),
            model: "whisper-1",
            response_format: "text",
        });
        console.log("Whisper Transcript (first 100 chars):", String(transcription).substring(0, 100));

        // Cleanup
        if (fs.existsSync(mp4Path)) fs.unlinkSync(mp4Path);
        if (fs.existsSync(mp3Path)) fs.unlinkSync(mp3Path);
        console.log("Debug successful!");

    } catch (e) {
        console.error("Debug Pipeline Failed:", e);
    }
}

debugTranscription();
