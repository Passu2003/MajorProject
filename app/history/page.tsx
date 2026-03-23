"use client"

import { useEffect, useState } from "react"
import { getRecordings } from "@/lib/db"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Video, Film, ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function HistoryPage() {
    const router = useRouter()
    const [history, setHistory] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        async function fetchHistory() {
            try {
                // Fetch up to 30 Calls from Stream API and Cloud Recordings concurrently
                const [callsRes, apiRecsRes] = await Promise.all([
                  fetch('/api/stream/calls', { cache: 'no-store' }),
                  fetch('/api/stream/recordings', { cache: 'no-store' })
                ]);
                const callsData = await callsRes.json();
                const apiRecsData = await apiRecsRes.json();
                const calls = Array.isArray(callsData.calls) ? callsData.calls : [];

                // Map remote recordings by call_id for fast lookup
                const apiRecsMap = new Map();
                if (apiRecsData.recordings) {
                  apiRecsData.recordings.forEach((r: any) => {
                    if (r.call_id && !apiRecsMap.has(r.call_id)) {
                      apiRecsMap.set(r.call_id, r.url);
                    }
                  });
                }

                // Fetch Local Recordings
                const localRecs = await getRecordings()
                const recs = localRecs.filter(r => !r.deleted).map(r => ({
                    title: r.title || "Untitled Recording",
                    type: "recording",
                    date: r.date ? new Date(r.date).toLocaleString() : "Unknown",
                    rawDate: r.date ? new Date(r.date) : new Date(0),
                    status: "Saved",
                    duration: r.duration || "Unknown"
                }))

                // Normalize calls
                const normalizedCalls = calls.map((c: any) => ({
                    id: c.id,
                    title: c.title,
                    type: "meeting",
                    date: c.date,
                    rawDate: new Date(c.date),
                    status: c.status,
                    duration: c.duration,
                    recordingUrl: apiRecsMap.get(c.id) || null,
                    participants: c.participants || []
                }))

                // Merge, Sort by exact time descending, and cap rigidly at 30 items
                const merged = [...normalizedCalls, ...recs]
                    .sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime())
                    .slice(0, 30)

                setHistory(merged)
            } catch (e) {
                console.error("Failed to load history:", e)
            } finally {
                setIsLoading(false)
            }
        }
        fetchHistory()
    }, [])

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-8 font-sans">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center gap-4 mb-8">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => router.push("/dashboard")}
                        className="rounded-full hover:bg-neutral-200 dark:hover:bg-neutral-800"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Activity History</h1>
                        <p className="text-neutral-500 dark:text-neutral-400 mt-1">Viewing your last 30 meetings and recordings</p>
                    </div>
                </div>

                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                    {isLoading ? (
                        <div className="p-12 text-center text-neutral-500 flex flex-col items-center justify-center gap-4">
                            <div className="w-8 h-8 border-4 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
                            <p>Loading your timeline...</p>
                        </div>
                    ) : history.length === 0 ? (
                        <div className="p-12 text-center text-neutral-500">
                            No history found. Your meetings will appear here.
                        </div>
                    ) : (
                        <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                            {history.map((activity, index) => (
                                <div 
                                    key={index} 
                                    onClick={() => {
                                        if (activity.type === 'meeting' && activity.id) {
                                            router.push(`/history/${activity.id}`);
                                        }
                                    }}
                                    className={`p-6 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors flex items-center justify-between group ${activity.type === 'meeting' ? 'cursor-pointer' : ''}`}
                                >
                                    <div className="flex items-center gap-5">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm ${
                                            activity.type === 'recording' 
                                            ? 'bg-gradient-to-br from-orange-400 to-orange-600 text-white' 
                                            : 'bg-gradient-to-br from-emerald-400 to-teal-600 text-white'
                                        }`}>
                                            {activity.type === 'recording' ? <Film className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-neutral-900 dark:text-white mb-1 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                                                {activity.title}
                                            </h3>
                                            <div className="flex items-center gap-3 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                                                <span className="flex items-center gap-1">{activity.date}</span>
                                                <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                                                <span>{activity.duration}</span>
                                                
                                                {/* Mini Avatar Group */}
                                                {activity.participants && activity.participants.length > 0 && (
                                                    <>
                                                        <span className="w-1 h-1 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                                                        <div className="flex items-center -space-x-2">
                                                            {activity.participants.slice(0, 3).map((p: any, i: number) => (
                                                                <div 
                                                                    key={i} 
                                                                    className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-200 dark:bg-neutral-800 shrink-0 overflow-hidden flex items-center justify-center text-[10px] font-bold text-neutral-600 dark:text-neutral-300"
                                                                    title={p.name}
                                                                >
                                                                    {p.image ? (
                                                                        <img src={p.image} alt={p.name} className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        p.name.charAt(0).toUpperCase()
                                                                    )}
                                                                </div>
                                                            ))}
                                                            {activity.participants.length > 3 && (
                                                                <div className="w-5 h-5 rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-100 dark:bg-neutral-800 shrink-0 flex items-center justify-center text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                                                                    +{activity.participants.length - 3}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <Badge 
                                            variant="secondary" 
                                            className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                                                activity.status === "Active"
                                                ? "bg-green-100/50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 animate-pulse"
                                                : activity.status === "Saved" 
                                                ? "bg-orange-100/50 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/50" 
                                                : "bg-emerald-100/50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50"
                                            }`}
                                        >
                                            {activity.status === "Active" ? "● Active" : activity.status}
                                        </Badge>
                                        
                                        {activity.type === "meeting" && activity.status === "Active" && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-white dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-900 dark:text-neutral-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    router.push(`/meetings?room=${activity.id}`);
                                                }}
                                            >
                                                Rejoin
                                            </Button>
                                        )}
                                        {activity.type === "meeting" && activity.status === "Completed" && activity.recordingUrl && (
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                className="bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/50 dark:hover:bg-emerald-900/40"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    window.open(activity.recordingUrl, "_blank");
                                                }}
                                            >
                                                <Film className="w-3 h-3 mr-1.5" />
                                                Watch Recording
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
