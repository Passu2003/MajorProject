import { useState, useRef, useCallback } from "react"
import { saveRecording } from "@/lib/db"
import { v4 as uuidv4 } from "uuid"

export function useScreenRecorder() {
    const [isRecording, setIsRecording] = useState(false)
    const [recordingTime, setRecordingTime] = useState(0)
    const mediaRecorderRef = useRef<MediaRecorder | null>(null)
    const chunksRef = useRef<Blob[]>([])
    const timerRef = useRef<NodeJS.Timeout | null>(null)

    const startRecording = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getDisplayMedia({
                video: { mediaSource: "screen" } as any,
                audio: true, // Try to capture system audio
            })

            // If user cancels the selection
            stream.getVideoTracks()[0].onended = () => {
                stopRecording()
            }

            const mediaRecorder = new MediaRecorder(stream)
            mediaRecorderRef.current = mediaRecorder
            chunksRef.current = []

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunksRef.current.push(event.data)
                }
            }

            mediaRecorder.onstop = async () => {
                const blob = new Blob(chunksRef.current, { type: "video/webm" })
                const duration = formatTime(recordingTime)

                await saveRecording({
                    id: uuidv4(),
                    title: `Meeting Recording ${new Date().toLocaleDateString()}`,
                    blob,
                    date: new Date().toISOString(),
                    duration,
                    size: blob.size,
                })

                // Clean up stream
                stream.getTracks().forEach((track) => track.stop())
                setIsRecording(false)
                clearInterval(timerRef.current!)
                setRecordingTime(0)
            }

            mediaRecorder.start()
            setIsRecording(true)

            // Start timer
            timerRef.current = setInterval(() => {
                setRecordingTime((prev) => prev + 1)
            }, 1000)

        } catch (err) {
            console.error("Error starting screen recording:", err)
            setIsRecording(false)
        }
    }, [recordingTime])

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
            mediaRecorderRef.current.stop()
        }
    }, [])

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, "0")}`
    }

    return {
        isRecording,
        startRecording,
        stopRecording,
        recordingTime: formatTime(recordingTime),
    }
}
