
import React, { useState } from 'react';
import { Job, JobStatus, UserProfile } from '../types';
import { generateCoverLetter, customizeResume } from '../services/geminiService';
import { 
    FileText, 
    Loader2, 
    Sparkles, 
    StickyNote,
    ExternalLink,
    ChevronDown,
    Building2,
    MapPin,
    Calendar,
    CheckCircle2
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
    if (!userProfile.resumeContent || userProfile.resumeContent.length < 50) {
        notify("Please update your master resume in Settings first (minimum 50 chars).", "error");
        return;
    }
    
    setIsGenerating(true);
    notify(`AI Agent is tailoring your assets for ${job.company}...`, 'success');
    
    try {
        // Run parallel generations
        const [finalResume, finalLetter] = await Promise.all([
            customizeResume(job.title, job.company, job.description, userProfile.resumeContent, userProfile.email),
            generateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email)
        ]);
        
        if (!finalResume || !finalLetter) {
            throw new Error("AI returned empty content");
        }

        const updatedJob: Job = { 
            ...job, 
            customizedResume: finalResume, 
            coverLetter: finalLetter, 
            status: job.status === JobStatus.DETECTED ? JobStatus.SAVED : job.status 
        };
        
        // Push update to parent and database
        await onUpdateJob(updatedJob);
        notify("Application assets ready for review!", "success");
    } catch (e) {
        console.error("Asset generation failed:", e);
        notify("Generation failed. Please verify your connection or API key.", "error");
    } finally {
        setIsGenerating(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 overflow-y-auto pb-24">
      <div className="p-8 max-w-5xl mx-auto w-full space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Header Section */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-6 flex-col md:flex-row text-center md:text-left">
                <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl shadow-indigo-100 transform -rotate-3">
                    {job.company.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">{job.title}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase tracking-widest">
                            <Building2 className="w-4 h-4" /> {job.company}
                        </div>
                        <span className="hidden md:inline w-1 h-1 bg-slate-300 rounded-full"></span>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <MapPin className="w-4 h-4" /> {job.location}
                        </div>
                        <span className="hidden md:inline w-1 h-1 bg-slate-300 rounded-full"></span>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <Calendar className="w-4 h-4" /> {new Date(job.detectedAt).toLocaleDateString()}
                        </div>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full md:w-auto">
                <button 
                  onClick={() => openSafeApplicationUrl(job)}
                  className="w-full md:w-56 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    Visit Job Page <ExternalLink className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleGenerateDocuments} 
                  disabled={isGenerating} 
                  className="w-full md:w-56 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl shadow-indigo-100"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
                  {job.customizedResume ? 'Regenerate Assets' : 'Generate Assets'}
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
            {/* Job Description Card */}
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
               <div className="absolute top-0 right-0 p-6">
                   <div className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Context Summary</div>
               </div>
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                 <ChevronDown className="w-4 h-4 text-indigo-600" /> Full Description
               </h3>
               <div className="text-slate-600 text-base leading-relaxed whitespace-pre-wrap font-medium">
                 {job.description || "No description content available. Use the Visit Job Page link to see full details."}
               </div>
            </div>

            {/* Tailored AI Assets Flow */}
            {(job.customizedResume || job.coverLetter) ? (
              <div className="space-y-12 py-8 animate-in fade-in slide-in-from-bottom-10 duration-700">
                 <div className="flex items-center gap-6">
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                    <div className="flex items-center gap-3">
                        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        <h3 className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.4em] whitespace-nowrap">AI-Customized Application</h3>
                    </div>
                    <div className="h-[1px] flex-1 bg-slate-200"></div>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Custom Resume View */}
                    <div className="flex flex-col bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-100 rounded-lg">
                                    <FileText className="w-5 h-5 text-indigo-600" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Tailored Resume</h4>
                            </div>
                        </div>
                        <div className="p-10 h-[650px] overflow-y-auto bg-white custom-scrollbar">
                           <pre className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">
                             {job.customizedResume}
                           </pre>
                        </div>
                    </div>

                    {/* Cover Letter View */}
                    <div className="flex flex-col bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-purple-100 rounded-lg">
                                    <StickyNote className="w-5 h-5 text-purple-600" />
                                </div>
                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Generated Letter</h4>
                            </div>
                        </div>
                        <div className="p-10 h-[650px] overflow-y-auto bg-white custom-scrollbar">
                           <pre className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap font-sans">
                             {job.coverLetter}
                           </pre>
                        </div>
                    </div>
                 </div>
              </div>
            ) : (
                <div className="p-16 text-center bg-slate-100/50 rounded-[2.5rem] border border-dashed border-slate-200">
                    <Sparkles className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                    <h4 className="text-sm font-black text-slate-400 uppercase tracking-widest">AI Assets Not Generated</h4>
                    <p className="text-xs text-slate-400 mt-2">Click the "Generate Assets" button above to create customized job-specific documents.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
