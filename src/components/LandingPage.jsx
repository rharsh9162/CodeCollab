import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
    Users, Code2, ArrowRight, Terminal, Zap, 
    Layers, Globe, Shield, Activity, Check, Copy, Play, Sparkles, 
    Cpu, Mic, PenTool, ChevronDown, ExternalLink, GitBranch,
    TerminalSquare, CheckCircle2, Server, Laptop
} from 'lucide-react';

export default function LandingPage({ onGetStarted }) {
    const [copied, setCopied] = useState(false);
    const [activeLang, setActiveLang] = useState('python');
    const [activeFaq, setActiveFaq] = useState(null);

    const handleCopyCommand = () => {
        navigator.clipboard.writeText('npx create-codecollab');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const techPills = [
        { icon: Zap, name: "Socket.io", desc: "Sub-20ms WebSocket & Polling" },
        { icon: Cpu, name: "Judge0 CE", desc: "Python 3.12, Node 18, C++ GCC" },
        { icon: Code2, name: "Monaco Editor", desc: "VS Code Core Engine" },
        { icon: Globe, name: "WebRTC Audio", desc: "P2P Voice with OpenRelay TURN" },
        { icon: Shield, name: "Clerk Auth", desc: "Unified OAuth & Session Identity" },
        { icon: Activity, name: "Live Presence", desc: "Global Typing & Drawing Banners" },
        { icon: GitBranch, name: "LeetCode API", desc: "Official GraphQL Test Driver" },
        { icon: PenTool, name: "Excalidraw", desc: "Vector Architecture Whiteboard" },
    ];

    const codeSnippets = {
        python: `# Two City Scheduling - Python 3.12 (PEP 585 Generics)
class Solution:
    def twoCitySchedCost(self, costs: list[list[int]]) -> int:
        costs.sort(key=lambda x: x[0] - x[1])
        total_cost = 0
        n = len(costs) // 2
        for i in range(n):
            total_cost += costs[i][0] + costs[i + n][1]
        return total_cost

# Executed in Judge0 sandboxed runtime
# Status: 3/3 Test cases passed (18ms)`,
        typescript: `// Real-Time Socket.io Room Orchestration
socket.on('code:change', ({ roomId, code, language, user }) => {
  socket.to(roomId).emit('code:update', {
    code,
    language,
    updatedBy: user.userId,
    user,
  });
}); // Sub-15ms WebSocket propagation`,
        cpp: `// C++ Solution with GCC 9.2
#include <vector>
#include <algorithm>
using namespace std;

class Solution {
public:
    int twoCitySchedCost(vector<vector<int>>& costs) {
        sort(costs.begin(), costs.end(), [](const auto& a, const auto& b) {
            return (a[0] - a[1]) < (b[0] - b[1]);
        });
        int total = 0, n = costs.size() / 2;
        for (int i = 0; i < n; ++i) total += costs[i][0] + costs[i + n][1];
        return total;
    }
};`
    };

    const faqs = [
        {
            q: "How does the real-time collaboration work across devices?",
            a: "CodeCollab uses a high-performance Socket.io architecture with automatic HTTP long-polling fallback. Code changes, cursor positions, whiteboard vectors, and chat messages synchronize instantly between laptops, tablets, and phones without connection drops."
        },
        {
            q: "How is code execution handled securely?",
            a: "All code submissions are dispatched to isolated Judge0 Community Edition sandboxes running modern runtimes: Python 3.12 (with PEP 585 generic type support), Node.js 18, TypeScript 5, C++ (GCC), and Java 17, complete with memory limits and execution timeouts."
        },
        {
            q: "How do distinct user accounts work in shared rooms?",
            a: "Powered by Clerk authentication, developers can sign in from their own device with Google, GitHub, or email. Joining a room with a Room ID retains each developer's distinct identity, avatar, and color-coded presence."
        },
        {
            q: "How does the LeetCode problem integration work?",
            a: "Search or enter any LeetCode problem slug (e.g. two-sum). CodeCollab automatically fetches the official problem description, starter code snippets, and example test cases via GraphQL, wrapping them with our automated test runner driver."
        }
    ];

    return (
        <div className="h-screen w-full flex flex-col relative overflow-x-hidden overflow-y-auto custom-scrollbar bg-slate-50 text-slate-900 selection:bg-blue-600 selection:text-white font-sans">
            {/* Clean architectural ambient lighting */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute -top-[25%] left-1/2 -translate-x-1/2 w-[900px] h-[550px] bg-blue-600/[0.04] blur-[140px] rounded-full pointer-events-none" />
                <div 
                    className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                    style={{ 
                        backgroundImage: 'radial-gradient(#0F172A 1.2px, transparent 1.2px)', 
                        backgroundSize: '32px 32px' 
                    }} 
                />
            </div>

            {/* Floating Island Glass Header */}
            <header className="sticky top-0 z-50 w-full pt-4 px-4 sm:px-6 pointer-events-none">
                <motion.nav 
                    initial={{ y: -15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    className="pointer-events-auto max-w-5xl mx-auto rounded-full bg-white/90 backdrop-blur-xl border border-slate-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.03)] px-5 py-2.5 flex items-center justify-between"
                >
                    <div className="flex items-center gap-3 select-none cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                        <div className="h-8 w-8 rounded-xl bg-white border border-slate-200 shadow-sm p-0.5 overflow-hidden flex items-center justify-center">
                            <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover mix-blend-multiply" />
                        </div>
                        <span className="text-sm sm:text-base font-bold tracking-tight text-slate-900 flex items-center gap-2">
                            CodeCollab
                            <span className="text-[10px] uppercase font-mono font-semibold tracking-wider px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">v2.0</span>
                        </span>
                    </div>

                    <div className="hidden md:flex items-center gap-7 text-xs sm:text-sm font-medium text-slate-600">
                        <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
                        <a href="#preview" className="hover:text-slate-900 transition-colors">Live Canvas</a>
                        <a href="#architecture" className="hover:text-slate-900 transition-colors">Architecture</a>
                        <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
                    </div>

                    <div className="flex items-center gap-3">
                        <button 
                            onClick={onGetStarted}
                            className="text-xs sm:text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors px-3 py-1.5 hidden sm:block"
                        >
                            Sign In
                        </button>
                        <button 
                            onClick={onGetStarted}
                            className="group inline-flex items-center gap-2 rounded-full bg-blue-600 hover:bg-blue-700 text-white pl-4 pr-2 py-1.5 text-xs sm:text-sm font-semibold shadow-sm transition-all active:scale-[0.98]"
                        >
                            <span>Open Room</span>
                            <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                <ArrowRight size={11} strokeWidth={2.5} className="text-white" />
                            </span>
                        </button>
                    </div>
                </motion.nav>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col items-center justify-start z-10 w-full pt-14 sm:pt-20 pb-24">
                {/* Hero Section */}
                <section className="max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
                    {/* Status Badge */}
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4 }}
                        className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-slate-200/90 shadow-sm text-xs font-semibold text-slate-800 mb-6 hover:border-slate-300 transition-colors cursor-default"
                    >
                        <span className="flex h-2 w-2 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span>Multiplayer Coding Engine</span>
                        <span className="text-slate-300">|</span>
                        <span className="text-blue-600 font-semibold">WebRTC + Yjs</span>
                    </motion.div>

                    {/* Headline - Solid Typography */}
                    <motion.h1 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        className="text-4xl sm:text-6xl md:text-7xl lg:text-[72px] font-extrabold tracking-tight text-slate-950 leading-[1.08] max-w-4xl"
                    >
                        Collaborate in code. <br />
                        <span className="text-blue-600">
                            At the speed of thought.
                        </span>
                    </motion.h1>

                    {/* Subtitle */}
                    <motion.p 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="text-base sm:text-lg md:text-xl font-normal text-slate-600 max-w-2xl mt-6 leading-relaxed"
                    >
                        A multiplayer coding workspace with containerized sandboxes, synchronized architectural canvas, and integrated voice channels.
                    </motion.p>

                    {/* Action Cluster */}
                    <motion.div 
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                        className="flex flex-col sm:flex-row items-center justify-center gap-3.5 mt-8 w-full sm:w-auto"
                    >
                        <button 
                            onClick={onGetStarted}
                            className="group inline-flex items-center justify-center gap-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-7 py-3.5 text-sm sm:text-base font-semibold shadow-[0_4px_16px_rgba(37,99,235,0.3)] transition-all hover:scale-[1.01] active:scale-[0.98] w-full sm:w-auto"
                        >
                            <span>Start Instant Room</span>
                            <span className="h-5 w-5 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                <ArrowRight size={13} strokeWidth={2.5} className="text-white" />
                            </span>
                        </button>

                        <button 
                            onClick={handleCopyCommand}
                            className="inline-flex items-center justify-center gap-2.5 rounded-full bg-white text-slate-700 border border-slate-200/90 px-5 py-3.5 text-xs sm:text-sm font-mono font-medium shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all w-full sm:w-auto"
                        >
                            <TerminalSquare size={16} strokeWidth={1.75} className="text-slate-500" />
                            <span>npx create-codecollab</span>
                            {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} className="text-slate-400" />}
                        </button>
                    </motion.div>

                    {/* Clean Capsule Metrics Bar */}
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 mt-10"
                    >
                        <div className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <Zap size={14} strokeWidth={2} className="text-blue-600" />
                            <span>&lt;40ms Median Latency</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <Shield size={14} strokeWidth={2} className="text-emerald-600" />
                            <span>Isolated Docker Containers</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <Activity size={14} strokeWidth={2} className="text-indigo-600" />
                            <span>WebRTC P2P Voice</span>
                        </div>
                        <div className="px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 shadow-sm flex items-center gap-2 text-xs font-semibold text-slate-700">
                            <CheckCircle2 size={14} strokeWidth={2} className="text-blue-600" />
                            <span>LeetCode Test Driver</span>
                        </div>
                    </motion.div>
                </section>

                {/* Actual Website Workspace Showcase */}
                <section id="preview" className="w-full max-w-[1180px] mx-auto px-4 sm:px-6 mt-14">
                    <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-[2.2rem] p-2.5 sm:p-3.5 bg-slate-200/60 border border-slate-300/80 shadow-[0_24px_70px_-15px_rgba(15,23,42,0.12)] relative"
                    >
                        {/* Live Session Pill */}
                        <div className="absolute -top-3.5 right-8 z-20 hidden md:flex items-center gap-2 rounded-full bg-white px-3.5 py-1 shadow-md border border-slate-200 text-xs font-semibold text-slate-800">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <span>Live Collaborative Session Active</span>
                        </div>

                        {/* Double-Bezel Concentric Frame fitting the entire screenshot */}
                        <div 
                            className="rounded-[1.6rem] bg-white overflow-hidden border border-slate-200/90 shadow-xl group relative cursor-pointer"
                            onClick={onGetStarted}
                        >
                            <img 
                                src="/app-preview.png" 
                                alt="CodeCollab Live Workspace with Code Editor, LeetCode Problem Panel, and Integrated Voice" 
                                className="w-full h-auto block object-contain select-none transition-transform duration-500 group-hover:scale-[1.006]"
                            />
                            {/* Hover overlay hint */}
                            <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-950/10 transition-colors flex items-center justify-center pointer-events-none">
                                <span className="opacity-0 group-hover:opacity-100 transition-opacity bg-white/95 backdrop-blur-md text-slate-900 font-semibold text-xs px-4 py-2 rounded-full shadow-lg border border-slate-200 flex items-center gap-2">
                                    <span>Launch Workspace</span>
                                    <ArrowRight size={13} />
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </section>

                {/* IMPROVISED MARQUEE: Sleek Interactive Tech Capsule Rail */}
                <section className="w-full mt-24 py-8 border-y border-slate-200/80 bg-slate-100/60 overflow-hidden relative">
                    <div className="max-w-6xl mx-auto px-4 text-center mb-5">
                        <span className="text-[11px] uppercase tracking-[0.22em] font-mono font-bold text-slate-400">
                            Core Infrastructure & Open Protocols
                        </span>
                    </div>

                    <div className="flex w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)]">
                        <div className="flex gap-4 items-center w-max animate-marquee">
                            {[...Array(2)].map((_, groupIdx) => (
                                <div key={groupIdx} className="flex gap-4 items-center shrink-0">
                                    {techPills.map((tech, idx) => {
                                        const Icon = tech.icon;
                                        return (
                                            <div 
                                                key={idx}
                                                className="flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-white border border-slate-200 shadow-[0_2px_8px_rgba(0,0,0,0.03)] hover:border-blue-300 hover:shadow-md transition-all cursor-default select-none shrink-0"
                                            >
                                                <div className="h-7 w-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shrink-0">
                                                    <Icon size={15} strokeWidth={2} />
                                                </div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-xs font-bold text-slate-900 leading-tight">{tech.name}</span>
                                                    <span className="text-[10px] font-mono text-slate-500">{tech.desc}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* Features Bento Grid with Authentic Graphics */}
                <section id="features" className="w-full max-w-6xl mx-auto px-4 sm:px-6 mt-28">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-700 mb-3">
                            Platform Features
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                            Engineered for real engineering teams.
                        </h2>
                        <p className="text-base sm:text-lg text-slate-600 mt-3">
                            Everything needed for technical interviews, pair-programming, and architectural whiteboard sessions.
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Large Tile: Socket.io Real-Time Engine */}
                        <motion.div 
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.5 }}
                            className="md:col-span-2 rounded-[2rem] bg-white border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 border border-blue-100">
                                    <Zap size={22} strokeWidth={1.75} />
                                </div>
                                <h3 className="text-2xl font-bold text-slate-950 mb-2">
                                    Real-Time Socket.io Multi-User Engine
                                </h3>
                                <p className="text-slate-600 text-base max-w-xl leading-relaxed">
                                    Engineered with low-latency bidirectional WebSocket pipelines and automatic HTTP long-polling fallback. Code changes, typing indicators, and whiteboard vectors broadcast instantaneously in under 15ms.
                                </p>
                            </div>

                            {/* SVG Network Convergence Graphic */}
                            <div className="mt-8 rounded-2xl bg-slate-50 border border-slate-200/80 p-5">
                                <div className="flex items-center justify-between text-xs text-slate-500 mb-3 font-mono border-b border-slate-200/60 pb-2">
                                    <span>Socket.io Room Pipeline</span>
                                    <span className="text-emerald-600 font-semibold flex items-center gap-1">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                        Live Synced
                                    </span>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 text-center items-center py-2">
                                    <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                                        <Laptop size={18} className="text-blue-600" />
                                        <span className="text-xs font-bold text-slate-800">Peer A</span>
                                        <span className="text-[10px] font-mono text-slate-500">12ms · Client</span>
                                    </div>
                                    <div className="flex flex-col items-center justify-center">
                                        <div className="w-full border-t-2 border-dashed border-blue-300 relative flex items-center justify-center">
                                            <span className="absolute px-2 py-0.5 rounded bg-blue-600 text-white text-[9px] font-mono font-bold">
                                                Socket.io 4.8
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex flex-col items-center gap-1.5 p-2 rounded-xl bg-white border border-slate-200 shadow-sm">
                                        <Laptop size={18} className="text-blue-600" />
                                        <span className="text-xs font-bold text-slate-800">Peer B</span>
                                        <span className="text-[10px] font-mono text-slate-500">15ms · Client</span>
                                    </div>
                                </div>
                            </div>
                        </motion.div>

                        {/* Tile 2: Judge0 Cloud Sandbox */}
                        <motion.div 
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.5, delay: 0.1 }}
                            className="rounded-[2rem] bg-slate-950 text-white p-8 shadow-sm hover:shadow-md transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="h-11 w-11 rounded-xl bg-slate-800 text-blue-400 flex items-center justify-center mb-6 border border-slate-700">
                                    <Cpu size={22} strokeWidth={1.75} />
                                </div>
                                <h3 className="text-2xl font-bold mb-2">Judge0 Sandbox</h3>
                                <p className="text-slate-400 text-sm leading-relaxed">
                                    Cloud-isolated compilers executing Python 3.12 (with PEP 585 generics), Node.js 18, TypeScript 5, C++ (GCC), and Java 17 with automated testcase harness evaluation.
                                </p>
                            </div>

                            <div className="mt-8 font-mono text-xs rounded-xl bg-slate-900 p-3.5 border border-slate-800 space-y-2">
                                <div className="flex items-center justify-between text-[11px] text-slate-500 border-b border-slate-800 pb-1.5">
                                    <span>Judge0 CE Telemetry</span>
                                    <span className="text-emerald-400">Exit Code: 0</span>
                                </div>
                                <div className="text-slate-300">$ python3.12 solution.py</div>
                                <div className="text-slate-500">Execution time: 0.02s · Status: Accepted</div>
                                <div className="text-emerald-400 font-semibold">Test Output: 3/3 Passed ✓</div>
                            </div>
                        </motion.div>

                        {/* Tile 3: Live Language Playground */}
                        <motion.div 
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.5, delay: 0.15 }}
                            className="rounded-[2rem] bg-white border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 border border-blue-100">
                                    <Code2 size={22} strokeWidth={1.75} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-950 mb-2">Live Runtimes</h3>
                                <p className="text-slate-600 text-sm leading-relaxed mb-4">
                                    Toggle between active language environments:
                                </p>

                                <div className="flex gap-2 mb-4">
                                    {['python', 'typescript', 'cpp'].map((lang) => (
                                        <button
                                            key={lang}
                                            onClick={() => setActiveLang(lang)}
                                            className={`px-3 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                                                activeLang === lang 
                                                    ? 'bg-blue-600 text-white shadow-sm' 
                                                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                                            }`}
                                        >
                                            {lang}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-[140px]">
                                <pre>{codeSnippets[activeLang]}</pre>
                            </div>
                        </motion.div>

                        {/* Tile 4: Integrated Voice Channel */}
                        <motion.div 
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.5, delay: 0.2 }}
                            className="rounded-[2rem] bg-white border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 border border-blue-100">
                                    <Mic size={22} strokeWidth={1.75} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-950 mb-2">Built-in Voice</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Browser-to-browser peer voice channels. No third-party video links required to talk through complex algorithms.
                                </p>
                            </div>

                            <div className="mt-6 flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-200/80">
                                <div className="h-8 w-8 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                                    P
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-semibold text-slate-800">Voice Channel Active</div>
                                    <div className="text-[10px] text-slate-500">Opus 48kHz Stereo</div>
                                </div>
                                <div className="flex gap-0.5 items-center">
                                    <span className="h-2 w-1 bg-emerald-500 rounded-full animate-pulse"></span>
                                    <span className="h-4 w-1 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.1s' }}></span>
                                    <span className="h-3 w-1 bg-emerald-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Tile 5: Excalidraw Whiteboard */}
                        <motion.div 
                            initial={{ opacity: 0, y: 25 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true, margin: "-80px" }}
                            transition={{ duration: 0.5, delay: 0.25 }}
                            className="rounded-[2rem] bg-white border border-slate-200/80 p-8 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col justify-between"
                        >
                            <div>
                                <div className="h-11 w-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 border border-blue-100">
                                    <PenTool size={22} strokeWidth={1.75} />
                                </div>
                                <h3 className="text-xl font-bold text-slate-950 mb-2">System Whiteboard</h3>
                                <p className="text-slate-600 text-sm leading-relaxed">
                                    Switch from code to canvas with a single tab click. Diagram system architecture, flowcharts, and schemas collaboratively.
                                </p>
                            </div>

                            <div className="mt-6 p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-medium text-slate-700 flex items-center justify-between">
                                <span>Powered by Excalidraw</span>
                                <span className="text-blue-600 font-semibold">1-Click Toggle</span>
                            </div>
                        </motion.div>
                    </div>
                </section>

                {/* Workflow Architecture with Visual Cards */}
                <section id="architecture" className="w-full max-w-5xl mx-auto px-4 sm:px-6 mt-32">
                    <div className="text-center max-w-2xl mx-auto mb-16">
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-[11px] font-mono uppercase tracking-wider font-semibold text-slate-700 mb-3">
                            Instant Setup
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                            Zero friction workflow.
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        <div className="flex flex-col items-start p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                            <span className="text-2xl font-black font-mono text-blue-600 mb-3">01</span>
                            <h3 className="text-base font-bold text-slate-900 mb-2">Create Room</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Generate an instant cryptographic room ID with a single click. No accounts or setup required.
                            </p>
                        </div>

                        <div className="flex flex-col items-start p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                            <span className="text-2xl font-black font-mono text-blue-600 mb-3">02</span>
                            <h3 className="text-base font-bold text-slate-900 mb-2">Share URL</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Send the room link to interview candidates or teammates. Everyone enters the collaborative state immediately.
                            </p>
                        </div>

                        <div className="flex flex-col items-start p-6 rounded-2xl bg-white border border-slate-200/90 shadow-sm">
                            <span className="text-2xl font-black font-mono text-blue-600 mb-3">03</span>
                            <h3 className="text-base font-bold text-slate-900 mb-2">Code & Test</h3>
                            <p className="text-sm text-slate-600 leading-relaxed">
                                Import LeetCode problem descriptions, run test cases, and verify algorithm efficiency in real time.
                            </p>
                        </div>
                    </div>
                </section>

                {/* FAQ */}
                <section id="faq" className="w-full max-w-4xl mx-auto px-4 sm:px-6 mt-32">
                    <div className="text-center mb-14">
                        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-950">
                            Frequently Asked Questions
                        </h2>
                        <p className="text-slate-600 mt-2">Architecture and feature details.</p>
                    </div>

                    <div className="space-y-3">
                        {faqs.map((faq, idx) => (
                            <div 
                                key={idx}
                                className="rounded-2xl bg-white border border-slate-200/90 overflow-hidden shadow-sm"
                            >
                                <button
                                    onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                                    className="w-full p-5 text-left flex items-center justify-between font-semibold text-slate-900 hover:text-blue-600 transition-colors"
                                >
                                    <span>{faq.q}</span>
                                    <ChevronDown 
                                        size={18} 
                                        className={`text-slate-400 transition-transform duration-200 ${activeFaq === idx ? 'rotate-180 text-blue-600' : ''}`}
                                    />
                                </button>
                                <AnimatePresence>
                                    {activeFaq === idx && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.25 }}
                                            className="px-5 pb-5 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
                                        >
                                            {faq.a}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Pre-Footer Solid Accent CTA */}
                <section className="w-full max-w-5xl mx-auto px-4 sm:px-6 mt-32">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.98 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                        className="rounded-[2.5rem] bg-slate-950 text-white p-10 sm:p-16 text-center relative overflow-hidden shadow-xl border border-slate-800"
                    >
                        <div className="relative z-10 max-w-2xl mx-auto flex flex-col items-center">
                            <div className="h-12 w-12 rounded-2xl bg-white/10 flex items-center justify-center text-blue-400 mb-6 border border-white/10">
                                <TerminalSquare size={24} strokeWidth={1.75} />
                            </div>
                            <h2 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight leading-tight">
                                Ready to write code together?
                            </h2>
                            <p className="text-slate-400 text-base sm:text-lg mt-4 leading-relaxed">
                                Spin up a collaborative coding environment in seconds. Free for developer pairing.
                            </p>

                            <div className="mt-8 flex flex-col sm:flex-row items-center gap-4">
                                <button 
                                    onClick={onGetStarted}
                                    className="group inline-flex items-center gap-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 text-base font-bold shadow-lg transition-all active:scale-95"
                                >
                                    <span>Create Free Room</span>
                                    <span className="h-6 w-6 rounded-full bg-white/20 flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
                                        <ArrowRight size={13} strokeWidth={2.5} />
                                    </span>
                                </button>
                            </div>

                            <p className="text-xs text-slate-500 mt-4">
                                No credit card required · Instant room in 2 seconds
                            </p>
                        </div>
                    </motion.div>
                </section>
            </main>

            {/* Footer */}
            <footer className="w-full py-12 border-t border-slate-200 bg-white z-10 shrink-0">
                <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-3">
                        <div className="h-7 w-7 rounded-lg overflow-hidden bg-white flex items-center justify-center border border-slate-200 shadow-sm">
                            <img src="/logo.jpg" alt="Logo" className="h-full w-full object-cover mix-blend-multiply" />
                        </div>
                        <span className="font-bold text-slate-900 tracking-tight">CodeCollab</span>
                        <div className="flex items-center gap-1.5 ml-4 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-[10px] font-semibold text-emerald-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span>All Systems Normal</span>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm font-medium text-slate-500">
                        <a href="#features" className="hover:text-slate-900 transition-colors">Features</a>
                        <a href="#preview" className="hover:text-slate-900 transition-colors">Live Canvas</a>
                        <a href="#architecture" className="hover:text-slate-900 transition-colors">Architecture</a>
                        <a href="#faq" className="hover:text-slate-900 transition-colors">FAQ</a>
                        <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-900 transition-colors flex items-center gap-1">
                            <span>GitHub</span>
                            <ExternalLink size={12} />
                        </a>
                    </div>

                    <div className="text-xs text-slate-400 font-medium">
                        © 2026 CodeCollab Inc. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    );
}
