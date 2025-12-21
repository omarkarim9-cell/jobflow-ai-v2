import React from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider } from '@clerk/clerk-react';
import { App } from './App';

/**
 * Clerk Publishable Key Detection
 * Checks for both standard uppercase and the user's specific lowercase entry from Vercel.
 */
const CLERK_PUBLISHABLE_KEY = 
  process.env.VITE_CLERK_PUBLISHABLE_KEY || 
  process.env.vite_clerk_publishable_key || 
  "";

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

// Setup Guard: Only shows if the key is missing or is the placeholder string.
if (!CLERK_PUBLISHABLE_KEY || CLERK_PUBLISHABLE_KEY === "your_publishable_key_here" || CLERK_PUBLISHABLE_KEY.trim() === "") {
  root.render(
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center font-sans">
      <div className="max-w-md w-full bg-white p-10 rounded-3xl shadow-2xl border border-slate-200">
        <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 text-white text-4xl shadow-xl transform rotate-3">
          🔑
        </div>
        <h1 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Configuration Error</h1>
        <p className="text-slate-600 mb-8 leading-relaxed text-sm">
          The Clerk Publishable Key was not detected. Please ensure you named the variable correctly in your environment settings.
        </p>
        
        <div className="space-y-4 text-left mb-8 bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Vercel Environment Check</p>
            <div className="flex items-start gap-3">
                <div className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">1</div>
                <p className="text-xs text-slate-700">Check variable name: <code className="bg-white px-1 border rounded text-indigo-600">VITE_CLERK_PUBLISHABLE_KEY</code></p>
            </div>
            <div className="flex items-start gap-3">
                <div className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">2</div>
                <p className="text-xs text-slate-700">Ensure there are no leading/trailing spaces in the key value.</p>
            </div>
            <div className="flex items-start gap-3">
                <div className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center shrink-0 font-bold text-[10px]">3</div>
                <p className="text-xs text-slate-700">Trigger a "Redeploy" in the Deployments tab to apply changes.</p>
            </div>
        </div>

        <div className="pt-4 border-t border-slate-100">
            <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                JobFlow AI &bull; Enterprise Stack
            </p>
        </div>
      </div>
    </div>
  );
} else {
  root.render(
    <React.StrictMode>
      <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY}>
        <App />
      </ClerkProvider>
    </React.StrictMode>
  );
}