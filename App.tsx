import React, { useState, useEffect } from 'react';
import { analyzeSyncIssue } from './services/geminiService';

/**
 * JobFlow AI Sync Debugger - Version 1.1.0
 * Resilient build with inlined components to prevent Vercel resolution failures.
 */

// --- INLINED SUB-COMPONENTS ---

const CodeBlock: React.FC<{ code: string; language?: string }> = ({ code, language = 'typescript' }) => {
  return (
    <div className="relative group rounded-xl overflow-hidden bg-slate-950 border border-slate-800 my-6 shadow-2xl">
      <div className="flex items-center justify-between px-4 py-2 bg-slate-900/80 border-b border-slate-800">
        <span className="text-[10px] font-black font-mono text-slate-500 uppercase tracking-widest">{language}</span>
        <button 
          onClick={() => navigator.clipboard.writeText(code)}
          className="text-[10px] font-bold text-indigo-400 hover:text-indigo-300 transition-colors uppercase tracking-widest"
        >
          Copy Code
        </button>
      </div>
      <pre className="p-6 overflow-x-auto font-mono text-sm leading-relaxed text-indigo-100/90">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// --- MAIN APPLICATION ---

export default function App() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log("JobFlow App v1.1.0 Mounted Successfully");
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeSyncIssue("User reported data persistence after Neon row deletion. Likely stale Clerk JWT vs empty Postgres table.");
      setAnalysis(result);
    } catch (err: any) {
      console.error("Analysis Error:", err);
      setError(err.message || "Failed to connect to the diagnostic service.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] text-slate-200 font-sans p-6 md:p-12">
      <div className="max-w-6xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-slate-800 pb-8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2 h-2 bg-indigo-500 rounded-full animate-pulse"></span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Build v1.1.0 Verified</span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Sync <span className="text-indigo-500">Architect</span></h1>
            <p className="text-slate-500 text-sm mt-1">Clerk Auth to Neon Database Bridge Repair</p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Status</p>
              <p className="text-xs font-black text-emerald-400">OPERATIONAL</p>
            </div>
          </div>
        </header>

        {error && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
             <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
             Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          {/* Left Column: Context */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 p-8 rounded-[2rem] border border-slate-800">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Diagnostic Overview</h2>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-1 h-8 bg-indigo-500/30 rounded-full mt-1"></div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase mb-1">Ghost Data Explained</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">Clerk stores sessions in browser cookies. Deleting Neon rows doesn't clear your browser's login state.</p>
                  </div>
                </li>
                <li className="flex gap-4">
                  <div className="w-1 h-8 bg-slate-800 rounded-full mt-1"></div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase mb-1">The Webhook Fix</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed">We need to catch 'user.created' events from Clerk and automatically push them into Neon.</p>
                  </div>
                </li>
              </ul>
              
              <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing}
                className="w-full mt-10 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-2xl font-black text-xs uppercase tracking-widest transition-all transform active:scale-95"
              >
                {isAnalyzing ? "Generating Solution..." : "Generate Repair Code"}
              </button>
            </div>

            <div className="p-6 bg-indigo-500/5 border border-indigo-500/10 rounded-[2rem]">
              <p className="text-[10px] text-indigo-400 font-black uppercase mb-2">Pro Tip</p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium">
                To see your changes immediately after implementing the webhook, use the <strong>Sign Out</strong> button in your app to clear the stale Clerk session.
              </p>
            </div>
          </div>

          {/* Right Column: Output */}
          <div className="lg:col-span-8">
            {!analysis && !isAnalyzing ? (
              <div className="h-full min-h-[500px] border-2 border-dashed border-slate-800 rounded-[3rem] flex flex-col items-center justify-center p-12 text-center">
                <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-6 border border-slate-800 text-slate-600">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2">No Solution Generated</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto">Click the button on the left to analyze your environment and generate the Clerk Webhook handler.</p>
              </div>
            ) : isAnalyzing ? (
              <div className="space-y-8 animate-pulse">
                <div className="h-4 bg-slate-800 rounded-full w-1/3"></div>
                <div className="h-[400px] bg-slate-900/50 rounded-[2.5rem] border border-slate-800"></div>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <section>
                  <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">The Solution</h2>
                  <div className="bg-indigo-500/5 p-8 rounded-[2rem] border border-indigo-500/10 text-slate-300 text-sm leading-relaxed font-medium">
                    {analysis.explanation}
                  </div>
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-4">Webhook Handler (api/webhooks/clerk/route.ts)</h2>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4">Required Vercel Env Vars</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="p-4 bg-slate-900/50 border border-slate-800 rounded-xl text-xs text-slate-400 font-mono">
                        {rec}
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
}
