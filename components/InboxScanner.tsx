
import React, { useState, useEffect, useRef } from 'react';
import { Job, JobStatus, EmailAccount, UserPreferences } from '../types';
import { Mail, Search, X, Loader2, StopCircle, BrainCircuit, Zap, Clock } from 'lucide-react';
import { localExtractJobs } from '../services/localAiService';
import { getMessageBody, decodeEmailBody, listMessages } from '../services/gmailService';
import { analyzeJobsWithAi } from '../services/geminiService';
import { NotificationType } from './NotificationToast';
import { EmailConnectModal } from './EmailConnectModal';

interface InboxScannerProps {
  onImport: (jobs: Job[]) => void;
  showNotification: (msg: string, type: NotificationType) => void;
  userPreferences?: UserPreferences;
  sessionAccount: EmailAccount | null;
  onConnectSession?: (account: EmailAccount) => void;
  onDisconnectSession?: () => void;
  resumeContent?: string;
}

export const InboxScanner: React.FC<InboxScannerProps> = ({ 
    onImport, 
    showNotification, 
    userPreferences, 
    sessionAccount,
    onConnectSession = () => {},
    onDisconnectSession = () => {},
    resumeContent = ""
}) => {
  const [isScanning, setIsScanning] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [dateRange, setDateRange] = useState('2'); // Default 48h
  const [scanMode, setScanMode] = useState<'fast' | 'ai'>('fast');

  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  const handleStopScan = () => {
      if (abortController.current) abortController.current.abort();
      setIsScanning(false);
      setIsBatchProcessing(false);
      setProgress('Stopped');
  };

  const handleBatchAnalyze = async (emailList: any[]) => {
      if (emailList.length === 0) return;
      setIsBatchProcessing(true);
      abortController.current = new AbortController();
      const uniqueJobsMap = new Map<string, Partial<Job>>();
      const batchSize = scanMode === 'ai' ? 1 : 4; 
      
      try {
          for (let i = 0; i < emailList.length; i += batchSize) {
              if (abortController.current?.signal.aborted || !isMounted.current) return;
              const chunk = emailList.slice(i, i + batchSize);
              
              await Promise.all(chunk.map(async (email) => {
                  if (!sessionAccount?.accessToken) return;
                  try {
                      const bodyData = await getMessageBody(sessionAccount.accessToken, email.id);
                      const htmlContent = decodeEmailBody(bodyData);
                      
                      let extracted: any[] = [];
                      if (scanMode === 'ai') {
                          setProgress(`AI Reasoning... ${email.id.substring(0, 5)}`);
                          extracted = await analyzeJobsWithAi(htmlContent, resumeContent, sessionAccount.accessToken);
                      } else {
                          extracted = localExtractJobs(htmlContent, userPreferences?.targetRoles || []);
                      }

                      extracted.forEach(job => {
                          if (job.applicationUrl && !uniqueJobsMap.has(job.applicationUrl)) {
                                uniqueJobsMap.set(job.applicationUrl, { 
                                    ...job, 
                                    id: `gmail-${email.id}-${Math.random().toString(36).substr(2, 5)}`,
                                    source: 'Gmail', 
                                    detectedAt: new Date().toISOString(),
                                    status: JobStatus.DETECTED 
                                });
                          }
                      });
                  } catch (e) {
                      console.error("Batch error:", e);
                  }
              }));
              
              setProgress(`${Math.min(i + batchSize, emailList.length)} / ${emailList.length}`);
              await new Promise(r => setTimeout(r, scanMode === 'ai' ? 500 : 50));
          }

          const allJobs = Array.from(uniqueJobsMap.values()).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
          if (allJobs.length > 0) onImport(allJobs as Job[]);
          showNotification(`Found ${allJobs.length} potential leads.`, 'success');
      } catch (e) {
          console.error(e);
      } finally {
          setIsBatchProcessing(false);
          setProgress('');
      }
  };

  const handleScan = async () => {
      if (!sessionAccount?.accessToken) {
          setIsConnectModalOpen(true);
          return;
      }
      setIsScanning(true);
      try {
          const query = `subject:(job OR hiring OR role OR position) newer_than:${dateRange}d`;
          const messages = await listMessages(sessionAccount.accessToken, 20, query);
          if (messages.length > 0) await handleBatchAnalyze(messages);
          else showNotification("No new results in this timeframe.", 'success');
      } catch (e) {
          showNotification("Scan failed. Token might be expired.", "error");
      } finally {
          setIsScanning(false);
      }
  };

  return (
    <div className="flex h-full bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-xl">
      <div className="w-80 border-r border-slate-100 flex flex-col bg-slate-50/50">
        <div className="p-8 space-y-8 bg-white border-b border-slate-100">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">Scanner Control</h3>
            
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <Clock className="w-3 h-3" /> Timeframe
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                        {['1', '2', '7', '30'].map(d => (
                            <button 
                                key={d} 
                                onClick={() => setDateRange(d)}
                                className={`py-2 px-3 rounded-xl text-[10px] font-bold border transition-all ${dateRange === d ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-400'}`}
                            >
                                {d === '1' ? '24h' : d === '2' ? '48h' : d === '7' ? '1 Week' : '1 Month'}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
                        <BrainCircuit className="w-3 h-3" /> Intelligence Mode
                    </label>
                    <div className="bg-slate-100 p-1 rounded-2xl flex gap-1">
                        <button 
                            onClick={() => setScanMode('fast')}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${scanMode === 'fast' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            <Zap className="w-3 h-3" /> Fast
                        </button>
                        <button 
                            onClick={() => setScanMode('ai')}
                            className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${scanMode === 'ai' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'}`}
                        >
                            <BrainCircuit className="w-3 h-3" /> AI
                        </button>
                    </div>
                </div>
            </div>

            <button 
                onClick={handleScan} 
                disabled={isScanning || isBatchProcessing}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
            >
                {isScanning || isBatchProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                Run Sequence
            </button>

            {(isScanning || isBatchProcessing) && (
                <button onClick={handleStopScan} className="w-full flex items-center justify-center gap-2 text-[10px] font-black uppercase text-red-400 hover:text-red-600 transition-colors">
                    <StopCircle className="w-4 h-4" /> Abort Mission
                </button>
            )}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Inbox Status</span>
                <span className={`w-2 h-2 rounded-full ${sessionAccount ? 'bg-emerald-500 animate-pulse' : 'bg-slate-300'}`}></span>
            </div>
            {sessionAccount ? (
                <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 truncate pe-2">{sessionAccount.emailAddress}</span>
                    <button onClick={onDisconnectSession} className="text-slate-300 hover:text-red-500"><X className="w-4 h-4" /></button>
                </div>
            ) : (
                <button onClick={() => setIsConnectModalOpen(true)} className="w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-[10px] font-black uppercase text-slate-400 hover:border-indigo-400 hover:text-indigo-400 transition-all">
                    Link Email Provider
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 bg-slate-50/50 p-12 flex flex-col items-center justify-center relative">
          <div className="absolute top-8 left-8">
              <div className="text-[10px] font-black uppercase text-slate-300 tracking-[0.3em]">Scanner Intelligence Beta v1.2</div>
          </div>
          {isScanning || isBatchProcessing ? (
              <div className="text-center space-y-6">
                <div className="relative">
                    <Loader2 className="w-24 h-24 text-indigo-600 animate-spin mx-auto opacity-20" />
                    <div className="absolute inset-0 flex items-center justify-center">
                        <BrainCircuit className={`w-8 h-8 text-indigo-600 ${scanMode === 'ai' ? 'animate-pulse' : ''}`} />
                    </div>
                </div>
                <div>
                    <p className="text-xl font-black text-slate-900 tracking-tight uppercase">Analyzing Signal</p>
                    <p className="text-xs text-slate-400 font-bold uppercase mt-2">{progress || 'Fetching data packets...'}</p>
                </div>
              </div>
          ) : (
              <div className="text-center max-w-sm">
                <div className="w-20 h-20 bg-white rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl">
                    <Mail className="w-10 h-10 text-slate-200" />
                </div>
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-widest">Scanner Standby</h4>
                <p className="text-xs text-slate-400 font-medium mt-4 leading-relaxed">
                    Select a timeframe and intelligence mode to begin extracting job leads from your connected inbox.
                </p>
              </div>
          )}
      </div>
      <EmailConnectModal isOpen={isConnectModalOpen} onClose={() => setIsConnectModalOpen(false)} onConnect={(acc) => { onConnectSession(acc); setIsConnectModalOpen(false); }} />
    </div>
  );
};
