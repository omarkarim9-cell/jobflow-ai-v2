import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App';
import { Zap, RefreshCcw, AlertCircle, ExternalLink } from 'lucide-react';

/**
 * Enhanced Environment Variable Detection
 */
const getEnv = (key: string): string => {
    const viteKey = `VITE_${key}`;
    
    // @ts-ignore - Vite environment
    const meta = import.meta.env;
    if (meta && meta[viteKey]) return String(meta[viteKey]);
    
    // Fallback for non-Vite contexts
    try {
        const globalEnv = (window as any).process?.env || {};
        return globalEnv[viteKey] || globalEnv[key] || "";
    } catch (e) {
        return "";
    }
};

const CLERK_KEY = getEnv('CLERK_PUBLISHABLE_KEY');
const GEMINI_KEY = getEnv('API_KEY');

// Ensure process.env.API_KEY is available for the @google/genai SDK
if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
    if (GEMINI_KEY) (window as any).process.env.API_KEY = GEMINI_KEY;
}

const ConfigurationGuard: React.FC = () => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    
    const isConfigured = (CLERK_KEY?.length > 20) && (GEMINI_KEY?.length > 20);

    const handleRefresh = () => {
        setIsRefreshing(true);
        window.location.reload();
    };

    if (!isConfigured) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-xl w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl transform -rotate-3">
                        <Zap className="w-10 h-10" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight text-center">Connection Required</h1>
                    <p className="text-slate-500 mb-8 text-center leading-relaxed text-sm">
                        To run the platform, your secure access keys must be configured in the environment.
                    </p>
                    
                    <div className="space-y-3 mb-8">
                        <div className={`p-4 rounded-2xl border flex items-center justify-between ${CLERK_KEY ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                            <span className="text-xs font-bold uppercase tracking-widest">Identity Service</span>
                            {CLERK_KEY ? <span className="text-[10px] font-black uppercase">Linked</span> : <span className="text-[10px] font-black uppercase">Missing</span>}
                        </div>
                        <div className={`p-4 rounded-2xl border flex items-center justify-between ${GEMINI_KEY ? 'bg-green-50 border-green-200 text-green-700' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                            <span className="text-xs font-bold uppercase tracking-widest">Intelligence Service</span>
                            {GEMINI_KEY ? <span className="text-[10px] font-black uppercase">Linked</span> : <span className="text-[10px] font-black uppercase">Missing</span>}
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8 flex gap-4">
                        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                            <strong>Note:</strong> Configuration changes require a <strong>Platform Refresh</strong> to take effect in your session.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={handleRefresh}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Refresh Platform
                        </button>
                        <a 
                            href="https://vercel.com/dashboard" 
                            target="_blank" 
                            className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <React.StrictMode>
            <ClerkProvider publishableKey={CLERK_KEY}>
                <App />
            </ClerkProvider>
        </React.StrictMode>
    );
};

const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<ConfigurationGuard />);
}