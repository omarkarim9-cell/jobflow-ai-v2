import React, { useEffect, useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App';
import { ExternalLink, Database, ShieldCheck, Zap, Lock, Info, RefreshCcw, AlertCircle, Bug } from 'lucide-react';

/**
 * Hardened Environment Variable Detection
 * Vite standard: import.meta.env.VITE_VARIABLE_NAME
 */
const getEnv = (key: string): string => {
    const viteKey = `VITE_${key}`;
    
    // @ts-ignore - Check Vite standard first
    const meta = import.meta.env;
    if (meta && meta[viteKey]) return String(meta[viteKey]);
    if (meta && meta[key]) return String(meta[key]);

    // Check window/process for edge cases or non-Vite environments
    try {
        const winEnv = (window as any).process?.env || {};
        if (winEnv[viteKey]) return winEnv[viteKey];
        if (winEnv[key]) return winEnv[key];
        
        // Final fallback to checking if Vite defined it in the global scope
        if (typeof process !== 'undefined' && process.env) {
            return process.env[viteKey] || process.env[key] || "";
        }
    } catch (e) {}
    
    return "";
};

const CLERK_KEY = getEnv('CLERK_PUBLISHABLE_KEY');
const GEMINI_KEY = getEnv('API_KEY');

// Log status for developer debugging (visible in browser console)
console.log('--- JobFlow AI Configuration Debug ---');
console.log('Clerk Key Detected:', CLERK_KEY ? 'YES (Starts with ' + CLERK_KEY.substring(0, 8) + '...)' : 'NO');
console.log('Gemini Key Detected:', GEMINI_KEY ? 'YES (Length: ' + GEMINI_KEY.length + ')' : 'NO');
console.log('---------------------------------------');

// Inject into process.env for @google/genai SDK compatibility
if (typeof window !== 'undefined') {
    (window as any).process = (window as any).process || { env: {} };
    if (GEMINI_KEY) {
        (window as any).process.env.API_KEY = GEMINI_KEY;
    }
}

const ConfigurationGuard: React.FC = () => {
    const [isChecking, setIsChecking] = useState(false);
    
    const hasClerk = CLERK_KEY && CLERK_KEY.length > 25;
    const hasGemini = GEMINI_KEY && GEMINI_KEY.length > 20;
    const isConfigured = hasClerk && hasGemini;

    const handleRefresh = () => {
        setIsChecking(true);
        window.location.reload();
    };

    if (!isConfigured) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-xl w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl transform -rotate-3">
                        <Zap className="w-10 h-10" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight text-center">Finalizing Connection</h1>
                    <p className="text-slate-500 mb-8 text-center leading-relaxed text-sm">
                        You've updated the variable names, but the browser isn't seeing them yet. This usually means a <strong>Redeploy</strong> is needed on Vercel.
                    </p>
                    
                    <div className="space-y-4 mb-8">
                        <div className={`p-5 rounded-2xl border flex flex-col gap-3 transition-all ${hasClerk ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${hasClerk ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`}></div>
                                    <span className="text-sm font-bold text-slate-700">Clerk Auth</span>
                                </div>
                                {hasClerk ? <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active</span> : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Missing</span>}
                            </div>
                            {!hasClerk && (
                                <div className="text-[10px] text-slate-500 font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    Expected: VITE_CLERK_PUBLISHABLE_KEY
                                </div>
                            )}
                        </div>

                        <div className={`p-5 rounded-2xl border flex flex-col gap-3 transition-all ${hasGemini ? 'bg-green-50 border-green-200' : 'bg-white border-slate-200 shadow-sm'}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${hasGemini ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]' : 'bg-slate-300'}`}></div>
                                    <span className="text-sm font-bold text-slate-700">Gemini AI</span>
                                </div>
                                {hasGemini ? <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Active</span> : <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Missing</span>}
                            </div>
                            {!hasGemini && (
                                <div className="text-[10px] text-slate-500 font-mono bg-slate-50 p-3 rounded-xl border border-slate-100">
                                    Expected: VITE_API_KEY
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8">
                        <div className="flex gap-3 mb-3">
                            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                            <div className="text-xs text-amber-800 font-bold">Important Deployment Note</div>
                        </div>
                        <p className="text-xs text-amber-700 leading-relaxed ps-8">
                            Environment variables in Vite are "baked in" during the build process. Adding them to Vercel settings doesn't change a running app. You must <strong>Trigger a Redeploy</strong> to inject the new keys.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={handleRefresh}
                            disabled={isChecking}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            {isChecking ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <RefreshCcw className="w-4 h-4" />}
                            I've Redeployed, Refresh
                        </button>
                        <a 
                            href="https://vercel.com/dashboard" 
                            target="_blank" 
                            rel="noreferrer"
                            className="p-4 bg-white border border-slate-200 text-slate-600 rounded-2xl hover:bg-slate-50 transition-all"
                            title="Vercel Dashboard"
                        >
                            <ExternalLink className="w-5 h-5" />
                        </a>
                    </div>
                    
                    <div className="mt-8 pt-8 border-t border-slate-100 flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        <Bug className="w-3 h-3" /> Check Browser Console for Logs
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