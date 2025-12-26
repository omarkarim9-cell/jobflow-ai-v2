
import React, { useState } from 'react';
import { Job, JobStatus, UserProfile } from '../types';
import { generateCoverLetter, customizeResume } from '../services/geminiService';
import { 
    FileText, 
    Loader2, 
    Sparkles, 
    StickyNote,
    ExternalLink,
    ChevronDown
} from 'lucide-react';
import { NotificationType } from './NotificationToast';
import { openSafeApplicationUrl } from '../services/automationService';

interface JobDetailProps {
  job: Job;
  userProfile: UserProfile;
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onUpdateJob: (job: Job) => void;
  onClose: () => void;
  showNotification?: (msg: string, type: NotificationType) => void;
}

export const JobDetail: React.FC<JobDetailProps> = ({ job, userProfile, onUpdateJob, showNotification }) => {
  const [isGenerating, setIsGenerating] = useState(false);
  
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
    } catch (e) {
        notify("Tailoring interrupted.", "error");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto">
      <div className="p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
        
        {/* Header Section */}
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-6">
                <div className="w-20 h-20 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg shadow-indigo-100">
                    {job.company.charAt(0)}
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tight">{job.title}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest">{job.company}</p>
                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                        <p className="text-sm font-medium text-slate-500">{job.location}</p>
                    </div>
                </div>
            </div>
            
            <div className="flex gap-3 w-full md:w-auto">
                <button 
                  onClick={() => openSafeApplicationUrl(job)}
                  className="flex-1 md:flex-none px-6 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                    Visit Site <ExternalLink className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleGenerateDocuments} 
                  disabled={isGenerating} 
                  className="flex-1 md:flex-none bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
                  {job.customizedResume ? 'Regenerate Assets' : 'Generate Assets'}
                </button>
            </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 gap-8">
            {/* Job Description */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
                 Description <ChevronDown className="w-3 h-3" />
               </h3>
               <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap font-medium">
                 {job.description || "No description provided."}
               </div>
            </div>

            {/* AI Generated Assets Section */}
            {(job.customizedResume || job.coverLetter) && (
              <div className="space-y-8 animate-in fade-in duration-700">
                 <div className="flex items-center gap-4">
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                    <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.3em] whitespace-nowrap">AI Tailored Assets</h3>
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {job.customizedResume && (
                       <div className="flex flex-col bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                              <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <FileText className="w-4 h-4 text-indigo-600" /> Tailored Resume
                              </h4>
                          </div>
                          <div className="p-8 h-[500px] overflow-y-auto bg-white">
                             <pre className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap">
                               {job.customizedResume}
                             </pre>
                          </div>
                       </div>
                    )}

                    {job.coverLetter && (
                       <div className="flex flex-col bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
                          <div className="p-6 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                              <h4 className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                                <StickyNote className="w-4 h-4 text-purple-600" /> Cover Letter
                              </h4>
                          </div>
                          <div className="p-8 h-[500px] overflow-y-auto bg-white">
                             <pre className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap">
                               {job.coverLetter}
                             </pre>
                          </div>
                       </div>
                    )}
                 </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
