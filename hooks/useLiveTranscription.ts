import { useState, useRef, useCallback, useEffect } from "react";
import { Socket } from "socket.io-client";

interface SubtitleEntry {
    text: string;
    speaker: string;
    language: string;
    timestamp: number;
    senderID?: string;
}

interface UseLiveTranscriptionOptions {
    socket: Socket | null;
    username: string;
    isMicMuted?: boolean;
}

const SUPPORTED_LANGUAGES = [
    { code: "en", label: "English" },
    { code: "hi", label: "Hindi" },
    { code: "es", label: "Spanish" },
    { code: "fr", label: "French" },
    { code: "de", label: "German" },
    { code: "zh", label: "Chinese" },
    { code: "ja", label: "Japanese" },
    { code: "ko", label: "Korean" },
    { code: "ar", label: "Arabic" },
    { code: "pt", label: "Portuguese" },
    { code: "ru", label: "Russian" },
    { code: "it", label: "Italian" },
];

// Well-known Whisper hallucination phrases that appear on silence
const HALLUCINATION_PATTERNS = [
    "thank you for watching",
    "thanks for watching",
    "please subscribe",
    "subscribe to the channel",
    "like and subscribe",
    "share this video",
    "see you next time",
    "bye bye",
    "goodbye",
    "thank you for listening",
    "thanks for listening",
    "please like",
    "don't forget to subscribe",
    "hit the bell",
    "leave a comment",
    "see you in the next",
    "subtitles by",
    "translated by",
    "amara.org",
    "subs by",
];

function isHallucination(text: string): boolean {
    const lower = text.toLowerCase().trim();
    if (lower.length < 3) return true; // Too short to be meaningful
    return HALLUCINATION_PATTERNS.some((pattern) => lower.includes(pattern));
}

export { SUPPORTED_LANGUAGES };

export function useLiveTranscription({
    socket,
    username,
    isMicMuted = false,
}: UseLiveTranscriptionOptions) {
    const [isTranscribing, setIsTranscribing] = useState(false);
    const [subtitles, setSubtitles] = useState<Map<string, SubtitleEntry>>(new Map());
    const [targetLanguage, setTargetLanguage] = useState("en");
    const [isDubbedMode, setIsDubbedMode] = useState(false);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const micStreamRef = useRef<MediaStream | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isProcessingRef = useRef(false);
    const isTranscribingRef = useRef(false);
    const targetLanguageRef = useRef(targetLanguage);
    const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
    const subtitleTimeoutsRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
    const socketRef = useRef<Socket | null>(null);
    const usernameRef = useRef(username);
    const isDubbedModeRef = useRef(isDubbedMode);
    const ttsReadyRef = useRef(false);
    const isMicMutedRef = useRef(isMicMuted);

    // Voice activity detection refs
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const hasSpeechRef = useRef(false);

    // Keep refs in sync with state
    useEffect(() => { targetLanguageRef.current = targetLanguage; }, [targetLanguage]);
    useEffect(() => { socketRef.current = socket; }, [socket]);
    useEffect(() => { usernameRef.current = username; }, [username]);
    useEffect(() => { isDubbedModeRef.current = isDubbedMode; }, [isDubbedMode]);
    useEffect(() => { isMicMutedRef.current = isMicMuted; }, [isMicMuted]);

    // When mic is muted in Stream SDK, disable transcription mic tracks to truly stop capture.
    // When unmuted, re-enable the tracks so recording continues.
    useEffect(() => {
        if (!micStreamRef.current) return;
        micStreamRef.current.getAudioTracks().forEach((track) => {
            track.enabled = !isMicMuted;
        });
        if (isMicMuted) {
            console.log("[Transcription] Mic muted — pausing audio capture");
        } else {
            console.log("[Transcription] Mic unmuted — resuming audio capture");
        }
    }, [isMicMuted]);

    // Pre-create a persistent TTS audio element to avoid browser autoplay blocking.
    // This must be created once during a user gesture context.
    useEffect(() => {
        if (!ttsAudioRef.current) {
            const audio = new Audio();
            audio.setAttribute("data-tts", "true");
            ttsAudioRef.current = audio;
        }
    }, []);

    // Track which elements WE muted so we only restore those
    const mutedElementsRef = useRef<Set<HTMLMediaElement>>(new Set());

    // Mute/unmute REMOTE participants when dubbed mode changes.
    // Only intervene when dubbed mode is ON. When OFF, restore only what we muted.
    useEffect(() => {
        const container = document.querySelector(".str-video");
        if (!container) return;

        if (isDubbedMode) {
            // Dubbed mode ON: mute all remote audio/video, track what we muted
            container.querySelectorAll("video").forEach((video) => {
                if (!video.muted) {
                    video.muted = true;
                    mutedElementsRef.current.add(video);
                }
            });
            container.querySelectorAll("audio").forEach((audio) => {
                if (audio.getAttribute("data-tts") === "true") return;
                if (!audio.muted) {
                    audio.muted = true;
                    mutedElementsRef.current.add(audio);
                }
            });
        } else {
            // Dubbed mode OFF: only unmute elements WE previously muted
            mutedElementsRef.current.forEach((el) => {
                el.muted = false;
            });
            mutedElementsRef.current.clear();
        }
    }, [isDubbedMode]);

    // Periodically enforce mute when dubbed mode is active (Stream may re-render elements)
    useEffect(() => {
        if (!isDubbedMode) return;

        const enforceInterval = setInterval(() => {
            const container = document.querySelector(".str-video");
            if (!container) return;

            container.querySelectorAll("video").forEach((video) => {
                if (!video.muted) {
                    video.muted = true;
                    mutedElementsRef.current.add(video);
                }
            });
            container.querySelectorAll("audio").forEach((audio) => {
                if (audio.getAttribute("data-tts") === "true") return;
                if (!audio.muted) {
                    audio.muted = true;
                    mutedElementsRef.current.add(audio);
                }
            });
        }, 1000);

        return () => clearInterval(enforceInterval);
    }, [isDubbedMode]);

    // Check if audio has speech activity using AnalyserNode
    const checkVoiceActivity = useCallback((): boolean => {
        if (!analyserRef.current) return false;

        const analyser = analyserRef.current;
        const dataArray = new Uint8Array(analyser.fftSize);
        analyser.getByteTimeDomainData(dataArray);

        // Calculate RMS (root mean square) of the audio signal
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            const val = (dataArray[i] - 128) / 128; // Normalize to -1..1
            sum += val * val;
        }
        const rms = Math.sqrt(sum / dataArray.length);

        // Lowered threshold to 0.02 to ensure typical laptop mic picks up speech without yelling
        return rms > 0.02;
    }, []);

    // Continuously monitor voice activity while recording
    useEffect(() => {
        if (!isTranscribing) return;

        const vadInterval = setInterval(() => {
            if (checkVoiceActivity()) {
                hasSpeechRef.current = true;
            }
        }, 200); // Check every 200ms

        return () => clearInterval(vadInterval);
    }, [isTranscribing, checkVoiceActivity]);

    // Clear a subtitle after 8 seconds
    const scheduleSubtitleClear = useCallback((speakerId: string) => {
        const existingTimeout = subtitleTimeoutsRef.current.get(speakerId);
        if (existingTimeout) clearTimeout(existingTimeout);

        const timeout = setTimeout(() => {
            setSubtitles((prev) => {
                const next = new Map(prev);
                next.delete(speakerId);
                return next;
            });
            subtitleTimeoutsRef.current.delete(speakerId);
        }, 8000);

        subtitleTimeoutsRef.current.set(speakerId, timeout);
    }, []);

    // Process an audio chunk: transcribe → translate → broadcast
    const processChunk = useCallback(
        async (audioBlob: Blob) => {
            if (isProcessingRef.current) return;
            isProcessingRef.current = true;

            try {
                // 1. Transcribe with Whisper
                const formData = new FormData();
                formData.append("audio", audioBlob, "chunk.webm");

                const transcribeRes = await fetch("/api/stream/live-transcribe", {
                    method: "POST",
                    body: formData,
                });

                if (!transcribeRes.ok) {
                    console.error("[Transcription] API error:", transcribeRes.status);
                    return;
                }

                const { text, detectedLanguage } = await transcribeRes.json();
                if (!text || text.trim().length === 0) return;

                // Filter out Whisper hallucinations and non-speech tags
                if (isHallucination(text)) {
                    console.log("[Transcription] Filtered hallucination:", text);
                    return;
                }
                const textTrimmed = text.trim();
                if (/^(\[.*\]|\(.*\))$/.test(textTrimmed)) {
                    console.log("[Transcription] Filtered non-speech tag:", text);
                    return;
                }

                console.log("[Transcription] Got text:", text, "lang:", detectedLanguage);

                let displayLang = detectedLanguage || "en";
                const currentTargetLang = targetLanguageRef.current;
                let localDisplayText = text;

                // 2. Optionally translate for SENDER's local display only
                const needsTranslation = currentTargetLang !== detectedLanguage;
                if (needsTranslation) {
                    const langLabel = SUPPORTED_LANGUAGES.find((l) => l.code === currentTargetLang)?.label || currentTargetLang;
                    try {
                        const translateRes = await fetch("/api/stream/translate", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                text,
                                targetLanguage: langLabel,
                            }),
                        });

                        if (translateRes.ok) {
                            const { translatedText } = await translateRes.json();
                            localDisplayText = translatedText;
                        }
                    } catch (e) {
                        console.error("[Translation] Error:", e);
                    }
                }

                // 3. Update local subtitle
                const entry: SubtitleEntry = {
                    text: localDisplayText,
                    speaker: usernameRef.current,
                    language: needsTranslation ? currentTargetLang : displayLang,
                    timestamp: Date.now(),
                    senderID: "local",
                };

                setSubtitles((prev) => {
                    const next = new Map(prev);
                    next.set("local", entry);
                    return next;
                });
                scheduleSubtitleClear("local");

                // 4. Broadcast to room via Socket.IO (Send the ORIGINAL text/language)
                const sock = socketRef.current;
                if (sock) {
                    sock.emit("subtitle-update", {
                        text: text, // Raw text
                        originalText: text,
                        speaker: usernameRef.current,
                        language: displayLang, // Raw language
                        timestamp: Date.now(),
                    });
                }

                // 5. Local TTS Playback (If dubbed mode is explicitly ON, hear your own translation)
                if (isDubbedModeRef.current && localDisplayText) {
                    console.log("[TTS SENDER] Generating TTS for:", localDisplayText);
                    try {
                        const ttsRes = await fetch("/api/stream/tts", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                                text: localDisplayText,
                                voice: "alloy",
                            }),
                        });

                        if (ttsRes.ok) {
                            const audioBlob = await ttsRes.blob();
                            const audioUrl = URL.createObjectURL(audioBlob);

                            const audio = ttsAudioRef.current || new Audio();
                            audio.setAttribute("data-tts", "true");
                            audio.pause();
                            audio.src = audioUrl;
                            audio.load();
                            ttsAudioRef.current = audio;

                            audio.onended = () => {
                                URL.revokeObjectURL(audioUrl);
                            };

                            audio.play()
                                .then(() => console.log("[TTS SENDER] Playback started"))
                                .catch((e) => console.error("[TTS SENDER] Playback error:", e));
                        } else {
                            console.error("[TTS SENDER] API returned:", ttsRes.status);
                        }
                    } catch (e) {
                        console.error("[TTS SENDER] Error:", e);
                    }
                }

            } catch (error) {
                console.error("[Transcription] Process error:", error);
            } finally {
                isProcessingRef.current = false;
            }
        },
        [scheduleSubtitleClear]
    );

    // Start transcription — acquires its own mic stream
    const startTranscription = useCallback(async () => {
        if (isTranscribingRef.current) return;

        try {
            // Get a dedicated mic stream for transcription
            const micStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true,
                },
            });

            micStreamRef.current = micStream;

            // Set up Voice Activity Detection using Web Audio API
            const audioCtx = new AudioContext();
            const source = audioCtx.createMediaStreamSource(micStream);
            const analyser = audioCtx.createAnalyser();
            analyser.fftSize = 2048;
            source.connect(analyser);
            // Don't connect to destination — we just want to analyse, not play back

            audioContextRef.current = audioCtx;
            analyserRef.current = analyser;
            hasSpeechRef.current = false;

            const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
                ? "audio/webm;codecs=opus"
                : "audio/webm";

            let chunks: Blob[] = [];

            const recorder = new MediaRecorder(micStream, { mimeType });
            mediaRecorderRef.current = recorder;

            recorder.ondataavailable = (e) => {
                if (e.data && e.data.size > 0) {
                    chunks.push(e.data);
                }
            };

            recorder.onstop = () => {
                // Only process if we detected speech AND mic is not muted in Stream SDK
                const hadSpeech = hasSpeechRef.current;
                const micMuted = isMicMutedRef.current;
                hasSpeechRef.current = false; // Reset for next window

                if (chunks.length > 0 && hadSpeech && !micMuted) {
                    const blob = new Blob(chunks, { type: mimeType });
                    chunks = [];

                    if (blob.size > 1000) {
                        processChunk(blob);
                    }
                } else {
                    chunks = [];
                    if (micMuted) {
                        console.log("[Transcription] Skipped chunk — mic is muted");
                    } else if (!hadSpeech) {
                        console.log("[Transcription] Skipped silent chunk");
                    }
                }

                // Restart recorder if still transcribing
                if (isTranscribingRef.current && mediaRecorderRef.current) {
                    try {
                        mediaRecorderRef.current.start();
                    } catch (e) {
                        console.warn("[Transcription] Could not restart recorder:", e);
                    }
                }
            };

            // Start recording
            recorder.start();
            isTranscribingRef.current = true;
            setIsTranscribing(true);

            console.log("[Transcription] Started — capturing mic audio in 5s chunks with VAD");

            // Every 5 seconds, stop the recorder to flush a chunk
            intervalRef.current = setInterval(() => {
                if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
                    mediaRecorderRef.current.stop();
                }
            }, 5000);

        } catch (err) {
            console.error("[Transcription] Failed to start:", err);
            alert("Could not access microphone for live transcription.");
        }
    }, [processChunk]);

    // Stop transcription
    const stopTranscription = useCallback(() => {
        isTranscribingRef.current = false;

        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            try { mediaRecorderRef.current.stop(); } catch (e) { /* ignore */ }
        }
        mediaRecorderRef.current = null;

        // Close audio context used for VAD
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(() => {});
            audioContextRef.current = null;
            analyserRef.current = null;
        }

        // Release the dedicated mic stream
        if (micStreamRef.current) {
            micStreamRef.current.getTracks().forEach((t) => t.stop());
            micStreamRef.current = null;
        }

        setIsTranscribing(false);
        setSubtitles(new Map());

        // Clear all timeouts
        subtitleTimeoutsRef.current.forEach((t) => clearTimeout(t));
        subtitleTimeoutsRef.current.clear();

        console.log("[Transcription] Stopped");
    }, []);

    // Listen for subtitles from other participants
    useEffect(() => {
        if (!socket) return;

        const handleSubtitleReceived = async (data: SubtitleEntry & { senderID: string; originalText?: string }) => {
            // Filter hallucinations and non-speech tags from remote subtitles
            if (isHallucination(data.text)) return;
            const textTrimmed = data.text.trim();
            if (/^(\[.*\]|\(.*\))$/.test(textTrimmed)) return;

            let finalDisplayText = data.text;
            let finalLanguage = data.language;
            const currentTargetLang = targetLanguageRef.current;

            // Translate receiver side if languages mismatch
            if (currentTargetLang !== finalLanguage) {
                const langLabel = SUPPORTED_LANGUAGES.find((l) => l.code === currentTargetLang)?.label || currentTargetLang;
                try {
                    const translateRes = await fetch("/api/stream/translate", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: data.text,
                            targetLanguage: langLabel,
                        }),
                    });

                    if (translateRes.ok) {
                        const { translatedText } = await translateRes.json();
                        finalDisplayText = translatedText;
                        finalLanguage = currentTargetLang;
                    }
                } catch (e) {
                    console.error("[Translation] Error:", e);
                }
            }

            // If dubbed mode, generate TTS for the *translated* subtitles
            if (isDubbedModeRef.current && finalDisplayText) {
                console.log("[TTS RECEIVER] Generating TTS for:", finalDisplayText);
                try {
                    const ttsRes = await fetch("/api/stream/tts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                            text: finalDisplayText,
                            voice: "alloy",
                        }),
                    });

                    if (ttsRes.ok) {
                        const audioBlob = await ttsRes.blob();
                        const audioUrl = URL.createObjectURL(audioBlob);

                        // Reuse the persistent TTS audio element
                        const audio = ttsAudioRef.current || new Audio();
                        audio.setAttribute("data-tts", "true");
                        audio.pause();
                        audio.src = audioUrl;
                        audio.load();
                        ttsAudioRef.current = audio;

                        audio.onended = () => {
                            URL.revokeObjectURL(audioUrl);
                        };

                        audio.play()
                            .then(() => console.log("[TTS RECEIVER] Playback started"))
                            .catch((e) => console.error("[TTS RECEIVER] Playback error:", e));
                    } else {
                        console.error("[TTS RECEIVER] API returned:", ttsRes.status);
                    }
                } catch (e) {
                    console.error("[TTS RECEIVER] Error:", e);
                }
            }

            // Update subtitles map
            const entry: SubtitleEntry = {
                text: finalDisplayText,
                speaker: data.speaker,
                language: finalLanguage,
                timestamp: data.timestamp,
                senderID: data.senderID,
            };

            setSubtitles((prev) => {
                const next = new Map(prev);
                next.set(data.senderID, entry);
                return next;
            });
            scheduleSubtitleClear(data.senderID);
        };

        socket.on("subtitle-received", handleSubtitleReceived);

        return () => {
            socket.off("subtitle-received", handleSubtitleReceived);
        };
    }, [socket, scheduleSubtitleClear]);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (isTranscribingRef.current) {
                isTranscribingRef.current = false;
                if (intervalRef.current) clearInterval(intervalRef.current);
                if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
                    try { mediaRecorderRef.current.stop(); } catch (e) { /* */ }
                }
                if (micStreamRef.current) {
                    micStreamRef.current.getTracks().forEach((t) => t.stop());
                }
            }
            if (audioContextRef.current) {
                audioContextRef.current.close().catch(() => {});
            }
            if (ttsAudioRef.current) {
                ttsAudioRef.current.pause();
                ttsAudioRef.current = null;
            }
            subtitleTimeoutsRef.current.forEach((t) => clearTimeout(t));
        };
    }, []);

    const toggleDubbedMode = useCallback(() => {
        setIsDubbedMode((prev) => !prev);
    }, []);

    return {
        isTranscribing,
        subtitles,
        targetLanguage,
        setTargetLanguage,
        isDubbedMode,
        toggleDubbedMode,
        startTranscription,
        stopTranscription,
        SUPPORTED_LANGUAGES,
    };
}
