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
    Tag,
    ChevronRight,
    RefreshCw
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

  useEffect(() => {
      setResumeText(job.customizedResume || userProfile.resumeContent || '');
      setLetterText(job.coverLetter || '');
      if (job.customizedResume && activeTab === 'details') {
          setActiveTab('ai-docs');
      }
  }, [job, userProfile.resumeContent]);

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
            finalResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent, userProfile.email);
        } catch (e) {
            finalResume = await localCustomizeResume(job.title, job.company, job.description, userProfile.resumeContent, userProfile.email);
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
        notify("Resume and Cover Letter customized for this role.", "success");
        setActiveTab('ai-docs');
    } catch (e) {
        console.error("AI Generation Error:", e);
        notify("Tailoring interrupted.", "error");
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
                <div className="w-16 h-16 rounded-2xl bg-indigo-600 flex items-center justify-center text-white text-2xl font-black">
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
                Generated Resume and Letter
              </button>
            </div>

            <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
               <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Job Details</h3>
               <div className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{job.description}</div>
            </div>
          </div>
        ) : (
          <div className="h-full flex flex-col animate-in fade-in duration-300 max-w-6xl mx-auto">
            {!job.customizedResume ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-12 bg-white rounded-[3rem] border border-dashed border-slate-300 mt-4">
                <Wand2 className="w-12 h-12 text-indigo-200 mb-6" />
                <h3 className="text-xl font-black text-slate-900 mb-2 uppercase tracking-tight">Tailoring Required</h3>
                <p className="text-sm text-slate-500 max-w-xs mb-8">Click the button in the 'Job Description' tab to generate your verified documents.</p>
              </div>
            ) : (
              <div className="space-y-6 pb-20">
                {tailoringAnalysis && (
                    <div className="bg-indigo-900 text-white p-4 rounded-2xl flex items-center justify-between shadow-xl shadow-indigo-900/10">
                        <div className="flex items-center gap-4">
                            <Sparkles className="w-5 h-5 text-indigo-300" />
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-indigo-300">Tailoring Confidence</p>
                                <p className="text-xs font-bold">{tailoringAnalysis.confidence} — {tailoringAnalysis.keywordsFound.length} Keywords Matching</p>
                            </div>
                        </div>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 h-full">
                  <div className="flex flex-col h-[600px] bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Tailored Resume</h4>
                      <button onClick={() => downloadTextFile(`${job.company}_Resume.txt`, resumeText)} className="text-indigo-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea 
                      value={resumeText}
                      onChange={(e) => setResumeText(e.target.value)}
                      className="flex-1 p-8 bg-white text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none"
                    />
                  </div>

                  <div className="flex flex-col h-[600px] bg-white rounded-[2rem] border border-slate-200 overflow-hidden shadow-sm">
                    <div className="p-5 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                      <h4 className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Cover Letter</h4>
                      <button onClick={() => downloadTextFile(`${job.company}_Letter.txt`, letterText)} className="text-purple-600">
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                    <textarea 
                      value={letterText}
                      onChange={(e) => setLetterText(e.target.value)}
                      className="flex-1 p-8 bg-white text-[11px] font-mono text-slate-600 leading-relaxed outline-none resize-none"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
