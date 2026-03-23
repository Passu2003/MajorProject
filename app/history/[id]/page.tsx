import { StreamClient } from '@stream-io/node-sdk';
import { ArrowLeft, Clock, Calendar, Users, FileText, MessageSquare, Bot, PenTool } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from '@/components/ui/scroll-area';
import { AudioSummaryTab } from '@/components/AudioSummaryTab';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export default async function HistoryDetailPage({ params }: { params: { id: string } }) {
    const { id } = params;

    const apiKey = process.env.NEXT_PUBLIC_STREAM_VIDEO_API_KEY;
    const secretKey = process.env.STREAM_VIDEO_SECRET_KEY;

    if (!apiKey || !secretKey) {
        return <div className="p-8 text-center text-red-500">Missing Stream API Keys</div>;
    }

    const client = new StreamClient(apiKey, secretKey);
    let callData = null;
    let customData: any = {};
    let errorMsg = "";
    let recordingUrl = "";

    try {
        const response = await client.video.queryCalls({
            filter_conditions: { id: id },
            limit: 1
        });
        
        if (response.calls.length > 0) {
            callData = response.calls[0].call;
            customData = callData.custom || {};
            
            // Try fetching recordings explicitly since they are not always natively attached to queryCalls
            try {
                const callInstance = client.video.call('default', id);
                const recs = await callInstance.listRecordings();
                if (recs.recordings && recs.recordings.length > 0) {
                    recordingUrl = recs.recordings[0].url;
                }
            } catch (rErr) {
                console.warn("No recording found or error listing recordings", rErr);
            }

        } else {
            errorMsg = "Meeting not found.";
        }
    } catch (e: any) {
        errorMsg = "Failed to load meeting details: " + e.message;
    }

    if (errorMsg || !callData) {
        return (
            <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 flex flex-col items-center justify-center p-8">
                <div className="bg-white dark:bg-neutral-900 p-8 rounded-2xl shadow-sm text-center max-w-md w-full border border-neutral-200 dark:border-neutral-800">
                    <FileText className="w-12 h-12 text-neutral-300 dark:text-neutral-700 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Meeting Not Found</h2>
                    <p className="text-neutral-500 mb-6">{errorMsg || "This meeting could not be loaded."}</p>
                    <Button asChild className="w-full bg-emerald-600 hover:bg-emerald-700 text-white">
                        <Link href="/history">Back to History</Link>
                    </Button>
                </div>
            </div>
        );
    }

    const title = customData.title || `Meeting Room ${id.substring(0, 8)}`;
    const date = new Date(callData.created_at).toLocaleString();
    
    // Parse duration safely
    let durationStr = "Unknown duration";
    if (callData.starts_at && callData.ended_at) {
        const start = new Date(callData.starts_at);
        const end = new Date(callData.ended_at);
        const diffMs = end.getTime() - start.getTime();
        durationStr = `${Math.floor(diffMs / 60000)} min`;
    }

    const aiSummary = customData.aiSummary || "";
    const chatLogs = customData.chatLogs || [];
    const notes = customData.notes || "";

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-neutral-950 p-4 md:p-8 font-sans pb-24">
            <div className="max-w-5xl mx-auto space-y-6">
                
                {/* Top Navigation */}
                <div className="flex items-center justify-between">
                    <Button variant="ghost" className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white hover:bg-neutral-200 dark:hover:bg-neutral-800 pl-2" asChild>
                        <Link href="/history">
                            <ArrowLeft className="w-5 h-5 mr-1" />
                            Back to History
                        </Link>
                    </Button>
                </div>

                {/* Header Card */}
                <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 md:p-8 shadow-sm relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 dark:bg-emerald-500/5 blur-3xl rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                    
                    <div className="relative z-10 flex flex-col md:flex-row gap-6 md:items-start justify-between">
                        <div>
                            <div className="flex items-center gap-3 mb-3">
                                <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none dark:bg-emerald-900/40 dark:text-emerald-400">
                                    Completed Meeting
                                </Badge>
                                <span className="text-xs font-mono text-neutral-400 dark:text-neutral-500 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
                                    ID: {id.substring(0, 8)}
                                </span>
                            </div>
                            <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-white mb-2">
                                {title}
                            </h1>
                            <div className="flex flex-wrap items-center gap-4 text-sm text-neutral-500 dark:text-neutral-400 font-medium">
                                <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {date}</span>
                                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {durationStr}</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Content Tabs */}
                <Tabs defaultValue="ai" className="w-full">
                    <TabsList className="grid w-full max-w-md grid-cols-3 mb-6 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-1 h-12 rounded-xl text-neutral-500 shadow-sm mx-auto md:mx-0">
                        <TabsTrigger value="ai" className="rounded-lg data-[state=active]:bg-emerald-50 dark:data-[state=active]:bg-emerald-900/30 data-[state=active]:text-emerald-700 dark:data-[state=active]:text-emerald-400">
                            <Bot className="w-4 h-4 mr-2" /> AI Minutes
                        </TabsTrigger>
                        <TabsTrigger value="chat" className="rounded-lg data-[state=active]:bg-neutral-100 dark:data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-900 dark:data-[state=active]:text-white">
                            <MessageSquare className="w-4 h-4 mr-2" /> Transcript
                        </TabsTrigger>
                        <TabsTrigger value="notes" className="rounded-lg data-[state=active]:bg-neutral-100 dark:data-[state=active]:bg-neutral-800 data-[state=active]:text-neutral-900 dark:data-[state=active]:text-white">
                            <FileText className="w-4 h-4 mr-2" /> Notes
                        </TabsTrigger>
                    </TabsList>

                    <TabsContent value="ai" className="focus-visible:outline-none focus-visible:ring-0">
                        <AudioSummaryTab 
                            callId={id} 
                            aiSummary={aiSummary} 
                            recordingUrl={recordingUrl} 
                        />
                    </TabsContent>

                    <TabsContent value="chat" className="focus-visible:outline-none focus-visible:ring-0">
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
                                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white flex items-center">
                                    <MessageSquare className="w-5 h-5 mr-3 text-blue-500" />
                                    Chat Transcript
                                </h3>
                                <Badge variant="secondary" className="bg-neutral-100 dark:bg-neutral-800 font-mono text-neutral-500 dark:text-neutral-400">
                                    {chatLogs.length} Messages
                                </Badge>
                            </div>
                            {chatLogs.length > 0 ? (
                                <ScrollArea className="h-[500px]">
                                    <div className="px-6 py-4 space-y-4">
                                        {chatLogs.map((msg: any, i: number) => {
                                            const time = new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                            return (
                                                <div key={i} className={`flex flex-col gap-1 max-w-[85%] ${msg.isSelf ? 'ml-auto items-end' : 'mr-auto items-start'}`}>
                                                    <div className="flex items-center gap-2 text-xs text-neutral-500">
                                                        <span className="font-semibold text-neutral-700 dark:text-neutral-300">{msg.sender}</span>
                                                        <span>{time}</span>
                                                    </div>
                                                    <div className={`px-4 py-2.5 rounded-2xl text-[15px] shadow-sm ${
                                                        msg.isSelf 
                                                            ? 'bg-emerald-600 text-white rounded-br-sm' 
                                                            : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-900 dark:text-white border border-neutral-200 dark:border-neutral-700/50 rounded-bl-sm'
                                                    }`}>
                                                        {msg.text}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            ) : (
                                <div className="h-[400px] flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500 bg-neutral-50/50 dark:bg-neutral-900/50">
                                    <MessageSquare className="w-10 h-10 mb-3 opacity-20" />
                                    <p>No chat messages were recorded during this session.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="notes" className="focus-visible:outline-none focus-visible:ring-0">
                        <div className="bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 p-6 shadow-sm min-h-[400px]">
                            <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-6 flex items-center">
                                <FileText className="w-5 h-5 mr-3 text-orange-500" />
                                Private Organizer Notes
                            </h3>
                            {notes ? (
                                <div className="p-6 bg-[#fffdf5] dark:bg-[#1a1811] border border-orange-200/50 dark:border-orange-900/30 rounded-xl whitespace-pre-wrap font-sans text-neutral-800 dark:text-neutral-300 leading-relaxed shadow-sm">
                                    {notes}
                                </div>
                            ) : (
                                <div className="h-48 flex flex-col items-center justify-center text-neutral-400 dark:text-neutral-500">
                                    <PenTool className="w-10 h-10 mb-3 opacity-20" />
                                    <p>You did not take any private notes during this meeting.</p>
                                </div>
                            )}
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
