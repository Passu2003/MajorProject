"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Video, Film, FileText, Info, Copy, Clock, PenTool, X } from "lucide-react"
import { Download } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Whiteboard } from "./Whiteboard"
import { ChatPanel } from "./ChatPanel"

import { Socket } from "socket.io-client"

interface MeetingSidebarProps {
    isRecording: boolean
    onStartRecording: () => void
    onStopRecording: () => void
    meetingId?: string
    socket: Socket | null
    username: string
    activeTab: string
    messages: any[]
    setMessages: (messages: any[]) => void
    notes: string
    setNotes: (notes: string) => void
    onClose: () => void
}

export function MeetingSidebar({
    isRecording,
    onStartRecording,
    onStopRecording,
    meetingId = "meet-ai-123",
    socket,
    username,
    activeTab,
    messages,
    setMessages,
    notes,
    setNotes,
    onClose
}: MeetingSidebarProps) {
    return (
        <div className="h-full w-full flex flex-col bg-white dark:bg-neutral-900 border-l border-neutral-200 dark:border-neutral-800">
            <Tabs value={activeTab} className="flex-1 flex flex-col min-h-0">
                <TabsContent value="chat" forceMount={true} className="flex-1 h-full flex flex-col overflow-hidden min-h-0 data-[state=inactive]:hidden">
                    <ChatPanel
                        socket={socket}
                        username={username}
                        roomID={meetingId}
                        messages={messages}
                        setMessages={setMessages}
                        onClose={onClose}
                    />
                </TabsContent>

                <TabsContent value="board" className="flex-1 h-full overflow-hidden">
                    <Whiteboard onClose={onClose} />
                </TabsContent>

                <TabsContent value="notes" className="flex-1 h-full min-h-0 flex flex-col p-4">
                    <div className="flex-1 flex flex-col gap-2 min-h-0">
                        <div className="shrink-0 flex justify-between items-center mb-2">
                            <h3 className="text-sm font-medium text-neutral-500">Private Meeting Notes</h3>
                            <div className="flex items-center gap-1">
                                <Button variant="ghost" size="icon" onClick={() => {
                                    const blob = new Blob([notes], { type: "text/plain" });
                                    const url = URL.createObjectURL(blob);
                                    const a = document.createElement("a");
                                    a.href = url;
                                    a.download = `meeting-notes-${meetingId}-${new Date().toISOString().slice(0, 10)}.txt`;
                                    document.body.appendChild(a);
                                    a.click();
                                    document.body.removeChild(a);
                                    URL.revokeObjectURL(url);
                                }} className="h-6 w-6 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800" title="Download Notes">
                                    <Download className="w-4 h-4" />
                                </Button>
                                <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800">
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                        <Textarea
                            placeholder="Type your notes here..."
                            className="flex-1 resize-none bg-neutral-50 dark:bg-neutral-800 border-neutral-200 dark:border-neutral-700 focus:ring-emerald-500 text-black dark:text-white p-4 leading-relaxed"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                        />
                        <p className="text-xs text-neutral-400 shrink-0">Notes are not visible to other participants.</p>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    )
}
