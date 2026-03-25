"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Search, Plus, Bot, Video, Film, Settings, LogOut, LayoutGrid } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { getRecordings } from "@/lib/db"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"

export default function DashboardPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("meetings")
  const [newMeetingDialog, setNewMeetingDialog] = useState(false)
  const [meetingTitle, setMeetingTitle] = useState("")

  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  useEffect(() => {
    async function fetchActivity() {
      try {
        // Fetch Call History and Cloud Recordings concurrently
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

        // Fetch Local Recordings (which have live overrides and titles)
        const localRecs = await getRecordings();
        const recs = localRecs.filter(r => !r.deleted).map(r => ({
          title: r.title || "Untitled Recording",
          type: "recording",
          date: r.date ? new Date(r.date).toLocaleString() : "Unknown",
          rawDate: r.date ? new Date(r.date) : new Date(0),
          status: "Saved",
          duration: r.duration || "Unknown"
        }));

        // Normalize calls for sorting
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
        }));

        const merged = [...normalizedCalls, ...recs].sort((a, b) => b.rawDate.getTime() - a.rawDate.getTime()).slice(0, 4);
        setRecentActivity(merged);
      } catch (e) {
        console.error("Failed to load dashboard activity:", e);
      }
    }
    fetchActivity();
  }, []);

  const openNewMeeting = () => {
    setMeetingTitle("");
    setNewMeetingDialog(true);
  }

  const handleNewMeeting = () => {
    const roomId = crypto.randomUUID();
    const titleParam = meetingTitle.trim() ? `&title=${encodeURIComponent(meetingTitle.trim())}` : "";
    setNewMeetingDialog(false);
    router.push(`/meetings?room=${roomId}${titleParam}`);
  }

  const handleRecordings = () => {
    router.push("/recordings")
  }

  const [joinRoomId, setJoinRoomId] = useState("");

  const handleJoinRoom = () => {
    if (!joinRoomId.trim()) return;

    // Extract ID if full URL is pasted
    let roomId = joinRoomId.trim();
    try {
      const url = new URL(roomId);
      const id = url.searchParams.get("room");
      if (id) roomId = id;
    } catch (e) {
      // Not a URL, use as is
    }

    router.push(`/meetings?room=${roomId}`);
  }

  return (
    <div className="flex h-screen bg-neutral-50 dark:bg-neutral-950 font-sans">
      {/* Sidebar */}
      <div className="w-72 bg-white dark:bg-neutral-900 border-r border-neutral-200 dark:border-neutral-800 flex flex-col shadow-sm z-10 transition-all duration-300">
        {/* Logo */}
        <div className="p-6 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform">
              <Video className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-neutral-900 to-neutral-600 dark:from-white dark:to-neutral-400">
              Meet.AI
            </span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-2">
          <div className="px-4 py-2 text-xs font-semibold text-neutral-400 uppercase tracking-wider">
            Menu
          </div>
          <Button
            variant="ghost"
            onClick={() => setActiveTab("meetings")}
            className={`w-full justify-start gap-3 px-4 py-6 rounded-xl transition-all ${activeTab === "meetings"
              ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 font-medium"
              : "text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              }`}
          >
            <LayoutGrid className="w-5 h-5" />
            Dashboard
          </Button>
          <Button
            variant="ghost"
            onClick={handleRecordings}
            className="w-full justify-start gap-3 px-4 py-6 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
          >
            <Film className="w-5 h-5" />
            RecordingsLibrary
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 px-4 py-6 rounded-xl text-neutral-600 dark:text-neutral-400 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-all"
          >
            <Settings className="w-5 h-5" />
            Settings
          </Button>
        </nav>

        {/* User Profile */}
        <div className="p-4 border-t border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3 p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800 cursor-pointer transition-colors group">
            <Avatar className="w-10 h-10 border-2 border-white dark:border-neutral-700 shadow-sm group-hover:border-emerald-200 transition-colors">
              <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-medium">JD</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-neutral-900 dark:text-white truncate">John Doe</div>
              <div className="text-xs text-neutral-500 dark:text-neutral-400 truncate">john.doe@example.com</div>
            </div>
            <LogOut className="w-4 h-4 text-neutral-400 group-hover:text-red-500 transition-colors" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden bg-neutral-50/50 dark:bg-neutral-950">
        {/* Header */}
        <header className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800 px-6 py-3 sticky top-0 z-20">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-neutral-900 dark:text-white">Good Morning, John</h1>
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">Here's what's happening today</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="relative hidden md:block w-56">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-neutral-400 w-4 h-4" />
                <Input
                  placeholder="Search meetings..."
                  className="pl-10 h-10 bg-neutral-100 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-900 transition-all rounded-xl"
                />
              </div>
              <Button
                className="bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg h-10 hover:shadow-emerald-500/25 transition-all rounded-xl px-4"
                onClick={openNewMeeting}
              >
                <Plus className="w-5 h-5 mr-2" />
                New Meeting
              </Button>
            </div>
          </div>
        </header>

        {/* Scrollable Content */}
        <main className="flex-1 p-6 overflow-y-auto no-scrollbar">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div
              onClick={openNewMeeting}
              className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-4 text-white cursor-pointer hover:shadow-xl hover:scale-[1.02] transition-all duration-300"
            >
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center mb-3 backdrop-blur-sm">
                <Video className="w-5 h-5 text-white" />
              </div>
              <h3 className="text-base font-bold mb-1">Start Instant Meeting</h3>
              <p className="text-emerald-100 text-xs">Launch a secure call immediately</p>
            </div>

            <div
              onClick={handleRecordings}
              className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 cursor-pointer hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900/50 hover:scale-[1.02] transition-all duration-300 group"
            >
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-orange-100 dark:group-hover:bg-orange-900/30 transition-colors">
                <Film className="w-5 h-5 text-orange-500" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">View Recordings</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs">Access your saved sessions</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 cursor-pointer hover:shadow-xl hover:border-purple-200 dark:hover:border-purple-900/50 hover:scale-[1.02] transition-all duration-300 group">
              <div className="w-10 h-10 bg-purple-50 dark:bg-purple-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-purple-100 dark:group-hover:bg-purple-900/30 transition-colors">
                <Bot className="w-5 h-5 text-purple-500" />
              </div>
              <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">Call With AI</h3>
              <p className="text-neutral-500 dark:text-neutral-400 text-xs">Talk to your AI assistant</p>
            </div>

            <Dialog>
              <DialogTrigger className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 cursor-pointer hover:shadow-xl hover:border-emerald-200 dark:hover:border-emerald-900/50 hover:scale-[1.02] transition-all duration-300 group text-left">
                <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center mb-3 group-hover:bg-emerald-100 dark:group-hover:bg-emerald-900/30 transition-colors">
                  <Settings className="w-5 h-5 text-emerald-500" />
                </div>
                <h3 className="text-base font-bold text-neutral-900 dark:text-white mb-1">Join Room</h3>
                <p className="text-neutral-500 dark:text-neutral-400 text-xs text-left">Enter via code or link</p>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <DialogHeader>
                  <DialogTitle>Join Meeting</DialogTitle>
                  <DialogDescription>
                    Enter the meeting code or link to join an existing session.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="room-id">Meeting ID or Link</Label>
                    <Input
                      id="room-id"
                      placeholder="e.g. 123-456 or https://..."
                      value={joinRoomId}
                      onChange={(e) => setJoinRoomId(e.target.value)}
                      className="bg-neutral-100 dark:bg-neutral-800"
                    />
                  </div>
                </div>
                <DialogFooter className="sm:justify-start">
                  <Button
                    type="button"
                    onClick={handleJoinRoom}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white w-full sm:w-auto"
                  >
                    Join Meeting
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* New Meeting Dialog */}
            <Dialog open={newMeetingDialog} onOpenChange={setNewMeetingDialog}>
              <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800">
                <DialogHeader>
                  <DialogTitle>Start New Meeting</DialogTitle>
                  <DialogDescription>
                    Give your new meeting a descriptive name.
                  </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col gap-4 py-4">
                  <div className="grid gap-2">
                    <Label htmlFor="meeting-title">Meeting Name</Label>
                    <Input
                      id="meeting-title"
                      placeholder="e.g. Weekly Standup"
                      value={meetingTitle}
                      onChange={(e) => setMeetingTitle(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleNewMeeting()}
                      className="bg-neutral-100 dark:bg-neutral-800"
                      autoFocus
                    />
                  </div>
                </div>
                <DialogFooter className="sm:justify-start">
                  <Button
                    type="button"
                    onClick={() => setNewMeetingDialog(false)}
                    variant="ghost"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    onClick={handleNewMeeting}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    Start Meeting
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          {/* Recent Activity Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Recent Activity</h2>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                onClick={() => router.push("/history")}
              >
                View All
              </Button>
            </div>

            <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
              <div className="p-4 space-y-3">
                {recentActivity.length > 0 ? recentActivity.map((activity, index) => (
                  <div
                    key={index}
                    onClick={() => {
                        if (activity.type === 'meeting' && activity.id) {
                            router.push(`/history/${activity.id}`);
                        }
                    }}
                    className="flex items-center justify-between p-3 rounded-xl hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors border border-transparent hover:border-neutral-200 dark:hover:border-neutral-700/50 cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${activity.type === 'recording'
                        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/20'
                        : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20'
                        }`}>
                        {activity.type === 'recording' ? <Film className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-semibold text-neutral-900 dark:text-white line-clamp-1 max-w-[200px] md:max-w-md" title={activity.title}>{activity.title}</h4>
                        <div className="flex items-center gap-2 text-sm text-neutral-500 dark:text-neutral-400">
                          <span>{activity.date}</span>
                          <span>•</span>
                          <span>{activity.duration}</span>
                          
                          {/* Mini Avatar Group */}
                          {activity.participants && activity.participants.length > 0 && (
                            <>
                              <span>•</span>
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
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="secondary"
                        className={
                          activity.status === "Active"
                            ? "bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800/50 whitespace-nowrap animate-pulse"
                            : activity.status === "Saved"
                            ? "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800 whitespace-nowrap"
                            : "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800 whitespace-nowrap"
                        }
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
                )) : (
                  <div className="text-center py-8 text-neutral-500 dark:text-neutral-400">
                    No recent activity found. Start a meeting to see it here!
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
