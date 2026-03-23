"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { Eraser, Pen, Trash2, Undo, Redo, X } from "lucide-react"

interface WhiteboardProps {
    onClose?: () => void
}

// Maintain persistent canvas and history out of component scope to survive unmounts
let globalPersistentCanvas: HTMLCanvasElement | null = null;
let globalHistory: string[] = [];
let globalRedoHistory: string[] = [];

// Helper to broadcast
const getPersistentCanvas = () => {
    if (!globalPersistentCanvas) {
        const c = document.createElement("canvas")
        c.width = 3000
        c.height = 3000
        globalPersistentCanvas = c
    }
    return globalPersistentCanvas
}

    export function Whiteboard({ onClose }: WhiteboardProps) {
        const canvasRef = useRef<HTMLCanvasElement>(null)
        const containerRef = useRef<HTMLDivElement>(null)
        const [isDrawing, setIsDrawing] = useState(false)
        const [color, setColor] = useState("#000000")
        const [lineWidth, setLineWidth] = useState(3)
        const [tool, setTool] = useState<"pen" | "eraser">("pen")
    
        // Simple history for undo
        // Note: History is local only for now to keep sync simple
        const [history, setHistory] = useState<string[]>(globalHistory)
        const [redoHistory, setRedoHistory] = useState<string[]>(globalRedoHistory)
    
        // BroadcastChannel for syncing
        const channelRef = useRef<BroadcastChannel | null>(null)

    // Sync state back to global vars
    useEffect(() => {
        globalHistory = history;
    }, [history]);

    useEffect(() => {
        globalRedoHistory = redoHistory;
    }, [redoHistory]);

    useEffect(() => {
        const channel = new BroadcastChannel("meet-ai-whiteboard")
        channelRef.current = channel

        channel.onmessage = (event) => {
            const { type, payload } = event.data
            const canvas = canvasRef.current
            const ctx = canvas?.getContext("2d")
            const pCanvas = getPersistentCanvas()
            const pCtx = pCanvas.getContext("2d")

            if (!canvas || !ctx || !pCtx) return

            if (type === "draw") {
                const { start, end, color: strokeColor, lineWidth: width } = payload
                const drawLine = (context: CanvasRenderingContext2D) => {
                    context.beginPath()
                    context.moveTo(start.x, start.y)
                    context.lineTo(end.x, end.y)
                    context.strokeStyle = strokeColor
                    context.lineWidth = width
                    context.lineCap = "round"
                    context.lineJoin = "round"
                    context.stroke()
                }
                drawLine(ctx)
                drawLine(pCtx)
            } else if (type === "clear") {
                ctx.clearRect(0, 0, canvas.width, canvas.height)
                pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height)
            }
        }

        return () => {
            channel.close()
        }
    }, [])

    // Helper to broadcast
    const broadcastDraw = (start: { x: number, y: number }, end: { x: number, y: number }) => {
        channelRef.current?.postMessage({
            type: "draw",
            payload: {
                start,
                end,
                color: tool === "eraser" ? "#ffffff" : color,
                lineWidth
            }
        })
    }

    useEffect(() => {
        const canvas = canvasRef.current
        const container = containerRef.current
        if (!canvas || !container) return

        const ctx = canvas.getContext("2d")
        if (!ctx) return

        const resizeCanvas = () => {
            const { width, height } = container.getBoundingClientRect()
            
            const pCanvas = getPersistentCanvas()
            
            // Check if pCanvas needs to grow
            let resized = false
            let newWidth = pCanvas.width
            let newHeight = pCanvas.height
            if (width > pCanvas.width) {
                 newWidth = width + Math.max(1000, width)
                 resized = true
            }
            if (height > pCanvas.height) {
                 newHeight = height + Math.max(1000, height)
                 resized = true
            }
            if (resized) {
                 const newCanvas = document.createElement('canvas')
                 newCanvas.width = newWidth
                 newCanvas.height = newHeight
                 newCanvas.getContext('2d')?.drawImage(pCanvas, 0, 0)
                 globalPersistentCanvas = newCanvas
            }

            // Set canvas size to match container
            canvas.width = width
            canvas.height = height

            // Restore content from persistent canvas
            if (globalPersistentCanvas) {
                ctx.drawImage(globalPersistentCanvas, 0, 0)
            }
        }

        // Use ResizeObserver for robust checking of container resize
        const resizeObserver = new ResizeObserver(() => {
            resizeCanvas()
        })

        resizeObserver.observe(container)

        // Initial sizing
        resizeCanvas()

        return () => {
            resizeObserver.disconnect()
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    // Track previous point for drawing lines
    const lastPoint = useRef<{ x: number, y: number } | null>(null)

    const saveState = () => {
        const pCanvas = getPersistentCanvas()
        const dataUrl = pCanvas.toDataURL()
        setHistory(prev => [...prev.slice(-10), dataUrl])
        setRedoHistory([]) // Clear redo history when a new action is performed
    }

    const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        if (!canvas || !ctx) return

        setIsDrawing(true)

        // Save state for undo before new stroke
        saveState()

        const { offsetX, offsetY } = getCoordinates(e, canvas)
        lastPoint.current = { x: offsetX, y: offsetY }
    }

    const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
        if (!isDrawing || !lastPoint.current) return
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        const pCanvas = getPersistentCanvas()
        const pCtx = pCanvas.getContext("2d")
        if (!canvas || !ctx || !pCtx) return

        const { offsetX, offsetY } = getCoordinates(e, canvas)

        const drawLine = (context: CanvasRenderingContext2D) => {
            context.beginPath()
            context.moveTo(lastPoint.current!.x, lastPoint.current!.y)
            context.lineTo(offsetX, offsetY)
            context.strokeStyle = tool === "eraser" ? "#ffffff" : color
            context.lineWidth = lineWidth
            context.lineCap = "round"
            context.lineJoin = "round"
            context.stroke()
        }

        drawLine(ctx)
        drawLine(pCtx)

        // Broadcast
        broadcastDraw(lastPoint.current, { x: offsetX, y: offsetY })

        lastPoint.current = { x: offsetX, y: offsetY }
    }

    const stopDrawing = () => {
        setIsDrawing(false)
        lastPoint.current = null
        const ctx = canvasRef.current?.getContext("2d")
        ctx?.closePath()
    }

    const getCoordinates = (e: React.MouseEvent | React.TouchEvent, canvas: HTMLCanvasElement) => {
        if ("touches" in e) {
            const rect = canvas.getBoundingClientRect()
            return {
                offsetX: e.touches[0].clientX - rect.left,
                offsetY: e.touches[0].clientY - rect.top
            }
        } else {
            return {
                offsetX: e.nativeEvent.offsetX,
                offsetY: e.nativeEvent.offsetY
            }
        }
    }

    const clearCanvas = () => {
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        const pCanvas = getPersistentCanvas()
        const pCtx = pCanvas.getContext("2d")
        if (!canvas || !ctx || !pCtx) return

        // Save history before clearing
        saveState()

        ctx.clearRect(0, 0, canvas.width, canvas.height)
        pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height)
        channelRef.current?.postMessage({ type: "clear" })
    }

    const undo = () => {
        if (history.length === 0) return
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        const pCanvas = getPersistentCanvas()
        const pCtx = pCanvas.getContext("2d")
        if (!canvas || !ctx || !pCtx) return

        const currentDataUrl = pCanvas.toDataURL()
        setRedoHistory(prev => [...prev.slice(-10), currentDataUrl])

        const previousDataUrl = history[history.length - 1]
        
        const img = new Image()
        img.onload = () => {
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height)
            pCtx.drawImage(img, 0, 0)

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(pCanvas, 0, 0)
        }
        img.src = previousDataUrl

        setHistory(prev => prev.slice(0, -1))
    }

    const redo = () => {
        if (redoHistory.length === 0) return
        const canvas = canvasRef.current
        const ctx = canvas?.getContext("2d")
        const pCanvas = getPersistentCanvas()
        const pCtx = pCanvas.getContext("2d")
        if (!canvas || !ctx || !pCtx) return

        const currentDataUrl = pCanvas.toDataURL()
        setHistory(prev => [...prev.slice(-10), currentDataUrl])

        const nextDataUrl = redoHistory[redoHistory.length - 1]
        
        const img = new Image()
        img.onload = () => {
            pCtx.clearRect(0, 0, pCanvas.width, pCanvas.height)
            pCtx.drawImage(img, 0, 0)

            ctx.clearRect(0, 0, canvas.width, canvas.height)
            ctx.drawImage(pCanvas, 0, 0)
        }
        img.src = nextDataUrl

        setRedoHistory(prev => prev.slice(0, -1))
    }

    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-neutral-900">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-2 border-b border-neutral-200 dark:border-neutral-800 gap-2 overflow-x-auto shrink-0 bg-white dark:bg-neutral-900 z-10">
                <div className="flex items-center gap-1">
                    <Button
                        variant={tool === "pen" ? "default" : "ghost"}
                        size="icon"
                        onClick={() => setTool("pen")}
                        className={`h-8 w-8 ${tool === 'pen' ? '' : 'text-black dark:text-white'}`}
                    >
                        <Pen className="w-4 h-4" />
                    </Button>
                    <Button
                        variant={tool === "eraser" ? "secondary" : "ghost"}
                        size="icon"
                        onClick={() => setTool("eraser")}
                        className={`h-8 w-8 ${tool === 'eraser' ? '' : 'text-black dark:text-white'}`}
                    >
                        <Eraser className="w-4 h-4" />
                    </Button>
                </div>

                <div className="flex items-center gap-2">
                    <input
                        type="color"
                        value={color}
                        onChange={(e) => {
                            setColor(e.target.value)
                            setTool("pen")
                            setLineWidth(3)
                        }}
                        className="w-8 h-8 rounded cursor-pointer border-0"
                    />
                    <div className="w-20">
                        <Slider
                            value={[lineWidth]}
                            min={1}
                            max={20}
                            step={1}
                            onValueChange={(val) => setLineWidth(val[0])}
                        />
                    </div>
                </div>

                <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" onClick={undo} disabled={history.length === 0} className="h-8 w-8 text-black dark:text-white">
                        <Undo className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={redo} disabled={redoHistory.length === 0} className="h-8 w-8 text-black dark:text-white">
                        <Redo className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={clearCanvas} className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-4 h-4" />
                    </Button>
                    {onClose && (
                        <div className="ml-2 border-l pl-2 border-neutral-200 dark:border-neutral-800">
                            <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8 text-black dark:text-white">
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Canvas Area */}
            <div ref={containerRef} className="flex-1 relative bg-neutral-100 dark:bg-neutral-800 overflow-hidden cursor-crosshair touch-none w-full h-full">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="bg-white block absolute inset-0"
                />
            </div>
        </div>
    )
}
