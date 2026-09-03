import { useState, lazy, Suspense, useEffect, useRef, useCallback } from 'react';
import '@excalidraw/excalidraw/index.css';

const ExcalidrawComponent = lazy(() =>
    import('@excalidraw/excalidraw').then((mod) => ({
        default: mod.Excalidraw,
    }))
);

export default function Whiteboard({ roomId, roomWs }) {
    const [excalidrawAPI, setExcalidrawAPI] = useState(null);
    const isRemoteUpdate = useRef(false);
    const lastSentElements = useRef(null);
    const throttleTimer = useRef(null);

    // Listen for remote whiteboard updates
    useEffect(() => {
        if (!roomWs || !excalidrawAPI) return;

        const handleMessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                if (data.type === 'whiteboard-update') {
                    isRemoteUpdate.current = true;
                    excalidrawAPI.updateScene({
                        elements: data.elements,
                    });
                    // Reset flag after update is processed
                    setTimeout(() => { isRemoteUpdate.current = false; }, 50);
                }
            } catch { /* ignore */ }
        };

        roomWs.addEventListener('message', handleMessage);
        return () => roomWs.removeEventListener('message', handleMessage);
    }, [roomWs, excalidrawAPI]);

    // Send local changes to room (throttled)
    const handleChange = useCallback((elements, appState) => {
        if (isRemoteUpdate.current || !roomWs || roomWs.readyState !== 1) return;

        // Throttle: send at most every 100ms
        if (throttleTimer.current) return;
        throttleTimer.current = setTimeout(() => {
            throttleTimer.current = null;
        }, 100);

        // Only send if elements actually changed
        const serialized = JSON.stringify(elements.map(e => ({
            id: e.id, type: e.type, x: e.x, y: e.y,
            width: e.width, height: e.height, version: e.version,
        })));
        if (serialized === lastSentElements.current) return;
        lastSentElements.current = serialized;

        roomWs.send(JSON.stringify({
            type: 'whiteboard-update',
            elements: elements,
            appState: {
                viewBackgroundColor: appState.viewBackgroundColor,
            },
        }));
    }, [roomWs]);

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
