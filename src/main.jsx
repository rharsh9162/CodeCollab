import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { ClerkProvider } from '@clerk/react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './contexts/AuthContext.jsx'
import { KeyRound, ExternalLink } from 'lucide-react'

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY

function MissingClerkKeyNotice() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center p-6 bg-slate-50 text-slate-900 font-sans">
      <div className="w-full max-w-lg rounded-[2rem] p-2.5 bg-slate-200/70 border border-slate-300/80 shadow-[0_20px_50px_-15px_rgba(15,23,42,0.08)]">
        <div className="rounded-[1.6rem] bg-white p-8 space-y-6 border border-slate-100 shadow-sm">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 flex items-center justify-center">
            <KeyRound size={24} />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Connect Your Clerk Account</h2>
            <p className="text-sm text-slate-600 leading-relaxed">
              CodeCollab has shifted to Clerk authentication. Add your Publishable Key to connect your project.
            </p>
          </div>

          <div className="rounded-2xl bg-slate-50 p-5 border border-slate-200/80 text-xs space-y-3 leading-relaxed">
            <div className="font-semibold text-slate-900 text-sm">Quick 3-step setup:</div>
            <ol className="list-decimal list-inside space-y-2 text-slate-600">
              <li>
                Open <a href="https://dashboard.clerk.com" target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-semibold inline-flex items-center gap-1">clerk.com dashboard <ExternalLink size={11} /></a> and create your application.
              </li>
              <li>
                Copy your <strong>Publishable key</strong> (starts with <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-900 font-mono text-[11px]">pk_test_...</code>).
              </li>
              <li>
                Paste it into your <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-slate-900 font-mono text-[11px]">.env</code> file as <code className="bg-slate-200/80 px-1.5 py-0.5 rounded text-blue-700 font-mono text-[11px]">VITE_CLERK_PUBLISHABLE_KEY</code>.
              </li>
            </ol>
          </div>

          <div className="text-xs text-slate-400 font-mono flex items-center justify-between border-t border-slate-100 pt-4">
            <span>Target file: <code>.env</code></span>
            <span className="text-emerald-600 font-sans font-semibold">Ready for key</span>
          </div>
        </div>
      </div>
    </div>
  )
}

const isValidKey = Boolean(PUBLISHABLE_KEY && PUBLISHABLE_KEY.startsWith('pk_') && PUBLISHABLE_KEY !== 'pk_test_placeholder_key');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {!isValidKey ? (
      <MissingClerkKeyNotice />
    ) : (
      <ClerkProvider publishableKey={PUBLISHABLE_KEY}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </ClerkProvider>
    )}
  </StrictMode>,
)
