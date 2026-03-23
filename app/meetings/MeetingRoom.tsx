"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
    StreamVideo, 
    StreamCall, 
    StreamVideoClient, 
    SpeakerLayout, 
    CallControls, 
    CallParticipantsList, 
    RecordCallButton,
    useCallStateHooks,
    VideoPreview,
    DeviceSettings
} from '@stream-io/video-react-sdk';
import '@stream-io/video-react-sdk/dist/css/styles.css';
import { toast } from 'sonner';

import { MeetingSidebar } from "@/components/MeetingSidebar";
import { SubtitleOverlay } from "@/components/SubtitleOverlay";
import { SubtitleSettings } from "@/components/SubtitleSettings";
import { useLiveTranscription, SUPPORTED_LANGUAGES } from "@/hooks/useLiveTranscription";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { PhoneOff, Mic, MicOff, Video, VideoOff, MoreVertical, FileText, PenTool, Copy, X, Languages } from "lucide-react";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
    DropdownMenuLabel,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { io, Socket } from "socket.io-client";

const API_KEY = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY!;

function CallLayout({ roomID, username, onLeave }: { roomID: string, username: string, onLeave: () => void }) {
    const { useCallCallingState, useIsCallRecordingInProgress, useMicrophoneState } = useCallStateHooks();
    const callingState = useCallCallingState();
    const isRecording = useIsCallRecordingInProgress();
    const { isMute: isMicMuted } = useMicrophoneState();
    
    const prevIsRecording = useRef(isRecording);

    useEffect(() => {
        if (isRecording && !prevIsRecording.current) {
            toast.success("Recording Started", { description: "This meeting is now being recorded to the cloud." });
        } else if (!isRecording && prevIsRecording.current) {
            toast.info("Recording Stopped", { description: "The video is being processed and will appear in your View Recordings library." });
        }
        prevIsRecording.current = isRecording;
    }, [isRecording]);

    const [socket, setSocket] = useState<Socket | null>(null);
    const [messages, setMessages] = useState<any[]>([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const [activeTab, setActiveTab] = useState("chat");
    const [notes, setNotes] = useState("");
    const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
    const [showSubtitleSettings, setShowSubtitleSettings] = useState(false);

    const {
        isTranscribing,
        subtitles,
        targetLanguage,
        setTargetLanguage,
        isDubbedMode,
        toggleDubbedMode,
        startTranscription,
        stopTranscription,
    } = useLiveTranscription({
        socket,
        username,
        isMicMuted,
    });

    // Toggle subtitles on/off
    const handleToggleSubtitles = useCallback(() => {
        if (subtitlesEnabled) {
            stopTranscription();
            setSubtitlesEnabled(false);
        } else {
            startTranscription();
            setSubtitlesEnabled(true);
        }
    }, [subtitlesEnabled, startTranscription, stopTranscription]);

    const handleEndCall = async () => {
        try {
            // Push history to Stream Custom data before leaving
            const res = await fetch('/api/stream/save-history', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    call_id: roomID,
                    chatLogs: messages,
                    notes: notes
                })
            });
            if (!res.ok) console.error("Failed to save history:", await res.text());
        } catch (e) {
            console.error("Error saving history:", e);
        }
        onLeave();
    };

    useEffect(() => {
        const s = io({ path: "/socket.io", autoConnect: true });
        setSocket(s);

        s.on("connect", () => {
            s.emit("join-room", { roomID, username });
        });

        const handleReceiveMessage = (data: any) => {
            const newMsg = {
                id: data.id || Date.now().toString(),
                text: data.text,
                sender: data.sender || "Anonymous",
                timestamp: data.timestamp || Date.now(),
                isSelf: false
            };

            setMessages((prev) => {
                const updated = [...prev, newMsg];
                sessionStorage.setItem(`meet-ai-chat-${roomID}`, JSON.stringify(updated));
                return updated;
            });

            if (activeTab !== "chat" || !isSidebarOpen) {
                setUnreadCount((prev) => prev + 1);
            }
        };

        const handleDeleteMessage = (data: any) => {
            setMessages((prev) => {
                const updated = prev.filter((msg: any) => msg.id !== data.messageID);
                sessionStorage.setItem(`meet-ai-chat-${roomID}`, JSON.stringify(updated));
                return updated;
            });
        };

        const handleEditMessage = (data: any) => {
            setMessages((prev) => {
                const updated = prev.map((msg: any) =>
                    msg.id === data.messageID ? { ...msg, text: data.newText } : msg
                );
                sessionStorage.setItem(`meet-ai-chat-${roomID}`, JSON.stringify(updated));
                return updated;
            });
        };

        s.on("receive-message", handleReceiveMessage);
        s.on("message-deleted", handleDeleteMessage);
        s.on("message-edited", handleEditMessage);

        const savedChat = sessionStorage.getItem(`meet-ai-chat-${roomID}`);
        if (savedChat) {
            try { setMessages(JSON.parse(savedChat)); } catch (e) { }
        }

        return () => {
            s.disconnect();
        };
    }, [roomID, username, activeTab, isSidebarOpen]);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        setIsSidebarOpen(true);
        if (value === "chat") {
            setUnreadCount(0);
        }
    };

    if (callingState !== 'joined') {
        return <div className="w-full h-full flex items-center justify-center text-white bg-neutral-900 animate-pulse">Connecting to Media Server...</div>;
    }

    return (
        <div className="w-screen h-[100dvh] bg-neutral-950 flex flex-col text-white overflow-hidden relative str-video">
            <ResizablePanelGroup direction="horizontal">
                <ResizablePanel defaultSize={75} minSize={50} className="relative flex flex-col">
                    <div className="flex-1 w-full h-full relative bg-neutral-950 overflow-hidden">
                        <SpeakerLayout participantsBarPosition="bottom" />
                        
                        {/* Live Subtitle Overlay */}
                        <SubtitleOverlay subtitles={subtitles} isVisible={subtitlesEnabled} />

                        {/* Subtitle Settings Panel */}
                        <SubtitleSettings
                            isOpen={showSubtitleSettings}
                            onClose={() => setShowSubtitleSettings(false)}
                            isTranscribing={isTranscribing}
                            onToggleTranscription={handleToggleSubtitles}
                            targetLanguage={targetLanguage}
                            onLanguageChange={setTargetLanguage}
                            isDubbedMode={isDubbedMode}
                            onToggleDubbed={toggleDubbedMode}
                            languages={SUPPORTED_LANGUAGES}
                        />

                        <div className="absolute top-4 right-4 z-50">
                             {/* Stream SDK handles local participants UI, but we could add custom absolute floating elements here */}
                        </div>
                    </div>

                    <div className="h-24 md:h-20 shrink-0 bg-neutral-900/95 backdrop-blur-xl flex items-center justify-center gap-4 md:gap-6 border-t border-white/5 z-40 pb-safe str-video">
                        <CallControls onLeave={handleEndCall} />

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className="p-3 sm:p-4 rounded-full bg-neutral-800 hover:bg-neutral-700 transition-all duration-200 relative text-white border border-white/5">
                                    <MoreVertical size={24} className="md:w-5 md:h-5" />
                                    {unreadCount > 0 && (
                                        <Badge variant="destructive" className="absolute -top-1 -right-1 px-1 py-0 h-5 min-w-[20px] rounded-full text-[10px] flex items-center justify-center border border-neutral-900">
                                            {unreadCount}
                                        </Badge>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent side="top" align="end" className="w-56 bg-neutral-900 border-neutral-800 text-white shadow-xl">
                                <DropdownMenuLabel className="text-xs text-neutral-500 font-normal uppercase tracking-wider">Apps</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => handleTabChange("chat")} className="cursor-pointer focus:bg-neutral-800 focus:text-white justify-between">
                                    <div className="flex items-center">
                                        <FileText className="mr-2 h-4 w-4" />
                                        <span>Chat</span>
                                    </div>
                                    {unreadCount > 0 && (
                                        <Badge variant="destructive" className="h-5 px-1.5 rounded-full text-[10px]">
                                            {unreadCount}
                                        </Badge>
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTabChange("board")} className="cursor-pointer focus:bg-neutral-800 focus:text-white">
                                    <PenTool className="mr-2 h-4 w-4" />
                                    <span>Board</span>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setShowSubtitleSettings(prev => !prev)} className="cursor-pointer focus:bg-neutral-800 focus:text-white justify-between">
                                    <div className="flex items-center">
                                        <Languages className="mr-2 h-4 w-4" />
                                        <span>Subtitles</span>
                                    </div>
                                    {isTranscribing && (
                                        <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                    )}
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleTabChange("notes")} className="cursor-pointer focus:bg-neutral-800 focus:text-white">
                                    <FileText className="mr-2 h-4 w-4" />
                                    <span>Notes</span>
                                </DropdownMenuItem>

                                <DropdownMenuSeparator className="bg-neutral-800" />
                                <DropdownMenuLabel className="text-xs text-neutral-500 font-normal uppercase tracking-wider">Actions</DropdownMenuLabel>

                                <DropdownMenuItem
                                    onClick={() => {
                                        const link = `${window.location.origin}/meetings?room=${roomID}`;
                                        navigator.clipboard.writeText(link);
                                        alert("Meeting link copied to clipboard!");
                                    }}
                                    className="cursor-pointer focus:bg-neutral-800 focus:text-white"
                                >
                                    <Copy className="mr-2 h-4 w-4" />
                                    <span>Copy Link</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </ResizablePanel>

                {isSidebarOpen && (
                    <>
                        <ResizableHandle withHandle className="hidden md:flex bg-neutral-800" />
                        <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="hidden md:block border-l border-neutral-800">
                            <MeetingSidebar
                                meetingId={roomID}
                                isRecording={false}
                                onStartRecording={() => {}}
                                onStopRecording={() => {}}
                                socket={socket}
                                username={username}
                                activeTab={activeTab}
                                messages={messages}
                                setMessages={setMessages}
                                notes={notes}
                                setNotes={setNotes}
                                onClose={() => setIsSidebarOpen(false)}
                            />
                        </ResizablePanel>
                    </>
                )}
            </ResizablePanelGroup>

             {/* Mobile Overlay */}
             {isSidebarOpen && (
                <div className="md:hidden fixed inset-0 z-[100] bg-white dark:bg-neutral-900 flex flex-col">
                    <div className="flex justify-end p-2 border-b border-gray-200 dark:border-gray-800">
                        <button onClick={() => setIsSidebarOpen(false)} className="p-2">
                            <X className="w-6 h-6 text-gray-500" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-hidden">
                        <MeetingSidebar
                            meetingId={roomID}
                            isRecording={false}
                            onStartRecording={() => {}}
                            onStopRecording={() => {}}
                            socket={socket}
                            username={username}
                            activeTab={activeTab}
                            messages={messages}
                            setMessages={setMessages}
                            notes={notes}
                            setNotes={setNotes}
                            onClose={() => setIsSidebarOpen(false)}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

function SetupUI({ onJoin }: { onJoin: () => void }) {
    const { useMicrophoneState, useCameraState } = useCallStateHooks();
    const { microphone, isMute: isMicMute } = useMicrophoneState();
    const { camera, isMute: isCamMute } = useCameraState();

    return (
        <div className="w-screen h-screen bg-neutral-950 flex flex-col items-center justify-center text-white py-10 px-4">
            <h1 className="text-3xl md:text-4xl font-bold mb-8 tracking-tight">Ready to join?</h1>
            
            <div className="w-full max-w-3xl bg-neutral-900 rounded-2xl overflow-hidden shadow-2xl border border-white/10 relative aspect-video flex items-center justify-center">
                <VideoPreview />

                <div className="absolute bottom-6 left-0 right-0 gap-6 flex items-center justify-center">
                    <button 
                        onClick={() => camera.toggle()} 
                        className={`p-4 rounded-full shadow-lg transition-all ${isCamMute ? 'bg-red-500 hover:bg-red-600' : 'bg-neutral-800 hover:bg-neutral-700 border border-white/10'}`}
                    >
                        {isCamMute ? <VideoOff size={24} /> : <Video size={24} />}
                    </button>
                    
                    <button 
                        onClick={() => microphone.toggle()} 
                        className={`p-4 rounded-full shadow-lg transition-all ${isMicMute ? 'bg-red-500 hover:bg-red-600' : 'bg-neutral-800 hover:bg-neutral-700 border border-white/10'}`}
                    >
                        {isMicMute ? <MicOff size={24} /> : <Mic size={24} />}
                    </button>

                    <div className="bg-neutral-800 p-2 rounded-full border border-white/10 flex items-center justify-center">
                        <DeviceSettings />
                    </div>
                </div>
            </div>

            <button 
                onClick={onJoin}
                className="mt-10 bg-emerald-600 hover:bg-emerald-500 text-white px-12 py-4 rounded-xl font-bold text-lg shadow-lg shadow-emerald-600/20 transition-all hover:scale-105"
            >
                Join Meeting
            </button>
        </div>
    );
}

function MeetingView() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const roomID = searchParams.get("room") || "default-room";
    const meetingTitle = searchParams.get("title") || "";

    const [isJoined, setIsJoined] = useState(false);
    const [isSetupComplete, setIsSetupComplete] = useState(false);
    const [username, setUsername] = useState("");
    const [client, setClient] = useState<StreamVideoClient | null>(null);
    const [call, setCall] = useState<any>(null);

    useEffect(() => {
        const savedSession = sessionStorage.getItem(`meeting_session_${roomID}`);
        if (savedSession) {
            try {
                const { username: savedName } = JSON.parse(savedSession);
                if (savedName) setUsername(savedName);
            } catch (e) {
                console.error("Failed to parse session", e);
            }
        }
    }, [roomID]);

    const handleJoin = async () => {
        if (!username.trim()) return;
        
        // Clean session identifier mapping spaces to underscores for Stream compatibility
        const safeUserId = username.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Math.floor(Math.random() * 10000);

        try {
            // 1. Fetch token
            const res = await fetch('/api/stream/token', {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'ngrok-skip-browser-warning': 'true' // Bypass Ngrok HTML Interstitial
                },
                body: JSON.stringify({ userId: safeUserId })
            });
            const data = await res.json();

            if (!res.ok) throw new Error(data.error || 'Failed to get token');

            // 2. Initialize Client
            const streamClient = new StreamVideoClient({
                apiKey: API_KEY,
                user: { id: safeUserId, name: username },
                token: data.token
            });

            // 3. Create call (but do not join yet!)
            const streamCall = streamClient.call('default', roomID);
            // We use getOrCreate to ensure the call exists and we can attach custom data
            await streamCall.getOrCreate({
                 data: {
                     custom: { title: meetingTitle }
                 }
            });

            setClient(streamClient);
            setCall(streamCall);
            setIsJoined(true);
            sessionStorage.setItem(`meeting_session_${roomID}`, JSON.stringify({ username }));

        } catch (error) {
            console.error('Error joining stream call:', error);
            alert('Failed to connect to the media server. Please check your API keys.');
        }
    };

    const handleLeave = async () => {
        try {
            if (call && call.state.callingState !== 'left') {
                await call.leave();
            }
        } catch (e) {
            console.log('Call already left');
        }
        
        try {
            if (client) await client.disconnectUser();
        } catch (e) {
            console.log('Client already disconnected');
        }
        
        setIsJoined(false);
        router.push("/dashboard");
    };

    if (!isJoined || !client || !call) {
        return (
            <div className="w-screen h-screen bg-neutral-900 flex flex-col items-center justify-center text-white p-4">
                <div className="max-w-md w-full flex flex-col gap-6 items-center justify-center bg-neutral-800 p-8 rounded-2xl shadow-2xl border border-white/5">
                    <div className="text-center mb-4">
                        <div className="mx-auto bg-indigo-500/20 w-16 h-16 rounded-full flex items-center justify-center mb-4 shadow-lg ring-1 ring-indigo-500/50">
                            <Video className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h1 className="text-2xl font-bold mb-2 tracking-tight">Stream Video Room</h1>
                        <p className="text-gray-400 text-sm">Meeting ID: <code className="bg-black/50 px-2 py-1 rounded text-indigo-300 font-mono tracking-wider">{roomID}</code></p>
                    </div>

                    <input
                        type="text"
                        placeholder="Enter your name"
                        className="bg-neutral-900/50 text-white px-5 py-4 rounded-xl border border-neutral-700/50 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 w-full text-center text-lg transition-all"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
                    />

                    <button
                        onClick={handleJoin}
                        disabled={!username.trim()}
                        className={`w-full text-white text-lg py-4 rounded-xl font-bold transition-all shadow-lg text-center ${username.trim() ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/25 cursor-pointer' : 'bg-neutral-700 text-neutral-400 cursor-not-allowed border border-neutral-600'}`}
                    >
                        Join Now
                    </button>

                    <button
                        onClick={() => router.push("/dashboard")}
                        className="text-neutral-400 hover:text-white transition-colors text-sm font-medium mt-2"
                    >
                        Cancel
                    </button>
                    
                    <p className="text-xs text-neutral-500 mt-2 text-center max-w-xs leading-relaxed">
                        This room is powered by Stream's global edge network for HD recording and ultra-low latency.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <StreamVideo client={client}>
            <StreamCall call={call}>
                {!isSetupComplete ? (
                    <SetupUI onJoin={async () => {
                        await call.join();
                        setIsSetupComplete(true);
                    }} />
                ) : (
                    <CallLayout roomID={roomID} username={username} onLeave={handleLeave} />
                )}
            </StreamCall>
        </StreamVideo>
    );
}

export default function MeetingRoom() {
    return (
        <Suspense fallback={<div className="w-screen h-screen bg-neutral-900 flex items-center justify-center text-white font-medium animate-pulse">Preparing Room...</div>}>
            <MeetingView />
        </Suspense>
    );
}
