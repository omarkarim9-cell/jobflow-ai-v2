
import React, { useState } from 'react';
import { Job, JobStatus, UserProfile } from '../types';
import { generateCoverLetter, customizeResume } from '../services/geminiService';
import { 
    FileText, 
    Loader2, 
    Sparkles, 
    X
} from 'lucide-react';
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
  
  const [resumeText, setResumeText] = useState<string>(job.customizedResume || userProfile.resumeContent || '');
  const [letterText, setLetterText] = useState<string>(job.coverLetter || '');

  const notify = (msg: string, type: NotificationType) => {
      if (showNotification) showNotification(msg, type);
  };

  const handleGenerateDocuments = async () => {
    if (!userProfile.resumeContent || userProfile.resumeContent.length < 20) {
        notify("Please upload a resume in Settings first.", "error");
        return;
    }
    setIsGenerating(true);
    notify(`Generating tailored assets...`, 'success');
    try {
        const finalResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent, userProfile.email);
        const finalLetter = await generateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email);
        onUpdateJob({ ...job, customizedResume: finalResume, coverLetter: finalLetter, status: JobStatus.SAVED });
        setResumeText(finalResume);
        setLetterText(finalLetter);
        setActiveTab('ai-docs');
    } catch (e) {
        notify("Tailoring interrupted.", "error");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex border-b border-slate-100 shrink-0">
        <button onClick={() => setActiveTab('details')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400'}`}>Details</button>
        <button onClick={() => setActiveTab('ai-docs')} className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ai-docs' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400'}`}>AI Assets</button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
        {activeTab === 'details' && (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="flex items-start justify-between bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">{job.company.charAt(0)}</div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{job.title}</h1>
                  <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">{job.company}</p>
                </div>
              </div>
              <button onClick={handleGenerateDocuments} disabled={isGenerating} className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2">
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Generate Docs
              </button>
            </div>
            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Job Details</h3>
               <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{job.description}</div>
            </div>
          </div>
        )}

        {activeTab === 'ai-docs' && (
          <div className="h-full space-y-6 animate-in fade-in duration-300 max-w-6xl mx-auto">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                  <div className="flex flex-col h-[600px] bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><h4 className="text-[10px] font-black uppercase tracking-widest">Resume</h4></div>
                    <textarea value={resumeText} readOnly className="flex-1 p-8 bg-white text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none" />
                  </div>
                  <div className="flex flex-col h-[600px] bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center"><h4 className="text-[10px] font-black uppercase tracking-widest">Cover Letter</h4></div>
                    <textarea value={letterText} readOnly className="flex-1 p-8 bg-white text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none" />
                  </div>
                </div>
          </div>
        )}
      </div>
    </div>
  );
};
