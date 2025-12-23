
import React, { useState, useEffect } from 'react';
import { Job, JobStatus, UserProfile } from '../types';
import { generateCoverLetter, customizeResume } from '../services/geminiService';
import { localGenerateCoverLetter, localCustomizeResume } from '../services/localAiService';
import { Wand2, FileText, Loader2, RefreshCw, Sparkles, Download, X, Send, ExternalLink } from 'lucide-react';
import { NotificationType } from './NotificationToast';

interface JobDetailProps {
  job: Job;
  userProfile: UserProfile;
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onUpdateJob: (job: Job) => void;
  onClose: () => void;
  showNotification?: (msg: string, type: NotificationType) => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, userProfile, onUpdateJob, onClose, showNotification }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'details' | 'ai-docs'>('details');
  
  // Local state for live preview/editing of generated text
  const [resumeText, setResumeText] = useState<string>(job.customizedResume || userProfile.resumeContent || '');
  const [letterText, setLetterText] = useState<string>(job.coverLetter || '');

  const notify = (msg: string, type: NotificationType) => {
      if (showNotification) showNotification(msg, type);
  };

  // Keep local state in sync with job object updates
  useEffect(() => {
      setResumeText(job.customizedResume || userProfile.resumeContent || '');
      setLetterText(job.coverLetter || '');
      
      // Auto-switch to docs if they were just generated
      if (job.customizedResume && activeTab === 'details') {
          setActiveTab('ai-docs');
      }
  }, [job, userProfile.resumeContent]);

  const handleGenerateDocuments = async () => {
    if (!userProfile.resumeContent || userProfile.resumeContent.length < 20) {
        notify("Please upload a resume in Settings first.", "error");
        return;
    }

    setIsGenerating(true);
    notify(`Tailoring assets for ${job.company}...`, 'success');
    
    try {
        // Sequential calls with delay to ensure Gemini processing
        let finalResume = "";
        try {
            finalResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
        } catch (e) {
            finalResume = await localCustomizeResume(job.title, job.company, job.description, userProfile.resumeContent);
        }
        
        await new Promise(r => setTimeout(r, 1200));

        let finalLetter = "";
        try {
            finalLetter = await generateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email);
        } catch (e) {
            finalLetter = await localGenerateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email);
        }

        const updatedJob: Job = { 
            ...job, 
            customizedResume: finalResume, 
            coverLetter: finalLetter, 
            status: JobStatus.SAVED 
        };
        
        onUpdateJob(updatedJob);
        notify("Resume and Cover Letter generated.", "success");
        setActiveTab('ai-docs');
    } catch (e) {
        console.error("AI Generation Error:", e);
        notify("Tailoring failed. Please retry in a few seconds.", "error");
    } finally {
        setIsGenerating(false);
    }
  };

  const downloadTextFile = (filename: string, content: string) => {
      if (!content) return;
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

  // Added the missing return statement to fix line 18 error
  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex border-b border-slate-100">
        <button 
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Job Details
        </button>
        <button 
          onClick={() => setActiveTab('ai-docs')}
          className={`flex-1 py-4 text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'ai-docs' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-400 hover:text-slate-600'}`}
        >
          AI Assets
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8">
        {activeTab === 'details' ? (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-300 text-4xl font-black">
                  {job.company.charAt(0)}
                </div>
                <div>
                  <h1 className="text-3xl font-black text-slate-900 tracking-tight">{job.title}</h1>
                  <p className="text-lg font-bold text-indigo-600 mt-1">{job.company}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button 
                  onClick={handleGenerateDocuments}
                  disabled={isGenerating}
                  className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-indigo-100"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                  AI Tailoring
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Match Score</p>
                <p className={`text-2xl font-black ${job.matchScore > 80 ? 'text-emerald-600' : 'text-amber-600'}`}>{job.matchScore}%</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Location</p>
                <p className="text-sm font-bold text-slate-700">{job.location}</p>
              </div>
              <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                <p className="text-sm font-bold text-slate-700">{job.status}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">Description</h3>
              <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                {job.description}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col animate-in fade-in duration-300">
            {!job.customizedResume ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                  <Wand2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2">No AI Assets Yet</h3>
                <p className="text-sm text-slate-500 max-w-xs mb-8">Generate a tailored resume and cover letter for this specific role in one click.</p>
                <button 
                  onClick={handleGenerateDocuments}
                  disabled={isGenerating}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-3 shadow-2xl shadow-indigo-200"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Generate Assets Now
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tailored Resume</h4>
                    <button 
                      onClick={() => downloadTextFile(`${job.company}_Resume.txt`, resumeText)}
                      className="p-2 hover:bg-slate-50 rounded-xl text-indigo-600 transition-all"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea 
                    value={resumeText}
                    onChange={(e) => setResumeText(e.target.value)}
                    className="flex-1 p-8 bg-transparent text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none"
                  />
                </div>
                <div className="flex flex-col h-full bg-slate-50 rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                  <div className="p-6 bg-white border-b border-slate-100 flex justify-between items-center">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Custom Cover Letter</h4>
                    <button 
                      onClick={() => downloadTextFile(`${job.company}_CoverLetter.txt`, letterText)}
                      className="p-2 hover:bg-slate-50 rounded-xl text-purple-600 transition-all"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                  <textarea 
                    value={letterText}
                    onChange={(e) => setLetterText(e.target.value)}
                    className="flex-1 p-8 bg-transparent text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none"
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
