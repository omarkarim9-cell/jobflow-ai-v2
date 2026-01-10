import React, { useState, useEffect } from 'react';
import { analyzeSyncIssue } from '../services/geminiService.ts';

// --- INLINED COMPONENTS ---

const CodeBlock = ({ code, title }: { code: string; title: string }) => (
  <div className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl my-6">
    <div className="bg-slate-900 px-6 py-3 border-b border-slate-800 flex justify-between items-center">
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{title}</span>
      <button 
        onClick={() => navigator.clipboard.writeText(code)}
        className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase"
      >
        Copy
      </button>
    </div>
    <pre className="p-6 text-sm font-mono text-indigo-100 overflow-x-auto leading-relaxed">
      <code>{code}</code>
    </pre>
  </div>
);

const App = () => {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const runRepair = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await analyzeSyncIssue("Clerk success / Neon fail. Stale session persists after row deletion.");
      setData(result);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-6 md:p-12 lg:p-20 flex flex-col items-center">
      <div className="w-full max-w-5xl">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-16 border-b border-slate-800 pb-12">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 border border-indigo-500/20 rounded-full">
              <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Diagnostic Tool v1.2.0</span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              JobFlow <span className="text-indigo-500">Sync Architect</span>
            </h1>
            <p className="text-slate-400 font-medium">Repairing the bridge between Clerk Auth and Neon Database.</p>
          </div>
          <button 
            onClick={runRepair}
            disabled={loading}
            className="px-8 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 active:scale-95"
          >
            {loading ? "Analyzing System..." : "Generate Repair Plan"}
          </button>
        </header>

        {error && (
          <div className="mb-12 p-6 bg-rose-500/10 border border-rose-500/20 rounded-3xl flex items-start gap-4 animate-in fade-in slide-in-from-top-4">
            <div className="w-10 h-10 rounded-full bg-rose-500/20 flex items-center justify-center flex-shrink-0">
              <span className="text-rose-500 font-bold">!</span>
            </div>
            <div>
              <h3 className="text-rose-500 font-black text-xs uppercase tracking-widest mb-1">System Error</h3>
              <p className="text-sm text-slate-400 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Content Area */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Dashboard Info */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] shadow-xl">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">System Analysis</h2>
              <div className="space-y-8">
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-xs font-bold text-indigo-500">1</div>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">Clerk manages sessions in your browser. Deleting DB rows does not invalidate Clerk Cookies.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-xs font-bold text-emerald-500">2</div>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">A missing webhook means Neon is never notified when a new user joins via Clerk.</p>
                </div>
                <div className="flex gap-4">
                  <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xs font-bold text-amber-500">3</div>
                  <p className="text-xs text-slate-400 leading-relaxed font-medium">Ghost profiles appear because the frontend reads from Clerk, not your empty database.</p>
                </div>
              </div>
            </div>

            <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem]">
              <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-2">Recommendation</p>
              <p className="text-xs text-slate-400 leading-relaxed">Log out of your application completely to clear the stale Clerk session after updating your database code.</p>
            </div>
          </div>

          {/* Solution Area */}
          <div className="lg:col-span-8">
            {!data && !loading ? (
              <div className="h-full min-h-[400px] border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center opacity-60">
                <div className="w-16 h-16 bg-slate-900 rounded-3xl border border-slate-800 flex items-center justify-center mb-6 text-slate-600">
                  <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Ready to Synchronize</h3>
                <p className="text-sm text-slate-500 max-w-xs">Generate the repair plan to fix your user onboarding flow and session persistence issues.</p>
              </div>
            ) : loading ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-6 bg-slate-900 rounded-full w-1/4"></div>
                <div className="h-48 bg-slate-900/50 rounded-[2rem]"></div>
                <div className="h-96 bg-slate-900 rounded-[2rem]"></div>
              </div>
            ) : (
              <div className="space-y-12 animate-in fade-in slide-in-from-bottom-8 duration-700">
                <section>
                  <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-6">The Root Cause</h2>
                  <div className="p-8 bg-indigo-500/5 border border-indigo-500/10 rounded-[2.5rem] text-slate-300 text-sm leading-relaxed font-medium">
                    {data.explanation}
                  </div>
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-6">Webhook Route Handler</h2>
                  <CodeBlock title="api/webhooks/clerk/route.ts" code={data.routeHandler} />
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-6">Implementation Steps</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {data.steps.map((step: string, i: number) => (
                      <div key={i} className="p-6 bg-slate-900/30 border border-slate-800 rounded-2xl flex gap-4 items-start">
                        <span className="text-indigo-500 font-black text-xs">{i+1}.</span>
                        <p className="text-xs text-slate-400 leading-relaxed font-medium">{step}</p>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;





