
import React, { useState, useRef } from 'react';
import { useAuth } from '@clerk/clerk-react';
import { Job, JobStatus, UserProfile } from '../types';
import { generateCoverLetter, customizeResume, generateAudioBriefing, generateInterviewQuestions } from '../services/geminiService';
import { 
    FileText, 
    Loader2, 
    Sparkles, 
    StickyNote,
    ExternalLink,
    ChevronDown,
    Building2,
    MapPin,
    Volume2,
    Play,
    BrainCircuit,
    ListChecks
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
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [isInterviewLoading, setIsInterviewLoading] = useState(false);
  const [questions, setQuestions] = useState<string[]>([]);
  const { getToken } = useAuth();
  
  const audioContextRef = useRef<AudioContext | null>(null);

  const notify = (msg: string, type: NotificationType) => {
      if (showNotification) showNotification(msg, type);
  };

  // Raw PCM Decoding Helpers
  const decodeBase64 = (base64: string) => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
  };

  async function decodeAudioData(data: Uint8Array, ctx: AudioContext, sampleRate: number, numChannels: number): Promise<AudioBuffer> {
    const dataInt16 = new Int16Array(data.buffer);
    const frameCount = dataInt16.length / numChannels;
    const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

    for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
            channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
    }
    return buffer;
  }

  const handlePlayBriefing = async () => {
    if (isAudioLoading) return;
    setIsAudioLoading(true);
    try {
        const base64 = await generateAudioBriefing(job, userProfile);
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({sampleRate: 24000});
        }
        
        const rawData = decodeBase64(base64);
        const audioBuffer = await decodeAudioData(rawData, audioContextRef.current, 24000, 1);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = audioBuffer;
        source.connect(audioContextRef.current.destination);
        source.start();
        notify("Briefing is playing...", "success");
    } catch (e) {
        console.error(e);
        notify("Audio playback failed.", "error");
    } finally {
        setIsAudioLoading(false);
    }
  };

  const handleGenerateQuestions = async () => {
    setIsInterviewLoading(true);
    try {
        const qs = await generateInterviewQuestions(job, userProfile);
        setQuestions(qs);
        notify("Practice questions generated!", "success");
    } catch (e) {
        notify("Failed to generate questions.", "error");
    } finally {
        setIsInterviewLoading(false);
    }
  };

  const handleGenerateDocuments = async () => {
    if (!userProfile.resumeContent || userProfile.resumeContent.length < 50) {
        notify("Please update your master resume in Settings first.", "error");
        return;
    }
    setIsGenerating(true);
    try {
        const token = await getToken();
        if (!token) throw new Error("Auth failed");
        const [finalResume, finalLetter] = await Promise.all([
            customizeResume(job.title, job.company, job.description, userProfile.resumeContent, userProfile.email, token),
            generateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email, token)
        ]);
        await onUpdateJob({ ...job, customizedResume: finalResume, coverLetter: finalLetter, status: JobStatus.SAVED });
        notify("AI Assets tailored!", "success");
    } catch (e) {
        notify("Asset generation failed.", "error");
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
                <div className="w-24 h-24 rounded-3xl bg-indigo-600 flex items-center justify-center text-white text-4xl font-black shadow-2xl">
                    {job.company.charAt(0)}
                </div>
                <div>
                    <h1 className="text-3xl font-black text-slate-900 tracking-tight leading-none mb-3">{job.title}</h1>
                    <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 uppercase">
                            <Building2 className="w-4 h-4" /> {job.company}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
                            <MapPin className="w-4 h-4" /> {job.location}
                        </div>
                        <div className="text-emerald-600 font-black text-xs uppercase tracking-widest">{job.matchScore}% AI Match</div>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-col gap-3 w-full md:w-auto">
                <button 
                  onClick={() => openSafeApplicationUrl(job)}
                  className="w-full md:w-56 py-4 bg-white border border-slate-200 text-slate-600 rounded-2xl font-black text-[10px] uppercase hover:bg-slate-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                    Visit Job Page <ExternalLink className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleGenerateDocuments} 
                  disabled={isGenerating} 
                  className="w-full md:w-56 bg-indigo-600 text-white py-4 rounded-2xl font-black text-[10px] uppercase hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2 shadow-xl"
                >
                  {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} 
                  {job.customizedResume ? 'Regenerate Assets' : 'Tailor Profile'}
                </button>
            </div>
        </div>

        {/* Intelligence Briefing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-indigo-900 text-white p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl"></div>
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] opacity-60">Audio Briefing</h3>
                    <Volume2 className="w-5 h-5 opacity-40" />
                </div>
                <p className="text-sm font-medium leading-relaxed mb-6 opacity-80 italic pe-8">
                    "Hi {userProfile.fullName}, I've analyzed this role. It matches your background perfectly. Let's listen to the key points..."
                </p>
                <button 
                    onClick={handlePlayBriefing}
                    disabled={isAudioLoading}
                    className="flex items-center gap-3 px-6 py-3 bg-white text-indigo-900 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-indigo-50 transition-all shadow-lg"
                >
                    {isAudioLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                    Listen to Summary
                </button>
            </div>

            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden group">
                <div className="flex justify-between items-start mb-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-slate-400">Interview Prep</h3>
                    <BrainCircuit className="w-5 h-5 text-indigo-400" />
                </div>
                <div className="space-y-3">
                    {questions.length > 0 ? (
                        questions.map((q, i) => (
                            <div key={i} className="flex gap-3 items-start animate-in slide-in-from-left duration-300" style={{animationDelay: `${i*100}ms`}}>
                                <span className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center text-[10px] font-black text-slate-400 shrink-0">{i+1}</span>
                                <p className="text-xs font-medium text-slate-600 leading-tight">{q}</p>
                            </div>
                        ))
                    ) : (
                        <p className="text-xs text-slate-400 italic">Generate mock questions based on your profile for this specific role.</p>
                    )}
                </div>
                <button 
                    onClick={handleGenerateQuestions}
                    disabled={isInterviewLoading}
                    className="mt-6 flex items-center gap-3 px-6 py-3 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all"
                >
                    {isInterviewLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ListChecks className="w-4 h-4" />}
                    Generate Questions
                </button>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-8">
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
               <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-8 flex items-center gap-2">
                 <ChevronDown className="w-4 h-4 text-indigo-600" /> Full Description
               </h3>
               <div className="text-slate-600 text-base leading-relaxed whitespace-pre-wrap font-medium">
                 {job.description || "No description content available."}
               </div>
            </div>

            {(job.customizedResume || job.coverLetter) && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 py-8 animate-in fade-in duration-700">
                    <div className="flex flex-col bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                            <FileText className="w-5 h-5 text-indigo-600" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Tailored Resume</h4>
                        </div>
                        <div className="p-10 h-[500px] overflow-y-auto bg-white custom-scrollbar">
                           <pre className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap">{job.customizedResume}</pre>
                        </div>
                    </div>
                    <div className="flex flex-col bg-white rounded-[3rem] border border-slate-200 overflow-hidden shadow-sm">
                        <div className="p-8 bg-slate-50/50 border-b border-slate-100 flex items-center gap-3">
                            <StickyNote className="w-5 h-5 text-purple-600" />
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800">Generated Letter</h4>
                        </div>
                        <div className="p-10 h-[500px] overflow-y-auto bg-white custom-scrollbar">
                           <pre className="text-[11px] font-mono text-slate-600 leading-relaxed whitespace-pre-wrap">{job.coverLetter}</pre>
                        </div>
                    </div>
              </div>
            )}
        </div>
      </div>
    </div>
  );
};
