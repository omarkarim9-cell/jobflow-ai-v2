import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App';
import { ExternalLink, Database, ShieldCheck, Zap, Lock, Info } from 'lucide-react';

/**
 * Enterprise-Grade Environment Variable Detection
 */
const getEnv = (key: string): string => {
    try {
        // 1. Check window.process.env (for platform injections)
        if (typeof window !== 'undefined' && (window as any).process?.env?.[key]) {
            return (window as any).process.env[key];
        }

        // 2. Check import.meta.env (for Vite environments)
        // @ts-ignore
        if (typeof import.meta !== 'undefined' && import.meta.env) {
            // @ts-ignore
            const v = import.meta.env[`VITE_${key}`] || import.meta.env[key];
            if (v && v !== 'undefined') return String(v);
        }

        // 3. Fallback to global process.env
        if (typeof process !== 'undefined' && process.env) {
            const p = process.env[`VITE_${key}`] || 
                      process.env[key] || 
                      process.env[key.toUpperCase()];
            if (p && p !== 'undefined') return String(p);
        }
    } catch (e) {
        console.warn(`Environment variable ${key} could not be read safely.`);
    }
    return "";
};

const ConfigurationGuard: React.FC = () => {
    const CLERK_KEY = getEnv('CLERK_PUBLISHABLE_KEY');
    const GEMINI_KEY = getEnv('API_KEY');

    const hasClerk = CLERK_KEY && CLERK_KEY.length > 25;
    const hasGemini = GEMINI_KEY && GEMINI_KEY.length > 20;
    const isConfigured = hasClerk && hasGemini;

    if (!isConfigured) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
                <div className="max-w-xl w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-500">
                    <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white shadow-xl transform -rotate-3">
                        <Zap className="w-10 h-10" />
                    </div>
                    
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight text-center">Complete Setup</h1>
                    <p className="text-slate-500 mb-8 text-center leading-relaxed text-sm">
                        To activate JobFlow AI on Vercel, you must add the following environment variables to your project settings.
                    </p>
                    
                    <div className="space-y-6 mb-8">
                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                <Zap className="w-3 h-3 mr-2" /> Frontend Keys (Unlocks UI)
                            </h3>
                            <div className="space-y-2">
                                <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${hasClerk ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${hasClerk ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block leading-none">VITE_CLERK_PUBLISHABLE_KEY</span>
                                            {!hasClerk && <a href="https://dashboard.clerk.com/" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center mt-1">Get from Clerk <ExternalLink className="w-2 h-2 ml-0.5" /></a>}
                                        </div>
                                    </div>
                                </div>

                                <div className={`flex items-center justify-between p-4 rounded-2xl border transition-colors ${hasGemini ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                    <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${hasGemini ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-700 block leading-none">API_KEY (Gemini AI)</span>
                                            {!hasGemini && <a href="https://aistudio.google.com/app/apikey" target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 hover:underline flex items-center mt-1">Get from Google <ExternalLink className="w-2 h-2 ml-0.5" /></a>}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center">
                                <Database className="w-3 h-3 mr-2" /> Backend Keys (Unlocks Database)
                            </h3>
                            <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                        <Lock className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">CLERK_SECRET_KEY</p>
                                        <p className="text-[10px] text-slate-500 leading-tight">Ensures secure authentication. Found in Clerk Dashboard API Keys.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="p-1.5 bg-white rounded-lg shadow-sm border border-slate-100">
                                        <Database className="w-4 h-4 text-indigo-600" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-slate-700">DATABASE_URL</p>
                                        <p className="text-[10px] text-slate-500 leading-tight">Connection string for Neon PostgreSQL. Ends with .neon.tech</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-slate-900 rounded-3xl p-6 text-white mb-8 shadow-lg">
                        <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-3 flex items-center">
                            <ShieldCheck className="w-3 h-3 mr-2" /> Deployment Steps
                        </h4>
                        <div className="space-y-4 text-xs text-slate-300 leading-relaxed">
                            <p>1. Open <strong>Vercel Dashboard &gt; Settings &gt; Environment Variables</strong>.</p>
                            <p>2. Add the <strong>4 Keys</strong> listed above exactly as shown.</p>
                            <p>3. Go to the <strong>Deployments</strong> tab and select <strong>Redeploy</strong>.</p>
                        </div>
                        <a 
                            href="https://vercel.com/dashboard" 
                            target="_blank" 
                            rel="noreferrer"
                            className="mt-6 block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-center text-sm font-bold transition-all shadow-xl shadow-indigo-600/20"
                        >
                            Open Vercel Dashboard
                        </a>
                    </div>

                    <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 mb-8">
                        <Info className="w-4 h-4 shrink-0" />
                        <p className="text-[10px] font-medium leading-tight">
                            Note: Backend keys (Secret/DB) are not checked by the UI for security reasons, but the app will crash if they are missing during login.
                        </p>
                    </div>

                    <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                        JobFlow AI &bull; Production v4.5
                    </p>
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