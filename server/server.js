import express from 'express';
import cors from 'cors';
import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { fetchProblemDetail, searchProblems } from './services/leetcodeService.js';
import { executeCode } from './services/pistonService.js';
import { registerRoomHandlers } from './socket/roomHandler.js';

const app = express();
const server = http.createServer(app);

// ----------------------------------------------------
// Global Middleware
// ----------------------------------------------------
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json({ limit: '5mb' }));

const PORT = process.env.PORT || 3001;

// ----------------------------------------------------
// Health Check Endpoints
// ----------------------------------------------------
app.get('/', (req, res) => {
    res.json({
        service: 'CodeCollab Backend',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        engine: 'Socket.io',
    });
});

app.get('/health', (req, res) => {
    res.status(200).json({ status: 'OK', uptime: process.uptime() });
});

// ----------------------------------------------------
// REST API Routes (Powered by Axios)
// ----------------------------------------------------

/**
 * Fetch LeetCode problem details by titleSlug
 */
app.get('/api/problem/:titleSlug', async (req, res, next) => {
    try {
        const { titleSlug } = req.params;
        if (!titleSlug) {
            return res.status(400).json({ error: 'titleSlug parameter is required' });
        }
        const problem = await fetchProblemDetail(titleSlug);
        res.json(problem);
    } catch (err) {
        next(err);
    }
});

/**
 * Search LeetCode problems
 */
app.get('/api/search/:query', async (req, res, next) => {
    try {
        const { query } = req.params;
        if (!query || query.trim() === '') {
            return res.json([]);
        }
        const questions = await searchProblems(query);
        res.json({ questions });
    } catch (err) {
        next(err);
    }
});

/**
 * Code execution via Piston API
 */
app.post('/api/execute', async (req, res, next) => {
    try {
        const { code, language, stdin } = req.body;
        if (!code || !language) {
            return res.status(400).json({ error: 'Both code and language are required.' });
        }
        const result = await executeCode(code, language, stdin);
        res.json(result);
    } catch (err) {
        next(err);
    }
});

// ----------------------------------------------------
// Centralized Error Handling Middleware
// ----------------------------------------------------
app.use((err, req, res, next) => {
    console.error(`[API Error] ${req.method} ${req.url}:`, err.message);
    const statusCode = err.status || (err.message.includes('not found') ? 404 : 500);
    res.status(statusCode).json({
        error: err.message || 'Internal Server Error',
    });
});

// ----------------------------------------------------
// Socket.io Real-time Server Setup
// ----------------------------------------------------
const io = new SocketIOServer(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false,
    },
    transports: ['polling', 'websocket'], // Robust fallback for cloud proxies (Render/Vercel)
    pingTimeout: 30000,
    pingInterval: 25000,
});

io.on('connection', (socket) => {
    registerRoomHandlers(io, socket);
});

// ----------------------------------------------------
// Start Server with Graceful Shutdown
// ----------------------------------------------------
server.listen(PORT, () => {
    console.log(`🚀 CodeCollab Server running on port ${PORT}`);
    console.log(`⚡ Real-time engine: Socket.io (polling + websocket)`);
    console.log(`📡 LeetCode & Code execution APIs ready`);
});

function gracefulShutdown(signal) {
    console.log(`Received ${signal}. Shutting down server gracefully...`);
    io.close(() => {
        server.close(() => {
            console.log('Server and active connections closed cleanly.');
            process.exit(0);
        });
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
