
import React, { useState } from 'react';
import { analyzeSyncIssue } from '../services/geminiService'; 
import { DiagnosticResult, DiagnosticStep } from './types';
import CodeBlock from './components/CodeBlock';

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const [diagnostics] = useState<DiagnosticResult[]>([
    { step: DiagnosticStep.CLERK_AUTH, status: 'success', message: 'Clerk SDK initialized.' },
    { step: DiagnosticStep.WEBHOOK_RECEPTION, status: 'warning', message: 'Endpoint: jobflow-ai-lime.vercel.app/api/webhooks/clerk' },
    { step: DiagnosticStep.NEON_INSERTION, status: 'error', message: 'Table "profiles" sync logic required.' },
    { step: DiagnosticStep.SESSION_VALIDATION, status: 'error', message: 'Ghost session detected: JWT exists, DB record missing.' }
  ]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const logs = `
        Domain: jobflow-ai-lime.vercel.app
        Issue: Build error fix applied. Generating final webhook.
        Database: Neon PostgreSQL (profiles table)
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
            Instance: jobflow-ai-v2
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            Sync <span className="text-blue-500 font-outline-2">Engine</span>
          </h1>
          <p className="text-slate-400 text-lg mt-2 max-w-xl leading-relaxed">
            Deployment Fix for <strong>jobflow-ai-lime.vercel.app</strong>
          </p>
        </div>
        
        <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700 flex flex-col gap-1 shadow-xl shadow-blue-500/5">
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Build Resolution</span>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981]"></div>
            <span className="text-xs font-bold text-white">Import: ../services/geminiService</span>
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
              {isAnalyzing ? 'Mapping Production Fix...' : 'Generate Sync Solution'}
            </button>
          </div>

          <div className="bg-blue-600/5 p-8 rounded-[2rem] border border-blue-500/10">
            <h3 className="text-blue-400 font-bold mb-4 text-xs uppercase tracking-widest flex items-center gap-2">
              Env Setup Guide
            </h3>
            <div className="space-y-4">
              <p className="text-[11px] text-slate-400 leading-relaxed">
                • <strong>DATABASE_URL</strong>: Neon Connection String.<br/>
                • <strong>CLERK_WEBHOOK_SECRET</strong>: From Clerk Webhook settings.<br/>
                • <strong>CLERK_SECRET_KEY</strong>: Your Clerk API Key.
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {!analysis && !isAnalyzing && (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[600px]">
              <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">Build Ready</h3>
              <p className="text-slate-500 text-sm max-w-xs mx-auto">Click generate to receive the production-ready code for your Clerk Webhook.</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="space-y-8 min-h-[600px] animate-pulse">
              <div className="h-10 bg-slate-800 rounded-2xl w-1/4"></div>
              <div className="h-[500px] bg-slate-800 rounded-[3rem]"></div>
            </div>
          )}

          {analysis && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
              <div className="bg-slate-800/30 backdrop-blur-3xl rounded-[3rem] p-10 border border-slate-700 shadow-2xl space-y-10">
                <section>
                  <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-6">Root Cause & Logic</h2>
                  <div className="p-8 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 text-slate-300 text-sm leading-relaxed">
                    {analysis.explanation}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Update: api/webhooks/clerk.ts</h2>
                    <span className="text-[10px] font-bold text-emerald-500 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">Ready for Vercel</span>
                  </div>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-6">Environment Variables</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="p-5 bg-slate-900/50 rounded-2xl border border-slate-800 text-slate-400 text-xs flex items-center gap-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center font-bold text-blue-400">0{i+1}</div>
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
