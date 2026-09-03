import express from 'express';
import cors from 'cors';
import http from 'http';

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3001;

// Root & Health check endpoints for Render
app.get('/', (req, res) => {
    res.json({ service: 'CodeCollab Backend', status: 'healthy', ws: true });
});

app.get('/health', (req, res) => {
    res.status(200).send('OK');
});

// LeetCode GraphQL API proxy
app.get('/api/problem/:titleSlug', async (req, res) => {
    const { titleSlug } = req.params;

    const query = `
    query getQuestionDetail($titleSlug: String!) {
      question(titleSlug: $titleSlug) {
        questionId
        title
        titleSlug
        content
        difficulty
        likes
        dislikes
        categoryTitle
        topicTags {
          name
          slug
        }
        codeSnippets {
          lang
          langSlug
          code
        }
        sampleTestCase
        exampleTestcases
        hints
        stats
        acRate
      }
    }
  `;

    try {
        const response = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
            },
            body: JSON.stringify({
                query,
                variables: { titleSlug },
            }),
        });

        const data = await response.json();
        if (data.errors) return res.status(400).json({ error: data.errors[0].message });
        if (!data.data.question) return res.status(404).json({ error: 'Problem not found' });
        res.json(data.data.question);
    } catch (error) {
        console.error('LeetCode API error:', error);
        res.status(500).json({ error: 'Failed to fetch problem from LeetCode' });
    }
});

// Search problems
app.get('/api/search/:query', async (req, res) => {
    const { query: searchQuery } = req.params;

    const query = `
    query problemsetQuestionList($categorySlug: String, $limit: Int, $skip: Int, $filters: QuestionListFilterInput) {
      problemsetQuestionList: questionList(
        categorySlug: $categorySlug
        limit: $limit
        skip: $skip
        filters: $filters
      ) {
        total: totalNum
        questions: data {
          questionId
          title
          titleSlug
          difficulty
          acRate
          topicTags {
            name
          }
        }
      }
    }
  `;

    try {
        const response = await fetch('https://leetcode.com/graphql', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Referer': 'https://leetcode.com',
            },
            body: JSON.stringify({
                query,
                variables: {
                    categorySlug: '',
                    skip: 0,
                    limit: 10,
                    filters: { searchKeywords: searchQuery },
                },
            }),
        });

        const data = await response.json();
        if (data.errors) return res.status(400).json({ error: data.errors[0].message });
        res.json(data.data.problemsetQuestionList);
    } catch (error) {
        console.error('LeetCode search error:', error);
        res.status(500).json({ error: 'Failed to search problems' });
    }
});

// Language mapping for Piston API
const PISTON_LANG_MAP = {
    python: { language: 'python', version: '3.10.0' },
    javascript: { language: 'javascript', version: '18.15.0' },
    typescript: { language: 'typescript', version: '5.0.3' },
    java: { language: 'java', version: '15.0.2' },
    cpp: { language: 'c++', version: '10.2.0' },
    c: { language: 'c', version: '10.2.0' },
    csharp: { language: 'csharp', version: '6.12.0' },
    go: { language: 'go', version: '1.16.2' },
    rust: { language: 'rust', version: '1.68.2' },
    ruby: { language: 'ruby', version: '3.0.1' },
    swift: { language: 'swift', version: '5.3.3' },
    kotlin: { language: 'kotlin', version: '1.8.20' },
};

// Code execution via Piston API
app.post('/api/execute', async (req, res) => {
    const { code, language, stdin = '' } = req.body;
    const langConfig = PISTON_LANG_MAP[language];
    if (!langConfig) return res.status(400).json({ error: `Unsupported language: ${language}` });

    try {
        const response = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: langConfig.language,
                version: langConfig.version,
                files: [{ content: code }],
                stdin,
            }),
        });
        const data = await response.json();
        if (data.message) return res.status(400).json({ error: data.message });
        res.json({
            output: data.run?.output || '',
            stderr: data.run?.stderr || '',
            code: data.run?.code ?? 0,
            signal: data.run?.signal || null,
            language: data.language,
            version: data.version,
        });
    } catch (error) {
        console.error('Piston API error:', error);
        res.status(500).json({ error: 'Failed to execute code.' });
    }
});

const server = http.createServer(app);

// ============================================================
// WebSocket Servers
// ============================================================
import { WebSocketServer } from 'ws';
import * as Y from 'yjs';
import { encoding, decoding } from 'lib0';
import * as syncProtocol from 'y-protocols/sync';
import * as awarenessProtocol from 'y-protocols/awareness';

// Two WebSocket servers on the same HTTP server, differentiated by URL path
const wssYjs = new WebSocketServer({ noServer: true });
const wssRoom = new WebSocketServer({ noServer: true });

server.on('upgrade', (request, socket, head) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    const pathname = url.pathname;

    if (pathname === '/room') {
        wssRoom.handleUpgrade(request, socket, head, (ws) => {
            wssRoom.emit('connection', ws, request);
        });
    } else {
        // Default: Yjs collaboration
        wssYjs.handleUpgrade(request, socket, head, (ws) => {
            wssYjs.emit('connection', ws, request);
        });
    }
});

// ============================================================
// Yjs Collaboration WebSocket (for code editor)
// ============================================================
const docs = new Map();
const roomConnections = new Map();
const roomAwareness = new Map();

function getYDoc(docName) {
    if (!docs.has(docName)) {
        const doc = new Y.Doc();
        docs.set(docName, doc);
    }
    return docs.get(docName);
}

function getAwareness(roomName, doc) {
    if (!roomAwareness.has(roomName)) {
        const awareness = new awarenessProtocol.Awareness(doc);
        roomAwareness.set(roomName, awareness);
    }
    return roomAwareness.get(roomName);
}

wssYjs.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomName = url.searchParams.get('room') || 'default';

    const doc = getYDoc(roomName);
    const awareness = getAwareness(roomName, doc);

    if (!roomConnections.has(roomName)) roomConnections.set(roomName, new Set());
    roomConnections.get(roomName).add(ws);

    // Send sync step 1
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, 0);
    syncProtocol.writeSyncStep1(encoder, doc);
    ws.send(encoding.toUint8Array(encoder));

    // Send awareness
    const awarenessEncoder = encoding.createEncoder();
    encoding.writeVarUint(awarenessEncoder, 1);
    encoding.writeVarUint8Array(
        awarenessEncoder,
        awarenessProtocol.encodeAwarenessUpdate(awareness, Array.from(awareness.getStates().keys()))
    );
    ws.send(encoding.toUint8Array(awarenessEncoder));

    const updateHandler = (update, origin) => {
        if (origin !== ws) {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, 0);
            syncProtocol.writeUpdate(encoder, update);
            if (ws.readyState === 1) ws.send(encoding.toUint8Array(encoder));
        }
    };
    doc.on('update', updateHandler);

    const awarenessChangeHandler = ({ added, updated, removed }) => {
        const changedClients = added.concat(updated).concat(removed);
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 1);
        encoding.writeVarUint8Array(encoder, awarenessProtocol.encodeAwarenessUpdate(awareness, changedClients));
        const msg = encoding.toUint8Array(encoder);
        roomConnections.get(roomName)?.forEach((conn) => {
            if (conn.readyState === 1) conn.send(msg);
        });
    };
    awareness.on('change', awarenessChangeHandler);

    ws.on('message', (message) => {
        const data = new Uint8Array(message);
        const decoder = decoding.createDecoder(data);
        const msgType = decoding.readVarUint(decoder);
        switch (msgType) {
            case 0: {
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, 0);
                syncProtocol.readSyncMessage(decoder, encoder, doc, ws);
                if (encoding.length(encoder) > 1) ws.send(encoding.toUint8Array(encoder));
                break;
            }
            case 1: {
                awarenessProtocol.applyAwarenessUpdate(awareness, decoding.readVarUint8Array(decoder), ws);
                break;
            }
        }
    });

    ws.on('close', () => {
        doc.off('update', updateHandler);
        awareness.off('change', awarenessChangeHandler);
        roomConnections.get(roomName)?.delete(ws);
        awarenessProtocol.removeAwarenessStates(awareness, [doc.clientID], null);
    });
});

// ============================================================
// Room Communication WebSocket (chat, whiteboard sync, WebRTC signaling)
// ============================================================
const roomClients = new Map(); // roomId -> Set of { ws, userId, userName, userColor }
const roomChatHistory = new Map(); // roomId -> array of chat messages (last 100)

wssRoom.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const roomId = url.searchParams.get('room') || 'default';
    const userId = url.searchParams.get('userId') || Math.random().toString(36).slice(2, 10);
    const userName = decodeURIComponent(url.searchParams.get('userName') || 'Anonymous');
    const userColor = url.searchParams.get('userColor') || '#6c63ff';

    const clientInfo = { ws, userId, userName, userColor };

    if (!roomClients.has(roomId)) roomClients.set(roomId, new Set());
    roomClients.get(roomId).add(clientInfo);

    // Send chat history
    const history = roomChatHistory.get(roomId) || [];
    ws.send(JSON.stringify({ type: 'chat-history', messages: history }));

    // Send current participants list
    broadcastParticipants(roomId);

    // Notify room about new user
    broadcastToRoom(roomId, {
        type: 'user-joined',
        userId,
        userName,
        userColor,
        timestamp: Date.now(),
    }, ws);

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message.toString());

            switch (data.type) {
                case 'chat': {
                    const chatMsg = {
                        type: 'chat',
                        userId,
                        userName,
                        userColor,
                        text: data.text,
                        timestamp: Date.now(),
                    };
                    // Store in history (max 100)
                    if (!roomChatHistory.has(roomId)) roomChatHistory.set(roomId, []);
                    const hist = roomChatHistory.get(roomId);
                    hist.push(chatMsg);
                    if (hist.length > 100) hist.shift();
                    // Broadcast to all in room (including sender)
                    broadcastToRoom(roomId, chatMsg);
                    break;
                }

                case 'whiteboard-update': {
                    // Broadcast whiteboard scene to all others in room
                    broadcastToRoom(roomId, {
                        type: 'whiteboard-update',
                        elements: data.elements,
                        appState: data.appState,
                        userId,
                    }, ws);
                    break;
                }

                case 'rtc-offer':
                case 'rtc-answer':
                case 'rtc-ice': {
                    // Forward WebRTC signaling to specific peer
                    const target = findClient(roomId, data.targetUserId);
                    if (target) {
                        target.ws.send(JSON.stringify({
                            ...data,
                            fromUserId: userId,
                            fromUserName: userName,
                        }));
                    }
                    break;
                }

                case 'voice-join':
                case 'voice-leave': {
                    broadcastToRoom(roomId, {
                        type: data.type,
                        userId,
                        userName,
                        userColor,
                    });
                    break;
                }
            }
        } catch (e) {
            // Ignore malformed messages
        }
    });

    ws.on('close', () => {
        roomClients.get(roomId)?.delete(clientInfo);
        broadcastToRoom(roomId, {
            type: 'user-left',
            userId,
            userName,
            timestamp: Date.now(),
        });
        broadcastParticipants(roomId);
    });
});

function broadcastToRoom(roomId, message, excludeWs = null) {
    const clients = roomClients.get(roomId);
    if (!clients) return;
    const msg = JSON.stringify(message);
    clients.forEach((client) => {
        if (client.ws !== excludeWs && client.ws.readyState === 1) {
            client.ws.send(msg);
        }
    });
}

function broadcastParticipants(roomId) {
    const clients = roomClients.get(roomId);
    if (!clients) return;
    const participants = Array.from(clients).map((c) => ({
        userId: c.userId,
        userName: c.userName,
        userColor: c.userColor,
    }));
    const msg = JSON.stringify({ type: 'participants', participants });
    clients.forEach((client) => {
        if (client.ws.readyState === 1) client.ws.send(msg);
    });
}

function findClient(roomId, targetUserId) {
    const clients = roomClients.get(roomId);
    if (!clients) return null;
    for (const client of clients) {
        if (client.userId === targetUserId) return client;
    }
    return null;
}

server.listen(PORT, () => {
    console.log(`🚀 CodeCollab server running on http://localhost:${PORT}`);
    console.log(`📡 Yjs WebSocket ready for code collaboration`);
    console.log(`💬 Room WebSocket ready for chat, whiteboard & voice`);
});
