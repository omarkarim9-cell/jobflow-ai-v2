import React, { useState } from 'react';
import { analyzeSyncIssue } from './services/geminiService.ts'; 
import { DiagnosticStep } from './types.ts';
import CodeBlock from './components/CodeBlock.tsx';

/**
 * VERSION: 1.0.7 - BUILD_FIX
 * If you see this version, Vercel has successfully bypassed the resolution error.
 */

const App: React.FC = () => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  
  const diagnostics = [
    { 
      step: DiagnosticStep.CLERK_AUTH, 
      status: 'success', 
      message: 'Clerk session is active in your browser cookies.' 
    },
    { 
      step: DiagnosticStep.NEON_INSERTION, 
      status: 'error', 
      message: 'Database is empty. The Webhook bridge is likely missing.' 
    },
    { 
      step: DiagnosticStep.SESSION_VALIDATION, 
      status: 'warning', 
      message: 'Ghost Data Alert: Sign out and back in to clear stale browser state.' 
    }
  ];

  const runAnalysis = async () => {
    setIsAnalyzing(true);
    try {
      const result = await analyzeSyncIssue("Build failure fixed. Now addressing the Clerk-to-Neon webhook requirements.");
      setAnalysis(result);
    } catch (err) {
      console.error("Sync analysis failed:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        <header className="mb-12 border-b border-slate-800 pb-8 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="bg-blue-500 w-2 h-2 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-bold text-blue-400 uppercase tracking-[0.2em]">Build 1.0.7 Verified</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Sync <span className="text-blue-500">Diagnostics</span></h1>
          </div>
          <div className="bg-slate-900 px-6 py-3 rounded-2xl border border-slate-800">
            <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Database Provider</p>
            <p className="text-sm font-bold text-white uppercase tracking-tighter">Neon PostgreSQL</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="space-y-6">
            <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800 shadow-2xl">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Pipeline Health</h2>
              <div className="space-y-8">
                {diagnostics.map((d, i) => (
                  <div key={i} className="flex gap-4">
                    <div className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${
                      d.status === 'success' ? 'bg-emerald-500' : d.status === 'error' ? 'bg-rose-500' : 'bg-amber-500'
                    }`} />
                    <div>
                      <h4 className="text-xs font-bold text-slate-200 uppercase mb-1">{d.step}</h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed font-medium">{d.message}</p>
                    </div>
                  </div>
                ))}
              </div>
              <button 
                onClick={runAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
              >
                {isAnalyzing ? 'Analyzing...' : 'Generate Sync Fix'}
              </button>
            </div>

            <div className="p-6 bg-amber-500/5 border border-amber-500/10 rounded-[2rem]">
              <h3 className="text-amber-500 text-[10px] font-black uppercase mb-2">The "Ghost User" Fix</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                If you see old user data after deleting Neon rows, your <strong>browser session</strong> is stale. 
                <br/><br/>
                <strong>Step 1:</strong> Sign out of the app.
                <br/>
                <strong>Step 2:</strong> Clear your domain cookies.
                <br/>
                <strong>Step 3:</strong> Use the Webhook code generated here to automate user creation in Neon.
              </p>
            </div>
          </div>

          <div className="lg:col-span-2">
            {!analysis && !isAnalyzing ? (
              <div className="h-full min-h-[500px] border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-slate-800 rounded-2xl flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Sync Engine Ready</h3>
                <p className="text-sm text-slate-500 max-w-xs">Run the diagnostic to generate the Clerk Webhook handler for your JobFlow API.</p>
              </div>
            ) : isAnalyzing ? (
              <div className="animate-pulse space-y-6">
                <div className="h-8 bg-slate-800 rounded-lg w-1/4"></div>
                <div className="h-[500px] bg-slate-800 rounded-[2.5rem]"></div>
              </div>
            ) : (
              <div className="bg-slate-900/40 p-10 rounded-[3rem] border border-slate-800 shadow-2xl space-y-10 animate-in fade-in slide-in-from-bottom-4">
                <section>
                  <h2 className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Implementation Guide</h2>
                  <div className="text-slate-300 text-sm leading-relaxed font-medium bg-blue-500/5 p-6 rounded-2xl border border-blue-500/10">
                    {analysis.explanation}
                  </div>
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Required Code (api/webhooks/clerk.ts)</h2>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4">Critical Env Vars</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.recommendations.map((r: string, i: number) => (
                      <div key={i} className="p-4 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-slate-400 font-mono">
                        {r}
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
