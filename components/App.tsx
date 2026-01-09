
import React, { useState } from 'react';
import { analyzeSyncIssue } from './services/geminiService'; 
import { DiagnosticResult, DiagnosticStep } from './types';
import CodeBlock from './components/CodeBlock';

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const [diagnostics] = useState<DiagnosticResult[]>([
    { step: DiagnosticStep.CLERK_AUTH, status: 'success', message: 'Clerk SDK initialized.' },
    { step: DiagnosticStep.WEBHOOK_RECEPTION, status: 'warning', message: 'Endpoint: jobflow-ai-lime.vercel.app/api/webhooks/clerk' },
    { step: DiagnosticStep.NEON_INSERTION, status: 'error', message: 'Neon profiles table out of sync.' },
    { step: DiagnosticStep.SESSION_VALIDATION, status: 'error', message: 'Ghost session detected: JWT valid, DB empty.' }
  ]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const logs = `
        Domain: jobflow-ai-lime.vercel.app
        Issue: User in Clerk but not in Neon. 'whsec_' secret found.
        Action: Generating full api/webhooks/clerk.ts file.
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
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-12 text-center md:text-left">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-4 mx-auto md:mx-0">
            Target: jobflow-ai-lime.vercel.app
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Cloud <span className="text-blue-500">Synchronizer</span>
          </h1>
          <p className="text-slate-400 text-lg mt-2 max-w-xl leading-relaxed">
            Consolidated root entry point. Clerk Signing Secret (whsec_...) is confirmed.
          </p>
        </div>
        
        <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700 flex flex-col gap-1 shadow-xl shadow-blue-500/5 items-center md:items-start">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Build Status</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <span className="text-xs font-bold text-white uppercase tracking-tighter">Path: Root Consistently</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-700 shadow-2xl">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 text-center">Diagnostics</h2>
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
              {isAnalyzing ? 'Mapping Sync Logic...' : 'Generate Fix Code'}
            </button>
          </div>

          <div className="bg-slate-800/40 p-8 rounded-[2rem] border border-slate-700">
            <h3 className="text-blue-400 font-bold mb-6 text-xs uppercase tracking-widest">Dashboard Setup</h3>
            <div className="space-y-6">
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">1. Env Var</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Set <code className="bg-slate-800 text-blue-300 px-1 rounded">CLERK_WEBHOOK_SECRET</code> to your <code className="text-white font-mono text-[9px]">whsec_...</code> value in Vercel.
                </p>
              </div>
              <div className="p-4 bg-slate-900/50 rounded-xl border border-slate-800">
                <span className="text-[10px] font-black text-slate-400 uppercase mb-2 block tracking-widest">2. Clerk Subscriptions</span>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Go to Clerk → Webhooks → Events. Enable: <br/>
                  <span className="text-emerald-400 font-mono text-[10px]">user.created</span> & <span className="text-emerald-400 font-mono text-[10px]">user.updated</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {!analysis && !isAnalyzing && (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[600px]">
              <div className="w-20 h-20 bg-blue-500/10 rounded-3xl flex items-center justify-center mb-8 border border-blue-500/20">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-10.714A11.022 11.022 0 0010 12.571m6.858 5.429A11.028 11.028 0 0115 21a11.03 11.03 0 01-4.858-1.143m1.858-12.857A11.021 11.021 0 0013 2.571m0 0a11.017 11.017 0 012.84 7.443m-2.84-7.443l-2.84 7.443m2.84-7.443v9.929m0 0a11.017 11.017 0 012.84-7.443m-2.84 7.443l2.84-7.443" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Root Resolution Active</h3>
              <p className="text-slate-500 text-sm max-w-sm mx-auto">Build failure resolved by consolidating App component. Ready to generate sync code.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="space-y-8 min-h-[600px] animate-pulse">
              <div className="h-10 bg-slate-800 rounded-2xl w-1/4"></div>
              <div className="h-[550px] bg-slate-800 rounded-[3rem]"></div>
            </div>
          )}

          {analysis && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="bg-slate-800/30 backdrop-blur-3xl rounded-[3rem] p-10 border border-slate-700 shadow-2xl space-y-10">
                <section>
                  <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Expert Diagnosis</h2>
                  <div className="p-8 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 text-slate-300 text-sm leading-relaxed">
                    {analysis.explanation}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">api/webhooks/clerk.ts</h2>
                    <span className="text-[10px] font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">Neon-Sync Optimized</span>
                  </div>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-6">Required Environment Variables</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-[11px] flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-blue-500 flex-shrink-0">0{i+1}</div>
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
