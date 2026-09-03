import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { Code2, PenTool, Play, Send, BookOpen, Loader2, PhoneCall, MessageSquare } from 'lucide-react';
import { useAuth } from './contexts/AuthContext';
import AuthPage from './components/AuthPage';
import LandingPage from './components/LandingPage';
import Toolbar from './components/Toolbar';
import ProblemPanel from './components/ProblemPanel';
import CodeEditor from './components/CodeEditor';
import Whiteboard from './components/Whiteboard';
import TestCases from './components/TestCases';
import ChatSidebar from './components/ChatSidebar';
import {
  extractMethodInfo,
  isLeetCodeFormat,
  parseTestCases,
  wrapWithDriver,
} from './utils/codeDriver';
import { Toaster, toast } from "sonner";
import { getSocket } from './services/socket';
import { getProblemDetail, searchLeetCodeProblems, runCodeExecution } from './services/api';

function generateRoomId() {
  return crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
}

function getRoomFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('room');
}

function getProblemFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('problem');
}

// Generate a stable color from user ID
const USER_COLORS = ['#6366f1', '#f43f5e', '#14b8a6', '#f59e0b', '#3b82f6', '#8b5cf6', '#06b6d4', '#ec4899', '#eab308', '#0ea5e9'];
function colorFromUid(uid) {
  let hash = 0;
  for (let i = 0; i < uid.length; i++) hash = uid.charCodeAt(i) + ((hash << 5) - hash);
  return USER_COLORS[Math.abs(hash) % USER_COLORS.length];
}

// Custom hook for resizable panel
function useResizer(initialWidth = 35) {
  const [panelWidth, setPanelWidth] = useState(initialWidth);
  const isDragging = useRef(false);

  const startDrag = useCallback((e) => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const onDrag = useCallback((e) => {
    if (!isDragging.current) return;
    const containerWidth = window.innerWidth;
    const newWidth = (e.clientX / containerWidth) * 100;
    if (newWidth > 20 && newWidth < 80) {
      setPanelWidth(newWidth);
    }
  }, []);

  const stopDrag = useCallback(() => {
    isDragging.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', onDrag);
    window.addEventListener('mouseup', stopDrag);
    return () => {
      window.removeEventListener('mousemove', onDrag);
      window.removeEventListener('mouseup', stopDrag);
    };
  }, [onDrag, stopDrag]);

  return { panelWidth, startDrag };
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth();
  const [showAuth, setShowAuth] = useState(false);
  const [viewLanding, setViewLanding] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('view') === 'landing' || window.location.pathname === '/landing';
  });

  // Show loading while checking auth state
  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-screen w-full bg-background">
        <Loader2 size={32} className="animate-spin text-primary" />
      </div>
    );
  }

  // If viewLanding is active, show the landing page
  if (viewLanding) {
    return (
      <LandingPage 
        onGetStarted={() => {
          setViewLanding(false);
          if (!user) setShowAuth(true);
        }} 
      />
    );
  }

  // Show landing page or auth page if not logged in
  if (!user) {
    if (showAuth) {
      return <AuthPage onBack={() => setShowAuth(false)} />;
    }
    return <LandingPage onGetStarted={() => setShowAuth(true)} />;
  }

  const handleSignOut = async () => {
    setShowAuth(false);
    await signOut();
  };

  return <MainApp user={user} signOut={handleSignOut} onShowLanding={() => setViewLanding(true)} />;
}

function MainApp({ user, signOut, onShowLanding }) {
  const [roomId, setRoomId] = useState(() => getRoomFromUrl() || generateRoomId());
  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState('python');
  const [activeRightTab, setActiveRightTab] = useState('editor');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [executionResults, setExecutionResults] = useState([]);
  const [isRunning, setIsRunning] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarTab, setSidebarTab] = useState('chat');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [globalActivity, setGlobalActivity] = useState(null);
  const [socket, setSocket] = useState(null);
  const editorRef = useRef(null);
  const problemLoadedRef = useRef(false);
  const activityTimer = useRef(null);
  const sidebarOpenRef = useRef(sidebarOpen);

  useEffect(() => {
    sidebarOpenRef.current = sidebarOpen;
  }, [sidebarOpen]);

  const { panelWidth, startDrag } = useResizer(35);

  // Real user identity from Clerk auth
  const userIdentity = useMemo(() => ({
    userId: user?.uid || 'user-' + Math.random().toString(36).slice(2, 6),
    userName: user?.displayName || user?.email?.split('@')[0] || 'User',
    userColor: user?.userColor || (user?.uid ? colorFromUid(user.uid) : '#2563EB'),
    email: user?.email || '',
    photoURL: user?.photoURL || null,
  }), [user]);

  // Update URL with room ID and problem
  useEffect(() => {
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    if (problem?.titleSlug) {
      url.searchParams.set('problem', problem.titleSlug);
    }
    window.history.replaceState({}, '', url);
  }, [roomId, problem]);

  const addToast = useCallback((message, type = 'info') => {
    if (type === 'error') {
      toast.error(message);
    } else if (type === 'success') {
      toast.success(message);
    } else {
      toast(message);
    }
  }, []);

  const handleJoinRoom = useCallback((newRoomId) => {
    if (!newRoomId || newRoomId === roomId) return;
    setRoomId(newRoomId);
    setProblem(null);
    setExecutionResults([]);
    addToast(`Switched to room: ${newRoomId}`, 'success');
  }, [roomId, addToast]);

  // Connect & join room via Socket.io
  useEffect(() => {
    const s = getSocket();
    setSocket(s);

    const onConnect = () => {
      s.emit('room:join', { roomId, user: userIdentity });
    };

    const onProblemUpdate = (data) => {
      const p = data?.problem || data;
      if (p) {
        setProblem(p);
      }
    };

    const onRoomInit = (data) => {
      if (data?.problem) {
        setProblem(data.problem);
      }
      if (data?.language) {
        setLanguage(data.language);
      }
    };

    // Global Presence: Code Typing
    const onCodeTyping = ({ user: activeUser }) => {
      if (!activeUser || activeUser.userId === userIdentity.userId) return;
      setGlobalActivity({
        type: 'typing',
        user: activeUser,
        text: `${activeUser.userName} is typing code...`,
      });
      clearTimeout(activityTimer.current);
      activityTimer.current = setTimeout(() => setGlobalActivity(null), 2500);
    };

    // Global Presence: Code Updated
    const onCodeUpdate = (data) => {
      if (!data?.user || data.user.userId === userIdentity.userId) return;
      setGlobalActivity({
        type: 'typing',
        user: data.user,
        text: `${data.user.userName} edited code`,
      });
      clearTimeout(activityTimer.current);
      activityTimer.current = setTimeout(() => setGlobalActivity(null), 2500);
    };

    // Global Presence: Whiteboard Drawing
    const onWhiteboardUpdate = (data) => {
      if (!data?.user || data.user.userId === userIdentity.userId) return;
      setGlobalActivity({
        type: 'drawing',
        user: data.user,
        text: `${data.user.userName} is drawing on whiteboard...`,
      });
      clearTimeout(activityTimer.current);
      activityTimer.current = setTimeout(() => setGlobalActivity(null), 2500);
    };

    // Global Presence: Voice Call
    const onVoiceIncoming = ({ user: caller }) => {
      setGlobalActivity({
        type: 'voice',
        user: caller,
        text: `${caller?.userName || 'A collaborator'} started a voice call`,
      });
      clearTimeout(activityTimer.current);
      activityTimer.current = setTimeout(() => setGlobalActivity(null), 4500);

      toast(`📞 ${caller?.userName || 'A peer'} started a voice call in this room!`, {
        action: {
          label: 'Join Call',
          onClick: () => {
            setSidebarTab('voice');
            setSidebarOpen(true);
          },
        },
        duration: 8000,
      });
    };

    // Global Presence: Chat Message
    const onChatMessage = (msg) => {
      if (msg.userId !== userIdentity.userId) {
        setGlobalActivity({
          type: 'chat',
          user: { userName: msg.userName, userColor: msg.userColor },
          text: `${msg.userName}: ${msg.text.slice(0, 30)}${msg.text.length > 30 ? '...' : ''}`,
        });
        clearTimeout(activityTimer.current);
        activityTimer.current = setTimeout(() => setGlobalActivity(null), 3500);

        if (!sidebarOpenRef.current) {
          setUnreadMessages((prev) => prev + 1);
          toast(`💬 ${msg.userName}: ${msg.text.slice(0, 35)}${msg.text.length > 35 ? '...' : ''}`, {
            action: {
              label: 'Open',
              onClick: () => {
                setSidebarTab('chat');
                setSidebarOpen(true);
                setUnreadMessages(0);
              },
            },
            duration: 4000,
          });
        }
      }
    };

    s.on('connect', onConnect);
    s.on('problem:update', onProblemUpdate);
    s.on('room:init', onRoomInit);
    s.on('code:typing', onCodeTyping);
    s.on('code:update', onCodeUpdate);
    s.on('whiteboard:update', onWhiteboardUpdate);
    s.on('voice:incoming', onVoiceIncoming);
    s.on('chat:message', onChatMessage);

    if (s.connected) {
      onConnect();
    }

    return () => {
      s.off('connect', onConnect);
      s.off('problem:update', onProblemUpdate);
      s.off('room:init', onRoomInit);
      s.off('code:typing', onCodeTyping);
      s.off('code:update', onCodeUpdate);
      s.off('whiteboard:update', onWhiteboardUpdate);
      s.off('voice:incoming', onVoiceIncoming);
      s.off('chat:message', onChatMessage);
    };
  }, [roomId, userIdentity]);

  const handleImport = useCallback(async (slug) => {
    setLoading(true);
    try {
      const data = await getProblemDetail(slug);
      setProblem(data);
      addToast(`Loaded: ${data.title}`, 'success');

      // Synchronize problem with all collaborators in room
      const s = getSocket();
      if (s?.connected) {
        s.emit('problem:sync', { roomId, problem: data });
      }
    } catch (err) {
      addToast(err.message || 'Failed to fetch problem from LeetCode', 'error');
    } finally {
      setLoading(false);
    }
  }, [addToast, roomId]);

  // Auto-load problem from URL on mount
  useEffect(() => {
    const slug = getProblemFromUrl();
    if (slug && !problemLoadedRef.current) {
      problemLoadedRef.current = true;
      handleImport(slug);
    }
  }, [handleImport]);

  const handleSearch = useCallback(async (query) => {
    setSearchLoading(true);
    try {
      const questions = await searchLeetCodeProblems(query);
      setSearchResults(questions || []);
    } catch (err) {
      setSearchResults([]);
      addToast(err.message || 'Failed to search problems', 'error');
    } finally {
      setSearchLoading(false);
    }
  }, [addToast]);

  const getEditorCode = useCallback(() => {
    if (editorRef.current) {
      return editorRef.current.getValue();
    }
    return '';
  }, []);

  const executeCodeApi = async (code, lang, stdin = '') => {
    return runCodeExecution(code, lang, stdin);
  };

  const executeForTestCase = async (code, lang, stdin) => {
    return runCodeExecution(code, lang, stdin);
  };

  const getCurrentSnippet = useCallback(() => {
    if (!problem?.codeSnippets) return null;
    const LANG_SLUGS = {
      python: 'python3', javascript: 'javascript', typescript: 'typescript',
      java: 'java', cpp: 'cpp', c: 'c', csharp: 'csharp', go: 'golang',
      rust: 'rust', ruby: 'ruby', swift: 'swift', kotlin: 'kotlin',
    };
    const slug = LANG_SLUGS[language];
    return problem.codeSnippets.find(
      (s) => s.langSlug === slug || s.lang.toLowerCase().includes(language)
    )?.code || null;
  }, [problem, language]);

  const handleRunCode = useCallback(async () => {
    const code = getEditorCode();
    if (!code.trim()) { addToast('No code to execute!', 'error'); return; }

    setIsRunning(true);
    setExecutionResults([]);

    try {
      const snippet = getCurrentSnippet();
      const methodInfo = snippet ? extractMethodInfo(snippet, language) : null;
      const leetCodeFormat = isLeetCodeFormat(code, language);
      const paramCount = methodInfo?.paramCount || 1;

      let testCases = problem?.exampleTestcases
        ? parseTestCases(problem.exampleTestcases, paramCount)
        : [{ inputs: [''], label: 'Case 1' }];
      if (testCases.length === 0) testCases = [{ inputs: [''], label: 'Case 1' }];

      let executableCode = code;
      if (leetCodeFormat && methodInfo?.methodName) {
        executableCode = wrapWithDriver(code, language, methodInfo.methodName, paramCount);
      }

      const results = [];
      for (const tc of testCases) {
        const stdin = tc.inputs.join('\n');
        try {
          const data = await executeForTestCase(executableCode, language, stdin);
          if (data.error) {
            results.push({ label: tc.label, inputs: tc.inputs, type: 'error', output: data.error });
          } else {
            const hasError = data.stderr && data.code !== 0;
            results.push({
              label: tc.label, inputs: tc.inputs,
              type: hasError ? 'error' : 'success',
              output: data.output?.trim() || '(no output)',
              stderr: data.stderr || '', exitCode: data.code,
              language: data.language, version: data.version,
            });
          }
        } catch {
          results.push({ label: tc.label, inputs: tc.inputs, type: 'error', output: 'Network error.' });
        }
        setExecutionResults([...results]);
      }

      const allSuccess = results.every((r) => r.type === 'success');
      addToast(allSuccess ? `All ${results.length} test case(s) passed!` : 'Some test cases failed', allSuccess ? 'success' : 'error');
    } catch {
      setExecutionResults([{ label: 'Error', inputs: [], type: 'error', output: 'Execution failed.' }]);
      addToast('Execution failed!', 'error');
    } finally {
      setIsRunning(false);
    }
  }, [getEditorCode, language, problem, addToast, getCurrentSnippet]);

  const openCollabTab = useCallback(() => {
    let url = `${window.location.origin}?room=${roomId}`;
    if (problem?.titleSlug) url += `&problem=${problem.titleSlug}`;
    window.open(url, '_blank');
    addToast('Opened a new collaboration tab!', 'success');
  }, [roomId, problem, addToast]);

  return (
    <div className="flex flex-col h-screen bg-transparent text-text-main overflow-hidden selection:bg-primary/20 selection:text-primary-hover relative">
      {/* Animated Glass Background */}
      <div className="glass-body-bg">
        <div className="glass-blob-1" />
        <div className="glass-blob-2" />
      </div>

      <Toolbar
        roomId={roomId}
        problem={problem}
        language={language}
        onLanguageChange={setLanguage}
        onSearch={handleSearch}
        onImport={handleImport}
        searchResults={searchResults}
        searchLoading={searchLoading}
        onOpenCollabTab={openCollabTab}
        user={userIdentity}
        onSignOut={signOut}
        onShowLanding={onShowLanding}
        onJoinRoom={handleJoinRoom}
      />

      {/* Global Live Activity Pill */}
      {globalActivity && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2.5 px-4 py-2 rounded-full bg-white/95 border border-white/70 shadow-2xl backdrop-blur-xl animate-slide-up pointer-events-none transition-all">
          {globalActivity.type === 'typing' && (
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: globalActivity.user?.userColor || '#2563EB' }} />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5" style={{ backgroundColor: globalActivity.user?.userColor || '#2563EB' }} />
            </span>
          )}
          {globalActivity.type === 'drawing' && (
            <PenTool size={14} className="text-secondary animate-bounce" />
          )}
          {globalActivity.type === 'voice' && (
            <PhoneCall size={14} className="text-secondary animate-pulse" />
          )}
          {globalActivity.type === 'chat' && (
            <MessageSquare size={14} className="text-primary animate-pulse" />
          )}
          <span className="text-xs font-extrabold tracking-wide" style={{ color: globalActivity.user?.userColor || '#2563EB' }}>
            {globalActivity.text}
          </span>
        </div>
      )}

      <div className="flex flex-1 min-h-0 min-w-0 overflow-hidden relative p-4 gap-2">
        {/* Left Panel: Problem Description */}
        <div style={{ width: `${panelWidth}%` }} className="flex flex-col h-full min-h-0 min-w-0 glass-panel shrink-0 z-0">
          <div className="glass-header rounded-t-2xl">
            <div className="flex items-center gap-2 text-sm font-semibold text-text-main">
              <BookOpen size={16} className="text-primary" /> 
              <span>Problem Description</span>
            </div>
          </div>
          <ProblemPanel problem={problem} loading={loading} />
        </div>

        {/* Resizer */}
        <div 
          className="resizer"
          onMouseDown={startDrag}
        />

        {/* Right Panel: Code Editor / Whiteboard */}
        <div className="flex flex-1 flex-col h-full min-h-0 min-w-0 shrink-0 z-0 glass-panel">
          <div className="glass-header rounded-t-2xl justify-between pr-2">
            <div className="flex h-full gap-5 px-2">
              <button 
                className={`flex h-full items-center gap-2 border-b-[3px] text-sm font-bold transition-colors pt-[3px] ${activeRightTab === 'editor' ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text-main'}`}
                onClick={() => setActiveRightTab('editor')}
              >
                <Code2 size={16} /> Code Editor
                <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-primary">Live</span>
              </button>
              <button 
                className={`flex h-full items-center gap-2 border-b-[3px] text-sm font-bold transition-colors pt-[3px] ${activeRightTab === 'whiteboard' ? 'border-secondary text-secondary' : 'border-transparent text-text-muted hover:text-text-main'}`}
                onClick={() => setActiveRightTab('whiteboard')}
              >
                <PenTool size={16} /> Whiteboard
                <span className="rounded-full bg-secondary/10 border border-secondary/20 px-2 py-0.5 text-[10px] uppercase tracking-wider text-secondary">Sync</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {activeRightTab === 'editor' && (
                <>
                  <button className="btn-secondary text-xs h-8 px-3 gap-2 border-white/60" onClick={handleRunCode} disabled={isRunning}>
                    {isRunning ? <Loader2 size={14} className="animate-spin text-primary" /> : <Play size={14} className="text-primary" />}
                    {isRunning ? 'Running...' : 'Run'}
                  </button>
                  <button className="btn-primary text-xs h-8 px-3 gap-2" onClick={handleRunCode} disabled={isRunning}>
                    <Send size={14} /> Submit
                  </button>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col overflow-hidden relative bg-white/20">
            <div className={`absolute inset-0 flex flex-col ${activeRightTab === 'editor' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
              <div className="flex-1 bg-white/50 backdrop-blur-md">
                <CodeEditor 
                  socket={socket} 
                  roomId={roomId} 
                  problem={problem} 
                  language={language} 
                  onLanguageChange={setLanguage} 
                  editorRef={editorRef} 
                  user={userIdentity}
                />
              </div>
              <div className="h-[35%] min-h-[250px] border-t border-white/50 bg-white/60 backdrop-blur-md flex flex-col shrink-0">
                  <TestCases problem={problem} executionResults={executionResults} isRunning={isRunning} language={language} />
              </div>
            </div>
            
            <div className={`absolute inset-0 bg-white/50 backdrop-blur-md ${activeRightTab === 'whiteboard' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                <Whiteboard roomId={roomId} socket={socket} user={userIdentity} />
            </div>
          </div>
        </div>

        <ChatSidebar
          socket={socket}
          roomId={roomId}
          isOpen={sidebarOpen}
          initialTab={sidebarTab}
          unreadCount={unreadMessages}
          onToggle={() => {
            setSidebarOpen(!sidebarOpen);
            if (!sidebarOpen) setUnreadMessages(0);
          }}
          userId={userIdentity.userId}
          userName={userIdentity.userName}
          userColor={userIdentity.userColor}
        />
      </div>
      
      <Toaster position="bottom-right" theme="light" toastOptions={{
          style: { background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.6)', color: '#0F172A', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' },
      }} />
    </div>
  );
}
