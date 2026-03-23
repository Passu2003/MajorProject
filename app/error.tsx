"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("UI Encountered a fatal error:", error);
    }, [error]);

    return (
        <div className="flex w-screen h-screen flex-col items-center justify-center bg-neutral-950 text-white p-4">
            <h2 className="text-2xl font-bold mb-4 text-red-500">Something went wrong!</h2>
            <div className="bg-neutral-900 border border-neutral-800 p-6 rounded-xl max-w-2xl w-full mb-6 overflow-auto">
                <p className="font-mono text-sm text-red-400 mb-2">{error.name}: {error.message}</p>
                {error.stack && (
                    <pre className="text-xs text-neutral-400 mt-2 whitespace-pre-wrap">
                        {error.stack}
                    </pre>
                )}
            </div>
            <Button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
                variant="outline"
                className="bg-neutral-800 hover:bg-neutral-700 text-white border-neutral-700"
            >
                Try again
            </Button>
        </div>
    );
}
