"use client";

import { useState } from "react";
import { Bot, FileAudio, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface AudioSummaryTabProps {
    callId: string;
    aiSummary: string;
    recordingUrl?: string;
    isGeneratingProp?: boolean;
}

// Placeholder strings that should be treated as "no real summary"
const PLACEHOLDER_TEXTS = [
    "Not enough data to generate an AI summary.",
    "Not enough data to generate an AI summary",
];

export function AudioSummaryTab({ callId, aiSummary, recordingUrl, isGeneratingProp = false }: AudioSummaryTabProps) {
    const [isGenerating, setIsGenerating] = useState(isGeneratingProp);
    const router = useRouter();

    // Treat placeholder text as no summary
    const hasRealSummary = aiSummary && !PLACEHOLDER_TEXTS.includes(aiSummary.trim());

    const handleGenerateSummary = async () => {
        if (!recordingUrl) return;

        setIsGenerating(true);
        toast.info("Extracting Audio...", { description: "This may take a few minutes depending on the length of the recording. Please stay on this page." });

        try {
            const res = await fetch('/api/stream/transcribe', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ call_id: callId, recording_url: recordingUrl })
            });

            const data = await res.json();
            
            if (!res.ok) {
                throw new Error(data.error || "Failed to transcribe audio");
            }

            toast.success("AI Summary Generated!");
            router.refresh(); // Refresh the page to load the new custom state
        } catch (error: any) {
            console.error("Transcription error:", error);
            toast.error("Transcription Failed", { description: error.message });
            setIsGenerating(false);
        }
    };

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm min-h-[400px] flex flex-col relative overflow-hidden">
            <div className="flex items-center justify-between mb-6 z-10">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center">
                    <Bot className="w-5 h-5 mr-3 text-emerald-500" />
                    Automated Meeting Minutes
                </h3>
                {/* Show regenerate button when we have a real summary AND a recording */}
                {hasRealSummary && recordingUrl && !isGenerating && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleGenerateSummary}
                        className="text-emerald-600 border-emerald-200 hover:bg-emerald-50 dark:border-emerald-800 dark:hover:bg-emerald-900/30"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Re-generate from Audio
                    </Button>
                )}
                {isGenerating && hasRealSummary && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Transcribing...
                    </div>
                )}
            </div>
            
            {/* The Summary Exists (and it's a real summary, not placeholder) */}
            {hasRealSummary ? (
                <div className="prose prose-neutral dark:prose-invert prose-emerald max-w-none text-[15px] leading-7 z-10"
                        dangerouslySetInnerHTML={{ __html: aiSummary.replace(/\n/g, '<br/>').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/### (.*?)\n/g, '<h4>$1</h4><br/>').replace(/## (.*?)\n/g, '<h3>$1</h3><br/>').replace(/# (.*?)\n/g, '<h2>$1</h2><br/>').replace(/- (.*?)\n/g, '<li>$1</li>') }}
                />
            ) : (
                /* No real Summary Exists — show button or empty state */
                <div className="flex-1 flex flex-col items-center justify-center text-center z-10">
                    <div className="w-20 h-20 bg-neutral-100 dark:bg-neutral-800 rounded-full flex items-center justify-center mb-6 shadow-inner ring-1 ring-neutral-200 dark:ring-neutral-700">
                        {isGenerating ? (
                            <Loader2 className="w-10 h-10 text-emerald-500 animate-spin" />
                        ) : (
                            <FileAudio className="w-10 h-10 text-neutral-400" />
                        )}
                    </div>
                    
                    <h4 className="text-lg font-bold text-neutral-800 dark:text-neutral-200 mb-2">
                        {isGenerating ? "Transcribing meeting audio..." : "No Summary Available"}
                    </h4>
                    
                    {isGenerating ? (
                        <p className="text-neutral-500 max-w-md">Our AI is currently listening to the recording and generating professional meeting minutes. This usually takes 1-3 minutes.</p>
                    ) : recordingUrl ? (
                         // Recording exists but no transcript yet! Provide the button.
                         <>
                            <p className="text-neutral-500 max-w-md mb-6">A cloud recording for this meeting is available. Would you like our AI to listen and extract a detailed summary?</p>
                            <Button onClick={handleGenerateSummary} className="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 px-8 py-6 rounded-xl font-semibold text-[15px] transition-all hover:scale-105">
                                <Bot className="w-5 h-5 mr-2" />
                                Extract Audio & Summarize
                            </Button>
                         </>
                    ) : (
                        // No recording, no transcript.
                        <p className="text-neutral-500 max-w-md">No AI minutes were generated because there was no chat activity, no notes taken, and no cloud recording found for this meeting.</p>
                    )}
                </div>
            )}

            {/* Background design elements */}
            {!hasRealSummary && (
                <div className="absolute inset-0 pointer-events-none opacity-50 dark:opacity-20 translate-y-20">
                    <div className="absolute bottom-[-20%] left-[-10%] w-[50%] h-[50%] bg-emerald-500/10 blur-[120px] rounded-full" />
                    <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[100px] rounded-full" />
                </div>
            )}
        </div>
    );
}

