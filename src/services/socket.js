import { io } from 'socket.io-client';

const isLocalhost = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

// Verified live Render backend fallback for production domains
const DEFAULT_SOCKET_URL = isLocalhost 
    ? 'http://localhost:3001' 
    : 'https://codecollab-backend-a4w0.onrender.com';

export const SOCKET_SERVER_URL = import.meta.env.VITE_WS_URL || 
                                 import.meta.env.VITE_API_URL || 
                                 DEFAULT_SOCKET_URL;

let socketInstance = null;

/**
 * Get or create the singleton Socket.io instance
 */
export function getSocket() {
    if (!socketInstance) {
        socketInstance = io(SOCKET_SERVER_URL, {
            transports: ['polling', 'websocket'], // Robust fallback for cloud proxies
            reconnection: true,
            reconnectionAttempts: Infinity,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 20000,
            autoConnect: true,
        });

        socketInstance.on('connect', () => {
            console.log('[Socket.io] Connected to server:', socketInstance.id);
        });

        socketInstance.on('connect_error', (err) => {
            console.warn('[Socket.io] Connection error (retrying):', err.message);
        });

        socketInstance.on('disconnect', (reason) => {
            console.log('[Socket.io] Disconnected:', reason);
        });
    }

    return socketInstance;
}

/**
 * Cleanly disconnect socket
 */
export function disconnectSocket() {
    if (socketInstance) {
        socketInstance.disconnect();
        socketInstance = null;
    }
}
