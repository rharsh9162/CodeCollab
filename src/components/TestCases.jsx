import { useState, useEffect } from 'react';
import { Loader2, CheckCircle2, XCircle, TerminalSquare } from 'lucide-react';
import { extractMethodInfo, parseTestCases } from '../utils/codeDriver';

export default function TestCases({ problem, executionResults = [], isRunning, language }) {
    const [activeTab, setActiveTab] = useState('testcase');
    const [activeCase, setActiveCase] = useState(0);
    const [activeResultCase, setActiveResultCase] = useState(0);

    useEffect(() => {
        if (executionResults.length > 0) {
            setActiveTab('result');
            setActiveResultCase(0);
        }
    }, [executionResults.length]);

    let testCases = [];
    if (problem?.exampleTestcases) {
        let paramCount = 1;
        if (problem.codeSnippets) {
            const LANG_SLUGS = {
                python: 'python3', javascript: 'javascript', typescript: 'typescript',
                java: 'java', cpp: 'cpp', c: 'c', csharp: 'csharp', go: 'golang',
                rust: 'rust', ruby: 'ruby', swift: 'swift', kotlin: 'kotlin',
            };
            const slug = LANG_SLUGS[language] || 'python3';
            const snippet = problem.codeSnippets.find(
                (s) => s.langSlug === slug || s.lang.toLowerCase().includes(language)
            );
            if (snippet) {
                const info = extractMethodInfo(snippet.code, language);
                if (info?.paramCount) paramCount = info.paramCount;
            }
        }
        testCases = parseTestCases(problem.exampleTestcases, paramCount);
    }

    if (testCases.length === 0) {
        testCases = [{ inputs: ['No test cases available'], label: 'Case 1' }];
    }

    const successfulResultsCount = executionResults.filter(r => r.type === 'success').length;
    const allSuccess = successfulResultsCount === executionResults.length && executionResults.length > 0;

    return (
        <div className="flex flex-col h-full shrink-0 border-t border-white/50 bg-transparent rounded-b-2xl">
            <div className="flex flex-col w-full h-full relative">
                
                {/* Tabs Header */}
                <div className="flex items-center px-4 bg-white/30 border-b border-white/50 h-11 shrink-0 gap-6 backdrop-blur-sm">
                    <button 
                        className={`flex items-center gap-2 h-full text-xs font-semibold tracking-wide uppercase transition-colors border-b-2 ${activeTab === 'testcase' ? 'border-primary text-text-main' : 'border-transparent text-text-muted hover:text-text-main'}`}
                        onClick={() => setActiveTab('testcase')}
                    >
                        <TerminalSquare size={14} className={activeTab === 'testcase' ? 'text-primary' : 'opacity-70'} />
                        Testcase
                    </button>
                    <button 
                        className={`flex items-center gap-2 h-full text-xs font-semibold tracking-wide uppercase transition-colors border-b-2 ${activeTab === 'result' ? 'border-secondary text-text-main' : 'border-transparent text-text-muted hover:text-text-main'}`}
                        onClick={() => setActiveTab('result')}
                    >
                        Test Result
                        {executionResults.length > 0 && (
                            <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold ${allSuccess ? 'bg-secondary/15 text-secondary border border-secondary/20' : 'bg-danger/15 text-danger border border-danger/20'}`}>
                                {successfulResultsCount}/{executionResults.length}
                            </span>
                        )}
                        {isRunning && <Loader2 size={12} className="animate-spin text-primary" />}
                    </button>
                </div>

                <div className="flex-1 overflow-hidden relative">
                    
                    {/* Testcase Tab */}
                    {activeTab === 'testcase' && (
                        <div className="absolute inset-0 flex flex-col animate-fade-in">
                            <div className="flex items-center gap-2 px-4 py-3 bg-white/20 overflow-x-auto border-b border-white/50 custom-scrollbar backdrop-blur-sm">
                                {testCases.map((tc, idx) => (
                                    <button
                                        key={idx}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${activeCase === idx ? 'bg-white/60 border border-white/60 text-text-main shadow-sm' : 'text-text-muted hover:bg-white/40 hover:text-text-main'}`}
                                        onClick={() => setActiveCase(idx)}
                                    >
                                        {tc.label}
                                    </button>
                                ))}
                            </div>
                            <div className="flex-1 overflow-y-auto custom-scrollbar p-5">
                                <div className="space-y-5 max-w-3xl">
                                    {testCases[activeCase]?.inputs.map((input, idx) => (
                                        <div key={idx} className="space-y-2">
                                            <div className="text-xs font-bold text-text-subtle uppercase tracking-wider">Input {idx + 1}</div>
                                            <textarea
                                                className="w-full bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl px-4 py-3 text-sm font-mono text-text-main focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/50 resize-none transition-all shadow-sm"
                                                value={input}
                                                readOnly
                                                rows={input.split('\n').length || 1}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Result Tab */}
                    {activeTab === 'result' && (
                        <div className="absolute inset-0 flex flex-col animate-fade-in">
                            {isRunning && executionResults.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-text-muted gap-3">
                                    <Loader2 size={20} className="animate-spin text-primary" />
                                    <span className="text-sm font-medium">Running your code...</span>
                                </div>
                            ) : executionResults.length > 0 ? (
                                <div className="flex h-full">
                                    <div className="w-56 shrink-0 border-r border-white/50 bg-white/20 flex flex-col backdrop-blur-sm">
                                        <div className="text-xs font-bold px-5 py-4 text-text-subtle uppercase tracking-widest border-b border-border/50">Results</div>
                                        <div className="flex-1 overflow-y-auto custom-scrollbar">
                                            <div className="flex flex-col gap-1 p-3">
                                                {executionResults.map((r, idx) => (
                                                    <button
                                                        key={idx}
                                                        className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm transition-all text-left truncate ${activeResultCase === idx ? (r.type === 'success' ? 'bg-secondary/15 text-secondary font-semibold border border-secondary/20 shadow-sm' : 'bg-danger/15 text-danger font-semibold border border-danger/20 shadow-sm') : 'hover:bg-white/40 text-text-muted'}`}
                                                        onClick={() => setActiveResultCase(idx)}
                                                    >
                                                        {r.type === 'success' ? <CheckCircle2 size={16} className={activeResultCase === idx ? '' : 'text-secondary/70'} /> : <XCircle size={16} className={activeResultCase === idx ? '' : 'text-danger/70'} />}
                                                        <span className="truncate">{r.label}</span>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex-1 overflow-y-auto custom-scrollbar bg-transparent">
                                        {executionResults[activeResultCase] && (() => {
                                            const result = executionResults[activeResultCase];
                                            return (
                                                <div className="p-6 md:p-8 space-y-8 max-w-4xl">
                                                    <div className={`flex items-center gap-4 px-6 py-4 rounded-xl border shadow-sm ${result.type === 'success' ? 'bg-secondary/10 border-secondary/20 text-secondary' : 'bg-danger/10 border-danger/20 text-danger'}`}>
                                                        {result.type === 'success' ? <CheckCircle2 size={24} /> : <XCircle size={24} />}
                                                        <span className="text-xl font-bold tracking-tight">{result.type === 'success' ? 'Accepted' : 'Error'}</span>
                                                        {result.language && (
                                                            <span className="ml-auto text-xs font-semibold px-2 py-1 bg-white/50 rounded-md">
                                                                {result.language} {result.version}
                                                            </span>
                                                        )}
                                                    </div>

                                                    {result.inputs && result.inputs.length > 0 && (
                                                        <div className="space-y-3">
                                                            <div className="text-xs font-bold text-text-subtle uppercase tracking-widest">Input</div>
                                                            <div className="bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl p-4 font-mono text-sm text-text-main/90 whitespace-pre-wrap shadow-sm">
                                                                {result.inputs.join('\n')}
                                                            </div>
                                                        </div>
                                                    )}

                                                    <div className="space-y-3">
                                                        <div className="text-xs font-bold text-text-subtle uppercase tracking-widest">Output</div>
                                                        <div className={`bg-white/50 backdrop-blur-sm border border-white/60 rounded-xl p-4 font-mono text-sm whitespace-pre-wrap break-words shadow-sm ${result.type === 'success' ? 'text-text-main' : 'text-danger'}`}>
                                                            {result.output || <span className="text-text-muted italic">No output</span>}
                                                        </div>
                                                    </div>

                                                    {result.stderr && (
                                                        <div className="space-y-3">
                                                            <div className="text-xs font-bold text-danger/80 uppercase tracking-widest">Standard Error</div>
                                                            <div className="bg-danger/10 border border-danger/20 rounded-xl p-4 font-mono text-sm text-danger whitespace-pre-wrap break-words shadow-sm">
                                                                {result.stderr}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-center h-full text-text-muted text-sm font-medium">
                                    Click <span className="mx-1 px-2 py-0.5 bg-white/50 backdrop-blur-sm border border-white/60 rounded-md text-primary">Run</span> to execute your code against all test cases.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
