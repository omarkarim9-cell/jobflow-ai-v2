
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './components/App';
import { Zap, RefreshCcw, AlertCircle, Key, ExternalLink } from 'lucide-react';
import './index.css';

/**
 * Retrieve API keys from various environment sources.
 */
const getEnv = (key: string): string => {
    // @ts-ignore - Vite environment
    const meta = (import.meta as any).env || {};
    
    const candidates = [
        `NEXT_PUBLIC_${key}`,
        `VITE_${key}`,
        key
    ];
    
    for (const c of candidates) {
        if (meta[c]) return String(meta[c]);
    }
    
    // Check for native process.env
    try {
        if (typeof process !== 'undefined' && process.env && process.env[key]) {
            return String(process.env[key]);
        }
    } catch (e) {}
    
    return "";
};

const CLERK_KEY = getEnv('CLERK_PUBLISHABLE_KEY');

// In this environment, process.env.API_KEY is usually already provided.
// We only inject if it's missing but we found it elsewhere.
if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
    if (!(window as any).process.env.API_KEY) {
        const detectedKey = getEnv('API_KEY');
        if (detectedKey) (window as any).process.env.API_KEY = detectedKey;
    }
}

const ConfigurationGuard: React.FC = () => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const hasClerk = (CLERK_KEY?.startsWith('pk_test_') || CLERK_KEY?.startsWith('pk_live_'));

    const handleRefresh = () => {
        setIsRefreshing(true);
        window.location.reload();
    };

    if (!hasClerk) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-xl w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl transform -rotate-3">
                        <Zap className="w-10 h-10" />
                    </div>
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight text-center">Identity Setup Required</h1>
                    <p className="text-slate-500 mb-8 text-center leading-relaxed text-sm">
                        The application is missing a valid <strong>Clerk Publishable Key</strong>.
                    </p>
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 mb-8 space-y-4">
                        <div className="flex items-start gap-4">
                            <Key className="w-5 h-5 text-indigo-600 mt-1 shrink-0" />
                            <div className="flex-1 overflow-hidden">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                                <code className="text-xs font-mono text-slate-600 break-all bg-white px-2 py-1 rounded border border-slate-100 block">
                                    {CLERK_KEY ? "Detected (Invalid Format)" : "Missing"}
                                </code>
                            </div>
                        </div>
                        <div className="flex items-start gap-4">
                            <AlertCircle className="w-5 h-5 text-amber-500 mt-1 shrink-0" />
                            <div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Configuration Fix</p>
                                <p className="text-xs text-slate-600 font-medium leading-relaxed">
                                    Add <strong>NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY</strong> to your environment.
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="flex flex-col gap-3">
                        <button onClick={handleRefresh} className="w-full py-4 bg-indigo-600 text-white rounded-2xl text-sm font-bold hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100">
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Reload Application
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <ClerkProvider publishableKey={CLERK_KEY} signInUrl="/#signin" signUpUrl="/#signup">
            <App />
        </ClerkProvider>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <ConfigurationGuard />
        </React.StrictMode>
    );
}
