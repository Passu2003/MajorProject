const { StreamClient } = require('@stream-io/node-sdk');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;

async function checkTranscripts() {
    if (!apiKey || !secretKey) {
        console.error("Missing keys");
        return;
    }
    const client = new StreamClient(apiKey, secretKey);
    try {
        const response = await client.video.queryCalls({
            limit: 5,
            sort: [{ field: 'created_at', direction: -1 }]
        });
        
        for (const callData of response.calls) {
            console.log(`\nChecking call: ${callData.call.id}`);
            const call = client.video.call('default', callData.call.id);
            try {
                const recordingsResponse = await call.listRecordings();
                
                if (recordingsResponse.recordings && recordingsResponse.recordings.length > 0) {
                    recordingsResponse.recordings.forEach(rec => {
                        console.log(`  Recording: ${rec.filename}, URL: ${rec.url}`);
                    });
                } else {
                    console.log("  No recordings found.");
                }
            } catch (e) {
                console.log(`  Could not list recordings: ${e.message}`);
            }
            
            const state = await call.get();
            if (state.call.transcripts || state.call.transcriptions || state.call.captions) {
                console.log("  Transcripts found in state:", Object.keys(state.call).filter(k => k.includes('trans')));
            } else {
                console.log("  No transcript fields found directly on call object.");
            }
        }
    } catch (e) {
        console.error(e);
    }
}

checkTranscripts();
