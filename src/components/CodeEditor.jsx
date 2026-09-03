import { useRef, useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';

const LANGUAGES = [
    { label: 'Python 3', value: 'python', slug: 'python3' },
    { label: 'JavaScript', value: 'javascript', slug: 'javascript' },
    { label: 'TypeScript', value: 'typescript', slug: 'typescript' },
    { label: 'Java', value: 'java', slug: 'java' },
    { label: 'C++', value: 'cpp', slug: 'cpp' },
    { label: 'C', value: 'c', slug: 'c' },
    { label: 'C#', value: 'csharp', slug: 'csharp' },
    { label: 'Go', value: 'go', slug: 'golang' },
    { label: 'Rust', value: 'rust', slug: 'rust' },
    { label: 'Ruby', value: 'ruby', slug: 'ruby' },
    { label: 'Swift', value: 'swift', slug: 'swift' },
    { label: 'Kotlin', value: 'kotlin', slug: 'kotlin' },
];

const DEFAULT_CODE = {
    python: '# Write your solution here\n',
    javascript: '// Write your solution here\n',
    typescript: '// Write your solution here\n',
    cpp: '// Write your solution here\n',
    c: '// Write your solution here\n',
    java: '// Write your solution here\n',
    csharp: '// Write your solution here\n',
    go: '// Write your solution here\n',
    rust: '// Write your solution here\n',
    ruby: '# Write your solution here\n',
    swift: '// Write your solution here\n',
    kotlin: '// Write your solution here\n',
};

export default function CodeEditor({ 
    socket,
    roomId, 
    problem, 
    language, 
    onLanguageChange, 
    editorRef: externalEditorRef,
    user,
}) {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const isRemoteChange = useRef(false);
    const lastSnippetRef = useRef(null);
    const changeDebounceTimer = useRef(null);
    const hasRoomCodeInitialized = useRef(false);

    // Keep always-fresh references to props so callbacks never suffer from stale closures
    const socketRef = useRef(socket);
    const roomIdRef = useRef(roomId);
    const languageRef = useRef(language);
    const userRef = useRef(user);

    useEffect(() => { socketRef.current = socket; }, [socket]);
    useEffect(() => { roomIdRef.current = roomId; }, [roomId]);
    useEffect(() => { languageRef.current = language; }, [language]);
    useEffect(() => { userRef.current = user; }, [user]);

    const handleEditorDidMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        monacoRef.current = monaco;

        if (externalEditorRef) {
            externalEditorRef.current = editor;
        }

        // Configure Monaco theme for modern light glassmorphic mode
        monaco.editor.defineTheme('codecollab-light', {
            base: 'vs',
            inherit: true,
            rules: [
                { token: 'comment', foreground: '9CA3AF', fontStyle: 'italic' },
                { token: 'keyword', foreground: '2563EB' },
                { token: 'string', foreground: '10B981' },
                { token: 'number', foreground: 'F59E0B' },
                { token: 'type', foreground: '6366F1' },
                { token: 'function', foreground: '2563EB' },
                { token: 'variable', foreground: 'EF4444' },
            ],
            colors: {
                'editor.background': '#00000000',
                'editor.foreground': '#18181B',
                'editor.lineHighlightBackground': '#F3F4F6',
                'editor.selectionBackground': '#2563EB33',
                'editor.inactiveSelectionBackground': '#2563EB1A',
                'editorLineNumber.foreground': '#9CA3AF',
                'editorLineNumber.activeForeground': '#4B5563',
                'editorIndentGuide.background': '#E5E7EB',
                'editorIndentGuide.activeBackground': '#9CA3AF',
                'editorCursor.foreground': '#2563EB',
                'editor.selectionHighlightBackground': '#2563EB1A',
                'editorBracketMatch.background': '#2563EB33',
                'editorBracketMatch.border': '#2563EB55',
                'scrollbar.shadow': '#00000000',
                'scrollbarSlider.background': '#00000010',
                'scrollbarSlider.hoverBackground': '#00000020',
                'scrollbarSlider.activeBackground': '#00000030',
                'editorWidget.background': '#FFFFFF',
                'editorWidget.border': '#CBD5E1',
                'editorWidget.foreground': '#0F172A',
                'editorSuggestWidget.background': '#FFFFFF',
                'editorSuggestWidget.border': '#CBD5E1',
                'editorSuggestWidget.foreground': '#0F172A',
                'editorSuggestWidget.selectedForeground': '#1E40AF',
                'editorSuggestWidget.selectedBackground': '#EFF6FF',
                'editorSuggestWidget.highlightForeground': '#2563EB',
                'editorSuggestWidget.focusHighlightForeground': '#1D4ED8',
                'editorHoverWidget.background': '#FFFFFF',
                'editorHoverWidget.border': '#CBD5E1',
                'editorHoverWidget.foreground': '#0F172A',
                'list.hoverBackground': '#F8FAFC',
                'list.activeSelectionBackground': '#EFF6FF',
                'list.activeSelectionForeground': '#1E40AF',
                'list.focusHighlightForeground': '#2563EB',
                'editorStickyScroll.background': '#FFFFFF',
                'editorStickyScrollHover.background': '#F3F4F6',
                'editorStickyScroll.shadow': '#00000010',
            },
        });
        monaco.editor.setTheme('codecollab-light');

        // Setup EOL to LF to prevent character offset mismatches across OSs
        editor.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF);

        // Listen for local text edits and emit via Socket.io
        const disposable = editor.onDidChangeModelContent(() => {
            if (isRemoteChange.current) return;

            const s = socketRef.current;
            if (!s || !s.connected) return;

            // Mark that local user has made custom edits
            hasRoomCodeInitialized.current = true;

            // Broadcast typing presence
            s.emit('code:typing', {
                roomId: roomIdRef.current,
                user: userRef.current,
            });

            const currentCode = editor.getValue();

            // Debounce code sync to maintain ultra-fast responsive typing without flooding socket
            clearTimeout(changeDebounceTimer.current);
            changeDebounceTimer.current = setTimeout(() => {
                s.emit('code:change', {
                    roomId: roomIdRef.current,
                    code: currentCode,
                    language: languageRef.current,
                    user: userRef.current,
                });
            }, 60);
        });

        return () => disposable.dispose();
    }, [externalEditorRef]);

    // Listen for remote code updates, room init, and typing awareness
    useEffect(() => {
        if (!socket) return;

        const onRoomInit = (data) => {
            if (data?.code && data.code.trim()) {
                hasRoomCodeInitialized.current = true;
                if (editorRef.current) {
                    isRemoteChange.current = true;
                    editorRef.current.setValue(data.code);
                    isRemoteChange.current = false;
                }
                const slug = data?.problem?.titleSlug || problem?.titleSlug || 'custom';
                lastSnippetRef.current = `${slug}-${data.language || language}`;
            }
            if (data?.language && data.language !== language && onLanguageChange) {
                onLanguageChange(data.language);
            }
        };

        const onCodeUpdate = (data) => {
            if (!editorRef.current || !data) return;
            if (data.updatedBy === userRef.current?.userId) return;

            const editor = editorRef.current;
            const currentVal = editor.getValue();
            if (currentVal === data.code) return;

            const pos = editor.getPosition();
            const scrollTop = editor.getScrollTop();

            hasRoomCodeInitialized.current = true;
            isRemoteChange.current = true;
            editor.setValue(data.code);
            if (pos) editor.setPosition(pos);
            editor.setScrollTop(scrollTop);
            isRemoteChange.current = false;

            if (data.language && data.language !== language && onLanguageChange) {
                onLanguageChange(data.language);
            }
        };

        socket.on('room:init', onRoomInit);
        socket.on('code:update', onCodeUpdate);

        return () => {
            socket.off('room:init', onRoomInit);
            socket.off('code:update', onCodeUpdate);
        };
    }, [socket, language, onLanguageChange, problem]);

    // Handle boilerplate snippet insertion when problem or language changes
    useEffect(() => {
        if (!editorRef.current) return;

        let newCode = null;
        const snippetKey = `${problem?.titleSlug || 'custom'}-${language}`;

        // If we've already inserted this exact problem+language snippet, do nothing
        if (lastSnippetRef.current === snippetKey) {
            return;
        }

        if (problem?.codeSnippets) {
            const lang = LANGUAGES.find((l) => l.value === language);
            const snippet = problem.codeSnippets.find(
                (s) => s.langSlug === lang?.slug || s.lang.toLowerCase().includes(language)
            );
            if (snippet) {
                newCode = snippet.code.replace(/\r\n/g, '\n').trimEnd() + '\n';
            }
        }

        // Fallback to default code if no problem snippet exists
        if (newCode === null) {
            newCode = DEFAULT_CODE[language] || '';
        }

        // Always update code on language/problem change unless it matches current
        const currentVal = editorRef.current.getValue().trim();
        const newCodeTrimmed = newCode.trim();

        if (currentVal !== newCodeTrimmed) {
            lastSnippetRef.current = snippetKey;
            
            isRemoteChange.current = true;
            editorRef.current.setValue(newCode);
            isRemoteChange.current = false;
            
            // Broadcast the new boilerplate so peers also see the change
            hasRoomCodeInitialized.current = true;
            const s = socketRef.current;
            if (s && s.connected) {
                s.emit('code:change', {
                    roomId: roomIdRef.current,
                    code: newCode,
                    language: languageRef.current,
                    user: userRef.current,
                });
            }
        } else {
            // Even if the code is identical, update the ref so we don't keep trying
            lastSnippetRef.current = snippetKey;
        }
    }, [problem, language]);

    return (
        <div className="flex-1 w-full relative h-full">
            <Editor
                height="100%"
                language={language}
                theme="codecollab-light"
                onMount={handleEditorDidMount}
                options={{
                    fontSize: 14,
                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                    fontLigatures: true,
                    minimap: { enabled: false },
                    scrollBeyondLastLine: false,
                    padding: { top: 16, bottom: 16 },
                    cursorBlinking: 'smooth',
                    cursorSmoothCaretAnimation: 'on',
                    smoothScrolling: true,
                    renderLineHighlight: 'all',
                    renderWhitespace: 'selection',
                    bracketPairColorization: { enabled: true },
                    guides: {
                        bracketPairs: true,
                        indentation: true,
                    },
                    suggest: {
                        showIcons: true,
                        showStatusBar: true,
                    },
                    wordWrap: 'off',
                    tabSize: 4,
                    automaticLayout: true,
                    lineNumbers: 'on',
                    glyphMargin: false,
                    folding: true,
                    links: true,
                    contextmenu: true,
                    quickSuggestions: true,
                    parameterHints: { enabled: true },
                    formatOnPaste: false,
                    formatOnType: false,
                    autoClosingBrackets: 'languageDefined',
                    autoClosingQuotes: 'languageDefined',
                    trimAutoWhitespace: true,
                    stickyScroll: { enabled: false },
                }}
                loading={
                    <div className="flex items-center justify-center h-full w-full">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                }
            />
        </div>
    );
}

export { LANGUAGES };
