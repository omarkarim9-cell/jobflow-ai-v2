import React, { useState } from 'react';
import { analyzeSyncIssue } from './services/geminiService'; 
import { DiagnosticResult, DiagnosticStep } from './types';
import CodeBlock from './components/CodeBlock';

// VERSION: 1.0.2 - CLEAN BUILD (No AutomationModal)
const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const [diagnostics] = useState<DiagnosticResult[]>([
    { 
      step: DiagnosticStep.CLERK_AUTH, 
      status: 'success', 
      message: 'Clerk JWT is active. This is why the user "exists" even if Neon is empty.' 
    },
    { 
      step: DiagnosticStep.WEBHOOK_RECEPTION, 
      status: 'warning', 
      message: 'Missing Webhook: Clerk is not currently notifying Neon when users sign up.' 
    },
    { 
      step: DiagnosticStep.NEON_INSERTION, 
      status: 'error', 
      message: 'Database Mismatch: Clerk user ID has no matching row in "profiles" table.' 
    },
    { 
      step: DiagnosticStep.SESSION_VALIDATION, 
      status: 'error', 
      message: 'Ghost Session: Browser holds stale auth state from deleted database records.' 
    }
  ]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const logs = `
        Status: Build error resolved.
        Issue: Clerk user created but Neon 'profiles' row is missing.
        Sync: Need to implement SVIX-verified webhook for Next.js.
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
    <div className="max-w-7xl mx-auto px-6 py-12 font-sans selection:bg-blue-500/30 bg-slate-900 min-h-screen text-slate-100">
      <header className="mb-12 flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-800 pb-12">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold tracking-[0.2em] uppercase mb-4">
            Build Status: Clean & Verified
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Sync <span className="text-blue-500">Bridge</span>
          </h1>
          <p className="text-slate-400 text-lg mt-2 max-w-xl leading-relaxed">
            Fixing the Clerk-to-Neon pipeline and resolving stale session data.
          </p>
        </div>
        
        <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700 flex flex-col gap-1 shadow-2xl">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resolver Entry</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_#3b82f6]"></div>
            <span className="text-xs font-bold text-white tracking-tight uppercase">Root App Active</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-700 shadow-2xl">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 text-center">Diagnostic Pipeline</h2>
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
              {isAnalyzing ? 'Generating Fix...' : 'Repair Connection'}
            </button>
          </div>

          <div className="bg-amber-500/5 p-8 rounded-[2rem] border border-amber-500/10 space-y-6">
            <h3 className="text-amber-400 font-bold text-xs uppercase tracking-widest">Stale Session Warning</h3>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If you deleted Neon rows, your browser still has a <strong>Clerk JWT</strong>. The app thinks you are logged in, but has no data to show.
              <br/><br/>
              To fix: Click <strong>"Sign Out"</strong> in your JobFlow app or clear cookies for <code>jobflow-ai-lime.vercel.app</code>.
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {!analysis && !isAnalyzing && (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[600px]">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6 border border-blue-500/20">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">Vercel Build Conflict Resolved</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">The phantom "AutomationModal" import was removed. Use the tool to generate the Neon sync webhook.</p>
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
                  <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Repair Instructions</h2>
                  <div className="p-8 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 text-slate-300 text-sm leading-relaxed">
                    {analysis.explanation}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">app/api/webhooks/clerk/route.ts</h2>
                    <span className="text-[10px] font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20 uppercase">Next.js Route Handler</span>
                  </div>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-6">Environment Variables</h2>
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
