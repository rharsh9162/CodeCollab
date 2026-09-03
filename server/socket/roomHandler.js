/**
 * Production-grade Socket.io Room Orchestrator for CodeCollab
 * Manages real-time room state: code, language, chat history, whiteboard, participants, and WebRTC
 */

class RoomManager {
    constructor() {
        this.rooms = new Map();
    }

    getOrCreateRoom(roomId) {
        if (!this.rooms.has(roomId)) {
            this.rooms.set(roomId, {
                code: '',
                language: 'python',
                problem: null,
                whiteboard: { elements: [], appState: null },
                chatHistory: [],
                participants: new Map(),
            });
        }
        return this.rooms.get(roomId);
    }

    getRoom(roomId) {
        return this.rooms.get(roomId);
    }

    deleteRoomIfEmpty(roomId) {
        const room = this.rooms.get(roomId);
        if (room && room.participants.size === 0) {
            setTimeout(() => {
                const r = this.rooms.get(roomId);
                if (r && r.participants.size === 0) {
                    this.rooms.delete(roomId);
                }
            }, 1000 * 60 * 60);
        }
    }
}

export const roomManager = new RoomManager();

export function registerRoomHandlers(io, socket) {
    let currentRoomId = null;
    let currentUser = null;

    // Join room event
    socket.on('room:join', ({ roomId, user }) => {
        if (!roomId || !user) return;

        currentRoomId = roomId;
        currentUser = {
            socketId: socket.id,
            userId: user.userId || socket.id,
            userName: user.userName || 'Anonymous',
            userColor: user.userColor || '#2563EB',
            photoURL: user.photoURL || null,
            inVoice: false,
            isMuted: false,
        };

        socket.join(roomId);

        const room = roomManager.getOrCreateRoom(roomId);
        
        // Prevent duplicate 'user:joined' spam if user is already connected in this room
        const isAlreadyInRoom = Array.from(room.participants.values()).some(p => p.userId === currentUser.userId);

        room.participants.set(socket.id, currentUser);

        // Send full initial state to the joining user
        socket.emit('room:init', {
            code: room.code,
            language: room.language,
            problem: room.problem,
            whiteboard: room.whiteboard,
            chatHistory: room.chatHistory,
            participants: Array.from(room.participants.values()),
        });

        // Notify other room members ONLY if genuinely a new participant
        if (!isAlreadyInRoom) {
            socket.to(roomId).emit('user:joined', {
                user: currentUser,
                timestamp: Date.now(),
            });
        }

        // Broadcast updated participants list to everyone in the room
        io.to(roomId).emit('participants:update', Array.from(room.participants.values()));
    });

    // Real-time Collaborative Code Editing
    socket.on('code:change', ({ roomId, code, language, cursor, user }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        if (typeof code === 'string') room.code = code;
        if (language) room.language = language;

        const activeUser = user || currentUser;

        socket.to(targetRoom).emit('code:update', {
            code: room.code,
            language: room.language,
            updatedBy: activeUser?.userId,
            user: activeUser,
            cursor,
        });
    });

    // Code typing presence broadcast
    socket.on('code:typing', ({ roomId, user }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        socket.to(targetRoom).emit('code:typing', {
            user: user || currentUser,
            timestamp: Date.now(),
        });
    });

    // Cursor movement awareness
    socket.on('code:cursor', ({ roomId, cursor, user }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        socket.to(targetRoom).emit('code:cursor', {
            cursor,
            user: user || currentUser,
        });
    });

    // Problem sync (when a user imports a LeetCode problem)
    socket.on('problem:sync', ({ roomId, problem, user }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        room.problem = problem;

        socket.to(targetRoom).emit('problem:update', {
            problem,
            user: user || currentUser,
        });
    });

    // Chat messaging
    socket.on('chat:send', ({ roomId, text, user }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom || !text?.trim()) return;

        const sender = user || currentUser;
        const room = roomManager.getOrCreateRoom(targetRoom);
        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId: sender?.userId || 'anon',
            userName: sender?.userName || 'Anonymous',
            userColor: sender?.userColor || '#2563EB',
            text: text.trim(),
            timestamp: Date.now(),
        };

        room.chatHistory.push(message);
        if (room.chatHistory.length > 100) {
            room.chatHistory.shift();
        }

        io.to(targetRoom).emit('chat:message', message);
    });

    // Real-time Whiteboard Drawing Sync with live drawer info
    socket.on('whiteboard:update', ({ roomId, elements, appState, user }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        room.whiteboard = { elements, appState };

        const drawer = user || currentUser;

        socket.to(targetRoom).emit('whiteboard:update', {
            elements,
            appState,
            fromUserId: drawer?.userId,
            user: drawer,
        });
    });

    // WebRTC Voice Chat Signaling
    socket.on('webrtc:signal', ({ targetSocketId, signal, type }) => {
        if (!targetSocketId) return;

        io.to(targetSocketId).emit('webrtc:signal', {
            fromSocketId: socket.id,
            fromUser: currentUser,
            signal,
            type,
        });
    });

    // Voice status toggle & incoming voice call notification
    socket.on('voice:toggle', ({ roomId, inVoice, isMuted, user }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        const participant = room.participants.get(socket.id);
        const activeUser = user || currentUser;

        if (participant) {
            participant.inVoice = Boolean(inVoice);
            participant.isMuted = Boolean(isMuted);
            io.to(targetRoom).emit('participants:update', Array.from(room.participants.values()));

            // If user joined voice, notify others in room to join
            if (inVoice) {
                socket.to(targetRoom).emit('voice:incoming', {
                    user: activeUser,
                    roomId: targetRoom,
                });
            }
        }
    });

    // Disconnect cleanup
    socket.on('disconnecting', () => {
        for (const roomName of socket.rooms) {
            if (roomName !== socket.id) {
                const room = roomManager.getRoom(roomName);
                if (room) {
                    room.participants.delete(socket.id);
                    
                    const userStillPresent = Array.from(room.participants.values()).some(p => p.userId === currentUser?.userId);
                    if (!userStillPresent && currentUser) {
                        socket.to(roomName).emit('user:left', {
                            userId: currentUser.userId,
                            userName: currentUser.userName,
                            timestamp: Date.now(),
                        });
                    }
                    socket.to(roomName).emit('participants:update', Array.from(room.participants.values()));
                    roomManager.deleteRoomIfEmpty(roomName);
                }
            }
        }
    });
}
