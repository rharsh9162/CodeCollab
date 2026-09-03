import { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageSquare, Mic, MicOff, PhoneCall, PhoneOff,
    Send, ChevronRight, Users, Volume2,
} from 'lucide-react';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
];

export default function ChatSidebar({ socket, roomId, isOpen, onToggle, userId, userName, userColor }) {
    const [activeTab, setActiveTab] = useState('chat');
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [participants, setParticipants] = useState([]);
    const [inVoiceChat, setInVoiceChat] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voiceParticipants, setVoiceParticipants] = useState([]);
    const messagesEndRef = useRef(null);
    const peerConnections = useRef(new Map());
    const localStream = useRef(null);
    const remoteAudios = useRef(new Map());

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    useEffect(() => {
        if (!socket) return;

        const onRoomInit = (data) => {
            if (data.chatHistory) setMessages(data.chatHistory);
            if (data.participants) setParticipants(data.participants);
        };

        const onChatMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
        };

        const onParticipantsUpdate = (list) => {
            setParticipants(list || []);
            setVoiceParticipants((list || []).filter(p => p.inVoice));
        };

        const onUserJoined = ({ user }) => {
            setMessages((prev) => [...prev, {
                type: 'system',
                text: `${user.userName} joined the room`,
                timestamp: Date.now(),
            }]);
            if (inVoiceChat && user.userId !== userId) {
                initiateVoiceConnection(user.socketId);
            }
        };

        const onUserLeft = ({ userName }) => {
            setMessages((prev) => [...prev, {
                type: 'system',
                text: `${userName || 'A user'} left the room`,
                timestamp: Date.now(),
            }]);
        };

        const onWebRtcSignal = async ({ fromSocketId, signal, type }) => {
            if (type === 'offer') {
                await handleRtcOffer(fromSocketId, signal);
            } else if (type === 'answer') {
                await handleRtcAnswer(fromSocketId, signal);
            } else if (type === 'ice') {
                await handleRtcIce(fromSocketId, signal);
            }
        };

        socket.on('room:init', onRoomInit);
        socket.on('chat:message', onChatMessage);
        socket.on('participants:update', onParticipantsUpdate);
        socket.on('user:joined', onUserJoined);
        socket.on('user:left', onUserLeft);
        socket.on('webrtc:signal', onWebRtcSignal);

        return () => {
            socket.off('room:init', onRoomInit);
            socket.off('chat:message', onChatMessage);
            socket.off('participants:update', onParticipantsUpdate);
            socket.off('user:joined', onUserJoined);
            socket.off('user:left', onUserLeft);
            socket.off('webrtc:signal', onWebRtcSignal);
        };
    }, [socket, inVoiceChat, userId]);

    const sendMessage = useCallback(() => {
        if (!inputText.trim() || !socket?.connected) return;
        socket.emit('chat:send', {
            roomId,
            text: inputText.trim(),
        });
        setInputText('');
    }, [inputText, socket, roomId]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ===================== Voice Chat (WebRTC over Socket.io) =====================

    const initiateVoiceConnection = useCallback(async (targetSocketId) => {
        if (!localStream.current || !socket?.connected || !targetSocketId) return;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnections.current.set(targetSocketId, pc);

        localStream.current.getTracks().forEach((track) => {
            pc.addTrack(track, localStream.current);
        });

        pc.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.autoplay = true;
            remoteAudios.current.set(targetSocketId, audio);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc:signal', {
                    targetSocketId,
                    type: 'ice',
                    signal: event.candidate,
                });
            }
        };

        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:signal', {
            targetSocketId,
            type: 'offer',
            signal: offer,
        });
    }, [socket]);

    const handleRtcOffer = useCallback(async (fromSocketId, offer) => {
        if (!localStream.current || !socket?.connected) return;

        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
        peerConnections.current.set(fromSocketId, pc);

        localStream.current.getTracks().forEach((track) => {
            pc.addTrack(track, localStream.current);
        });

        pc.ontrack = (event) => {
            const audio = new Audio();
            audio.srcObject = event.streams[0];
            audio.autoplay = true;
            remoteAudios.current.set(fromSocketId, audio);
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                socket.emit('webrtc:signal', {
                    targetSocketId: fromSocketId,
                    type: 'ice',
                    signal: event.candidate,
                });
            }
        };

        await pc.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc:signal', {
            targetSocketId: fromSocketId,
            type: 'answer',
            signal: answer,
        });
    }, [socket]);

    const handleRtcAnswer = useCallback(async (fromSocketId, answer) => {
        const pc = peerConnections.current.get(fromSocketId);
        if (pc) {
            await pc.setRemoteDescription(new RTCSessionDescription(answer));
        }
    }, []);

    const handleRtcIce = useCallback(async (fromSocketId, candidate) => {
        const pc = peerConnections.current.get(fromSocketId);
        if (pc && candidate) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(candidate));
            } catch { /* ignore */ }
        }
    }, []);

    const joinVoiceChat = useCallback(async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            localStream.current = stream;
            setInVoiceChat(true);
            setIsMuted(false);

            socket?.emit('voice:toggle', {
                roomId,
                inVoice: true,
                isMuted: false,
            });

            participants.forEach((p) => {
                if (p.socketId && p.userId !== userId && p.inVoice) {
                    initiateVoiceConnection(p.socketId);
                }
            });
        } catch (err) {
            console.error('Failed to access microphone:', err);
        }
    }, [socket, roomId, participants, userId, initiateVoiceConnection]);

    const leaveVoiceChat = useCallback(() => {
        localStream.current?.getTracks().forEach((track) => track.stop());
        localStream.current = null;

        peerConnections.current.forEach((pc) => pc.close());
        peerConnections.current.clear();

        remoteAudios.current.forEach((audio) => { audio.srcObject = null; });
        remoteAudios.current.clear();

        setInVoiceChat(false);
        setIsMuted(false);

        socket?.emit('voice:toggle', {
            roomId,
            inVoice: false,
            isMuted: false,
        });
    }, [socket, roomId]);

    const toggleMute = useCallback(() => {
        if (localStream.current) {
            const nextMuted = !isMuted;
            localStream.current.getAudioTracks().forEach((track) => {
                track.enabled = !nextMuted;
            });
            setIsMuted(nextMuted);

            socket?.emit('voice:toggle', {
                roomId,
                inVoice: true,
                isMuted: nextMuted,
            });
        }
    }, [isMuted, socket, roomId]);

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`relative h-full z-20 flex transition-all duration-300 ease-in-out ${isOpen ? 'w-[340px]' : 'w-0'}`}>
            <button
                className={`absolute top-1/2 -translate-y-1/2 left-0 -translate-x-full flex h-16 w-6 items-center justify-center rounded-l-xl border border-r-0 border-white/60 bg-white/60 backdrop-blur-md shadow-sm transition-all duration-300 hover:bg-white/80 hover:w-7 z-30`}
                onClick={onToggle}
                title={isOpen ? 'Close sidebar' : 'Open chat & voice'}
            >
                {isOpen ? <ChevronRight size={16} className="text-text-muted" /> : <MessageSquare size={16} className="text-primary animate-pulse-slow" />}
            </button>

            <div className={`flex flex-col h-full glass-panel rounded-r-none transition-all duration-300 w-[340px] shadow-xl border-l border-white/50 bg-white/70 overflow-hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
                {/* Tabs Navigation */}
                <div className="glass-header rounded-tl-2xl border-b border-white/50 bg-white/40 px-4 shrink-0 justify-center">
                    <div className="flex w-full bg-white/50 border border-white/60 p-1 rounded-xl shadow-sm gap-1 backdrop-blur-md">
                        <button 
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'chat' ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text-main hover:bg-background'}`}
                            onClick={() => setActiveTab('chat')}
                        >
                            <MessageSquare size={14} />
                            Chat
                        </button>
                        <button 
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors relative ${activeTab === 'voice' ? 'bg-secondary/20 text-secondary' : 'text-text-muted hover:text-text-main hover:bg-background'}`}
                            onClick={() => setActiveTab('voice')}
                        >
                            <PhoneCall size={14} />
                            Voice
                            {inVoiceChat && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-secondary shadow-sm" />}
                        </button>
                        <button 
                            className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'people' ? 'bg-white/10 text-text-main' : 'text-text-muted hover:text-text-main hover:bg-background'}`}
                            onClick={() => setActiveTab('people')}
                        >
                            <Users size={14} />
                            <span className="bg-background border border-border rounded-full px-2 py-0.5 text-[10px] ml-1">{participants.length}</span>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    {/* Chat Tab */}
                    {activeTab === 'chat' && (
                        <div className="absolute inset-0 flex flex-col animate-fade-in">
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                                {messages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-text-muted mt-10">
                                        <div className="h-16 w-16 rounded-full bg-surface flex items-center justify-center border border-border mb-4">
                                            <MessageSquare size={24} className="text-primary/50" />
                                        </div>
                                        <p className="text-sm font-bold text-text-main">No messages yet</p>
                                        <span className="text-xs font-medium mt-1">Start the conversation!</span>
                                    </div>
                                )}
                                <div className="space-y-5">
                                    {messages.map((msg, idx) => (
                                        msg.type === 'system' ? (
                                            <div key={idx} className="flex justify-center my-4">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted bg-background border border-border px-4 py-1.5 rounded-full shadow-sm">
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                key={msg.id || idx}
                                                className={`flex flex-col max-w-[85%] ${msg.userId === userId ? 'ml-auto' : 'mr-auto'}`}
                                            >
                                                <div className={`flex items-baseline gap-2 mb-1.5 px-1 ${msg.userId === userId ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs font-bold tracking-wide" style={{ color: msg.userId === userId ? '#2563EB' : msg.userColor }}>
                                                        {msg.userId === userId ? 'You' : msg.userName}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-text-subtle">{formatTime(msg.timestamp)}</span>
                                                </div>
                                                <div className={`text-sm px-4 py-3 shadow-sm ${msg.userId === userId ? 'bg-primary text-white rounded-[16px] rounded-br-sm' : 'bg-surface border border-border text-text-main rounded-[16px] rounded-bl-sm'}`}>
                                                    {msg.text}
                                                </div>
                                            </div>
                                        )
                                    ))}
                                    <div ref={messagesEndRef} />
                                </div>
                            </div>

                            <div className="p-4 border-t border-border bg-surface/50">
                                <div className="relative flex items-center">
                                    <textarea
                                        className="w-full bg-background border border-border rounded-[20px] pl-5 pr-14 py-3 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none max-h-32 min-h-[48px] shadow-sm custom-scrollbar"
                                        placeholder="Type a message..."
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                    />
                                    <button
                                        className={`absolute right-2 h-9 w-9 rounded-full flex items-center justify-center transition-all ${inputText.trim() ? 'bg-primary text-white shadow-sm' : 'bg-surface border border-border text-text-muted'}`}
                                        onClick={sendMessage}
                                        disabled={!inputText.trim()}
                                    >
                                        <Send size={16} className={inputText.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Voice Tab */}
                    {activeTab === 'voice' && (
                        <div className="absolute inset-0 flex flex-col p-6 animate-fade-in">
                            {!inVoiceChat ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-8">
                                    <div className="h-24 w-24 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20 shadow-sm">
                                        <PhoneCall size={36} className="text-secondary" />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-extrabold mb-3 text-text-main">Voice Chat</h3>
                                        <p className="text-sm font-medium text-text-muted leading-relaxed max-w-[250px]">Talk with your collaborators in real-time while coding together.</p>
                                    </div>
                                    <button onClick={joinVoiceChat} className="btn-primary w-full h-12 gap-3 text-sm font-bold tracking-wide uppercase bg-secondary hover:bg-secondary-hover shadow-secondary rounded-xl">
                                        <PhoneCall size={18} />
                                        Join Voice
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-center gap-3 py-4 px-4 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl mb-6 shadow-sm">
                                        <div className="h-2.5 w-2.5 rounded-full bg-secondary animate-pulse-slow shadow-sm" />
                                        <span className="text-xs font-extrabold uppercase tracking-widest">Voice Connected</span>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-4 overflow-y-auto custom-scrollbar pr-2">
                                        <div className="text-xs font-bold text-text-subtle uppercase tracking-widest pl-1">Participants</div>
                                        
                                        {/* Self */}
                                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface shadow-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-12 w-12 rounded-full border-2 border-transparent relative flex items-center justify-center font-bold text-white text-lg overflow-hidden shadow-sm" style={{ background: userColor }}>
                                                    {userName[0]?.toUpperCase()}
                                                    {!isMuted && <div className="absolute inset-0 rounded-full border-[3px] border-secondary animate-pulse-slow pointer-events-none" />}
                                                </div>
                                                <span className="text-[15px] font-bold text-text-main">You</span>
                                            </div>
                                            <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center text-text-muted">
                                                {isMuted ? <MicOff size={16} className="text-danger" /> : <Volume2 size={16} className="text-secondary" />}
                                            </div>
                                        </div>

                                        {voiceParticipants
                                            .filter(p => p.userId !== userId)
                                            .map((p) => (
                                                <div key={p.userId} className="flex items-center justify-between p-4 rounded-xl border border-border bg-surface shadow-sm">
                                                    <div className="flex items-center gap-4">
                                                        <div className="h-12 w-12 rounded-full border-2 border-transparent relative flex items-center justify-center font-bold text-white text-lg overflow-hidden shadow-sm" style={{ background: p.userColor }}>
                                                            {p.userName[0]?.toUpperCase()}
                                                            <div className="absolute inset-0 rounded-full border-[3px] border-secondary animate-pulse-slow pointer-events-none" />
                                                        </div>
                                                        <span className="text-[15px] font-bold text-text-main">{p.userName}</span>
                                                    </div>
                                                    <div className="h-10 w-10 rounded-full bg-background border border-border flex items-center justify-center">
                                                        <Volume2 size={16} className="text-secondary" />
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <div className="flex items-center justify-center gap-8 mt-auto pt-6 border-t border-border">
                                        <button 
                                            className={`flex items-center justify-center h-16 w-16 rounded-full border-2 transition-all ${isMuted ? 'border-danger/50 bg-danger/10 text-danger shadow-sm hover:bg-danger/20' : 'border-border bg-surface text-text-main hover:bg-surfaceHover'}`}
                                            onClick={toggleMute}
                                            title={isMuted ? 'Unmute' : 'Mute'}
                                        >
                                            {isMuted ? <MicOff size={24} /> : <Mic size={24} />}
                                        </button>
                                        <button 
                                            className="flex items-center justify-center h-16 w-16 rounded-full bg-danger hover:bg-danger/80 text-white shadow-sm transition-all"
                                            onClick={leaveVoiceChat}
                                            title="Leave voice chat"
                                        >
                                            <PhoneOff size={24} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* People Tab */}
                    {activeTab === 'people' && (
                        <div className="absolute inset-0 flex flex-col p-6 animate-fade-in overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-6">
                                <span className="text-sm font-extrabold text-text-main uppercase tracking-wider">In this room</span>
                                <span className="text-xs font-bold text-primary bg-primary/10 border border-primary/20 px-3 py-1 rounded-full">{participants.length} online</span>
                            </div>
                            <div className="space-y-3">
                                {participants.map((p) => (
                                    <div key={p.userId || p.socketId} className="flex items-center gap-4 p-4 rounded-xl bg-surface border border-border shadow-sm hover:bg-surfaceHover transition-colors">
                                        <div className="h-10 w-10 rounded-full flex items-center justify-center font-bold text-white text-sm shadow-sm" style={{ background: p.userColor }}>
                                            {p.userName[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-[15px] font-bold text-text-main truncate">
                                                {p.userId === userId ? `${p.userName} (You)` : p.userName}
                                            </div>
                                        </div>
                                        <div className="h-3 w-3 rounded-full bg-secondary shadow-sm animate-pulse-slow" />
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
