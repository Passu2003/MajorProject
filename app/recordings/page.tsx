"use client"

import { useEffect, useState } from "react"
import { getRecordings, deleteRecording, updateRecording, Recording } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2, Download, Play, Calendar, Clock, ArrowLeft, MoreVertical, Edit2, Info } from "lucide-react"
import { useRouter } from "next/navigation"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export default function RecordingsPage() {
    const [recordings, setRecordings] = useState<any[]>([])
    const [selectedRecording, setSelectedRecording] = useState<any | null>(null)
    const [recordingProperties, setRecordingProperties] = useState<any | null>(null)
    const [renameDialog, setRenameDialog] = useState<any | null>(null)
    const [newName, setNewName] = useState("")
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    useEffect(() => {
        loadRecordings()
    }, [])

    const loadRecordings = async () => {
        setLoading(true)
        try {
            const localDb = await getRecordings();
            const localMap = new Map(localDb.map(r => [r.id, r]));

            const res = await fetch('/api/stream/recordings');
            const data = await res.json();
            
            if (data.recordings) {
                const merged = data.recordings.map((r: any) => {
                    const localOverride = localMap.get(r.id);
                    if (localOverride) {
                        return { ...r, ...localOverride, url: r.url }; // Keep live streaming URL
                    }
                    return r;
                }).filter((r: any) => !r.deleted);
                setRecordings(merged);
            }
        } catch (e) {
            console.error('Error fetching stream recordings:', e)
        } finally {
            setLoading(false)
        }
    }

    const handleDownload = (rec: any, e: React.MouseEvent) => {
        e.stopPropagation()
        // Stream returns a direct remote URL
        window.open(rec.url, '_blank');
    }

    const handleDelete = async (rec: any, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('Are you sure you want to hide this recording from your dashboard?')) return;
        
        try {
            await updateRecording({ id: rec.id, deleted: true });
            setRecordings(prev => prev.filter(r => r.id !== rec.id));
        } catch (error) {
            console.error(error);
            alert("Local storage error processing deletion.");
        }
    }

    const handleRenameSubmit = async () => {
        if (!newName.trim() || !renameDialog) return;
        
        try {
            await updateRecording({ id: renameDialog.id, title: newName });
            setRecordings(prev => prev.map(r => r.id === renameDialog.id ? { ...r, title: newName } : r));
            setRenameDialog(null);
            setNewName("");
        } catch (e) {
            console.error(e);
            alert("Failed to rename recording in local storage.");
        }
    }

    const formatSize = (bytes: number) => {
        if (!bytes) return "Unknown Size";
        const mb = bytes / (1024 * 1024)
        return `${mb.toFixed(1)} MB`
    }

    return (
        <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 p-6 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button variant="ghost" size="icon" onClick={() => router.push("/dashboard")}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl font-bold text-neutral-900 dark:text-white">Cloud Recordings</h1>
                            <p className="text-neutral-500">Manage your Stream HD video sessions</p>
                        </div>
                    </div>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {loading ? (
                        <p>Loading...</p>
                    ) : recordings.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-neutral-500">
                            <div className="w-16 h-16 bg-neutral-200 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Play className="w-8 h-8 text-neutral-400" />
                            </div>
                            <h3 className="text-lg font-medium">No recordings yet</h3>
                            <p>Record your meetings to see them here.</p>
                        </div>
                    ) : (
                        recordings.map((rec) => (
                            <Card
                                key={rec.id}
                                className="group cursor-pointer hover:shadow-lg transition-all border-neutral-200 dark:border-neutral-800 overflow-hidden"
                                onClick={() => setSelectedRecording(rec)}
                            >
                                <div className="aspect-video bg-neutral-900 relative flex items-center justify-center group-hover:opacity-90 transition-opacity">
                                    <Play className="w-12 h-12 text-white opacity-50 group-hover:opacity-100 transition-opacity" />
                                    <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                                        {rec.duration}
                                    </div>
                                </div>
                                <CardHeader className="p-4 pb-2">
                                    <div className="flex justify-between items-start">
                                        <CardTitle className="text-base font-semibold line-clamp-1" title={rec.title}>
                                            {rec.title}
                                        </CardTitle>
                                        <div onClick={(e) => e.stopPropagation()}>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 -mr-2 -mt-2">
                                                        <MoreVertical className="w-4 h-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent>
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRecordingProperties(rec);
                                                    }}>
                                                        <Info className="w-4 h-4 mr-2" /> Properties
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => {
                                                        e.stopPropagation();
                                                        setRenameDialog(rec);
                                                        setNewName(rec.title);
                                                    }}>
                                                        <Edit2 className="w-4 h-4 mr-2" /> Rename
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={(e) => handleDownload(rec, e)}>
                                                        <Download className="w-4 h-4 mr-2" /> Download
                                                    </DropdownMenuItem>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuItem 
                                                        className="text-red-600 focus:bg-red-500/10 focus:text-red-500 cursor-pointer" 
                                                        onClick={(e) => handleDelete(rec, e)}
                                                    >
                                                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                        </DropdownMenu>
                                        </div>
                                    </div>
                                </CardHeader>
                                <CardContent className="p-4 pt-0 text-sm text-neutral-500 space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        <span>{new Date(rec.date).toLocaleDateString()}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="w-4 h-4" /> {/* spacer */}
                                        <span>{formatSize(rec.size)}</span>
                                    </div>
                                </CardContent>
                            </Card>
                        ))
                    )}
                </div>
            </div>

            {/* Playback Dialog */}
            <Dialog open={!!selectedRecording} onOpenChange={(open) => !open && setSelectedRecording(null)}>
                <DialogContent className="max-w-4xl bg-black border-neutral-800 p-0 overflow-hidden text-white sm:max-w-[800px]">
                    <DialogHeader className="p-4 absolute top-0 left-0 w-full bg-gradient-to-b from-black/80 to-transparent z-10">
                        <DialogTitle>{selectedRecording?.title}</DialogTitle>
                    </DialogHeader>
                    {selectedRecording && (
                        <div className="aspect-video w-full bg-neutral-900 flex items-center justify-center">
                                <video
                                    src={selectedRecording.url}
                                    controls
                                    className="max-w-full max-h-[70vh]"
                                    autoPlay
                                />
                            </div>
                        )}
                    </DialogContent>
                </Dialog>

            {/* Properties Dialog */}
            <Dialog open={!!recordingProperties} onOpenChange={(open) => !open && setRecordingProperties(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Recording Properties</DialogTitle>
                    </DialogHeader>
                    {recordingProperties && (
                        <div className="space-y-4 py-4 text-sm">
                            <div className="grid grid-cols-3 items-center gap-4">
                                <span className="font-semibold text-neutral-500">File Name:</span>
                                <span className="col-span-2 line-clamp-1" title={recordingProperties.title}>{recordingProperties.title}.mp4</span>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <span className="font-semibold text-neutral-500">Date Recorded:</span>
                                <span className="col-span-2">{new Date(recordingProperties.date).toLocaleString()}</span>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                <span className="font-semibold text-neutral-500">Duration:</span>
                                <span className="col-span-2">{recordingProperties.duration}</span>
                            </div>
                            <div className="grid grid-cols-3 items-center gap-4">
                                                <span className="font-semibold text-neutral-500">File Size:</span>
                                                <span className="col-span-2">{formatSize(recordingProperties.size)}</span>
                                            </div>
                                            <div className="grid grid-cols-3 items-center gap-4">
                                                <span className="font-semibold text-neutral-500">Format:</span>
                                                <span className="col-span-2">MP4 / AAC / H.264</span>
                                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Rename Dialog */}
            <Dialog open={!!renameDialog} onOpenChange={(open) => !open && setRenameDialog(null)}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Rename Recording</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="title">Recording Title</Label>
                            <Input
                                id="title"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                placeholder="E.g., Q3 Project Sync"
                                autoFocus
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setRenameDialog(null)}>Cancel</Button>
                        <Button onClick={handleRenameSubmit}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
