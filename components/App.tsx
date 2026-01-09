
import React, { useState } from 'react';
import { analyzeSyncIssue } from './services/geminiService';
import { DiagnosticResult, DiagnosticStep } from './types';
import CodeBlock from './components/CodeBlock';

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const [diagnostics] = useState<DiagnosticResult[]>([
    { step: DiagnosticStep.CLERK_AUTH, status: 'success', message: 'Clerk Dashboard: Webhook events ready.' },
    { step: DiagnosticStep.WEBHOOK_RECEPTION, status: 'warning', message: 'Endpoint api/webhooks/clerk.ts needs full verification logic.' },
    { step: DiagnosticStep.NEON_INSERTION, status: 'error', message: 'Neon DB columns (daily_ai_credits) not receiving data.' },
    { step: DiagnosticStep.SESSION_VALIDATION, status: 'error', message: 'Ghost Session detected: Valid JWT but missing DB Profile.' }
  ]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const logs = `
        Target: api/webhooks/clerk.ts
        Objective: Full SVIX verification + Neon profiles table mapping.
        Status: One-line placeholder code detected, need full file.
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
    <div className="max-w-7xl mx-auto px-6 py-12 font-sans selection:bg-blue-500/30">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
            Cloud Production Mode
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            JobFlow <span className="text-blue-500">Sync v2</span>
          </h1>
          <p className="text-slate-400 text-lg mt-2 max-w-xl leading-relaxed">
            Generating production-ready code for <strong>Vercel + GitHub</strong> deployments.
          </p>
        </div>
        
        <div className="flex flex-col gap-2">
           <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
             <span className="text-xs font-mono text-slate-300">NEON_DB_URL: [Set]</span>
           </div>
           <div className="bg-slate-800/50 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-3">
             <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse"></div>
             <span className="text-xs font-mono text-slate-300">CLERK_WEBHOOK_SECRET: [Pending]</span>
           </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-3xl p-8 border border-slate-700 shadow-2xl">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-8">Cloud Diagnostic</h2>
            <div className="space-y-8">
              {diagnostics.map((d, i) => (
                <div key={i} className="group relative pl-8 pb-2">
                  <div className="absolute left-0 top-0 bottom-0 w-px bg-slate-700"></div>
                  <div className={`absolute left-[-4px] top-1.5 h-2 w-2 rounded-full ${d.status === 'success' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]' : d.status === 'error' ? 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]' : 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]'}`}></div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-slate-300 uppercase tracking-wider mb-1">{d.step}</span>
                    <p className="text-xs text-slate-500 leading-relaxed font-medium">{d.message}</p>
                  </div>
                </div>
              ))}
            </div>

            <button 
              onClick={runAnalysis}
              disabled={isAnalyzing}
              className="w-full mt-10 py-4 px-6 bg-blue-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest transition-all hover:bg-blue-500 transform active:scale-[0.97] shadow-xl shadow-blue-500/20 disabled:opacity-50"
            >
              {isAnalyzing ? 'Building Webhook Code...' : 'Generate FULL Webhook Fix'}
            </button>
          </div>

          <div className="p-8 rounded-3xl bg-indigo-500/5 border border-indigo-500/10">
            <h3 className="text-indigo-400 font-bold mb-4 text-xs uppercase tracking-widest">Fixing Ghost Sessions</h3>
            <p className="text-xs text-slate-400 leading-relaxed mb-4">
              Since you're on Vercel, the "Stale Data" happens because Clerk is in the Cookie/JWT, but your <strong>profiles</strong> table is empty. 
            </p>
            <div className="bg-black/20 p-4 rounded-xl border border-slate-700 space-y-2">
               <div className="text-[10px] text-slate-500 font-bold uppercase mb-2">Next Step (Fix #2)</div>
               <p className="text-[10px] text-slate-300">Create a <code>middleware.ts</code> or update <code>Layout.tsx</code> to check for DB profile existence and redirect to a "Setup" flow if missing.</p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          {!analysis && !isAnalyzing && (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[2.5rem] p-16 text-center flex flex-col items-center justify-center min-h-[600px]">
              <div className="w-24 h-24 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-8 border border-blue-500/20">
                <svg className="w-12 h-12 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4 tracking-tight">Full Production Logic</h3>
              <p className="text-slate-500 max-w-sm text-sm leading-relaxed">
                Click the button to generate the complete <b>api/webhooks/clerk.ts</b> content. It will be a full file you can copy/paste.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="space-y-6 min-h-[600px] animate-pulse">
              <div className="h-8 bg-slate-800 rounded-full w-48"></div>
              <div className="h-[500px] bg-slate-800 rounded-[2.5rem]"></div>
            </div>
          )}

          {analysis && (
            <div className="bg-slate-800/30 backdrop-blur-xl rounded-[2.5rem] p-10 border border-slate-700 shadow-2xl animate-in zoom-in-95 duration-500">
              <div className="flex items-center justify-between mb-10">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-white tracking-tight leading-none uppercase">Full Webhook Handler</h2>
                    <p className="text-slate-500 text-xs mt-1 font-bold tracking-[0.3em] uppercase">Vercel & Neon Verified</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-12">
                <section>
                  <h3 className="text-[10px] font-black text-blue-400 uppercase tracking-[0.25em] mb-4">The Logic</h3>
                  <div className="p-6 bg-blue-500/5 rounded-3xl border border-blue-500/10">
                    <p className="text-slate-300 leading-relaxed text-lg italic">
                      {analysis.explanation}
                    </p>
                  </div>
                </section>

                <section>
                  <h3 className="text-[10px] font-black text-emerald-400 uppercase tracking-[0.25em] mb-4">Code: api/webhooks/clerk.ts</h3>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section className="bg-black/20 p-8 rounded-[2rem] border border-slate-700/50">
                  <h3 className="text-[10px] font-black text-amber-400 uppercase tracking-[0.25em] mb-6 underline decoration-amber-500/30 underline-offset-8">Vercel Setup Checklist</h3>
                  <div className="space-y-4">
                    {analysis.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="flex gap-4 items-start group">
                        <div className="h-6 w-6 rounded-lg bg-slate-800 flex items-center justify-center text-[10px] font-bold text-blue-400 border border-slate-700 group-hover:bg-blue-600 group-hover:text-white transition-all">{i + 1}</div>
                        <p className="text-slate-400 text-sm leading-relaxed">{rec}</p>
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
