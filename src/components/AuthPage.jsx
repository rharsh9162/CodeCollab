import { SignIn } from '@clerk/react';
import { ArrowLeft } from 'lucide-react';

export default function AuthPage({ onBack }) {
    return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center relative bg-slate-50 text-slate-900 p-4 overflow-y-auto">
            {/* Subtle architectural ambient background */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <div className="absolute -top-[20%] left-1/2 -translate-x-1/2 w-[700px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full" />
                <div 
                    className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                    style={{ 
                        backgroundImage: 'radial-gradient(#0F172A 1.2px, transparent 1.2px)', 
                        backgroundSize: '24px 24px' 
                    }} 
                />
            </div>

            {/* Back Button */}
            {onBack && (
                <button 
                    onClick={onBack}
                    className="fixed top-5 left-5 z-20 inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-3.5 py-2 rounded-full shadow-sm transition-all active:scale-95"
                >
                    <ArrowLeft size={14} />
                    <span>Back to Home</span>
                </button>
            )}

            {/* Official Prebuilt Clerk SignIn Component */}
            <div className="w-full flex items-center justify-center my-auto z-10 py-6">
                <SignIn fallbackRedirectUrl="/" />
            </div>
        </div>
    );
}
