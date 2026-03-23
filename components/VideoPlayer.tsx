import React, { useEffect, useRef } from "react";

interface VideoProps {
    stream: MediaStream;
    muted?: boolean;
    label?: string;
    isLocal?: boolean;
}

export const VideoPlayer: React.FC<VideoProps> = ({ stream, muted = false, isLocal = false }) => {
    const videoRef = useRef<HTMLVideoElement>(null);

    useEffect(() => {
        const videoEl = videoRef.current;
        if (videoEl) {
            videoEl.srcObject = stream;
            // Eagerly set volume to max to prevent browser-specific "quiet" defaults
            videoEl.volume = 1.0;
            
            // Critical: explicit loaded metadata promise handle to bypass autoplay restrictions on audio
            videoEl.onloadedmetadata = () => {
                videoEl.play().catch(e => console.error("VideoPlayer error playing video:", e));
            };
        }
        return () => {
            if (videoEl) {
                videoEl.onloadedmetadata = null;
                videoEl.srcObject = null;
            }
        };
    }, [stream]);

    return (
        <div className={`w-full h-full relative rounded-xl overflow-hidden shadow-lg bg-black ${isLocal ? 'border-2 border-black' : ''}`}>
            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted={muted} // Always mute local video to prevent feedback
                className={`w-full h-full object-cover ${isLocal ? 'scale-x-[-1]' : ''}`} // Mirror local video
            />
        </div>
    );
};
