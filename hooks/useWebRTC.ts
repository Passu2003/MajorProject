import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import SimplePeer, { Instance as PeerInstance } from "simple-peer";

interface PeerConnection {
    peerID: string;
    peer: PeerInstance;
    username: string;
}

interface StreamMap {
    [peerID: string]: MediaStream;
}

export const useWebRTC = (roomID: string, username: string, enabled: boolean = true) => {
    const [socket, setSocket] = useState<Socket | null>(null);
    const [peers, setPeers] = useState<PeerConnection[]>([]);
    const [streams, setStreams] = useState<StreamMap>({});
    const [localStream, setLocalStream] = useState<MediaStream | null>(null);

    const [logs, setLogs] = useState<string[]>([]);
    const socketRef = useRef<Socket | null>(null);
    const peersRef = useRef<PeerConnection[]>([]);
    const localStreamRef = useRef<MediaStream | null>(null);

    const addLog = (msg: string) => {
        console.log(msg);
        setLogs(prev => [...prev.slice(-19), `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    // 1. Get User Media
    useEffect(() => {
        const startMedia = async () => {
            try {
                // Initial load: Get Both Audio and Video
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: {
                        width: { ideal: 320, max: 640 },
                        height: { ideal: 240, max: 480 },
                        frameRate: { ideal: 15, max: 24 }
                    },
                    audio: {
                        echoCancellation: true,
                        noiseSuppression: true,
                        autoGainControl: true // Ensure consistent gain handling
                    }
                });
                setLocalStream(stream);
                localStreamRef.current = stream;
                cameraStreamRef.current = stream;
            } catch (err: any) {
                console.error("Failed to get local stream", err);
                addLog(`Error accessing media: ${err.message}`);
            }
        };
        if (!localStreamRef.current) startMedia();

        return () => {
            // Cleanup on unmount only
            if (localStreamRef.current) {
                localStreamRef.current.getTracks().forEach(track => track.stop());
                localStreamRef.current = null;
            }
        };
    }, []);

    const removePeer = (id: string) => {
        addLog(`Removing peer: ${id}`);

        // 1. Destroy if exists and not destroyed
        const peerObj = peersRef.current.find((p) => p.peerID === id);
        if (peerObj) {
            if (!peerObj.peer.destroyed) {
                try {
                    peerObj.peer.destroy();
                } catch (e: any) {
                    console.error("Error destroying peer", e);
                }
            }
        }

        // 2. Filter refs
        const newPeers = peersRef.current.filter((p) => p.peerID !== id);
        peersRef.current = newPeers;

        // 3. Update State
        setPeers([...newPeers]);

        // 4. Clean streams
        setStreams(prev => {
            const newStreams = { ...prev };
            delete newStreams[id];
            return newStreams;
        });
    };

    // 2. Socket Logic
    useEffect(() => {
        if (!enabled || !localStream) return;

        const s = io({
            path: "/socket.io",
            reconnectionAttempts: 5,
            autoConnect: true
        });
        socketRef.current = s;
        setSocket(s);

        s.on("connect", () => {
            addLog(`Socket connected (${s.id}), joining room: ${roomID} as ${username}`);
            s.emit("join-room", { roomID, username });
        });
        s.on("disconnect", () => addLog("Socket disconnected"));

        s.on("all-users", (users: Array<{ id: string, username: string }>) => {
            const newPeers: PeerConnection[] = [];

            users.forEach((user) => {
                const existing = peersRef.current.find(p => p.peerID === user.id);
                if (existing) return;

                // Use Ref for latest stream
                const stream = localStreamRef.current || localStream;
                if (!stream) return;

                addLog(`Creating initiator peer for: ${user.username} (${user.id})`);
                const peer = createPeer(user.id, s.id!, stream, s);
                const peerObj = { peerID: user.id, peer, username: user.username };
                peersRef.current.push(peerObj);
                newPeers.push(peerObj);
            });
            setPeers([...peersRef.current]);
        });

        s.on("user-joined", (payload: { signal: any; callerID: string; username: string }) => {
            const existingPeer = peersRef.current.find(p => p.peerID === payload.callerID);
            if (existingPeer) {
                existingPeer.peer.signal(payload.signal);
                return;
            }

            // AUTO-CLEANUP: Remove any existing peer with the same username (Ghost Peer)
            // Note: We need to manipulate the ref directly before adding the new one
            const ghostPeerIndex = peersRef.current.findIndex(p => p.username === payload.username);
            if (ghostPeerIndex !== -1) {
                const ghostPeer = peersRef.current[ghostPeerIndex];
                addLog(`Found ghost peer with confirmed username ${payload.username} (${ghostPeer.peerID}). Removing...`);
                try {
                    if (!ghostPeer.peer.destroyed) ghostPeer.peer.destroy();
                } catch (e) { console.error(e); }

                // Remove from ref immediately
                peersRef.current.splice(ghostPeerIndex, 1);

                // Clean streams
                setStreams(prev => {
                    const newStreams = { ...prev };
                    delete newStreams[ghostPeer.peerID];
                    return newStreams;
                });
            }

            const stream = localStreamRef.current || localStream;
            if (!stream) return;

            addLog(`Creating receiver peer for: ${payload.username} (${payload.callerID})`);
            const peer = addPeer(payload.signal, payload.callerID, stream, s);
            const peerObj = { peerID: payload.callerID, peer, username: payload.username };
            peersRef.current.push(peerObj);

            // FORCE SYNC STATE WITH REF
            setPeers([...peersRef.current]);
        });

        s.on("receiving-returned-signal", (payload: { signal: any; id: string }) => {
            const item = peersRef.current.find((p) => p.peerID === payload.id);
            if (item && !item.peer.destroyed) item.peer.signal(payload.signal);
        });

        s.on("user-left", (id: string) => {
            addLog(`User left event: ${id}`);
            removePeer(id);
        });

        return () => {
            if (socketRef.current) socketRef.current.disconnect();
            peersRef.current.forEach(p => p.peer.destroy());
            peersRef.current = [];
            setPeers([]);
            setStreams({});
            setSocket(null);
        };
    }, [roomID, enabled, localStream]);

    const iceConfig = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

    function createPeer(userToSignal: string, callerID: string, stream: MediaStream, socket: Socket) {
        const peer = new SimplePeer({ initiator: true, trickle: true, stream, config: iceConfig });

        peer.on("signal", (signal: any) => {
            if (!peer.destroyed) socket.emit("sending-signal", { userToSignal, callerID, signal });
        });

        peer.on("stream", (remoteStream: MediaStream) => {
            setStreams(prev => ({ ...prev, [userToSignal]: remoteStream }));
        });

        peer.on("track", (track: MediaStreamTrack, remoteStream: MediaStream) => {
            setStreams(prev => ({ ...prev, [userToSignal]: remoteStream }));
        });

        peer.on("close", () => {
            addLog(`Peer connection closed for: ${userToSignal}`);
            removePeer(userToSignal);
        });

        peer.on("error", err => {
            console.error("Peer error:", err);
            addLog(`Peer error (${userToSignal}): ${err.message}`);
        });

        return peer;
    }

    function addPeer(incomingSignal: any, callerID: string, stream: MediaStream, socket: Socket) {
        const peer = new SimplePeer({ initiator: false, trickle: true, stream, config: iceConfig });

        peer.on("signal", (signal: any) => {
            if (!peer.destroyed) socket.emit("returning-signal", { signal, callerID });
        });

        peer.on("stream", (remoteStream: MediaStream) => {
            setStreams(prev => ({ ...prev, [callerID]: remoteStream }));
        });

        peer.on("track", (track: MediaStreamTrack, remoteStream: MediaStream) => {
            setStreams(prev => ({ ...prev, [callerID]: remoteStream }));
        });

        peer.on("close", () => {
            addLog(`Peer connection closed for: ${callerID}`);
            removePeer(callerID);
        });

        peer.on("error", err => {
            console.error("Peer error:", err);
            addLog(`Peer error (${callerID}): ${err.message}`);
        });

        peer.signal(incomingSignal);
        return peer;
    }

    const [isScreenSharing, setIsScreenSharing] = useState(false);
    const screenStreamRef = useRef<MediaStream | null>(null);

    const shareScreen = async () => {
        // Check for support
        if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
            alert("Screen sharing is not supported on this device/browser.");
            return;
        }

        try {
            const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
            const screenTrack = screenStream.getVideoTracks()[0];

            screenStreamRef.current = screenStream;
            setIsScreenSharing(true);

            // Update local stream to show screen
            if (localStreamRef.current) {
                // Ensure audio tracks are preserved
                const audioTracks = localStreamRef.current.getAudioTracks();
                const newStream = new MediaStream([screenTrack, ...audioTracks]);
                setLocalStream(newStream);

                const oldStream = localStreamRef.current;

                // CRITICAL: Update Ref so NEW peers get the screen stream immediately
                localStreamRef.current = newStream;

                // Replace tracks for all peers
                peersRef.current.forEach(({ peer }) => {
                    // We must check if the peer was created with the camera stream or the screen stream (if rejoined)
                    // But generally, simple-peer replaceTrack requires the stream that was *originally* added or last replaced.
                    // For safety, we use 'oldStream' which was the active one before this call.
                    if (oldStream && !peer.destroyed) {
                        const currentVideoTrack = oldStream.getVideoTracks()[0];
                        if (currentVideoTrack) {
                            try {
                                peer.replaceTrack(currentVideoTrack, screenTrack, oldStream);
                            } catch (e) {
                                console.warn("Retrying/Ignoring track replacement", e);
                            }
                        }
                    }
                });
            }

            // Handle "Stop Sharing" via browser UI
            screenTrack.onended = () => {
                stopSharing();
            };

        } catch (err: any) {
            console.error("Failed to share screen", err);
            setIsScreenSharing(false);
            // Show visible error to user
            if (err.name === 'NotAllowedError') {
                // User cancelled, do nothing
            } else {
                alert(`Failed to share screen: ${err.message || err}`);
            }
        }
    };

    const stopSharing = async () => {
        if (!screenStreamRef.current) return;

        const screenTrack = screenStreamRef.current.getVideoTracks()[0];
        screenTrack.stop();
        screenStreamRef.current = null;
        setIsScreenSharing(false);

        try {
            // Re-acquire camera stream to ensure it is active
            const cameraStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 320, max: 640 },
                    height: { ideal: 240, max: 480 },
                    frameRate: { ideal: 15, max: 24 }
                },
                audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
            });

            // Check previous mute state
            const oldAudioTrack = localStreamRef.current?.getAudioTracks()[0];
            const wasAudioEnabled = oldAudioTrack ? oldAudioTrack.enabled : true;

            // Apply to new stream
            const newAudioTrack = cameraStream.getAudioTracks()[0];
            if (newAudioTrack) newAudioTrack.enabled = wasAudioEnabled;

            const cameraTrack = cameraStream.getVideoTracks()[0];

            // Reconstruct local stream
            setLocalStream(cameraStream);
            const oldScreenStream = localStreamRef.current;
            localStreamRef.current = cameraStream;
            cameraStreamRef.current = cameraStream;

            // Replace tracks
            peersRef.current.forEach(({ peer }) => {
                if (!peer.destroyed) {
                    try {
                        // Use oldScreenStream as context (since that's what the peer has active)
                        const streamContext = oldScreenStream || cameraStream;
                        peer.replaceTrack(screenTrack, cameraTrack, streamContext);
                    } catch (e) {
                        console.warn("Failed to revert track", e);
                    }
                }
            });
        } catch (e) {
            console.error("Failed to restore camera", e);
        }
    };

    // We need a ref for the original camera stream to revert to
    const cameraStreamRef = useRef<MediaStream | null>(null);

    return { socket, localStream, peers, streams, logs, shareScreen, stopSharing, isScreenSharing };
};
