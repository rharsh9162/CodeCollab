import { useRef, useEffect, useCallback } from 'react';
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

export default function CodeEditor({ 
    socket,
    roomId, 
    problem, 
    language, 
    onLanguageChange, 
    editorRef: externalEditorRef,
    userId,
}) {
    const editorRef = useRef(null);
    const monacoRef = useRef(null);
    const isRemoteChange = useRef(false);
    const lastSnippetRef = useRef(null);
    const changeDebounceTimer = useRef(null);

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
                'editorWidget.border': '#E5E7EB',
                'editorSuggestWidget.background': '#FFFFFF',
                'editorSuggestWidget.border': '#E5E7EB',
                'editorSuggestWidget.selectedBackground': '#F3F4F6',
            },
        });
        monaco.editor.setTheme('codecollab-light');

        // Setup EOL to LF to prevent character offset mismatches
        editor.getModel()?.setEOL(monaco.editor.EndOfLineSequence.LF);

        // Listen for local text edits and emit via Socket.io
        const disposable = editor.onDidChangeModelContent(() => {
            if (isRemoteChange.current || !socket?.connected) return;

            const currentCode = editor.getValue();

            // Slightly debounce emit to optimize network throughput (50ms)
            clearTimeout(changeDebounceTimer.current);
            changeDebounceTimer.current = setTimeout(() => {
                socket.emit('code:change', {
                    roomId,
                    code: currentCode,
                    language,
                });
            }, 50);
        });

        return () => disposable.dispose();
    }, [socket, roomId, language, externalEditorRef]);

    // Listen for remote code updates and room init
    useEffect(() => {
        if (!socket) return;

        const onRoomInit = (data) => {
            if (editorRef.current && data?.code && data.code.trim()) {
                isRemoteChange.current = true;
                editorRef.current.setValue(data.code);
                isRemoteChange.current = false;
            }
            if (data?.language && data.language !== language && onLanguageChange) {
                onLanguageChange(data.language);
            }
        };

        const onCodeUpdate = (data) => {
            if (!editorRef.current || !data) return;
            if (data.updatedBy === userId) return;

            const editor = editorRef.current;
            const currentVal = editor.getValue();
            if (currentVal === data.code) return;

            const pos = editor.getPosition();
            const scrollTop = editor.getScrollTop();

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
    }, [socket, userId, language, onLanguageChange]);

    // Handle initial boilerplate snippet insertion when problem or language changes
    useEffect(() => {
        if (problem?.codeSnippets && editorRef.current) {
            const lang = LANGUAGES.find((l) => l.value === language);
            const snippet = problem.codeSnippets.find(
                (s) => s.langSlug === lang?.slug || s.lang.toLowerCase().includes(language)
            );

            if (snippet) {
                const snippetKey = `${problem.titleSlug || 'custom'}-${language}`;
                if (lastSnippetRef.current !== snippetKey) {
                    lastSnippetRef.current = snippetKey;
                    const cleanCode = snippet.code.replace(/\r\n/g, '\n').trimEnd() + '\n';
                    
                    isRemoteChange.current = true;
                    editorRef.current.setValue(cleanCode);
                    isRemoteChange.current = false;

                    // Broadcast new snippet to room
                    if (socket?.connected) {
                        socket.emit('code:change', {
                            roomId,
                            code: cleanCode,
                            language,
                        });
                    }
                }
            }
        }
    }, [problem, language, socket, roomId]);

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
