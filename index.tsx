import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App';

/**
 * Robust Environment Variable Detection
 * Checks Vite's native 'import.meta.env' as well as the standard 'process.env'.
 * This is the most common reason for "Missing Key" errors in Vercel/Vite builds.
 */
const getEnv = (key: string) => {
    // 1. Try standard Vite (Standard for Vercel React apps)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env) {
        // @ts-ignore
        const viteVal = import.meta.env[`VITE_${key}`] || import.meta.env[key];
        if (viteVal) return viteVal;
    }

    // 2. Try process.env shim
    const processVal = process.env[`VITE_${key}`] || 
                      process.env[key] || 
                      process.env[key.toLowerCase()] || 
                      process.env[`NEXT_PUBLIC_${key}`];
    
    return processVal || "";
};

const CLERK_KEY = getEnv('CLERK_PUBLISHABLE_KEY');
const GEMINI_KEY = getEnv('API_KEY');
const DB_URL = getEnv('DATABASE_URL');

// Logic check: A Clerk key is usually > 30 chars and starts with 'pk_'
const isConfigured = CLERK_KEY && CLERK_KEY.trim().length > 20;

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error("Root element missing");

const root = ReactDOM.createRoot(rootElement);

if (!isConfigured) {
  root.render(
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-lg w-full bg-white p-10 rounded-[2.5rem] shadow-2xl border border-slate-200">
        <div className="w-24 h-24 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 text-white shadow-2xl transform -rotate-3">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/></svg>
        </div>
        
        <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight text-center">Configuration Required</h1>
        <p className="text-slate-500 mb-10 text-center leading-relaxed">
          JobFlow AI is connected to GitHub, but we need your API keys from the Vercel Dashboard to continue.
        </p>
        
        <div className="space-y-3 mb-10">
            <div className={`flex items-center justify-between p-4 rounded-2xl border ${CLERK_KEY ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${CLERK_KEY ? 'bg-green-500' : 'bg-red-500 animate-pulse'}`}></div>
                    <span className="text-sm font-bold text-slate-700">Clerk Auth Key</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${CLERK_KEY ? 'text-green-600' : 'text-red-600'}`}>
                    {CLERK_KEY ? 'Detected' : 'Not Found'}
                </span>
            </div>

            <div className={`flex items-center justify-between p-4 rounded-2xl border ${GEMINI_KEY ? 'bg-green-50 border-green-100' : 'bg-slate-50 border-slate-200'}`}>
                <div className="flex items-center gap-3">
                    <div className={`w-2 h-2 rounded-full ${GEMINI_KEY ? 'bg-green-500' : 'bg-slate-300'}`}></div>
                    <span className="text-sm font-bold text-slate-700">Gemini AI Key</span>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest ${GEMINI_KEY ? 'text-green-600' : 'text-slate-400'}`}>
                    {GEMINI_KEY ? 'Verified' : 'Pending'}
                </span>
            </div>
        </div>

        <div className="bg-slate-900 rounded-3xl p-6 text-white mb-8 shadow-xl">
            <h4 className="text-xs font-bold text-indigo-400 uppercase tracking-widest mb-2">Instructions for Vercel</h4>
            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
                1. Go to <strong>Settings > Environment Variables</strong>.<br/>
                2. Add <code className="text-white bg-white/10 px-1 rounded">VITE_CLERK_PUBLISHABLE_KEY</code>.<br/>
                3. Add <code className="text-white bg-white/10 px-1 rounded">API_KEY</code>.<br/>
                4. Go to <strong>Deployments</strong> and click <strong>Redeploy</strong>.
            </p>
            <a 
                href="https://vercel.com/dashboard" 
                target="_blank" 
                rel="noreferrer"
                className="block w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-center text-sm font-bold transition-all"
            >
                Open Vercel Dashboard
            </a>
        </div>

        <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
            JobFlow AI &bull; Deployment Sync v3.1
        </p>
      </div>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_KEY}>
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}