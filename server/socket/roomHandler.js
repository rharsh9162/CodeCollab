/**
 * Production-grade Socket.io Room Orchestrator for CodeCollab
 * Manages real-time room state: code, language, chat history, whiteboard, participants, and WebRTC
 */

class RoomManager {
    constructor() {
        // roomId -> { code, language, problem, whiteboard, chatHistory: [], participants: Map(socketId -> userData) }
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
            // Keep room in memory for 1 hour in case user refreshes
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

        // Notify other room members
        socket.to(roomId).emit('user:joined', {
            user: currentUser,
            timestamp: Date.now(),
        });

        // Broadcast updated participants list to everyone in the room
        io.to(roomId).emit('participants:update', Array.from(room.participants.values()));
    });

    // Real-time Collaborative Code Editing
    socket.on('code:change', ({ roomId, code, language, cursor }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        if (typeof code === 'string') room.code = code;
        if (language) room.language = language;

        socket.to(targetRoom).emit('code:update', {
            code: room.code,
            language: room.language,
            updatedBy: currentUser?.userId,
            cursor,
        });
    });

    // Cursor movement awareness
    socket.on('code:cursor', ({ roomId, cursor }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom || !currentUser) return;

        socket.to(targetRoom).emit('code:cursor', {
            cursor,
            user: currentUser,
        });
    });

    // Problem sync (when a user imports a LeetCode problem)
    socket.on('problem:sync', ({ roomId, problem }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        room.problem = problem;

        socket.to(targetRoom).emit('problem:update', problem);
    });

    // Chat messaging
    socket.on('chat:send', ({ roomId, text }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom || !text?.trim() || !currentUser) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        const message = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
            userId: currentUser.userId,
            userName: currentUser.userName,
            userColor: currentUser.userColor,
            text: text.trim(),
            timestamp: Date.now(),
        };

        room.chatHistory.push(message);
        if (room.chatHistory.length > 100) {
            room.chatHistory.shift();
        }

        io.to(targetRoom).emit('chat:message', message);
    });

    // Real-time Whiteboard Drawing Sync
    socket.on('whiteboard:update', ({ roomId, elements, appState }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        room.whiteboard = { elements, appState };

        socket.to(targetRoom).emit('whiteboard:update', {
            elements,
            appState,
            fromUserId: currentUser?.userId,
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

    // Voice status toggle
    socket.on('voice:toggle', ({ roomId, inVoice, isMuted }) => {
        const targetRoom = roomId || currentRoomId;
        if (!targetRoom || !currentUser) return;

        const room = roomManager.getOrCreateRoom(targetRoom);
        const participant = room.participants.get(socket.id);
        if (participant) {
            participant.inVoice = Boolean(inVoice);
            participant.isMuted = Boolean(isMuted);
            io.to(targetRoom).emit('participants:update', Array.from(room.participants.values()));
        }
    });

    // Disconnect cleanup
    socket.on('disconnecting', () => {
        for (const roomName of socket.rooms) {
            if (roomName !== socket.id) {
                const room = roomManager.getRoom(roomName);
                if (room) {
                    room.participants.delete(socket.id);
                    socket.to(roomName).emit('user:left', {
                        userId: currentUser?.userId,
                        userName: currentUser?.userName,
                        timestamp: Date.now(),
                    });
                    socket.to(roomName).emit('participants:update', Array.from(room.participants.values()));
                    roomManager.deleteRoomIfEmpty(roomName);
                }
            }
        }
    });
}
