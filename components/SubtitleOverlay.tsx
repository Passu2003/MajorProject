"use client";

import { useEffect, useState } from "react";

interface SubtitleEntry {
    text: string;
    speaker: string;
    language: string;
    timestamp: number;
    senderID?: string;
}

interface SubtitleOverlayProps {
    subtitles: Map<string, SubtitleEntry>;
    isVisible: boolean;
}

export function SubtitleOverlay({ subtitles, isVisible }: SubtitleOverlayProps) {
    const [visibleEntries, setVisibleEntries] = useState<SubtitleEntry[]>([]);

    useEffect(() => {
        const entries = Array.from(subtitles.values())
            .filter((entry) => Date.now() - entry.timestamp < 10000);
        setVisibleEntries(entries);
    }, [subtitles]);

    if (!isVisible || visibleEntries.length === 0) return null;

    return (
        <div
            style={{
                position: "absolute",
                bottom: "100px",
                left: "50%",
                transform: "translateX(-50%)",
                zIndex: 60,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "6px",
                maxWidth: "80%",
                width: "max-content",
                pointerEvents: "none",
            }}
        >
            {visibleEntries.map((entry, i) => (
                <div
                    key={`${entry.senderID || i}-${entry.timestamp}`}
                    style={{
                        background: "rgba(0, 0, 0, 0.8)",
                        backdropFilter: "blur(8px)",
                        borderRadius: "10px",
                        padding: "8px 18px",
                        maxWidth: "100%",
                        animation: "subtitleFadeIn 0.3s ease-out",
                    }}
                >
                    <span
                        style={{
                            fontSize: "11px",
                            fontWeight: 600,
                            color: entry.senderID === "local" ? "#818cf8" : "#34d399",
                            textTransform: "uppercase",
                            letterSpacing: "0.05em",
                            marginRight: "8px",
                        }}
                    >
                        {entry.speaker}
                    </span>
                    <span
                        style={{
                            fontSize: "16px",
                            fontWeight: 500,
                            color: "#ffffff",
                            lineHeight: 1.4,
                            textShadow: "0 1px 3px rgba(0,0,0,0.5)",
                        }}
                    >
                        {entry.text}
                    </span>
                </div>
            ))}

            <style>{`
                @keyframes subtitleFadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
}
