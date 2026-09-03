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
    const [activeDrawer, setActiveDrawer] = useState(null);
    const isRemoteUpdate = useRef(false);
    const lastSentElements = useRef(null);
    const throttleTimer = useRef(null);
    const drawerTimer = useRef(null);

    const userRef = useRef(user);
    useEffect(() => { userRef.current = user; }, [user]);

    // Listen for remote whiteboard updates
    useEffect(() => {
        if (!socket || !excalidrawAPI) return;

        const handleUpdate = (data) => {
            if (!data || !data.elements) return;

            // Show live drawing presence badge if someone else is drawing
            if (data.user && data.fromUserId !== userRef.current?.userId) {
                setActiveDrawer(data.user);
                clearTimeout(drawerTimer.current);
                drawerTimer.current = setTimeout(() => setActiveDrawer(null), 2500);
            }

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
            user: userRef.current,
        });
    }, [socket, roomId]);

    return (
        <div className="flex-1 relative w-full h-full bg-background">
            {/* Live Drawing Presence Badge */}
            {activeDrawer && (
                <div className="absolute top-4 left-4 z-30 flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white/95 border border-white/60 shadow-md backdrop-blur-md animate-fade-in pointer-events-none">
                    <PenTool size={13} className="text-secondary animate-bounce" />
                    <span className="text-xs font-bold" style={{ color: activeDrawer.userColor || '#10B981' }}>
                        {activeDrawer.userName} is drawing...
                    </span>
                </div>
            )}

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
