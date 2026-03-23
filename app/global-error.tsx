"use client";

import { useEffect } from "react";

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Global Layout Error:", error);
    }, [error]);

    return (
        <html lang="en">
            <body className="bg-neutral-950 text-white flex flex-col items-center justify-center min-h-screen">
                <h2 className="text-2xl font-bold text-red-500 mb-4">Fatal Layout Error</h2>
                <pre className="bg-neutral-900 p-4 rounded text-sm text-red-400 max-w-2xl overflow-auto border border-neutral-800 mb-4">
                    {error.message}
                </pre>
                <button 
                    onClick={() => reset()}
                    className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-sm font-medium transition-colors"
                >
                    Hard Reset
                </button>
            </body>
        </html>
    );
}
