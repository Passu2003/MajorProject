"use client";

import { Languages, Volume2, VolumeX, X } from "lucide-react";

interface SubtitleSettingsProps {
    isOpen: boolean;
    onClose: () => void;
    isTranscribing: boolean;
    onToggleTranscription: () => void;
    targetLanguage: string;
    onLanguageChange: (lang: string) => void;
    isDubbedMode: boolean;
    onToggleDubbed: () => void;
    languages: Array<{ code: string; label: string }>;
}

export function SubtitleSettings({
    isOpen,
    onClose,
    isTranscribing,
    onToggleTranscription,
    targetLanguage,
    onLanguageChange,
    isDubbedMode,
    onToggleDubbed,
    languages,
}: SubtitleSettingsProps) {
    if (!isOpen) return null;

    return (
        <div
            style={{
                position: "absolute",
                bottom: "90px",
                right: "20px",
                zIndex: 70,
                background: "rgba(23, 23, 23, 0.97)",
                backdropFilter: "blur(16px)",
                borderRadius: "16px",
                border: "1px solid rgba(255,255,255,0.1)",
                padding: "20px",
                width: "300px",
                boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
            }}
        >
            {/* Header */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Languages size={18} color="#818cf8" />
                    <span style={{ fontSize: "15px", fontWeight: 600, color: "#fff" }}>
                        Live Subtitles
                    </span>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        color: "#888",
                    }}
                >
                    <X size={16} />
                </button>
            </div>

            {/* Enable Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                <span style={{ fontSize: "13px", color: "#ccc" }}>Subtitles</span>
                <button
                    onClick={onToggleTranscription}
                    style={{
                        width: "44px",
                        height: "24px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        background: isTranscribing
                            ? "linear-gradient(135deg, #818cf8, #6366f1)"
                            : "#3f3f46",
                        transition: "background 0.2s",
                    }}
                >
                    <div
                        style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: "3px",
                            left: isTranscribing ? "23px" : "3px",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                    />
                </button>
            </div>

            {/* Language Selector */}
            <div style={{ marginBottom: "16px" }}>
                <label style={{ fontSize: "12px", color: "#888", display: "block", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                    Translate To
                </label>
                <select
                    value={targetLanguage}
                    onChange={(e) => onLanguageChange(e.target.value)}
                    style={{
                        width: "100%",
                        padding: "8px 12px",
                        borderRadius: "8px",
                        border: "1px solid rgba(255,255,255,0.1)",
                        background: "#27272a",
                        color: "#fff",
                        fontSize: "14px",
                        cursor: "pointer",
                        outline: "none",
                    }}
                >
                    {languages.map((lang) => (
                        <option key={lang.code} value={lang.code}>
                            {lang.label}
                        </option>
                    ))}
                </select>
            </div>

            {/* Dubbed Audio Toggle */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isDubbedMode ? (
                        <Volume2 size={16} color="#34d399" />
                    ) : (
                        <VolumeX size={16} color="#888" />
                    )}
                    <div>
                        <span style={{ fontSize: "13px", color: "#ccc", display: "block" }}>Dubbed Audio</span>
                        <span style={{ fontSize: "11px", color: "#666" }}>Replace voice with TTS</span>
                    </div>
                </div>
                <button
                    onClick={onToggleDubbed}
                    style={{
                        width: "44px",
                        height: "24px",
                        borderRadius: "12px",
                        border: "none",
                        cursor: "pointer",
                        position: "relative",
                        background: isDubbedMode
                            ? "linear-gradient(135deg, #34d399, #059669)"
                            : "#3f3f46",
                        transition: "background 0.2s",
                    }}
                >
                    <div
                        style={{
                            width: "18px",
                            height: "18px",
                            borderRadius: "50%",
                            background: "#fff",
                            position: "absolute",
                            top: "3px",
                            left: isDubbedMode ? "23px" : "3px",
                            transition: "left 0.2s",
                            boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
                        }}
                    />
                </button>
            </div>

            {/* Status indicator */}
            {isTranscribing && (
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "8px", padding: "8px 12px", borderRadius: "8px", background: "rgba(129, 140, 248, 0.1)" }}>
                    <div
                        style={{
                            width: "8px",
                            height: "8px",
                            borderRadius: "50%",
                            background: "#818cf8",
                            animation: "pulse 1.5s ease-in-out infinite",
                        }}
                    />
                    <span style={{ fontSize: "12px", color: "#818cf8" }}>Listening...</span>
                    <style>{`
                        @keyframes pulse {
                            0%, 100% { opacity: 1; }
                            50% { opacity: 0.3; }
                        }
                    `}</style>
                </div>
            )}
        </div>
    );
}
