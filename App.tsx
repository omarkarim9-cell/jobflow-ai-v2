import React, { useState } from 'react';
import { analyzeSyncIssue } from './services/geminiService'; 
import { DiagnosticStep } from './types';
import CodeBlock from './components/CodeBlock';

/**
 * VERSION: 1.0.6 - DEPLOYMENT_VERIFIER
 * This version is 100% stripped of all legacy JobFlow imports.
 * If you see '1.0.6' in your browser, the Vercel update was successful.
 */

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const diagnostics = [
    { 
      step: DiagnosticStep.CLERK_AUTH, 
      status: 'success', 
      message: 'Clerk identifies you via Browser Cookies/JWT. Deleting Neon rows does NOT log you out.' 
    },
    { 
      step: DiagnosticStep.WEBHOOK_RECEPTION, 
      status: 'warning', 
      message: 'Connection Gap: Your Neon DB is not receiving signup events from Clerk.' 
    },
    { 
      step: DiagnosticStep.SESSION_VALIDATION, 
      status: 'error', 
      message: 'Ghost Data: You are seeing old data because your Clerk session is still active.' 
    }
  ];

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSyncIssue("User deleted Neon rows. Clerk session still active. New users not populating Neon.");
      setAnalysis(result);
    } catch (err) {
      console.error("Sync analysis failed:", err);
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
                Vercel Deploy Verifier: v1.0.6
              </span>
            </div>
            <h1 className="text-5xl font-black text-white tracking-tighter">
              Fix <span className="text-indigo-500">Sync Bridge</span>
            </h1>
            <p className="text-slate-400 mt-2 text-lg font-medium">Solving the Clerk-to-Neon data disconnect.</p>
          </div>
          
          <div className="bg-slate-900/50 p-4 rounded-2xl border border-slate-800 flex items-center gap-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-500 uppercase">System Status</p>
              <p className="text-xs font-bold text-white uppercase tracking-tight">Resolver Active</p>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[2.5rem] shadow-2xl">
              <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 text-center">Diagnostic Pipeline</h2>
              <div className="space-y-10">
                {diagnostics.map((d, i) => (
                  <div key={i} className="relative pl-10">
                    <div className="absolute left-[3px] top-2 bottom-[-40px] w-px bg-slate-800 last:hidden"></div>
                    <div className={`absolute left-0 top-2 h-2 w-2 rounded-full z-10 ${
                      d.status === 'success' ? 'bg-emerald-500' : d.status === 'error' ? 'bg-rose-500' : 'bg-amber-500'
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
                {isAnalyzing ? 'Processing Fix...' : 'Build Webhook Bridge'}
              </button>
            </div>

            <div className="bg-rose-500/5 border border-rose-500/10 p-8 rounded-[2rem] space-y-4">
              <h3 className="text-rose-400 font-bold text-xs uppercase tracking-widest">Crucial: Why you see old data</h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Deleting Neon rows <strong>does not delete the Clerk session</strong> in your browser. 
                <br/><br/>
                If you see "old user data" in the UI, your browser is still holding a <strong>valid Clerk JWT</strong>. Log out manually in your app to clear the cache.
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            {!analysis && !isAnalyzing ? (
              <div className="bg-slate-950 border-2 border-dashed border-slate-900 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[500px]">
                <div className="w-20 h-20 bg-indigo-500/5 rounded-full flex items-center justify-center mb-6 border border-indigo-500/10 text-indigo-500">
                  <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M11 4a2 2 0 114 0v1a1 1 0 001 1h3a1 1 0 011 1v3a1 1 0 01-1 1h-1a2 2 0 100 4h1a1 1 0 011 1v3a1 1 0 01-1 1h-3a1 1 0 01-1-1v-1a2 2 0 10-4 0v1a1 1 0 01-1 1H7a1 1 0 01-1-1v-3a1 1 0 00-1-1H4a2 2 0 110-4h1a1 1 0 001-1V7a1 1 0 011-1h3a1 1 0 001-1V4z" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Build The Fix</h3>
                <p className="text-slate-500 text-sm max-w-sm font-medium">The fix for your sync issue is a server-side webhook handler. Click the button to generate the required Next.js code.</p>
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
                    <div className="flex items-center justify-between mb-6">
                      <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">api/webhooks/clerk.ts</h2>
                      <span className="text-[10px] font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase tracking-widest">Next.js API Route</span>
                    </div>
                    <CodeBlock code={analysis.fixCode} language="typescript" />
                  </section>

                  <section>
                    <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-6">Vercel Environment Setup</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {analysis.recommendations.map((rec: string, i: number) => (
                        <div key={i} className="p-5 bg-slate-950 rounded-2xl border border-slate-900 text-slate-400 text-[11px] flex items-center gap-4 font-medium">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center font-bold text-indigo-500 border border-slate-800">{i+1}</div>
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
