
import React, { useState, useEffect, useRef } from 'react';
import { Job, UserProfile } from '../types';
// Fixed non-existent 'Browser' and unused 'ArrowRight' imports from lucide-react
import { 
    Loader2, 
    Terminal, 
    ShieldCheck, 
    CheckCircle2, 
    AlertTriangle, 
    ExternalLink,
    X,
    Cpu
} from 'lucide-react';

interface AutomationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: Job;
  userProfile: UserProfile;
  onComplete: () => void;
}

export const AutomationModal: React.FC<AutomationModalProps> = ({ isOpen, onClose, job, userProfile, onComplete }) => {
  const [logs, setLogs] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'running' | 'success' | 'fallback' | 'error'>('running');
  const scrollRef = useRef<HTMLDivElement>(null);

  const addLog = (msg: string) => {
    setLogs(prev => [...prev, `[${new Date().toLocaleTimeString([], { hour12: false })}] ${msg}`]);
  };

  useEffect(() => {
    if (scrollRef.current) {
        scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs]);

  useEffect(() => {
    if (!isOpen) return;

    setLogs([]);
    setProgress(0);
    setStatus('running');

    const runSimulation = async () => {
        const steps = [
            { msg: "AI Agent initialized. Initializing secure Chromium instance...", delay: 800, p: 10 },
            { msg: "Loading master resume from cloud storage...", delay: 600, p: 20 },
            { msg: `Establishing connection to ${job.company} portal...`, delay: 1200, p: 35 },
            { msg: "Bypassing bot detection signatures...", delay: 1500, p: 50 },
            { msg: "Analyzing form structure and ID fields...", delay: 900, p: 65 },
            { msg: "Injecting tailored bullet points into experience fields...", delay: 1100, p: 80 },
            { msg: "Uploading generated PDF asset...", delay: 1300, p: 90 },
            { msg: "Ready for final submission.", delay: 500, p: 100 }
        ];

        for (const step of steps) {
            addLog(step.msg);
            setProgress(step.p);
            await new Promise(r => setTimeout(r, step.delay));
        }

        // Logic check: simulate manual fallback for certain domains
        const isComplex = job.applicationUrl?.includes('linkedin') || job.applicationUrl?.includes('indeed');
        if (isComplex) {
            setStatus('fallback');
            addLog("CRITICAL: Advanced anti-bot measures detected (Cloudflare).");
            addLog("Switching to Manual Fallback mode for account safety.");
        } else {
            setStatus('success');
            addLog("Application successfully submitted and tracked.");
            onComplete();
        }
    };

    runSimulation();
  }, [isOpen, job]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4">
      <div className="bg-slate-950 border border-slate-800 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-300">
        
        {/* Header */}
        <div className="p-8 border-b border-slate-900 flex justify-between items-center bg-slate-900/50">
            <div className="flex items-center gap-4">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all ${status === 'success' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {status === 'running' ? <Loader2 className="w-6 h-6 animate-spin" /> : status === 'success' ? <CheckCircle2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
                </div>
                <div>
                    <h2 className="text-white font-black uppercase text-sm tracking-widest">JobFlow Agent</h2>
                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-1">Executing: {job.company}</p>
                </div>
            </div>
            {status !== 'running' && (
                <button onClick={onClose} className="p-2 text-slate-500 hover:text-white transition-colors">
                    <X className="w-6 h-6" />
                </button>
            )}
        </div>

        {/* Console Content */}
        <div className="p-8 space-y-8">
            {/* Main Visual */}
            <div className="relative h-48 bg-black/40 rounded-[2rem] border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-10 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-indigo-500 via-transparent to-transparent"></div>
                
                {status === 'running' && (
                    <>
                        <div className="relative w-24 h-24 mb-4">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-800" />
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={251.2} strokeDashoffset={251.2 - (progress / 100) * 251.2} className="text-indigo-500 transition-all duration-500 ease-out" />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center text-xs font-black text-white">{progress}%</div>
                        </div>
                        <div className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] animate-pulse">Processing Sequence</div>
                    </>
                )}

                {status === 'success' && (
                    <div className="text-center animate-in zoom-in duration-500">
                        <CheckCircle2 className="w-16 h-16 text-emerald-500 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Mission Accomplished</h3>
                        <p className="text-xs text-slate-500 mt-2">Application status updated to "Auto-Applied"</p>
                    </div>
                )}

                {status === 'fallback' && (
                    <div className="text-center animate-in slide-in-from-bottom-4 duration-500">
                        <AlertTriangle className="w-16 h-16 text-amber-500 mx-auto mb-4" />
                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Manual Bypass Required</h3>
                        <p className="text-xs text-slate-500 mt-2 px-8">Site security prevents head-less automation. Complete manually using tailored assets.</p>
                    </div>
                )}
            </div>

            {/* Console Output */}
            <div className="bg-black rounded-2xl p-6 border border-slate-800 h-48 flex flex-col overflow-hidden">
                <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-900">
                    <Terminal className="w-3 h-3 text-slate-600" />
                    <span className="text-[9px] font-black uppercase text-slate-600 tracking-widest">Agent Logic Logs</span>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto font-mono text-[10px] space-y-1 custom-scrollbar">
                    {logs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                            <span className="text-slate-700 shrink-0">PROMPT_RES_ID_{i}</span>
                            <span className={`${log.includes('CRITICAL') ? 'text-red-400' : 'text-slate-400'}`}>{log}</span>
                        </div>
                    ))}
                    {status === 'running' && <div className="w-2 h-4 bg-indigo-500 animate-pulse inline-block ml-1"></div>}
                </div>
            </div>

            {/* Actions */}
            <div className="pt-4">
                {status === 'success' ? (
                    <button onClick={onClose} className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-900/20">
                        Close & View Status
                    </button>
                ) : status === 'fallback' ? (
                    <div className="flex gap-4">
                        <button onClick={onClose} className="flex-1 py-4 bg-slate-800 text-slate-300 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-700">Dismiss</button>
                        <a 
                            href={job.applicationUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 text-center flex items-center justify-center gap-2 shadow-xl shadow-indigo-900/20"
                        >
                            Open Manual Portal <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                ) : (
                    <div className="flex items-center justify-center gap-3 py-4 text-slate-600">
                        <Cpu className="w-4 h-4 animate-spin" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Computing optimal path...</span>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
