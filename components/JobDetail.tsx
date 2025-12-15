import React, { useState, useEffect } from 'react';
import { Job, JobStatus, UserProfile, isSubscriptionValid } from '../types';
import { generateCoverLetter, customizeResume } from '../services/geminiService';
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
        const letter = await generateCoverLetter(
          job.title,
          job.company,
          job.description,
          userProfile.resumeContent,
          userProfile.fullName,
          userProfile.email
        );
        setGeneratedLetter(letter);
    } catch (e) {
        console.error(e);
        notify("Failed to generate cover letter. Please try again.", 'error');
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
        const newResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
        setResumeText(newResume);
        onUpdateJob({
            ...job,
            customizedResume: newResume
        });
    } catch (e) {
        console.error(e);
        notify("Failed to regenerate resume. Please try again.", 'error');
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
    setApplySuccess(false);
    setShowManualFallback(false);
    
    setActiveTab('ai-docs');

    setApplyStep('AI Agent: Analyzing Job Description...');
    
    let currentResume = resumeText;
    let currentLetter = generatedLetter;

    try {
        if (!job.customizedResume) {
            setApplyStep('AI Agent: Rewriting Resume to match keywords...');
            setIsGenerating(true);
            currentResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
            setResumeText(currentResume);
            await new Promise(r => setTimeout(r, 500));
        }

        if (!job.coverLetter) {
            setApplyStep('AI Agent: Drafting personalized Cover Letter...');
            currentLetter = await generateCoverLetter(
                job.title, 
                job.company, 
                job.description, 
                userProfile.resumeContent,
                userProfile.fullName,
                userProfile.email
            );
            setGeneratedLetter(currentLetter);
            await new Promise(r => setTimeout(r, 500));
        }
        
        setIsGenerating(false);

        onUpdateJob({
            ...job,
            customizedResume: currentResume,
            coverLetter: currentLetter || undefined
        });

        setApplyStep('AI Agent: Connecting to Application Portal...');
        
        const automationResult = await simulateBrowserAutomation(job, userProfile, (step) => setApplyStep(step));
        
        if (automationResult.requiresManual) {
            setApplyStep('Documents Prepared. Ready for Manual Application.');
            setIsApplying(false);
            setShowManualFallback(true);
            return;
        }

        if (automationResult.success) {
             setApplySuccess(true);
             setApplyStep('Application Submitted Successfully!');
        } else {
             throw new Error(automationResult.error);
        }

    } catch (error) {
        console.error("Process failed", error);
        setApplyStep('Error during application process.');
        notify("Application process interrupted.", 'error');
    } finally {
        setIsApplying(false);
    }
  };

  const handleAutoApplyClick = () => {
      setShowConfirm(true);
  };

  // --- EFFECTS ---

  useEffect(() => {
    setGeneratedLetter(job.coverLetter || null);
    const initialResume = job.customizedResume || userProfile.resumeContent || "";
    setResumeText(initialResume);
    setNotesText(job.notes || '');
    setIsSaved(false);
    setApplyStep('');
    setApplySuccess(false);
    setLaterNotes(job.notes || '');
    setIsApplying(false); 
    setShowManualFallback(false);
    setIsFindingLink(false);
  }, [job, userProfile]);

  useEffect(() => {
    if (triggerAutoApply) {
        executeAutoApply();
        if (onAutoApplyHandled) onAutoApplyHandled();
    }
  }, [triggerAutoApply, onAutoApplyHandled]);

  // --- LINK HANDLING ---

  const handleManualLaunch = async () => {
      await openSafeApplicationUrl(job);
      onUpdateStatus(job.id, JobStatus.APPLIED_MANUAL);
      setShowManualFallback(false);
  };
  
  const handleAlternativeSearch = (platform: 'google' | 'linkedin' | 'indeed') => {
      const query = `${job.title} ${job.company}`;
      let url = '';
      if (platform === 'google') url = `https://www.google.com/search?q=${encodeURIComponent(query + ' jobs')}`;
      if (platform === 'linkedin') url = `https://www.linkedin.com/jobs/search?keywords=${encodeURIComponent(query)}`;
      if (platform === 'indeed') url = `https://www.indeed.com/jobs?q=${encodeURIComponent(query)}`;
      
      // Use the robust open handler that shows the intermediate page
      openSafeApplicationUrl(job, url);
  };

  const handleViewInBrowser = async (e: React.MouseEvent) => {
    e.preventDefault();
    await openSafeApplicationUrl(job);
  };
  
  const handleSaveDocs = () => {
      onUpdateJob({
          ...job,
          coverLetter: generatedLetter || undefined,
          customizedResume: resumeText,
          notes: notesText
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveNotes = () => {
      onUpdateJob({
          ...job,
          notes: notesText
      });
      setIsEditingNotes(false);
  };

  const handleApplyLaterSubmit = () => {
    onUpdateJob({
      ...job,
      notes: laterNotes,
      status: JobStatus.SAVED
    });
    onUpdateStatus(job.id, JobStatus.SAVED);
    setShowApplyLater(false);
  };

  const handleCopyText = (text: string, type: 'resume' | 'letter') => {
      navigator.clipboard.writeText(text);
      setCopyFeedback(type);
      setTimeout(() => setCopyFeedback(null), 2000);
  };

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

  const handleDownloadResume = () => {
      const safeCompany = job.company.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
      downloadTextFile(`${safeCompany}_Resume.txt`, resumeText);
  };

  const handleDownloadCoverLetter = () => {
      if (!generatedLetter) return;
      const safeCompany = job.company.replace(/[^a-z0-9]/gi, '_').substring(0, 20);
      downloadTextFile(`${safeCompany}_CoverLetter.txt`, generatedLetter);
  };

  const canAutoApply = job.status === JobStatus.DETECTED || job.status === JobStatus.SAVED;
  const hasMasterResume = userProfile.resumeContent && userProfile.resumeContent.trim().length > 10;
  
  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col overflow-hidden relative">
      {/* Header */}
      <div className="p-6 border-b border-slate-100">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-3 mb-2">
               <h2 className="text-2xl font-bold text-slate-900">{job.title}</h2>
               {job.applicationUrl ? (
                 <div className="flex items-center gap-2">
                     <button 
                       onClick={handleViewInBrowser}
                       className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition shadow-sm font-medium text-sm"
                     >
                       <Send className="w-4 h-4 rtl:rotate-180" />
                       Apply
                     </button>
                     
                     <button
                        onClick={() => handleAlternativeSearch('google')}
                        className="text-slate-500 hover:text-indigo-600 flex items-center text-xs font-medium px-2 py-1 rounded border border-slate-200 hover:bg-slate-50 transition-colors"
                        title="Search Google"
                     >
                         <Search className="w-3 h-3 me-1" /> Search
                     </button>
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs flex items-center">
                      <AlertTriangle className="w-3 h-3 me-1"/> No Link Available
                    </span>
                    <button
                        onClick={() => handleAlternativeSearch('google')}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center text-xs font-medium px-2 py-1 rounded border border-indigo-100 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        title="Search Google"
                     >
                         <Search className="w-3 h-3 me-1" /> Find on Google
                     </button>
                 </div>
               )}
            </div>
            <div className="text-lg text-slate-600 font-medium">{job.company}</div>
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-500">
              <span>{job.location}</span>
              <span>•</span>
              <span>{job.salaryRange || 'Salary not specified'}</span>
              <span>•</span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-600">{job.source}</span>
            </div>
          </div>
          
          <div className="flex gap-2">
             {canAutoApply && (
               <>
                <button 
                  onClick={() => onUpdateStatus(job.id, JobStatus.REJECTED)}
                  disabled={isApplying}
                  className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                >
                  Not Interested
                </button>
                
                <button 
                  onClick={() => setShowApplyLater(true)}
                  disabled={isApplying}
                  className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 flex items-center disabled:opacity-50"
                >
                  <Clock className="w-4 h-4 me-2" />
                  Apply Later
                </button>

                <button 
                  onClick={handleAutoApplyClick}
                  disabled={isApplying}
                  title="Generate Resume & Cover Letter"
                  className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center shadow-sm disabled:cursor-not-allowed min-w-[190px] justify-center bg-indigo-600 hover:bg-indigo-700`}
                >
                   {isApplying ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : <Wand2 className="w-4 h-4 me-2" />}
                   {isApplying ? 'Writing Docs...' : 'Generate Docs'}
                </button>
               </>
             )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 mt-6">
            <button 
                onClick={() => setActiveTab('details')}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${activeTab === 'details' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                Job Description
            </button>
            <button 
                onClick={() => setActiveTab('ai-docs')}
                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center ${activeTab === 'ai-docs' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
            >
                <Sparkles className="w-4 h-4 me-2" />
                AI Documents
            </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          
          {/* APPLY PROCESS STATUS */}
          {applyStep && (
              <div className={`mb-6 p-4 rounded-xl border ${applySuccess ? 'bg-green-50 border-green-200' : showManualFallback ? 'bg-amber-50 border-amber-200' : 'bg-indigo-50 border-indigo-200'} animate-in fade-in slide-in-from-top-2`}>
                   <div className="flex items-center justify-between">
                       <div className="flex items-center">
                           {isGenerating ? <Loader2 className="w-5 h-5 text-indigo-600 animate-spin me-3"/> : 
                            applySuccess ? <CheckCircle className="w-5 h-5 text-green-600 me-3"/> : 
                            showManualFallback ? <AlertTriangle className="w-5 h-5 text-amber-600 me-3"/> :
                            <Wand2 className="w-5 h-5 text-indigo-600 me-3"/>
                           }
                           <span className={`font-medium ${applySuccess ? 'text-green-800' : showManualFallback ? 'text-amber-800' : 'text-indigo-900'}`}>{applyStep}</span>
                       </div>
                   </div>
              </div>
          )}

          {activeTab === 'details' && (
              <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                  <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-4">Description</h3>
                  <div className="prose prose-sm max-w-none text-slate-600 whitespace-pre-wrap leading-relaxed">
                      {job.description}
                  </div>
                  
                  {job.requirements && job.requirements.length > 0 && (
                      <div className="mt-8">
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide mb-3">Key Requirements</h3>
                          <div className="flex flex-wrap gap-2">
                              {job.requirements.map((req, i) => (
                                  <span key={i} className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-xs font-medium border border-slate-200">
                                      {req}
                                  </span>
                              ))}
                          </div>
                      </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-slate-100">
                      <div className="flex justify-between items-center mb-2">
                          <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wide flex items-center">
                              <StickyNote className="w-4 h-4 me-2" /> Notes
                          </h3>
                          {!isEditingNotes && (
                              <button onClick={() => setIsEditingNotes(true)} className="text-xs text-indigo-600 hover:underline flex items-center">
                                  <Pencil className="w-3 h-3 me-1" /> Edit
                              </button>
                          )}
                      </div>
                      {isEditingNotes ? (
                          <div>
                              <textarea 
                                  value={notesText}
                                  onChange={(e) => setNotesText(e.target.value)}
                                  className="w-full h-24 p-3 border border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                                  placeholder="Add private notes about this job..."
                              />
                              <div className="flex justify-end gap-2 mt-2">
                                  <button onClick={() => setIsEditingNotes(false)} className="text-xs text-slate-500 hover:text-slate-700">Cancel</button>
                                  <button onClick={handleSaveNotes} className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700">Save Note</button>
                              </div>
                          </div>
                      ) : (
                          <p className="text-sm text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-100 min-h-[60px]">
                              {notesText || "No notes added yet."}
                          </p>
                      )}
                  </div>
              </div>
          )}

          {activeTab === 'ai-docs' && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-2 pb-12">
                  
                  {/* TOP APPLY BUTTON - ADDED FOR REDUNDANCY */}
                  <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex justify-between items-center shadow-sm">
                      <div className="flex items-center text-indigo-900">
                          <div className="bg-indigo-200 p-2 rounded-lg me-3">
                              <CheckCircle className="w-5 h-5 text-indigo-700" />
                          </div>
                          <div>
                              <p className="font-bold text-sm">Documents Ready</p>
                              <p className="text-xs opacity-80">Review your AI-generated assets below.</p>
                          </div>
                      </div>
                      <button 
                            onClick={handleViewInBrowser}
                            className="bg-green-600 text-white px-5 py-2 rounded-lg font-bold hover:bg-green-700 shadow-md hover:shadow-lg transition-all flex items-center text-xs"
                      >
                            Apply Now <Send className="w-3 h-3 ms-2 rtl:rotate-180" />
                      </button>
                  </div>

                  {/* RESUME SECTION */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                           <h3 className="font-bold text-slate-900 flex items-center">
                               <FileText className="w-4 h-4 me-2 text-indigo-600"/> Tailored Resume (AI Generated)
                           </h3>
                           <div className="flex gap-2">
                               {hasMasterResume ? (
                                   <>
                                       <button 
                                           onClick={handleRegenerateResume} 
                                           disabled={isGenerating}
                                           className="text-xs flex items-center text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                       >
                                           <RefreshCw className={`w-3 h-3 me-1 ${isGenerating ? 'animate-spin' : ''}`} /> Regenerate
                                       </button>
                                       <button onClick={handleDownloadResume} className="text-xs flex items-center text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                           <Download className="w-3 h-3 me-1" /> Download .txt
                                       </button>
                                   </>
                               ) : (
                                   <span className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded border border-amber-200">Action Required</span>
                               )}
                           </div>
                       </div>
                       
                       {!hasMasterResume ? (
                           <div className="p-8 flex flex-col items-center justify-center text-center bg-amber-50/30">
                               <AlertTriangle className="w-10 h-10 text-amber-500 mb-3" />
                               <h4 className="text-lg font-bold text-slate-800">Missing Master Resume</h4>
                               <p className="text-sm text-slate-600 max-w-md mb-4">
                                   The AI cannot generate a tailored resume because your Master Resume is missing. Please upload it in Settings.
                               </p>
                               {onOpenSettings && (
                                   <button 
                                     onClick={onOpenSettings}
                                     className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center"
                                   >
                                       <Settings className="w-4 h-4 me-2"/> Go to Settings
                                   </button>
                               )}
                           </div>
                       ) : (
                           <div className="p-0 relative">
                               {!job.customizedResume && (
                                   <div className="absolute top-0 right-0 rtl:left-0 rtl:right-auto bg-slate-100 text-slate-500 text-[10px] px-2 py-0.5 rounded-bl-lg rtl:rounded-br-lg z-10">
                                       Displaying Master Resume
                                   </div>
                               )}
                               <textarea 
                                   value={resumeText}
                                   onChange={(e) => setResumeText(e.target.value)}
                                   className="w-full h-96 p-4 text-sm font-mono text-slate-700 bg-white outline-none resize-none focus:bg-slate-50 transition-colors leading-relaxed"
                                   placeholder="Resume content..."
                               />
                           </div>
                       )}

                       {hasMasterResume && (
                            <div className="p-2 bg-slate-50 border-t border-slate-100 flex justify-end">
                                {isSaved ? (
                                    <span className="text-xs text-green-600 font-medium flex items-center px-3 py-1.5">
                                        <Check className="w-3 h-3 me-1" /> Saved
                                    </span>
                                ) : (
                                    <button onClick={handleSaveDocs} className="text-xs font-medium text-indigo-600 hover:text-indigo-800 px-3 py-1.5">
                                        Save Changes
                                    </button>
                                )}
                            </div>
                       )}
                  </div>

                  {/* COVER LETTER SECTION */}
                  <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                       <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                           <h3 className="font-bold text-slate-900 flex items-center">
                               <StickyNote className="w-4 h-4 me-2 text-indigo-600"/> Cover Letter
                           </h3>
                           <div className="flex gap-2">
                               {!generatedLetter ? (
                                   <button 
                                      onClick={handleGenerateCoverLetter} 
                                      disabled={isGenerating || !hasMasterResume}
                                      className="text-xs flex items-center text-white bg-indigo-600 hover:bg-indigo-700 px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                   >
                                       <Wand2 className="w-3 h-3 me-1" /> Generate
                                   </button>
                               ) : (
                                   <>
                                    <button 
                                        onClick={handleGenerateCoverLetter} 
                                        disabled={isGenerating || !hasMasterResume}
                                        className="text-xs flex items-center text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm disabled:opacity-50"
                                    >
                                        <RefreshCw className={`w-3 h-3 me-1 ${isGenerating ? 'animate-spin' : ''}`} /> Rewrite
                                    </button>
                                    <button onClick={handleDownloadCoverLetter} className="text-xs flex items-center text-slate-600 hover:text-indigo-600 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors shadow-sm">
                                        <Download className="w-3 h-3 me-1" /> Download
                                    </button>
                                   </>
                               )}
                           </div>
                       </div>
                       <div className="p-0">
                           {generatedLetter ? (
                               <textarea 
                                   value={generatedLetter}
                                   onChange={(e) => setGeneratedLetter(e.target.value)}
                                   className="w-full h-80 p-4 text-sm font-sans text-slate-700 bg-white outline-none resize-none focus:bg-slate-50 transition-colors leading-relaxed"
                               />
                           ) : (
                               <div className="h-40 flex flex-col items-center justify-center text-slate-400 bg-slate-50/50">
                                   <Wand2 className="w-8 h-8 mb-2 opacity-30" />
                                   <p className="text-sm">Click Generate to create a tailored cover letter.</p>
                               </div>
                           )}
                       </div>
                  </div>
                  
                  {/* BOTTOM APPLY BUTTON - For Single View Generated Documents */}
                  <div className="flex justify-end pt-4 border-t border-slate-200">
                        <button 
                            onClick={handleViewInBrowser}
                            className="bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 shadow-lg hover:shadow-green-200 transition-all flex items-center text-sm"
                        >
                            Apply Now <Send className="w-4 h-4 ms-2 rtl:rotate-180" />
                        </button>
                  </div>

              </div>
          )}
      </div>

      {/* CONFIRMATION MODALS */}
      {showConfirm && (
        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-20 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95">
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Generate Application Kit?</h3>
                 <p className="text-sm text-slate-600 mb-4">
                     The AI will rewrite your resume and generate a cover letter specifically for <strong>{job.company}</strong>.
                 </p>
                 <div className="flex gap-3">
                     <button onClick={() => setShowConfirm(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                     <button onClick={executeAutoApply} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">Generate</button>
                 </div>
             </div>
        </div>
      )}

      {/* MANUAL APPLY FALLBACK MODAL */}
      {showManualFallback && (
         <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm z-30 flex items-center justify-center p-4">
             <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-in zoom-in-95 overflow-hidden">
                 <div className="bg-indigo-50 p-6 border-b border-indigo-100 flex items-start">
                     <div className="p-2 bg-indigo-100 rounded-full me-4 shrink-0">
                         <FileText className="w-6 h-6 text-indigo-600" />
                     </div>
                     <div>
                        <h3 className="text-lg font-bold text-slate-900">Documents Ready</h3>
                        <p className="text-sm text-slate-600 mt-1">
                            We have prepared your tailored resume and cover letter. Use them to apply on the official job site.
                        </p>
                     </div>
                 </div>
                 
                 <div className="p-6 space-y-4">
                     <div className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Step 1: Copy Your Assets</div>
                     <div className="grid grid-cols-2 gap-4">
                         <button 
                            onClick={() => handleCopyText(resumeText, 'resume')}
                            className="flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors group"
                         >
                             {copyFeedback === 'resume' ? <Check className="w-6 h-6 text-green-600 mb-2" /> : <FileText className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform"/>}
                             <span className="text-sm font-bold text-slate-700">Copy Resume</span>
                             <span className="text-xs text-slate-400 mt-1">{copyFeedback === 'resume' ? 'Copied!' : 'Click to copy'}</span>
                         </button>

                         <button 
                            onClick={() => generatedLetter ? handleCopyText(generatedLetter, 'letter') : alert('No cover letter generated')}
                            disabled={!generatedLetter}
                            className={`flex flex-col items-center justify-center p-4 border border-slate-200 rounded-xl transition-colors group ${!generatedLetter ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-50'}`}
                         >
                             {copyFeedback === 'letter' ? <Check className="w-6 h-6 text-green-600 mb-2" /> : <StickyNote className="w-6 h-6 text-indigo-600 mb-2 group-hover:scale-110 transition-transform"/>}
                             <span className="text-sm font-bold text-slate-700">Copy Cover Letter</span>
                             <span className="text-xs text-slate-400 mt-1">{!generatedLetter ? 'Not generated' : copyFeedback === 'letter' ? 'Copied!' : 'Click to copy'}</span>
                         </button>
                     </div>

                     <div className="border-t border-slate-100 my-4"></div>

                     <div className="text-sm font-bold text-slate-800 uppercase tracking-wide mb-2">Step 2: Complete Application</div>
                     
                     <div className="flex flex-col gap-2">
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-2 text-xs text-amber-800">
                             <p className="font-bold flex items-center mb-1">
                                 <AlertTriangle className="w-3 h-3 mr-1" /> Important Note:
                             </p>
                             Job boards often restrict direct linking. If the link fails or redirects to a home page, please use the <strong>Search Google</strong> or <strong>LinkedIn</strong> buttons below to find the specific posting.
                        </div>

                        <button 
                            onClick={handleManualLaunch}
                            disabled={isFindingLink}
                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg hover:shadow-green-200 transition-all flex items-center justify-center disabled:opacity-70"
                        >
                            {isFindingLink ? <Loader2 className="w-5 h-5 me-2 animate-spin"/> : <ArrowRight className="w-5 h-5 me-2 rtl:rotate-180" />}
                            {isFindingLink ? 'Locating Official Site...' : 'Open Job Link'}
                        </button>
                        
                        <div className="flex items-center justify-center gap-2 pt-2">
                            <span className="text-xs text-slate-500">Link broken?</span>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleAlternativeSearch('google')}
                                    className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-50 flex items-center"
                                >
                                    <Search className="w-3 h-3 me-1" /> Search Google
                                </button>
                                <button 
                                    onClick={() => handleAlternativeSearch('linkedin')}
                                    className="text-xs bg-white border border-slate-200 text-slate-600 px-2 py-1 rounded hover:bg-slate-50 flex items-center"
                                >
                                    <Search className="w-3 h-3 me-1" /> LinkedIn
                                </button>
                            </div>
                        </div>
                     </div>

                 </div>

                 <div className="bg-slate-50 p-4 border-t border-slate-100 flex justify-end">
                     <button onClick={() => setShowManualFallback(false)} className="text-slate-500 hover:text-slate-700 text-sm font-medium px-4">
                         Close
                     </button>
                 </div>
             </div>
        </div>
      )}

      {showApplyLater && (
         <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm z-20 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-in zoom-in-95">
                 <h3 className="text-lg font-bold text-slate-900 mb-2">Save for Later</h3>
                 <div className="mb-4">
                     <label className="block text-xs font-bold text-slate-700 mb-1">Add a Note (Optional)</label>
                     <textarea 
                        value={laterNotes} 
                        onChange={(e) => setLaterNotes(e.target.value)}
                        className="w-full border border-slate-300 rounded-lg p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                        placeholder="e.g. Apply before Friday..."
                     />
                 </div>
                 <div className="flex gap-3">
                     <button onClick={() => setShowApplyLater(false)} className="flex-1 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium">Cancel</button>
                     <button onClick={handleApplyLaterSubmit} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm">Save Job</button>
                 </div>
             </div>
        </div>
      )}
    </div>
  );
};