import React, { useState, useEffect } from 'react';
import { analyzeSyncIssue } from './services/geminiService';

/**
 * JobFlow AI Sync Debugger - Version 1.1.2
 * Fail-safe build using dynamic imports to bypass browser initialization crashes.
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
  const [hasApiKey, setHasApiKey] = useState<boolean | null>(null);

  useEffect(() => {
    // Check for API key on mount to provide early feedback
    const key = process.env.API_KEY;
    setHasApiKey(!!key && key !== "");
    console.log("JobFlow App v1.1.2 Mounted. API Key detected:", !!key);
  }, []);

  const handleRunAnalysis = async () => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await analyzeSyncIssue("Data persistence after Neon row deletion. Ghost user profile remains visible.");
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
              <span className={`w-2 h-2 rounded-full ${hasApiKey ? 'bg-indigo-500 animate-pulse' : 'bg-rose-500'}`}></span>
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">
                {hasApiKey ? 'Build v1.1.2 Active' : 'API Key Missing from Env'}
              </span>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">Sync <span className="text-indigo-500">Architect</span></h1>
            <p className="text-slate-500 text-sm mt-1">Clerk Auth to Neon Database Bridge Repair</p>
          </div>
          <div className="flex gap-4">
            <div className="px-4 py-2 bg-slate-900 rounded-xl border border-slate-800 text-center">
              <p className="text-[9px] font-bold text-slate-500 uppercase mb-1">Engine Status</p>
              <p className={`text-xs font-black uppercase tracking-tight ${hasApiKey ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hasApiKey ? 'READY' : 'HALTED'}
              </p>
            </div>
          </div>
        </header>

        {hasApiKey === false && (
          <div className="mb-8 p-6 bg-rose-500/10 border border-rose-500/20 rounded-[2rem] text-rose-400">
             <h3 className="text-sm font-black uppercase tracking-widest mb-2 flex items-center gap-2">
               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
               Critical Environment Error
             </h3>
             <p className="text-xs font-medium leading-relaxed opacity-80">
               The <code>process.env.API_KEY</code> variable is not set. 
               The Google GenAI SDK cannot initialize. Please add your API key to the environment variables in your deployment dashboard.
             </p>
          </div>
        )}

        {error && (
          <div className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-400 text-xs font-bold uppercase tracking-widest flex items-center gap-3">
             <span className="w-2 h-2 bg-rose-500 rounded-full"></span>
             Error: {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
          
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-slate-900/50 p-8 rounded-[2.5rem] border border-slate-800 shadow-xl">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-6">Diagnostic Hub</h2>
              <ul className="space-y-6">
                <li className="flex gap-4">
                  <div className="w-1 h-8 bg-indigo-500/30 rounded-full mt-1"></div>
                  <div>
                    <p className="text-xs font-bold text-white uppercase mb-1">Clerk vs Neon Sync</p>
                    <p className="text-[11px] text-slate-500 leading-relaxed font-medium">Why deleting database rows doesn't log you out of Clerk (JWT session persistency).</p>
                  </div>
                </li>
              </ul>
              
              <button 
                onClick={handleRunAnalysis}
                disabled={isAnalyzing || !hasApiKey}
                className="w-full mt-10 py-5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-30 text-white rounded-[1.5rem] font-black text-xs uppercase tracking-widest transition-all transform active:scale-95 shadow-lg shadow-indigo-500/20"
              >
                {isAnalyzing ? "Processing..." : "Generate Repair Code"}
              </button>
            </div>

            <div className="p-8 bg-amber-500/5 border border-amber-500/10 rounded-[2.5rem]">
              <p className="text-[10px] text-amber-500 font-black uppercase mb-3">Sync Warning</p>
              <p className="text-[11px] text-slate-400 leading-relaxed font-medium italic">
                "When I delete rows in Neon, data is still populated from a previous session."
              </p>
              <p className="text-[11px] text-slate-500 leading-relaxed mt-4">
                This happens because <strong>Clerk</strong> manages the session in your browser's LocalStorage/Cookies. 
                Even if your DB is empty, Clerk still tells your app "User 123 is logged in".
              </p>
            </div>
          </div>

          <div className="lg:col-span-8">
            {!analysis && !isAnalyzing ? (
              <div className="h-full min-h-[500px] border-2 border-dashed border-slate-800 rounded-[3.5rem] flex flex-col items-center justify-center p-12 text-center bg-slate-900/10">
                <div className="w-16 h-16 bg-slate-900 rounded-3xl flex items-center justify-center mb-6 border border-slate-800 text-slate-600">
                   <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" /></svg>
                </div>
                <h3 className="text-xl font-bold text-white mb-2 tracking-tight">System Ready</h3>
                <p className="text-sm text-slate-500 max-w-xs mx-auto font-medium">Click the button to generate the Webhook logic needed to sync Clerk signups into your Neon DB.</p>
              </div>
            ) : isAnalyzing ? (
              <div className="space-y-8 animate-pulse p-4">
                <div className="h-4 bg-slate-800 rounded-full w-1/3"></div>
                <div className="h-[450px] bg-slate-900/50 rounded-[3rem] border border-slate-800"></div>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <section>
                  <h2 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Architecture Explanation</h2>
                  <div className="bg-indigo-500/5 p-8 rounded-[2.5rem] border border-indigo-500/10 text-slate-300 text-sm leading-relaxed font-medium shadow-inner">
                    {analysis.explanation}
                  </div>
                </section>

                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Neon-Clerk Webhook Bridge</h2>
                    <span className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">api/webhooks/clerk/route.ts</span>
                  </div>
                  <CodeBlock code={analysis.fixCode} language="typescript" />
                </section>

                <section>
                  <h2 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-4">Environment Setup</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {analysis.recommendations.map((rec: string, i: number) => (
                      <div key={i} className="p-5 bg-slate-900/30 border border-slate-800 rounded-2xl text-[11px] text-slate-400 font-mono flex gap-3">
                        <span className="text-indigo-500 font-bold">{i + 1}.</span>
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
