import { useEffect, useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

import { Send, X, Trash2, Pencil } from "lucide-react"
import { Socket } from "socket.io-client"

interface Message {
    id: string
    text: string
    sender: string
    timestamp: number
    isSelf: boolean
}

interface ChatPanelProps {
    socket: Socket | null
    username: string
    roomID: string
    messages: Message[]
    setMessages: (messages: Message[]) => void
    onClose: () => void
}

export function ChatPanel({ socket, username, roomID, messages, setMessages, onClose }: ChatPanelProps) {
    const [inputText, setInputText] = useState("")
    const [editingId, setEditingId] = useState<string | null>(null)
    const [editText, setEditText] = useState("")
    const scrollRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom on new messages
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight
        }
    }, [messages])

    const sendMessage = () => {
        if (!inputText.trim()) return

        const msgId = Date.now().toString()
        const newMessage: Message = {
            id: msgId,
            text: inputText,
            sender: username || "Me",
            timestamp: Date.now(),
            isSelf: true
        }

        // Update parent state
        const updatedMessages = [...messages, newMessage]
        setMessages(updatedMessages)

        // Save to session storage
        sessionStorage.setItem(`meet-ai-chat-${roomID}`, JSON.stringify(updatedMessages))

        // Send to Server
        if (socket) {
            socket.emit("send-message", {
                roomID,
                text: inputText,
                sender: username,
                id: msgId,
                timestamp: newMessage.timestamp
            })
        }

        setInputText("")
    }

    const deleteMessage = (msgId: string) => {
        // Optimistic update
        const updatedMessages = messages.filter(msg => msg.id !== msgId)
        setMessages(updatedMessages)
        sessionStorage.setItem(`meet-ai-chat-${roomID}`, JSON.stringify(updatedMessages))

        if (socket) {
            socket.emit("delete-message", {
                roomID,
                messageID: msgId
            })
        }
    }

    const startEditing = (msg: Message) => {
        setEditingId(msg.id)
        setEditText(msg.text)
    }

    const saveEdit = (msgId: string) => {
        if (!editText.trim()) return

        const updatedMessages = messages.map(msg =>
            msg.id === msgId ? { ...msg, text: editText } : msg
        )
        setMessages(updatedMessages)
        sessionStorage.setItem(`meet-ai-chat-${roomID}`, JSON.stringify(updatedMessages))

        if (socket) {
            socket.emit("edit-message", {
                roomID,
                messageID: msgId,
                newText: editText
            })
        }
        setEditingId(null)
        setEditText("")
    }

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") {
            sendMessage()
        }
    }

    return (
        <div className="flex flex-col h-full bg-white dark:bg-neutral-900">
            <div className="p-3 border-b border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-900/50 flex justify-between items-center">
                <h3 className="text-sm font-medium text-black dark:text-white">Group Chat</h3>
                <Button variant="ghost" size="icon" onClick={onClose} className="h-6 w-6 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10">
                    <X className="w-4 h-4" />
                </Button>
            </div>

            <div className="flex-1 p-4 overflow-y-auto min-h-0 bg-neutral-50 dark:bg-neutral-900/50" ref={scrollRef}>
                <div className="space-y-4">
                    {messages.length === 0 && (
                        <div className="text-center text-xs text-neutral-400 mt-4">
                            No messages yet. Say hello!
                        </div>
                    )}
                    {messages.map((msg) => (
                        <div
                            key={msg.id}
                            className={`flex flex-col ${msg.isSelf ? "items-end" : "items-start"} w-full group mb-2`}
                        >
                            <div className="flex items-center gap-2 max-w-[90%]">
                                {msg.isSelf && editingId !== msg.id && (
                                    <div className="flex bg-neutral-200 dark:bg-neutral-800 rounded opacity-0 group-hover:opacity-100 transition-opacity shrink-0 lg:flex-row flex-col">
                                        <button
                                            onClick={() => startEditing(msg)}
                                            className="p-1 px-2 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded"
                                            title="Edit"
                                        >
                                            <Pencil className="w-3 h-3" />
                                        </button>
                                        <button
                                            onClick={() => deleteMessage(msg.id)}
                                            className="p-1 px-2 text-black dark:text-white hover:bg-black/10 dark:hover:bg-white/10 rounded"
                                            title="Unsend"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </div>
                                )}

                                {editingId === msg.id ? (
                                    <div className="flex flex-col gap-1 items-end w-full">
                                        <Input
                                            value={editText}
                                            onChange={(e) => setEditText(e.target.value)}
                                            className="h-8 text-sm min-w-[150px] w-full text-black dark:text-white"
                                            autoFocus
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter") saveEdit(msg.id)
                                                if (e.key === "Escape") setEditingId(null)
                                            }}
                                        />
                                        <div className="flex gap-1">
                                            <button onClick={() => setEditingId(null)} className="text-[10px] text-gray-500 hover:text-black dark:hover:text-white">Cancel</button>
                                            <button onClick={() => saveEdit(msg.id)} className="text-[10px] text-emerald-600 font-bold hover:text-emerald-500">Save</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div className={`
                                        rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap break-words shadow-sm
                                        ${msg.isSelf
                                            ? "bg-emerald-600 text-white rounded-br-none"
                                            : "bg-white dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200 rounded-bl-none border border-neutral-100 dark:border-neutral-700"}
                                    `}>
                                        {msg.text}
                                    </div>
                                )}
                            </div>
                            <span className="text-[10px] text-neutral-400 mt-1 px-1">
                                {msg.isSelf ? "You" : msg.sender} • {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="p-3 pb-[calc(12px+env(safe-area-inset-bottom))] border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex gap-2">
                <Input
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 h-11 md:h-10 text-base md:text-sm text-black dark:text-white bg-transparent border-neutral-300 dark:border-neutral-700 rounded-xl"
                />
                <Button 
                    size="icon" 
                    onClick={sendMessage} 
                    className="shrink-0 w-11 h-11 md:w-10 md:h-10 bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-md"
                >
                    <Send className="w-5 h-5 md:w-4 md:h-4" />
                </Button>
            </div>
        </div>
    )
}
