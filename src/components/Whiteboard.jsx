import { useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import { PenTool } from 'lucide-react';
import '@excalidraw/excalidraw/index.css';

const ExcalidrawComponent = lazy(() =>
    import('@excalidraw/excalidraw').then((mod) => ({
        default: mod.Excalidraw,
    }))
);

export default function Whiteboard({ roomId, socket, user }) {
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const isRemoteUpdate = useRef(false);
    const lastSentElements = useRef(null);
    const hasReceivedInitialState = useRef(false);
    const throttleTimer = useRef(null);

    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    // Listen for remote whiteboard updates & initial room state
    useEffect(() => {
        if (!socket || !excalidrawAPI) return;

        const handleRoomInit = (data) => {
            if (data?.whiteboard?.elements && Array.isArray(data.whiteboard.elements) && data.whiteboard.elements.length > 0) {
                isRemoteUpdate.current = true;
                excalidrawAPI.updateScene({
                    elements: data.whiteboard.elements,
                    appState: data.whiteboard.appState || undefined,
                });
                lastSentElements.current = JSON.stringify(data.whiteboard.elements.map(e => ({
                    id: e.id, type: e.type, x: e.x, y: e.y,
                    width: e.width, height: e.height, version: e.version,
                })));
                setTimeout(() => { isRemoteUpdate.current = false; }, 100);
            }
            hasReceivedInitialState.current = true;
        };

        const handleUpdate = (data) => {
            if (!data || !data.elements) return;

            isRemoteUpdate.current = true;
            excalidrawAPI.updateScene({
                elements: data.elements,
            });
            hasReceivedInitialState.current = true;
            setTimeout(() => { isRemoteUpdate.current = false; }, 50);
        };

        socket.on('room:init', handleRoomInit);
        socket.on('whiteboard:update', handleUpdate);
        return () => {
            socket.off('room:init', handleRoomInit);
            socket.off('whiteboard:update', handleUpdate);
        };
    }, [socket, excalidrawAPI]);

    // Send local changes to room (throttled)
    const handleChange = useCallback((elements, appState) => {
        if (isRemoteUpdate.current || !socket?.connected) return;

        // Guard: do not emit an empty initial board before receiving room state
        if (!hasReceivedInitialState.current && (!elements || elements.length === 0)) {
            return;
        }
        if (elements && elements.length > 0) {
            hasReceivedInitialState.current = true;
        }

        // Throttle: send at most every 80ms
        if (throttleTimer.current) return;
        throttleTimer.current = setTimeout(() => {
            throttleTimer.current = null;
        }, 80);

        // Only send if elements actually changed
        const serialized = JSON.stringify(elements.map(e => ({
            id: e.id, type: e.type, x: e.x, y: e.y,
            width: e.width, height: e.height, version: e.version,
        })));
        if (serialized === lastSentElements.current) return;
        lastSentElements.current = serialized;

        socket.emit('whiteboard:update', {
            roomId,
            elements,
            appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
            },
            user: userRef.current,
        });
    }, [socket, roomId]);

    return (
        <div className="flex-1 relative w-full h-full bg-background">

            <Suspense
                fallback={
                    <div className="flex items-center justify-center h-full w-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                }
            >
                <ExcalidrawComponent
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    theme="light"
                    onChange={handleChange}
                    UIOptions={{
                        canvasActions: {
                            loadScene: true,
                            export: { saveFileToDisk: true },
                            toggleTheme: false,
                        },
                    }}
                    initialData={{
                        appState: {
                            viewBackgroundColor: '#F9FAFB',
                            currentItemStrokeColor: '#2563EB',
                            currentItemFontFamily: 1,
                            activeTool: { type: 'freedraw', lastActiveTool: null, locked: false, customType: null },
                        },
                    }}
                />
            </Suspense>
        </div>
    );
}
