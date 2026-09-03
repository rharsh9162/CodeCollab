import { useState } from 'react';
import {
    ThumbsUp,
    ThumbsDown,
    Lightbulb,
    ChevronRight,
    BookOpen,
    Loader2
} from 'lucide-react';

export default function ProblemPanel({ problem, loading }) {
    const [expandedHints, setExpandedHints] = useState({});

    const toggleHint = (index) => {
        setExpandedHints((prev) => ({ ...prev, [index]: !prev[index] }));
    };

    if (loading) {
        return (
            <div className="flex flex-1 items-center justify-center p-8 text-text-muted">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!problem) {
        return (
            <div className="flex flex-1 items-center justify-center p-4 w-full h-full text-text-muted overflow-hidden">
                <div className="flex flex-col items-center text-center w-full max-w-sm px-4 animate-fade-in">
                    <div className="flex h-16 w-16 items-center justify-center rounded-[16px] bg-surface border border-border shadow-panel mb-6 shrink-0">
                        <BookOpen size={28} className="text-text-subtle" />
                    </div>
                    <h3 className="text-lg font-bold text-text-main mb-2">No Problem Loaded</h3>
                    <p className="text-sm font-medium leading-relaxed break-words">Search for a LeetCode problem in the toolbar above to get started. Try <span className="text-primary">two-sum</span> or <span className="text-primary">valid-parentheses</span>.</p>
                </div>
            </div>
        );
    }

    const getDifficultyColor = (diff) => {
        if (diff === 'Easy') return 'bg-secondary/10 text-secondary border-secondary/20';
        if (diff === 'Medium') return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
        return 'bg-danger/10 text-danger border-danger/20';
    };

    return (
        <div className="flex-1 w-full relative overflow-y-auto custom-scrollbar bg-transparent">
            <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-10 animate-fade-in">
                
                {/* Header Section */}
                <div className="space-y-5">
                    <div className="flex items-center gap-3 flex-wrap">
                        <div className="text-xs font-mono font-semibold text-text-subtle bg-white/50 backdrop-blur-sm border border-white/60 px-2.5 py-1 rounded-md shadow-sm">
                            #{problem.questionId}
                        </div>
                        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-text-main">{problem.title}</h1>
                    </div>
                    
                    <div className="flex items-center gap-6 flex-wrap text-sm">
                        <div className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider border ${getDifficultyColor(problem.difficulty)}`}>
                            {problem.difficulty}
                        </div>
                        
                        <div className="flex items-center gap-5 text-text-muted font-semibold">
                            {problem.acRate && (
                                <span className="flex items-center gap-1.5">
                                    <span className="text-secondary">✓</span> {parseFloat(problem.acRate).toFixed(1)}% acc
                                </span>
                            )}
                            {problem.likes !== undefined && (
                                <span className="flex items-center gap-1.5">
                                    <ThumbsUp size={14} className="text-primary" /> {problem.likes}
                                </span>
                            )}
                            {problem.dislikes !== undefined && (
                                <span className="flex items-center gap-1.5">
                                    <ThumbsDown size={14} className="text-text-subtle" /> {problem.dislikes}
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Problem Description Content */}
                <div 
                    className="prose max-w-none text-text-muted text-[15px] leading-relaxed
                    prose-pre:bg-white/50 prose-pre:backdrop-blur-sm prose-pre:border prose-pre:border-white/60 prose-pre:rounded-xl prose-pre:shadow-sm
                    prose-code:text-primary prose-code:bg-primary/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:before:content-none prose-code:after:content-none
                    prose-a:text-primary hover:prose-a:text-primary-hover prose-strong:text-text-main prose-strong:font-bold
                    prose-headings:text-text-main prose-headings:font-bold"
                    dangerouslySetInnerHTML={{ __html: problem.content }}
                />

                {/* Tags Section */}
                {problem.topicTags && problem.topicTags.length > 0 && (
                    <div className="space-y-4 pt-8 border-t border-border">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-text-subtle flex items-center gap-2">
                            Tags
                        </h3>
                        <div className="flex flex-wrap gap-2">
                            {problem.topicTags.map((tag) => (
                                <div key={tag.slug} className="px-3 py-1.5 bg-white/50 backdrop-blur-sm border border-white/60 text-xs font-medium text-text-muted rounded-lg shadow-sm">
                                    {tag.name}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Hints Section */}
                {problem.hints && problem.hints.length > 0 && (
                    <div className="space-y-4 pt-8 border-t border-border">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-text-subtle flex items-center gap-2 mb-4">
                            <Lightbulb size={14} className="text-yellow-500" />
                            Hints
                        </h3>
                        <div className="space-y-3">
                            {problem.hints.map((hint, idx) => (
                                <div key={idx} className="border border-white/60 rounded-xl bg-white/40 backdrop-blur-sm overflow-hidden shadow-sm">
                                    <button 
                                        className="w-full flex items-center gap-3 px-5 py-3.5 text-sm font-semibold hover:bg-white/50 transition-colors text-left"
                                        onClick={() => toggleHint(idx)}
                                    >
                                        <ChevronRight
                                            size={16}
                                            className={`text-text-subtle transition-transform duration-300 ${expandedHints[idx] ? 'rotate-90' : ''}`}
                                        />
                                        <span className="text-text-main">Hint {idx + 1}</span>
                                    </button>
                                    
                                    <div className={`transition-all duration-300 ease-in-out ${expandedHints[idx] ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
                                        <div
                                            className="px-12 pb-5 text-sm text-text-muted prose max-w-none leading-relaxed"
                                            dangerouslySetInnerHTML={{ __html: hint }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
                
                <div className="h-4"></div> {/* Bottom padding */}
            </div>
        </div>
    );
}
