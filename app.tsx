
import React, { useState, useEffect } from 'react';
import { analyzeSyncIssue } from './services/geminiService'; 
import { DiagnosticResult, DiagnosticStep } from './types';
import CodeBlock from './components/CodeBlock';

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [buildTime] = useState(new Date().toLocaleTimeString());
  
  const [diagnostics] = useState<DiagnosticResult[]>([
    { 
      step: DiagnosticStep.CLERK_AUTH, 
      status: 'success', 
      message: 'Browser has valid Clerk JWT. User appears "logged in" regardless of DB state.' 
    },
    { 
      step: DiagnosticStep.WEBHOOK_RECEPTION, 
      status: 'warning', 
      message: 'Waiting for POST requests at /api/webhooks/clerk from Clerk Dashboard.' 
    },
    { 
      step: DiagnosticStep.NEON_INSERTION, 
      status: 'error', 
      message: 'Mismatch detected: Clerk ID exists, but no corresponding row in Neon "profiles" table.' 
    },
    { 
      step: DiagnosticStep.SESSION_VALIDATION, 
      status: 'error', 
      message: 'Ghost Session Active: The UI shows data from local cache/cookies, not the current DB.' 
    }
  ]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const logs = `
        Issue: Clerk user created, Neon profile missing.
        Sync Logic: Needs svix-verified webhook endpoint in Next.js/Vercel.
        Session: Browser session persists because Clerk does not check Neon on every page load.
        Database: Neon profiles table uses clerk_user_id as external reference.
      `;
      const result = await analyzeSyncIssue(logs);
      setAnalysis(result);
    } catch (err) {
      console.error("Analysis failed", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-12 font-sans selection:bg-blue-600/30">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
            Build Fingerprint: {buildTime}
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Sync <span className="text-blue-500">Bridge</span>
          </h1>
          <p className="text-slate-400 text-lg mt-2 max-w-xl leading-relaxed">
            Eliminating the gap between <strong>Clerk Authentication</strong> and your <strong>Neon Database</strong>.
          </p>
        </div>
        
        <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700 flex flex-col gap-1 shadow-2xl">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Health</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <span className="text-xs font-bold text-white tracking-tight uppercase tracking-widest">Root Entry Active</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-700 shadow-2xl">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 text-center">Diagnostic Logs</h2>
            <div className="space-y-10">
              {diagnostics.map((d, i) => (
                <div key={i} className="group relative pl-10">
                  <div className="absolute left-[3px] top-0 bottom-[-40px] w-px bg-slate-700 group-last:bg-transparent"></div>
                  <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full z-10 ${
                    d.status === 'success' ? 'bg-emerald-500 shadow-[0_0_12px_#10b981]' : 
                    d.status === 'error' ? 'bg-red-500 shadow-[0_0_12px_#ef4444]' : 'bg-amber-500 shadow-[0_0_12px_#f59e0b]'
                  }`}></div>
                  <div className="flex flex-col">
                    <span className="text-[11px] font-black text-slate-200 uppercase tracking-wider mb-2">{d.step}</span>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{d.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="w-full mt-12 py-5 px-6 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all hover:bg-blue-500 transform active:scale-[0.97] shadow-2xl shadow-blue-500/20 disabled:opacity-50"
            >
              {isAnalyzing ? 'Mapping Fix Strategy...' : 'Resolve Data Sync'}
            </button>
          </div>

          <div className="bg-blue-500/5 p-8 rounded-[2rem] border border-blue-500/10 space-y-6">
            <h3 className="text-blue-400 font-bold text-xs uppercase tracking-widest">Handling Ghost Sessions</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              When you delete data in <strong>Neon</strong>, Clerk remains unaware. Your browser keeps the <strong>active session cookie</strong>.
              <br/><br/>
              <strong className="text-white">The Fix:</strong> 
              1. Sign Out in the app UI to clear the JWT.<br/>
              2. Use the Webhook generated on the right to automate DB creation on sign-up.
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {!analysis && !isAnalyzing && (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[600px]">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Sync Infrastructure Ready</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Build conflict resolved. All imports are now pointing to the correct root files.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="space-y-8 min-h-[600px] animate-pulse">
              <div className="h-10 bg-slate-800 rounded-2xl w-1/4"></div>
              <div className="h-[550px] bg-slate-800 rounded-[3rem]"></div>
            </div>
          )}

          {analysis && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="bg-slate-800/30 backdrop-blur-3xl rounded-[3rem] p-10 border border-slate-700 shadow-2xl space-y-10">
                <section>
                  <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Repair Summary</h2>
                  <div className="p-8 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 text-slate-300 text-sm leading-relaxed">
                    {analysis.explanation}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Required File: app/api/webhooks/clerk/route.ts</h2>
                    <span className="text-[10px] font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase">Next.js App Router Fix</span>
                  </div>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-6">Vercel Environment Setup</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-[11px] flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-blue-500 flex-shrink-0">{i+1}</div>
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
  );
};

export default App;
