import { useState, useRef, useEffect } from 'react';
import {
    Search, Copy, Check, Link2, Code2, ChevronDown, Zap,
    ExternalLink, LogOut, Loader2
} from 'lucide-react';
import { LANGUAGES } from './CodeEditor';

export default function Toolbar({
    roomId, problem, language, onLanguageChange,
    onSearch, onImport, searchResults, searchLoading,
    onOpenCollabTab, user, onSignOut, onShowLanding,
}) {
    const [searchQuery, setSearchQuery] = useState('');
    const [showDropdown, setShowDropdown] = useState(false);
    const [showLangDropdown, setShowLangDropdown] = useState(false);
    const [showUserMenu, setShowUserMenu] = useState(false);
    const [copied, setCopied] = useState(false);
    const searchRef = useRef(null);
    const userMenuRef = useRef(null);
    const searchTimeout = useRef(null);

    const handleSearchChange = (e) => {
        const val = e.target.value;
        setSearchQuery(val);
        if (searchTimeout.current) clearTimeout(searchTimeout.current);
        if (val.trim().length >= 2) {
            searchTimeout.current = setTimeout(() => {
                onSearch(val.trim());
                setShowDropdown(true);
            }, 400);
        } else {
            setShowDropdown(false);
        }
    };

    const handleSearchKeyDown = (e) => {
        if (e.key === 'Enter' && searchQuery.trim()) {
            onImport(searchQuery.trim().toLowerCase().replace(/\s+/g, '-'));
            setShowDropdown(false);
            setSearchQuery('');
        }
    };

    const handleSelectResult = (slug) => {
        onImport(slug);
        setShowDropdown(false);
        setSearchQuery('');
    };

    const copyRoomLink = async () => {
        let link = `${window.location.origin}?room=${roomId}`;
        if (problem?.titleSlug) {
            link += `&problem=${problem.titleSlug}`;
        }
        try {
            await navigator.clipboard.writeText(link);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch { /* fallback */ }
    };

    const getDifficultyColor = (diff) => {
        if (diff === 'Easy') return 'text-secondary border-secondary/20 bg-secondary/10';
        if (diff === 'Medium') return 'text-yellow-500 border-yellow-500/20 bg-yellow-500/10';
        return 'text-danger border-danger/20 bg-danger/10';
    };

    useEffect(() => {
        const handleClick = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) setShowDropdown(false);
            if (userMenuRef.current && !userMenuRef.current.contains(e.target)) setShowUserMenu(false);
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const currentLang = LANGUAGES.find((l) => l.value === language);

    return (
        <header className="flex h-14 shrink-0 items-center justify-between glass-panel !overflow-visible mx-4 mt-4 px-6 z-50 rounded-2xl">
            <div className="flex items-center gap-8">
                <div 
                    className="flex items-center gap-2 select-none group cursor-pointer" 
                    onClick={() => {
                        if (onShowLanding) onShowLanding();
                        else window.location.href = '/?view=landing';
                    }}
                    title="Return to Landing Page"
                >
                    <div className="flex h-8 w-8 items-center justify-center rounded-[8px] bg-white shadow-sm overflow-hidden group-hover:scale-105 transition-transform">
                        <img src="/logo.jpg" alt="CodeCollab Logo" className="h-full w-full object-cover mix-blend-multiply p-1" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-text-main group-hover:text-primary transition-colors">CodeCollab</span>
                </div>

                <div className="relative" ref={searchRef}>
                    <div className="relative flex items-center">
                        <Search size={16} className="absolute left-3 text-text-muted" />
                        <input
                            className="input-field w-[320px] pl-10 h-9"
                            placeholder="Search LeetCode (e.g. two-sum)..."
                            value={searchQuery}
                            onChange={handleSearchChange}
                            onKeyDown={handleSearchKeyDown}
                            onFocus={() => { if (searchResults?.length > 0) setShowDropdown(true); }}
                        />
                        {searchLoading && (
                            <div className="absolute right-3">
                                <Loader2 size={14} className="animate-spin text-text-muted" />
                            </div>
                        )}
                    </div>

                    {showDropdown && searchResults?.length > 0 && (
                        <div className="absolute top-full left-0 mt-2 w-[400px] rounded-2xl border border-white/60 bg-white/95 backdrop-blur-3xl shadow-xl animate-slide-up z-50 max-h-[300px] overflow-y-auto custom-scrollbar">
                            {searchResults.map((item) => (
                                <div 
                                    key={item.titleSlug} 
                                    className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-surfaceHover transition-colors border-b border-border last:border-b-0"
                                    onClick={() => handleSelectResult(item.titleSlug)}
                                >
                                    <span className="text-xs font-mono text-text-subtle min-w-[36px]">{item.questionId}</span>
                                    <span className="text-sm font-medium text-text-main flex-1 truncate">{item.title}</span>
                                    <span className={`text-[10px] px-2 py-0.5 rounded-full border font-medium uppercase tracking-wider ${getDifficultyColor(item.difficulty)}`}>
                                        {item.difficulty}
                                    </span>
                                    <span className="text-xs font-semibold text-text-subtle">{parseFloat(item.acRate).toFixed(1)}%</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <div className="flex items-center gap-4">
                {/* Language Selector */}
                <div className="relative">
                    <button 
                        className="btn-secondary h-9 gap-2 px-3 text-sm" 
                        onClick={() => setShowLangDropdown(!showLangDropdown)}
                    >
                        <Code2 size={14} className="text-primary" />
                        <span className="min-w-[70px] text-left">{currentLang?.label || 'Python 3'}</span>
                        <ChevronDown size={14} className="text-text-subtle" />
                    </button>
                    
                    {showLangDropdown && (
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl border border-white/60 bg-white/95 backdrop-blur-3xl shadow-xl animate-slide-up z-50">
                            <div className="p-1.5 flex flex-col gap-0.5">
                                {LANGUAGES.map((lang) => (
                                    <button
                                        key={lang.value}
                                        className={`w-full text-left px-3 py-2 text-sm rounded-lg transition-colors hover:bg-surfaceHover ${language === lang.value ? 'bg-primary/10 text-primary font-medium' : 'text-text-muted hover:text-text-main'}`}
                                        onClick={() => { onLanguageChange(lang.value); setShowLangDropdown(false); }}
                                    >
                                        {lang.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Invite Link */}
                <div 
                    className="flex items-center gap-2 px-3 h-9 rounded-xl border border-white/60 bg-white/50 backdrop-blur-sm text-sm font-medium cursor-pointer hover:bg-white/80 transition-colors group"
                    onClick={copyRoomLink}
                    title="Click to copy invite link"
                >
                    <Link2 size={14} className="text-text-subtle group-hover:text-primary transition-colors" />
                    <span className="font-mono text-text-main">{roomId.slice(0, 8)}</span>
                    {copied ? <Check size={14} className="text-secondary" /> : <Copy size={14} className="text-text-subtle group-hover:text-text-main transition-colors" />}
                </div>

                <button className="btn-secondary h-9 px-3 gap-2 text-sm" onClick={onOpenCollabTab}>
                    <ExternalLink size={14} className="text-text-subtle" /> 
                    <span>Collab</span>
                </button>

                <div className="flex items-center gap-2 px-2 mr-2 border-l border-border pl-6">
                    <div className="h-2 w-2 rounded-full bg-secondary shadow-sm animate-pulse" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Live</span>
                </div>

                {/* User Menu */}
                <div className="relative" ref={userMenuRef}>
                    <button 
                        onClick={() => setShowUserMenu(!showUserMenu)} 
                        className="flex items-center justify-center h-9 w-9 rounded-full border-2 border-transparent hover:border-primary transition-all overflow-hidden"
                    >
                        {user?.photoURL ? (
                            <img src={user.photoURL} alt="User avatar" className="h-full w-full object-cover" />
                        ) : (
                            <div className="h-full w-full flex items-center justify-center font-bold text-white text-sm" style={{ background: user?.userColor || '#6366f1' }}>
                                {(user?.userName || 'U')[0].toUpperCase()}
                            </div>
                        )}
                    </button>

                    {showUserMenu && (
                        <div className="absolute right-0 top-full mt-2 w-56 rounded-2xl border border-white/60 bg-white/95 backdrop-blur-3xl shadow-xl animate-slide-up z-50 p-2">
                            <div className="flex items-center gap-3 px-2 py-3 border-b border-border/50 mb-1">
                                <div className="h-10 w-10 shrink-0 rounded-full overflow-hidden">
                                    {user?.photoURL ? (
                                        <img src={user.photoURL} alt="User avatar" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center font-bold text-white text-base" style={{ background: user?.userColor || '#6366f1' }}>
                                            {(user?.userName || 'U')[0].toUpperCase()}
                                        </div>
                                    )}
                                </div>
                                <div className="flex flex-col overflow-hidden">
                                    <span className="text-sm font-semibold text-text-main truncate">{user?.userName}</span>
                                    <span className="text-xs text-text-subtle truncate">{user?.email}</span>
                                </div>
                            </div>
                            <button 
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-surfaceHover text-text-main transition-colors mt-1"
                                onClick={() => {
                                    setShowUserMenu(false);
                                    if (onShowLanding) onShowLanding();
                                    else window.location.href = '/?view=landing';
                                }}
                            >
                                <ExternalLink size={15} className="text-primary" />
                                Landing Page
                            </button>
                            <button 
                                className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium hover:bg-danger/10 text-danger transition-colors mt-1"
                                onClick={onSignOut}
                            >
                                <LogOut size={16} />
                                Sign Out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
