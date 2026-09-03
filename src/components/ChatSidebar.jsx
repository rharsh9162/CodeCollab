import { useState, useEffect, useRef, useCallback } from 'react';
import {
    MessageSquare, Mic, MicOff, PhoneCall, PhoneOff,
    Send, ChevronRight, Users, Volume2, Bell
} from 'lucide-react';

const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun.relay.metered.ca:80' },
    {
        urls: 'turn:openrelay.metered.ca:80',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
    {
        urls: 'turn:openrelay.metered.ca:443?transport=tcp',
        username: 'openrelayproject',
        credential: 'openrelayproject',
    },
];

export default function ChatSidebar({ 
    socket, 
    roomId, 
    isOpen, 
    onToggle, 
    userId, 
    userName, 
    userColor,
    initialTab = 'chat',
    unreadCount = 0,
}) {
    const [activeTab, setActiveTab] = useState(initialTab);
    const [messages, setMessages] = useState([]);
    const [inputText, setInputText] = useState('');
    const [participants, setParticipants] = useState([]);
    const [inVoiceChat, setInVoiceChat] = useState(false);
    const [isMuted, setIsMuted] = useState(false);
    const [voiceParticipants, setVoiceParticipants] = useState([]);
    const [remoteStreams, setRemoteStreams] = useState(new Map());
    const messagesEndRef = useRef(null);
    const peerConnections = useRef(new Map());
    const localStream = useRef(null);

    const userRef = useRef({ userId, userName, userColor });
    useEffect(() => {
        userRef.current = { userId, userName, userColor };
    }, [userId, userName, userColor]);

    useEffect(() => {
        if (initialTab) setActiveTab(initialTab);
    }, [initialTab]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, activeTab]);

    useEffect(() => {
        if (!socket) return;

        const onRoomInit = (data) => {
            if (data.chatHistory) setMessages(data.chatHistory);
            if (data.participants) {
                setParticipants(data.participants);
                setVoiceParticipants(data.participants.filter(p => p.inVoice));
            }
        };

        const onChatMessage = (msg) => {
            setMessages((prev) => [...prev, msg]);
        };

        const onParticipantsUpdate = (list) => {
            const currentList = list || [];
            setParticipants(currentList);
            const inVoiceList = currentList.filter(p => p.inVoice);
            setVoiceParticipants(inVoiceList);

            // If we are currently in voice and a new participant joins voice, initiate connection to them
            if (inVoiceChat && localStream.current) {
                inVoiceList.forEach((p) => {
                    if (p.socketId && p.userId !== userId && !peerConnections.current.has(p.socketId)) {
                        initiateVoiceConnection(p.socketId);
                    }
                });
            }
        };

        const onUserJoined = ({ user }) => {
            setMessages((prev) => [...prev, {
                type: 'system',
                text: `${user.userName} joined the room`,
                timestamp: Date.now(),
            }]);
        };

        const onUserLeft = ({ userName, userId: leftUserId }) => {
            setMessages((prev) => [...prev, {
                type: 'system',
                text: `${userName || 'A user'} left the room`,
                timestamp: Date.now(),
            }]);

            // Clean up WebRTC peer connection
            peerConnections.current.forEach((pc, socketId) => {
                const participant = participants.find(p => p.socketId === socketId);
                if (!participant || participant.userId === leftUserId) {
                    pc.close();
                    peerConnections.current.delete(socketId);
                    setRemoteStreams(prev => {
                        const next = new Map(prev);
                        next.delete(socketId);
                        return next;
                    });
                }
            });
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
    }, [socket, inVoiceChat, userId, participants]);

    const sendMessage = useCallback(() => {
        if (!inputText.trim() || !socket?.connected) return;
        socket.emit('chat:send', {
            roomId,
            text: inputText.trim(),
            user: userRef.current,
        });
        setInputText('');
    }, [inputText, socket, roomId]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // ===================== WebRTC Voice Engine with TURN + DOM Audio =====================

    const initiateVoiceConnection = useCallback(async (targetSocketId) => {
        if (!localStream.current || !socket?.connected || !targetSocketId) return;

        try {
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            peerConnections.current.set(targetSocketId, pc);

            localStream.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStream.current);
            });

            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStreams(prev => new Map(prev).set(targetSocketId, event.streams[0]));
                }
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
        } catch (err) {
            console.error('Error initiating WebRTC connection:', err);
        }
    }, [socket]);

    const handleRtcOffer = useCallback(async (fromSocketId, offer) => {
        if (!socket?.connected) return;

        // Auto-request local audio stream if not ready yet
        if (!localStream.current) {
            try {
                localStream.current = await navigator.mediaDevices.getUserMedia({ audio: true });
                setInVoiceChat(true);
            } catch (err) {
                console.error('Failed to get mic stream on offer:', err);
                return;
            }
        }

        try {
            const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
            peerConnections.current.set(fromSocketId, pc);

            localStream.current.getTracks().forEach((track) => {
                pc.addTrack(track, localStream.current);
            });

            pc.ontrack = (event) => {
                if (event.streams && event.streams[0]) {
                    setRemoteStreams(prev => new Map(prev).set(fromSocketId, event.streams[0]));
                }
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
        } catch (err) {
            console.error('Error handling WebRTC offer:', err);
        }
    }, [socket]);

    const handleRtcAnswer = useCallback(async (fromSocketId, answer) => {
        const pc = peerConnections.current.get(fromSocketId);
        if (pc) {
            try {
                await pc.setRemoteDescription(new RTCSessionDescription(answer));
            } catch (err) {
                console.error('Error setting remote answer:', err);
            }
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
                user: userRef.current,
            });

            // Connect with all existing participants who are in voice
            participants.forEach((p) => {
                if (p.socketId && p.userId !== userId && p.inVoice) {
                    initiateVoiceConnection(p.socketId);
                }
            });
        } catch (err) {
            console.error('Failed to access microphone:', err);
            alert('Please allow microphone access to use voice chat.');
        }
    }, [socket, roomId, participants, userId, initiateVoiceConnection]);

    const leaveVoiceChat = useCallback(() => {
        localStream.current?.getTracks().forEach((track) => track.stop());
        localStream.current = null;

        peerConnections.current.forEach((pc) => pc.close());
        peerConnections.current.clear();
        setRemoteStreams(new Map());

        setInVoiceChat(false);
        setIsMuted(false);

        socket?.emit('voice:toggle', {
            roomId,
            inVoice: false,
            isMuted: false,
            user: userRef.current,
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
                user: userRef.current,
            });
        }
    }, [isMuted, socket, roomId]);

    const formatTime = (ts) => {
        const d = new Date(ts);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={`relative h-full z-20 flex transition-all duration-300 ease-in-out ${isOpen ? 'w-[340px]' : 'w-0'}`}>
            {/* Hidden DOM Audio Elements for robust, uninterrupted playback without autoplay blocking */}
            {Array.from(remoteStreams.entries()).map(([socketId, stream]) => (
                <audio
                    key={socketId}
                    autoPlay
                    playsInline
                    ref={(el) => { if (el && el.srcObject !== stream) el.srcObject = stream; }}
                />
            ))}

            {/* Collapsed Toggle Button with Unread Badge */}
            <button
                className={`absolute top-1/2 -translate-y-1/2 left-0 -translate-x-full flex h-16 w-6 items-center justify-center rounded-l-xl border border-r-0 border-white/60 bg-white/70 backdrop-blur-md shadow-sm transition-all duration-300 hover:bg-white/90 hover:w-8 z-30`}
                onClick={onToggle}
                title={isOpen ? 'Close sidebar' : 'Open chat & voice'}
            >
                {isOpen ? (
                    <ChevronRight size={16} className="text-text-muted" />
                ) : (
                    <div className="relative flex items-center justify-center">
                        <MessageSquare size={16} className="text-primary" />
                        {unreadCount > 0 && (
                            <span className="absolute -top-3 -right-2 h-4 min-w-[16px] px-1 rounded-full bg-danger text-white text-[9px] font-extrabold flex items-center justify-center animate-pulse">
                                {unreadCount}
                            </span>
                        )}
                        {voiceParticipants.length > 0 && !inVoiceChat && (
                            <span className="absolute -bottom-3 -right-1 h-2 w-2 rounded-full bg-secondary animate-ping" />
                        )}
                    </div>
                )}
            </button>

            <div className={`flex flex-col h-full glass-panel rounded-r-none transition-all duration-300 w-[340px] shadow-xl border-l border-white/50 bg-white/80 overflow-hidden ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
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
                            {voiceParticipants.length > 0 && (
                                <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                                    <span className="relative inline-flex rounded-full h-2 w-2 bg-secondary" />
                                </span>
                            )}
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
                                <div className="space-y-4">
                                    {messages.map((msg, idx) => (
                                        msg.type === 'system' ? (
                                            <div key={idx} className="flex justify-center my-3">
                                                <div className="text-[10px] font-bold uppercase tracking-widest text-text-muted bg-background border border-border px-3 py-1 rounded-full shadow-sm">
                                                    {msg.text}
                                                </div>
                                            </div>
                                        ) : (
                                            <div
                                                key={msg.id || idx}
                                                className={`flex flex-col max-w-[85%] ${msg.userId === userId ? 'ml-auto' : 'mr-auto'}`}
                                            >
                                                <div className={`flex items-baseline gap-2 mb-1 px-1 ${msg.userId === userId ? 'flex-row-reverse' : ''}`}>
                                                    <span className="text-xs font-bold tracking-wide" style={{ color: msg.userId === userId ? '#2563EB' : msg.userColor }}>
                                                        {msg.userId === userId ? 'You' : msg.userName}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-text-subtle">{formatTime(msg.timestamp)}</span>
                                                </div>
                                                <div className={`text-sm px-4 py-2.5 shadow-sm leading-relaxed ${msg.userId === userId ? 'bg-primary text-white rounded-[16px] rounded-br-sm' : 'bg-surface border border-border text-text-main rounded-[16px] rounded-bl-sm'}`}>
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
                                        className="w-full bg-background border border-border rounded-[20px] pl-4 pr-12 py-2.5 text-sm text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary resize-none max-h-32 min-h-[44px] shadow-sm custom-scrollbar"
                                        placeholder="Type a message..."
                                        value={inputText}
                                        onChange={(e) => setInputText(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        rows={1}
                                    />
                                    <button
                                        className={`absolute right-2 h-8 w-8 rounded-full flex items-center justify-center transition-all ${inputText.trim() ? 'bg-primary text-white shadow-sm' : 'bg-surface border border-border text-text-muted'}`}
                                        onClick={sendMessage}
                                        disabled={!inputText.trim()}
                                    >
                                        <Send size={15} className={inputText.trim() ? "translate-x-[-1px] translate-y-[1px]" : ""} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Voice Tab */}
                    {activeTab === 'voice' && (
                        <div className="absolute inset-0 flex flex-col p-6 animate-fade-in">
                            {!inVoiceChat ? (
                                <div className="flex flex-col items-center justify-center h-full text-center space-y-6">
                                    <div className="h-20 w-20 rounded-full bg-secondary/10 flex items-center justify-center border border-secondary/20 shadow-sm relative">
                                        <PhoneCall size={32} className="text-secondary" />
                                        {voiceParticipants.length > 0 && (
                                            <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75" />
                                                <span className="relative inline-flex rounded-full h-4 w-4 bg-secondary text-white text-[9px] font-bold items-center justify-center">
                                                    {voiceParticipants.length}
                                                </span>
                                            </span>
                                        )}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-extrabold mb-2 text-text-main">
                                            {voiceParticipants.length > 0 ? 'Voice Call Active' : 'Live Voice Room'}
                                        </h3>
                                        <p className="text-xs font-medium text-text-muted leading-relaxed max-w-[240px]">
                                            {voiceParticipants.length > 0 
                                                ? `${voiceParticipants.length} developer(s) are currently on call. Join in to talk!`
                                                : 'Start talking with your team in real-time with zero audio lag.'}
                                        </p>
                                    </div>
                                    <button 
                                        onClick={joinVoiceChat} 
                                        className="btn-primary w-full h-11 gap-3 text-xs font-bold tracking-wide uppercase bg-secondary hover:bg-secondary-hover shadow-secondary rounded-xl"
                                    >
                                        <PhoneCall size={16} />
                                        {voiceParticipants.length > 0 ? 'Join Active Call' : 'Start Voice Call'}
                                    </button>
                                </div>
                            ) : (
                                <div className="flex flex-col h-full">
                                    <div className="flex items-center justify-between py-3 px-4 bg-secondary/10 border border-secondary/20 text-secondary rounded-xl mb-5 shadow-sm">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 rounded-full bg-secondary animate-pulse shadow-sm" />
                                            <span className="text-xs font-extrabold uppercase tracking-wider">Voice Connected</span>
                                        </div>
                                        <span className="text-[11px] font-bold bg-secondary/20 px-2 py-0.5 rounded-full">
                                            {voiceParticipants.length || 1} online
                                        </span>
                                    </div>

                                    <div className="flex-1 flex flex-col gap-3 overflow-y-auto custom-scrollbar pr-1">
                                        <div className="text-[11px] font-bold text-text-subtle uppercase tracking-wider pl-1">In Call</div>
                                        
                                        {/* Self */}
                                        <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface shadow-sm">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full border-2 border-transparent relative flex items-center justify-center font-bold text-white text-sm overflow-hidden shadow-sm" style={{ background: userColor }}>
                                                    {(userName || 'U')[0]?.toUpperCase()}
                                                    {!isMuted && <div className="absolute inset-0 rounded-full border-2 border-secondary animate-pulse pointer-events-none" />}
                                                </div>
                                                <span className="text-sm font-bold text-text-main">You</span>
                                            </div>
                                            <div className="h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center text-text-muted">
                                                {isMuted ? <MicOff size={14} className="text-danger" /> : <Volume2 size={14} className="text-secondary" />}
                                            </div>
                                        </div>

                                        {voiceParticipants
                                            .filter(p => p.userId !== userId)
                                            .map((p) => (
                                                <div key={p.userId} className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-surface shadow-sm">
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-10 w-10 rounded-full border-2 border-transparent relative flex items-center justify-center font-bold text-white text-sm overflow-hidden shadow-sm" style={{ background: p.userColor }}>
                                                            {(p.userName || 'U')[0]?.toUpperCase()}
                                                            {!p.isMuted && <div className="absolute inset-0 rounded-full border-2 border-secondary animate-pulse pointer-events-none" />}
                                                        </div>
                                                        <span className="text-sm font-bold text-text-main">{p.userName}</span>
                                                    </div>
                                                    <div className="h-8 w-8 rounded-full bg-background border border-border flex items-center justify-center">
                                                        {p.isMuted ? <MicOff size={14} className="text-danger" /> : <Volume2 size={14} className="text-secondary" />}
                                                    </div>
                                                </div>
                                            ))
                                        }
                                    </div>

                                    <div className="flex items-center justify-center gap-6 mt-auto pt-4 border-t border-border">
                                        <button 
                                            className={`flex items-center justify-center h-14 w-14 rounded-full border-2 transition-all ${isMuted ? 'border-danger/50 bg-danger/10 text-danger shadow-sm' : 'border-border bg-surface text-text-main hover:bg-surfaceHover'}`}
                                            onClick={toggleMute}
                                            title={isMuted ? 'Unmute' : 'Mute'}
                                        >
                                            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
                                        </button>
                                        <button 
                                            className="flex items-center justify-center h-14 w-14 rounded-full bg-danger hover:bg-danger/80 text-white shadow-sm transition-all"
                                            onClick={leaveVoiceChat}
                                            title="Leave voice chat"
                                        >
                                            <PhoneOff size={20} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* People Tab */}
                    {activeTab === 'people' && (
                        <div className="absolute inset-0 flex flex-col p-6 animate-fade-in overflow-y-auto custom-scrollbar">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-extrabold text-text-main uppercase tracking-wider">In this room</span>
                                <span className="text-[11px] font-bold text-primary bg-primary/10 border border-primary/20 px-2.5 py-0.5 rounded-full">{participants.length} online</span>
                            </div>
                            <div className="space-y-2.5">
                                {participants.map((p) => (
                                    <div key={p.userId || p.socketId} className="flex items-center gap-3 p-3 rounded-xl bg-surface border border-border shadow-sm">
                                        <div className="h-9 w-9 rounded-full flex items-center justify-center font-bold text-white text-xs shadow-sm" style={{ background: p.userColor }}>
                                            {(p.userName || 'U')[0]?.toUpperCase()}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-bold text-text-main truncate">
                                                {p.userId === userId ? `${p.userName} (You)` : p.userName}
                                            </div>
                                            <div className="text-[10px] text-text-subtle flex items-center gap-1.5">
                                                <span className="h-1.5 w-1.5 rounded-full bg-secondary inline-block" />
                                                {p.inVoice ? 'In voice chat' : 'Active in room'}
                                            </div>
                                        </div>
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
