
import React, { useState } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App';
import { Zap, RefreshCcw, AlertCircle } from 'lucide-react';
import './index.css';

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
    
    // Access key validation
    const isConfigured = (CLERK_KEY?.length > 10);

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
                    
                    <h1 className="text-3xl font-black text-slate-900 mb-2 tracking-tight text-center">Cloud Access Required</h1>
                    <p className="text-slate-500 mb-8 text-center leading-relaxed text-sm">
                        To run the platform, your Clerk Publishable Key must be configured in your environment variables.
                    </p>
                    
                    <div className="bg-amber-50 border border-amber-100 rounded-2xl p-5 mb-8 flex gap-4">
                        <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                        <p className="text-xs text-amber-800 leading-relaxed font-medium">
                            <strong>Configuration Required:</strong> Ensure VITE_CLERK_PUBLISHABLE_KEY is set in your environment.
                        </p>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={handleRefresh}
                            className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-sm font-bold hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                        >
                            <RefreshCcw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                            Retry Initialization
                        </button>
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
