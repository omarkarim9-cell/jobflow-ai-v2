//app.tsx
import React, { useState } from 'react';
import { analyzeSyncIssue } from './services/geminiService'; // Fixed relative path
import { DiagnosticResult, DiagnosticStep } from './types';
import CodeBlock from './components/CodeBlock';

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const [diagnostics] = useState<DiagnosticResult[]>([
    { step: DiagnosticStep.CLERK_AUTH, status: 'success', message: 'Clerk App Secret is set in Vercel.' },
    { step: DiagnosticStep.WEBHOOK_RECEPTION, status: 'warning', message: 'Endpoint: jobflow-ai-lime.vercel.app/api/webhooks/clerk' },
    { step: DiagnosticStep.NEON_INSERTION, status: 'error', message: 'Database profiles table is out of sync.' },
    { step: DiagnosticStep.SESSION_VALIDATION, status: 'error', message: 'Ghost Session: Browser JWT is valid but Neon is empty.' }
  ]);

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const logs = `
        Domain: jobflow-ai-lime.vercel.app
        Issue: Build error resolved. Ready for full webhook generation.
        Goal: Sync Clerk users to Neon profiles table.
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
            Domain: jobflow-ai-lime.vercel.app
          </div>
          <h1 className="text-5xl font-black text-white tracking-tight">
            JobFlow <span className="text-blue-500">Cloud Fix</span>
          </h1>
          <p className="text-slate-400 text-lg mt-2 max-w-xl leading-relaxed">
            Generating the final production webhook for your <strong>profiles</strong> table.
          </p>
        </div>
        
        <div className="flex flex-col gap-3">
          <div className="bg-slate-800/80 px-4 py-2 rounded-xl border border-slate-700 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]"></div>
            <span className="text-[10px] font-bold text-slate-300 uppercase">Neon Sync: Active</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-slate-800/40 backdrop-blur-xl rounded-[2.5rem] p-8 border border-slate-700 shadow-2xl">
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-10 text-center">Cloud Health</h2>
            <div className="space-y-10">
              {diagnostics.map((d, i) => (
                <div key={i} className="group relative pl-10">
                  <div className="absolute left-[3px] top-0 bottom-[-40px] w-px bg-slate-700 group-last:bg-transparent"></div>
                  <div className={`absolute left-0 top-1.5 h-2 w-2 rounded-full z-10 ${
                    d.status === 'success' ? 'bg-emerald-500' : 
                    d.status === 'error' ? 'bg-red-500' : 'bg-amber-500'
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
              className="w-full mt-12 py-5 px-6 bg-blue-600 text-white rounded-[1.5rem] font-black text-sm uppercase tracking-widest transition-all hover:bg-blue-500 shadow-2xl shadow-blue-500/20 disabled:opacity-50"
            >
              {isAnalyzing ? 'Mapping Domain...' : 'Generate Full Sync Solution'}
            </button>
          </div>

          <div className="bg-blue-500/5 p-8 rounded-[2rem] border border-blue-500/10">
            <h3 className="text-blue-400 font-bold mb-4 text-xs uppercase tracking-widest">Setup Instructions</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              1. Copy the generated code below.<br/>
              2. Paste into <code>api/webhooks/clerk.ts</code>.<br/>
              3. In Clerk Dashboard, use:<br/>
              <code className="text-blue-300">https://jobflow-ai-lime.vercel.app/api/webhooks/clerk</code>
            </p>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-8">
          {!analysis && !isAnalyzing && (
            <div className="bg-slate-900/50 border-2 border-dashed border-slate-800 rounded-[3rem] p-20 text-center flex flex-col items-center justify-center min-h-[650px]">
              <h3 className="text-3xl font-bold text-white mb-4 tracking-tight">Full File Generation</h3>
              <p className="text-slate-500 max-w-md text-sm leading-relaxed">
                Ready to generate the complete handler for <b>jobflow-ai-lime.vercel.app</b>.
              </p>
            </div>
          )}

          {isAnalyzing && (
            <div className="space-y-10 min-h-[650px] animate-pulse">
              <div className="h-12 bg-slate-800 rounded-2xl w-1/3"></div>
              <div className="h-[500px] bg-slate-800 rounded-[3rem]"></div>
            </div>
          )}

          {analysis && (
            <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
              <div className="bg-slate-800/30 backdrop-blur-2xl rounded-[3rem] p-10 border border-slate-700 shadow-2xl space-y-12">
                <section>
                  <h2 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-4">Explanation</h2>
                  <div className="p-8 bg-blue-500/5 rounded-[2rem] border border-blue-500/10 text-slate-300 leading-relaxed">
                    {analysis.explanation}
                  </div>
                </section>

                <section>
                  <h2 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4">File: api/webhooks/clerk.ts</h2>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section>
                  <h2 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-6">Environment Variables Checklist</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="p-4 bg-slate-900/50 rounded-xl border border-slate-800 text-slate-400 text-xs">
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
