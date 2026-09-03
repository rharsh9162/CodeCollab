import { useRef, useEffect, useState, useCallback } from 'react';
import Editor from '@monaco-editor/react';
import * as Y from 'yjs';
import { MonacoBinding } from 'y-monaco';
import { WebsocketProvider } from 'y-websocket';

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

const USER_COLORS = [
    '#6c63ff', '#a855f7', '#ec4899', '#f43f5e',
    '#f97316', '#eab308', '#22c55e', '#06b6d4',
    '#3b82f6', '#8b5cf6', '#d946ef', '#14b8a6',
];

function getRandomColor() {
    return USER_COLORS[Math.floor(Math.random() * USER_COLORS.length)];
}

function getRandomName() {
    const adjectives = ['Swift', 'Clever', 'Bold', 'Calm', 'Sharp', 'Bright'];
    const nouns = ['Coder', 'Dev', 'Hacker', 'Builder', 'Architect', 'Wizard'];
    return `${adjectives[Math.floor(Math.random() * adjectives.length)]}${nouns[Math.floor(Math.random() * nouns.length)]}`;
}

export default function CodeEditor({ roomId, problem, language, onLanguageChange, editorRef: externalEditorRef }) {
    const editorRef = useRef(null);
    const providerRef = useRef(null);
    const bindingRef = useRef(null);
    const ydocRef = useRef(null);
    const [connected, setConnected] = useState(false);
    const userInfo = useRef({ name: getRandomName(), color: getRandomColor() });

    const handleEditorDidMount = useCallback((editor, monaco) => {
        editorRef.current = editor;
        // Expose editor to parent via external ref
        if (externalEditorRef) {
            externalEditorRef.current = editor;
        }

        // Configure Monaco theme for light SaaS mode
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

        // Setup EOL to LF to prevent Windows \r\n offset mismatches
        editor.getModel().setEOL(monaco.editor.EndOfLineSequence.LF);

        // Setup Yjs collaboration
        setupCollaboration(editor, monaco);
    }, [roomId]);

    const setupCollaboration = (editor, monaco) => {
        // Clean up existing connections
        if (bindingRef.current) bindingRef.current.destroy();
        if (providerRef.current) providerRef.current.destroy();
        if (ydocRef.current) ydocRef.current.destroy();

        const ydoc = new Y.Doc();
        ydocRef.current = ydoc;

        const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
        const defaultWs = isLocal ? `ws://${window.location.hostname}:3001` : 'wss://codecollab-backend-a4w0.onrender.com';
        const wsUrl = import.meta.env.VITE_WS_URL || defaultWs;
        const provider = new WebsocketProvider(wsUrl, `codecollab-${roomId}`, ydoc);
        providerRef.current = provider;

        provider.on('status', ({ status }) => {
            setConnected(status === 'connected');
        });

        // Set awareness (user presence)
        provider.awareness.setLocalStateField('user', {
            name: userInfo.current.name,
            color: userInfo.current.color,
        });

        const ytext = ydoc.getText('monaco');

        const binding = new MonacoBinding(
            ytext,
            editor.getModel(),
            new Set([editor]),
            provider.awareness
        );
        bindingRef.current = binding;
    };

    // Set initial code from problem snippets when problem or language changes
    const lastSnippetRef = useRef(null);

    useEffect(() => {
        if (problem && problem.codeSnippets && editorRef.current && ydocRef.current) {
            const lang = LANGUAGES.find((l) => l.value === language);
            const snippet = problem.codeSnippets.find(
                (s) => s.langSlug === lang?.slug || s.lang.toLowerCase().includes(language)
            );
            if (snippet) {
                // Build a key to track if we already inserted this exact snippet
                const snippetKey = `${problem.titleSlug || 'custom'}-${language}`;
                if (lastSnippetRef.current !== snippetKey) {
                    lastSnippetRef.current = snippetKey;
                    const ytext = ydocRef.current.getText('monaco');
                    const cleanCode = snippet.code.replace(/\r\n/g, '\n').trimEnd() + '\n';
                    
                    // Atomically clear and reset without trigger cascade
                    ydocRef.current.transact(() => {
                        const currentLen = ytext.length;
                        if (currentLen > 0) {
                            ytext.delete(0, currentLen);
                        }
                        ytext.insert(0, cleanCode);
                    });
                }
            }
        }
    }, [problem, language]);

    useEffect(() => {
        return () => {
            if (bindingRef.current) bindingRef.current.destroy();
            if (providerRef.current) providerRef.current.destroy();
            if (ydocRef.current) ydocRef.current.destroy();
        };
    }, []);

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
