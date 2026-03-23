import { useState, useRef, useCallback, useEffect } from "react";
import { saveRecording } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

interface ParticipantStream {
    id: string;
    stream: MediaStream;
    isLocal?: boolean;
}

export function useMeetingRecorder(participants: ParticipantStream[]) {
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    
    // Canvas & Audio Context refs
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const animationFrameRef = useRef<number>(0);
    const audioContextRef = useRef<AudioContext | null>(null);
    const audioDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);
    const audioSourcesRef = useRef<Map<string, MediaStreamAudioSourceNode>>(new Map());
    
    // Video element cache for drawing to canvas
    const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());

    // Update video elements when participants change
    useEffect(() => {
        if (!isRecording) return;
        
        const currentIds = new Set(participants.map(p => p.id));
        
        // Remove old videos
        for (const id of Array.from(videoElementsRef.current.keys())) {
            if (!currentIds.has(id)) {
                const video = videoElementsRef.current.get(id);
                if (video) {
                    video.srcObject = null;
                }
                videoElementsRef.current.delete(id);
            }
        }
        
        // Add new videos
        participants.forEach(p => {
            if (!videoElementsRef.current.has(p.id) && p.stream.getVideoTracks().length > 0) {
                const video = document.createElement("video");
                video.srcObject = p.stream;
                video.autoplay = true;
                video.muted = true; // Don't play out loud, just for canvas
                video.play().catch(e => console.error("Error playing hidden video for recording:", e));
                videoElementsRef.current.set(p.id, video);
            }
        });
        
        // Update audio sources
        if (audioContextRef.current && audioDestinationRef.current) {
            // Remove old audio sources
            for (const id of Array.from(audioSourcesRef.current.keys())) {
                if (!currentIds.has(id)) {
                    const source = audioSourcesRef.current.get(id);
                    source?.disconnect();
                    audioSourcesRef.current.delete(id);
                }
            }
            
            // Add new audio sources
            participants.forEach(p => {
                if (!audioSourcesRef.current.has(p.id) && p.stream.getAudioTracks().length > 0) {
                    try {
                        // Create a clone of the stream containing only the audio track to avoid issues
                        const audioStream = new MediaStream(p.stream.getAudioTracks());
                        const source = audioContextRef.current!.createMediaStreamSource(audioStream);
                        source.connect(audioDestinationRef.current!);
                        audioSourcesRef.current.set(p.id, source);
                    } catch (e) {
                         console.error("Error connecting audio source for recording:", e);
                    }
                }
            });
        }
        
    }, [participants, isRecording]);

    const startRecording = useCallback(async () => {
        try {
            // 1. Setup Canvas (1280x720)
            const canvas = document.createElement("canvas");
            canvas.width = 1280;
            canvas.height = 720;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Could not create canvas context");
            
            canvasRef.current = canvas;
            ctxRef.current = ctx;

            // Fill background
            ctx.fillStyle = "#171717"; // bg-neutral-900
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // 2. Setup Audio Context
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const audioCtx = new AudioContextClass();
            // Crucial step: AudioContext must be resumed after user gesture
            await audioCtx.resume();
            const destination = audioCtx.createMediaStreamDestination();
            
            audioContextRef.current = audioCtx;
            audioDestinationRef.current = destination;
            
            // 3. Connect existing participants
            participants.forEach(p => {
                // Audio
                if (p.stream.getAudioTracks().length > 0) {
                     try {
                        const audioStream = new MediaStream(p.stream.getAudioTracks());
                        const source = audioCtx.createMediaStreamSource(audioStream);
                        source.connect(destination);
                        audioSourcesRef.current.set(p.id, source);
                     } catch (e) {
                         console.error("Audio connection error", e);
                     }
                }
                
                // Video setup
                if (p.stream.getVideoTracks().length > 0) {
                    const video = document.createElement("video");
                    video.srcObject = p.stream;
                    video.autoplay = true;
                    video.muted = true;
                    video.play().catch(e => console.error(e));
                    videoElementsRef.current.set(p.id, video);
                }
            });

            // 4. Start Drawing Loop
            const drawGrid = () => {
                if (!ctxRef.current || !canvasRef.current) return;
                
                const c = canvasRef.current;
                const context = ctxRef.current;
                
                // Clear bg
                context.fillStyle = "#171717";
                context.fillRect(0, 0, c.width, c.height);
                
                const videos = Array.from(videoElementsRef.current.values());
                const count = videos.length;
                
                if (count > 0) {
                    // Simple grid layout logic based on count
                    let cols = Math.ceil(Math.sqrt(count));
                    let rows = Math.ceil(count / cols);
                    
                    const slotWidth = c.width / cols;
                    const slotHeight = c.height / rows;
                    
                    videos.forEach((video, index) => {
                        const col = index % cols;
                        const row = Math.floor(index / cols);
                        
                        const x = col * slotWidth;
                        const y = row * slotHeight;
                        
                        // Draw with padding
                        const padding = 10;
                        try {
                             if (video.readyState >= 2) {
                                 // Object cover logic manually implemented conceptually
                                 context.drawImage(video, x + padding, y + padding, slotWidth - (padding*2), slotHeight - (padding*2));
                             }
                        } catch (e) {
                             // Ignore drawing errors for disconnected videos
                        }
                    });
                } else {
                    context.fillStyle = "#fff";
                    context.font = "30px Arial";
                    context.textAlign = "center";
                    context.fillText("Waiting for video streams...", c.width / 2, c.height / 2);
                }
                
                animationFrameRef.current = requestAnimationFrame(drawGrid);
            };
            
            drawGrid();

            // 5. Combine Canvas Stream and Audio Stream
            const canvasStream = canvas.captureStream(30); // 30 FPS
            const audioStream = destination.stream;
            
            const combinedTracks = [
                ...canvasStream.getVideoTracks(),
                ...audioStream.getAudioTracks()
            ];
            
            const combinedStream = new MediaStream(combinedTracks);

            // 6. Start MediaRecorder
            // Use just webm or webm;codecs=vp8 if opus fails on some browsers
            const options = MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")
                ? { mimeType: "video/webm;codecs=vp8,opus" }
                : { mimeType: "video/webm" };

            const mediaRecorder = new MediaRecorder(combinedStream, options);
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    chunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" });
                const duration = formatTime(recordingTime);

                await saveRecording({
                    id: uuidv4(),
                    title: `Meeting Recording ${new Date().toLocaleDateString()}`,
                    blob,
                    date: new Date().toISOString(),
                    duration,
                    size: blob.size,
                });

                // Clean up tracks from combined stream
                combinedStream.getTracks().forEach(t => t.stop());
                
                setIsRecording(false);
                clearInterval(timerRef.current!);
                setRecordingTime(0);
            };

            mediaRecorder.start();
            setIsRecording(true);

            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error starting meeting internal recording:", err);
            setIsRecording(false);
            alert("Could not start recording.");
        }
    }, [participants, recordingTime]);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop();
        }
        
        // Stop animation loop
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        
        // Cleanup Audio
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        audioSourcesRef.current.clear();
        
        // Cleanup Video elements
        videoElementsRef.current.forEach(v => {
            v.srcObject = null;
        });
        videoElementsRef.current.clear();

    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, "0")}`;
    };

    return {
        isRecording,
        startRecording,
        stopRecording,
        recordingTime: formatTime(recordingTime),
    };
}
