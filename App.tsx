import React, { useState, useEffect } from 'react';
import { analyzeSyncIssue } from './services/geminiService';

/**
 * VERSION: 1.0.9 - RUNTIME_KEY_FIX
 * This version moves AI initialization to the function level to avoid early crashes.
 */

// --- INLINED TYPES ---
enum DiagnosticStep {
  CLERK_AUTH = 'Clerk Authentication',
  WEBHOOK_RECEPTION = 'Webhook Reception',
  NEON_INSERTION = 'Neon DB Insertion',
  SESSION_VALIDATION = 'Session Validation'
}

// --- INLINED COMPONENTS ---
const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'typescript' }) => {
  return (
    <div className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 my-6 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
        <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">{language}</span>
        <button 
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
        >
          Copy
        </button>
      </div>
      <pre className="p-6 overflow-x-auto font-mono text-sm leading-relaxed text-indigo-100/90">
        <code>{code}</code>
      </pre>
    </div>
  );
};

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("App Component Rendered - Version 1.0.9");
  }, []);
  
  const diagnostics = [
    { 
      step: DiagnosticStep.CLERK_AUTH, 
      status: 'success', 
      message: 'Active session found in Browser Cookies. (This is why data persists even if Neon is empty).' 
    },
    { 
      step: DiagnosticStep.NEON_INSERTION, 
      status: 'error', 
      message: 'Neon Database rows were deleted, but the Webhook bridge is not re-populating them.' 
    },
    { 
      step: DiagnosticStep.SESSION_VALIDATION, 
      status: 'warning', 
      message: 'Stale State: You are seeing Clerk data, not Neon data. Logout required.' 
    }
  ];

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeSyncIssue("Clerk-to-Neon disconnect logic. Addressing why deletion in Neon doesn't affect Clerk cookies.");
      setAnalysis(result);
    } catch (err: any) {
      console.error("Sync analysis failed:", err);
      setError(err?.message || "An unexpected error occurred during analysis.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans selection:bg-indigo-500/30">
      <div className="max-w-6xl mx-auto px-6 py-12">
        <header className="mb-16 flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b border-slate-800 pb-12">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <span className="px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full text-indigo-400 text-[10px] font-black tracking-widest uppercase">
                Vercel Deploy: v1.0.9 (Fixed Initialization)
              </span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              Repair <span className="text-indigo-500">The Bridge</span>
            </h1>
            <p className="text-slate-400 mt-2 text-lg font-medium">Clerk Auth → Neon Database Synchronization</p>
          </div>
          
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase">Status</p>
              <p className="text-xs font-bold text-white uppercase tracking-tight">Runtime Verified</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs font-bold uppercase tracking-wider">
            Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10">Current Diagnostics</h2>
              <div className="space-y-10">
                {diagnostics.map((d, i) => (
                  <div key={i} className="relative pl-10">
                    <div className="absolute left-[3px] top-2 bottom-[-40px] w-px bg-slate-800 last:hidden"></div>
                    <div className={`absolute left-0 top-2 h-2 w-2 rounded-full z-10 ${
                      d.status === 'success' ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 
                      d.status === 'error' ? 'bg-rose-500 shadow-[0_0_10px_#ef4444]' : 'bg-amber-500'
                    }`}></div>
                    <p className="text-xs font-black text-slate-100 uppercase tracking-wider mb-1">{d.step}</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{d.message}</p>
                  </div>
                ))}
              </div>

              <button 
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-12 py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all active:scale-[0.97] disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing Sync...' : 'Get Webhook Fix'}
              </button>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/10 p-8 rounded-[2rem] space-y-4">
              <h3 className="text-amber-500 font-bold text-xs uppercase tracking-widest">Wait, Why old data?</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Deleting database rows in Neon <strong>does not</strong> sign you out of Clerk. 
                <br/><br/>
                Your browser is still "Authenticated" via a Clerk Cookie. When the app loads, it sees that cookie and shows your profile info from Clerk's servers, even if your local Neon table is 100% empty.
                <br/><br/>
                <strong>To fix:</strong> Sign out, then implement the Webhook bridge below.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            {!analysis && !isAnalyzing ? (
              <div className="bg-slate-950 border-2 border-dashed border-slate-900 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mb-6 border border-indigo-500/10 text-indigo-500">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Sync Engine Ready</h3>
                <p className="text-slate-500 text-sm max-w-sm font-medium">Click the diagnostic button to generate the Clerk Webhook handler that will automatically populate your Neon DB when a user signs up.</p>
              </div>
            ) : isAnalyzing ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-10 bg-slate-900 rounded-xl w-1/4"></div>
                <div className="h-[450px] bg-slate-900 rounded-[2.5rem]"></div>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-500">
                <div className="bg-slate-900/30 border border-slate-800 p-10 rounded-[3rem] shadow-2xl space-y-10">
                  <section>
                    <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">Repair Instructions</h2>
                    <div className="p-8 bg-indigo-500/5 rounded-[2rem] border border-indigo-500/10 text-slate-300 text-sm leading-relaxed font-medium">
                      {analysis.explanation}
                    </div>
                  </section>

                  <section>
                    <div className="flex items-center justify-between mb-2">
                      <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">api/webhooks/clerk.ts</h2>
                      <span className="text-[9px] font-bold text-slate-500 uppercase tracking-[0.2em]">Next.js Route Handler</span>
                    </div>
                    <CodeBlock code={analysis.fixCode} language="typescript" />
                  </section>

                  <section>
                    <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-6">Environment Variables</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="p-5 bg-slate-950 rounded-2xl border border-slate-900 text-slate-400 text-[11px] flex items-center gap-4 font-mono">
                          <div className="w-6 h-6 rounded-lg bg-slate-900 flex items-center justify-center font-bold text-indigo-500 border border-slate-800">{i+1}</div>
                          {rec}
                        </div>
                      ))}
                    </div>
                  </section>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
