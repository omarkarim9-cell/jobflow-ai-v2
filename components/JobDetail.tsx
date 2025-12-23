import React, { useState, useEffect, useMemo } from 'react';
import { Job, JobStatus, UserProfile } from '../types';
import { generateCoverLetter, customizeResume } from '../services/geminiService';
import { localGenerateCoverLetter, localCustomizeResume } from '../services/localAiService';
import { 
    Wand2, 
    FileText, 
    Loader2, 
    Sparkles, 
    Download, 
    X, 
    CheckCircle2, 
    AlertCircle, 
    Tag,
    ChevronRight,
    Split
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
  
  // Local state for live preview/editing
  const [resumeText, setResumeText] = useState<string>(job.customizedResume || userProfile.resumeContent || '');
  const [letterText, setLetterText] = useState<string>(job.coverLetter || '');

  const notify = (msg: string, type: NotificationType) => {
      if (showNotification) showNotification(msg, type);
  };

  // Keep local state in sync with job object
  useEffect(() => {
      setResumeText(job.customizedResume || userProfile.resumeContent || '');
      setLetterText(job.coverLetter || '');
      if (job.customizedResume && activeTab === 'details') {
          setActiveTab('ai-docs');
      }
  }, [job, userProfile.resumeContent]);

  // TAILORING ANALYSIS: Extracts keywords to prove personalization
  const tailoringAnalysis = useMemo(() => {
      if (!job.customizedResume) return null;
      
      const jobWords = job.description.toLowerCase().match(/\b(react|node|typescript|aws|python|javascript|cloud|docker|kubernetes|manager|lead|frontend|backend|fullstack|sql|api)\b/g) || [];
      const uniqueKeywords = Array.from(new Set(jobWords));
      
      const foundInResume = uniqueKeywords.filter(kw => job.customizedResume?.toLowerCase().includes(kw));
      
      return {
          keywordsFound: foundInResume,
          totalKeywords: uniqueKeywords.length,
          confidence: foundInResume.length > 0 ? 'High Customization' : 'General Match'
      };
  }, [job.customizedResume, job.description]);

  const handleGenerateDocuments = async () => {
    if (!userProfile.resumeContent || userProfile.resumeContent.length < 20) {
        notify("Please upload a resume in Settings first.", "error");
        return;
    }

    setIsGenerating(true);
    notify(`Generating tailored assets for ${job.company}...`, 'success');
    
    try {
        let finalResume = "";
        try {
            finalResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
        } catch (e) {
            finalResume = await localCustomizeResume(job.title, job.company, job.description, userProfile.resumeContent);
        }
        
        await new Promise(r => setTimeout(r, 1500)); // Buffer for API stability

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
        notify("Resume and Cover Letter customized for this role.", "success");
        setActiveTab('ai-docs');
    } catch (e) {
        console.error("AI Generation Error:", e);
        notify("Tailoring interrupted. Check your network.", "error");
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

  return (
    <div className="flex flex-col h-full bg-white relative">
      {/* Tab Navigation */}
      <div className="flex border-b border-slate-100 shrink-0">
        <button 
          onClick={() => setActiveTab('details')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
        >
          Job Description
        </button>
        <button 
          onClick={() => setActiveTab('ai-docs')}
          className={`flex-1 py-4 text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'ai-docs' ? 'text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50/30' : 'text-slate-400 hover:text-slate-600'}`}
        >
          AI Personalized Assets
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
        {activeTab === 'details' ? (
          <div className="space-y-8 animate-in fade-in duration-300 max-w-4xl mx-auto">
            <div className="flex items-start justify-between bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-indigo-100">
                  {job.company.charAt(0)}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-slate-900 tracking-tight">{job.title}</h1>
                  <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">{job.company}</p>
                </div>
              </div>
              <button 
                onClick={handleGenerateDocuments}
                disabled={isGenerating}
                className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2 shadow-xl shadow-indigo-100 transition-all"
              >
                {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                Generate Personalized CV
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Compatibility</p>
                <div className="flex items-center gap-2">
                   <p className="text-xl font-black text-slate-900">{job.matchScore}%</p>
                   {job.matchScore > 80 && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                </div>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Region</p>
                <p className="text-sm font-bold text-slate-700">{job.location}</p>
              </div>
              <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Source</p>
                <p className="text-sm font-bold text-slate-700">{job.source}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                 <FileText className="w-3 h-3" /> Posting Content
              </h3>
              <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
                {job.description}
              </div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col animate-in fade-in duration-300 max-w-6xl mx-auto">
            {!job.customizedResume ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border border-dashed border-slate-300 mt-4">
                <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6">
                  <Wand2 className="w-10 h-10" />
                </div>
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Personalization Required</h3>
                <p className="text-sm text-slate-500 max-w-xs mb-8">AI needs to analyze the job description to tailor your resume and draft a high-impact cover letter.</p>
                <button 
                  onClick={handleGenerateDocuments}
                  disabled={isGenerating}
                  className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-3 shadow-2xl shadow-indigo-200 transition-all"
                >
                  {isGenerating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                  Tailor Documents Now
                </button>
              </div>
            ) : (
              <div className="space-y-6 pb-20">
                {/* Customization Analysis Banner */}
                {tailoringAnalysis && (
                    <div className="bg-indigo-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-indigo-900/10">
                        <div className="flex items-center gap-4">
                            <div className="p-2 bg-white/10 rounded-xl">
                                <Sparkles className="w-5 h-5 text-indigo-300" />
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Customization Analysis</p>
                                <p className="text-xs font-bold flex items-center gap-2 mt-0.5">
                                    {tailoringAnalysis.confidence} — {tailoringAnalysis.keywordsFound.length} Target Keywords Injected
                                </p>
                            </div>
                        </div>
                        <div className="flex gap-1.5 overflow-hidden">
                            {tailoringAnalysis.keywordsFound.slice(0, 5).map(kw => (
                                <span key={kw} className="px-2 py-0.5 bg-white/10 rounded-md text-[9px] font-black uppercase tracking-tighter">
                                    {kw}
                                </span>
                            ))}
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                  {/* TAILORED RESUME PREVIEW */}
                  <div className="flex flex-col h-[600px] bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm group">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center text-indigo-600">
                             <FileText className="w-4 h-4" />
                         </div>
                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Tailored Resume</h4>
                      </div>
                      <button 
                        onClick={() => downloadTextFile(`${job.company}_Resume.txt`, resumeText)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-indigo-50 hover:text-indigo-600 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-2"
                        title="Download Asset"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                    <textarea 
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      className="flex-1 p-8 bg-white text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none custom-scrollbar focus:ring-1 focus:ring-indigo-100"
                    />
                  </div>

                  {/* COVER LETTER PREVIEW */}
                  <div className="flex flex-col h-[600px] bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm group">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <div className="flex items-center gap-2">
                         <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center text-purple-600">
                             <Tag className="w-4 h-4" />
                         </div>
                         <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Custom Cover Letter</h4>
                      </div>
                      <button 
                        onClick={() => downloadTextFile(`${job.company}_Letter.txt`, letterText)}
                        className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-purple-50 hover:text-purple-600 rounded-lg text-[10px] font-black uppercase tracking-tight transition-all flex items-center gap-2"
                        title="Download Asset"
                      >
                        <Download className="w-3 h-3" /> Download
                      </button>
                    </div>
                    <textarea 
                      value={letterText}
                      onChange={(e) => setLetterText(e.target.value)}
                      className="flex-1 p-8 bg-white text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none custom-scrollbar focus:ring-1 focus:ring-purple-100"
                      placeholder="Generating your unique cover letter..."
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS */}
      {activeTab === 'ai-docs' && job.customizedResume && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-10 bg-slate-900 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-6 border border-white/10 animate-in slide-in-from-bottom-4">
             <div className="flex items-center gap-2">
                 <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                 <span className="text-[10px] font-black uppercase tracking-widest">Assets Ready</span>
             </div>
             <div className="w-px h-4 bg-white/10" />
             <button onClick={handleGenerateDocuments} className="text-[10px] font-black uppercase tracking-widest hover:text-indigo-400 flex items-center gap-2 transition-colors">
                 <RefreshCw className="w-3 h-3" /> Re-Tailor
             </button>
        </div>
      )}
    </div>
  );
};

// Internal utility component for the re-tailor icon
const RefreshCw = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
        <path d="M16 16h5v5" />
    </svg>
);
