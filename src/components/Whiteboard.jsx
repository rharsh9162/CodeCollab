import { useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import '@excalidraw/excalidraw/index.css';

const ExcalidrawComponent = lazy(() =>
    import('@excalidraw/excalidraw').then((mod) => ({
        default: mod.Excalidraw,
    }))
);

export default function Whiteboard({ roomId, socket }) {
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const isRemoteUpdate = useRef(false);
    const lastSentElements = useRef(null);
    const throttleTimer = useRef(null);

    // Listen for remote whiteboard updates
    useEffect(() => {
        if (!socket || !excalidrawAPI) return;

        const handleUpdate = (data) => {
            if (!data || !data.elements) return;
            isRemoteUpdate.current = true;
            excalidrawAPI.updateScene({
                elements: data.elements,
            });
            setTimeout(() => { isRemoteUpdate.current = false; }, 50);
        };

        socket.on('whiteboard:update', handleUpdate);
        return () => socket.off('whiteboard:update', handleUpdate);
    }, [socket, excalidrawAPI]);

    // Send local changes to room (throttled)
    const handleChange = useCallback((elements, appState) => {
        if (isRemoteUpdate.current || !socket?.connected) return;

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
