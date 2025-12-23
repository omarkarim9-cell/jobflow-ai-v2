import React, { useState, useEffect } from 'react';
import { Job, JobStatus, UserProfile, isSubscriptionValid } from '../types';
import { generateCoverLetter, customizeResume } from '../services/geminiService';
import { localGenerateCoverLetter, localCustomizeResume } from '../services/localAiService';
import { simulateBrowserAutomation, openSafeApplicationUrl } from '../services/automationService';
import { Wand2, FileText, CheckCircle, ExternalLink, Loader2, AlertTriangle, Clock, StickyNote, Pencil, Send, Search, RefreshCw, Sparkles, Check, Settings, Download, ArrowRight } from 'lucide-react';
import { NotificationType } from './NotificationToast';

interface JobDetailProps {
  job: Job;
  userProfile: UserProfile;
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onUpdateJob: (job: Job) => void;
  dirHandle?: any;
  triggerAutoApply?: boolean;
  onAutoApplyHandled?: () => void;
  onOpenSettings?: () => void;
  showNotification?: (msg: string, type: NotificationType) => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, userProfile, onUpdateStatus, onUpdateJob, dirHandle, triggerAutoApply, onAutoApplyHandled, onOpenSettings, showNotification }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showApplyLater, setShowApplyLater] = useState(false);
  const [showManualFallback, setShowManualFallback] = useState(false); 
  const [laterNotes, setLaterNotes] = useState('');
  const [applyStep, setApplyStep] = useState<string>('');
  const [applySuccess, setApplySuccess] = useState(false);
  
  // Link Discovery State
  const [isFindingLink, setIsFindingLink] = useState(false);
  
  // Local state for editing
  const [generatedLetter, setGeneratedLetter] = useState<string | null>(job.coverLetter || null);
  const [resumeText, setResumeText] = useState<string>(job.customizedResume || userProfile.resumeContent);
  const [notesText, setNotesText] = useState<string>(job.notes || '');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  
  const [activeTab, setActiveTab] = useState<'details' | 'ai-docs'>('details');
  const [isSaved, setIsSaved] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const notify = (msg: string, type: NotificationType) => {
      if (showNotification) showNotification(msg, type);
      else console.log(`[${type}] ${msg}`);
  };

  // --- ACTIONS & LOGIC ---

  const handleGenerateCoverLetter = async () => {
    if (!userProfile.resumeContent || userProfile.resumeContent.trim().length < 10) {
        alert("Please upload your Master Resume in Settings first.");
        return;
    }
    setIsGenerating(true);
    try {
        let letter = "";
        try {
            letter = await generateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email);
        } catch (e) {
            letter = await localGenerateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email);
        }
        setGeneratedLetter(letter);
    } catch (e) {
        console.error(e);
        notify("Generation failed.", 'error');
    } finally {
        setIsGenerating(false);
    }
  };

  const handleRegenerateResume = async () => {
    if (!userProfile.resumeContent || userProfile.resumeContent.trim().length < 10) {
        alert("Your Master Resume is missing. Please check Settings.");
        return;
    }

    setIsGenerating(true);
    try {
        let newResume = "";
        try {
            newResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
        } catch (e) {
            newResume = await localCustomizeResume(job.title, job.company, job.description, userProfile.resumeContent);
        }
        setResumeText(newResume);
        onUpdateJob({
            ...job,
            customizedResume: newResume
        });
    } catch (e) {
        console.error(e);
        notify("Tailoring failed.", 'error');
    } finally {
        setIsGenerating(false);
    }
  };

  const executeAutoApply = async () => {
    if (!userProfile.resumeContent || userProfile.resumeContent.trim().length < 10) {
        setShowConfirm(false);
        setActiveTab('ai-docs'); 
        return;
    }

    setShowConfirm(false);
    setIsApplying(true);
    setApplyStep('Analyzing Job Description...');
    
    let currentResume = resumeText;
    let currentLetter = generatedLetter;

    try {
        if (!job.customizedResume) {
            setApplyStep('Tailoring Resume...');
            try {
                currentResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
            } catch (e) {
                currentResume = await localCustomizeResume(job.title, job.company, job.description, userProfile.resumeContent);
            }
            setResumeText(currentResume);
            await new Promise(r => setTimeout(r, 500));
        }

        if (!job.coverLetter) {
            setApplyStep('Drafting Cover Letter...');
            try {
                currentLetter = await generateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email);
            } catch (e) {
                currentLetter = await localGenerateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email);
            }
            setGeneratedLetter(currentLetter);
            await new Promise(r => setTimeout(r, 500));
        }
        
        onUpdateJob({
            ...job,
            customizedResume: currentResume,
            coverLetter: currentLetter || undefined,
            status: JobStatus.SAVED
        });

        setApplyStep('Ready for application.');
        setShowManualFallback(true);

    } catch (error) {
        console.error("Process failed", error);
        notify("Generation interrupted.", 'error');
    } finally {
        setIsApplying(false);
    }
  };

  // --- EFFECTS ---

  useEffect(() => {
    setGeneratedLetter(job.coverLetter || null);
    setResumeText(job.customizedResume || userProfile.resumeContent || "");
    setNotesText(job.notes || '');
    setIsApplying(false); 
    setShowManualFallback(false);
  }, [job, userProfile]);

  useEffect(() => {
    if (triggerAutoApply) {
        executeAutoApply();
        if (onAutoApplyHandled) onAutoApplyHandled();
    }
  }, [triggerAutoApply]);

  // --- DOWNLOAD HELPERS ---

  const downloadTextFile = (filename: string, content: string) => {
      const blob = new Blob([content], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
  };

  const hasMasterResume = userProfile.resumeContent && userProfile.resumeContent.trim().length > 10;
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h2 className="text-2xl font-bold text-slate-900">{job.title}</h2>
               {job.applicationUrl && (
                 <button onClick={(e) => openSafeApplicationUrl(job)} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium text-sm">
                   <Send className="w-4 h-4" /> Apply
                 </button>
               )}
            </div>
            <div className="text-lg text-slate-600 font-medium">{job.company}</div>
          </div>
          
          <div className="flex gap-2">
            <button onClick={() => setShowApplyLater(true)} disabled={isApplying} className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center">
              <Clock className="w-4 h-4 me-2" /> Save for Later
            </button>
            <button onClick={() => setShowConfirm(true)} disabled={isApplying} className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg flex items-center shadow-sm">
               {isApplying ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Sparkles className="w-4 h-4 me-2" />}
               Resume/Letter Generation
            </button>
          </div>
        </div>

        <div className="flex border-b border-slate-200 mt-6">
            <button onClick={() => setActiveTab('details')} className={`pb-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>Job Details</button>
            <button onClick={() => setActiveTab('ai-docs')} className={`pb-3 px-4 text-sm font-medium border-b-2 ${activeTab === 'ai-docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500'}`}>AI Documents</button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {activeTab === 'details' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Description</h3>
                  <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">{job.description}</div>
              </div>
          )}

          {activeTab === 'ai-docs' && (
              <div className="space-y-6">
                  {/* Tailored Resume */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                           <h3 className="font-bold text-slate-900 flex items-center"><FileText className="w-4 h-4 me-2 text-indigo-600"/> Tailored Resume</h3>
                           <div className="flex gap-2">
                               <button onClick={handleRegenerateResume} disabled={isGenerating} className="text-xs flex items-center text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                                   <RefreshCw className={`w-3 h-3 me-1 ${isGenerating ? 'animate-spin' : ''}`} /> Regenerate
                               </button>
                               <button onClick={() => downloadTextFile(`${job.company}_Resume.txt`, resumeText)} className="text-xs flex items-center text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                                   <Download className="w-3 h-3 me-1" /> Download
                               </button>
                           </div>
                       </div>
                       <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)} className="w-full h-80 p-4 text-sm font-mono text-slate-700 bg-white outline-none resize-none leading-relaxed" />
                  </div>

                  {/* Cover Letter */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                           <h3 className="font-bold text-slate-900 flex items-center"><StickyNote className="w-4 h-4 me-2 text-indigo-600"/> Cover Letter</h3>
                           <div className="flex gap-2">
                               <button onClick={handleGenerateCoverLetter} disabled={isGenerating} className="text-xs flex items-center text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                                   <Wand2 className="w-3 h-3 me-1" /> {generatedLetter ? 'Rewrite' : 'Generate'}
                               </button>
                               {generatedLetter && (
                                   <button onClick={() => downloadTextFile(`${job.company}_Letter.txt`, generatedLetter)} className="text-xs flex items-center text-slate-600 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50">
                                       <Download className="w-3 h-3 me-1" /> Download
                                   </button>
                               )}
                           </div>
                       </div>
                       <textarea value={generatedLetter || ''} onChange={(e) => setGeneratedLetter(e.target.value)} placeholder="Click Generate to draft your letter..." className="w-full h-64 p-4 text-sm text-slate-700 bg-white outline-none resize-none leading-relaxed" />
                  </div>
              </div>
          )}
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full">
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Tailor Documents?</h3>
                 <p className="text-sm text-slate-600 mb-4">Generate personalized assets for <strong>{job.company}</strong>.</p>
                 <div className="flex gap-3">
                     <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                     <button onClick={executeAutoApply} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">Start Generation</button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};