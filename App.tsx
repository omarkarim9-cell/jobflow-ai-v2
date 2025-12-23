import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Job, JobStatus, ViewState, UserProfile, EmailAccount } from './types';
import { DashboardStats } from './components/DashboardStats';
import { JobCard } from './components/JobCard';
import { InboxScanner } from './components/InboxScanner';
import { Settings } from './components/Settings';
import { UserManual } from './components/UserManual';
import { Subscription } from './components/Subscription';
import { Support } from './components/Support';
import { AddJobModal } from './components/AddJobModal';
import { Auth } from './components/Auth';
import { ApplicationTracker } from './components/ApplicationTracker';
import { NotificationToast, NotificationType } from './components/NotificationToast';
import { createVirtualDirectory } from './services/fileSystemService';
import { LanguageCode } from './services/localization';
import { customizeResume, generateCoverLetter } from './services/geminiService';
import { localCustomizeResume, localGenerateCoverLetter } from './services/localAiService';
import { 
  fetchJobsFromDb, 
  getUserProfile, 
  saveUserProfile, 
  saveJobToDb, 
  deleteJobFromDb 
} from './services/dbService';
import { 
  LayoutDashboard, 
  Briefcase, 
  Mail, 
  Settings as SettingsIcon, 
  Search as SearchIcon,
  Loader2,
  List,
  LogOut,
  CreditCard,
  BookOpen,
  LifeBuoy,
  AlertCircle,
  ArrowRight,
  Trash2,
  Wand2,
  X,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { JobDetail } from './components/JobDetail';

export const App: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken, signOut } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [checkedJobIds, setCheckedJobIds] = useState<Set<string>>(new Set());
  const [sessionAccount, setSessionAccount] = useState<EmailAccount | null>(null);
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  const lang = (userProfile?.preferences?.language as LanguageCode) || 'en';
  const isRtl = lang === 'ar';

  const showNotification = useCallback((message: string, type: NotificationType) => {
      setNotification({ message, type });
  }, []);

  const syncData = useCallback(async () => {
      setLoading(true);
      try {
          const token = await getToken();
          if (!token) {
              setLoading(false);
              return;
          }

          let profile = await getUserProfile(token).catch(() => null);
          
          if (!profile && user) {
              profile = {
                  id: user.id,
                  fullName: user.fullName || 'User',
                  email: user.primaryEmailAddress?.emailAddress || '',
                  password: '',
                  phone: '',
                  resumeContent: '',
                  connectedAccounts: [],
                  preferences: { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' },
                  plan: 'free',
                  onboardedAt: new Date().toISOString()
              };
          } else if (profile && user) {
              // Ensure email is always the latest from Clerk
              profile.email = user.primaryEmailAddress?.emailAddress || profile.email;
          }
          
          setUserProfile(profile);
          
          const dbJobs = await fetchJobsFromDb(token).catch(() => []);
          setJobs(dbJobs);
          
          const storedPath = localStorage.getItem('jobflow_project_path');
          if (storedPath) setDirHandle(createVirtualDirectory(storedPath));
          
          setCurrentView(ViewState.DASHBOARD);
      } catch (e) {
          console.error("Sync error:", e);
          showNotification("Cloud sync unavailable. Local fallback active.", "error");
      } finally {
          setLoading(false);
      }
  }, [getToken, user, showNotification]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
        syncData();
    } else if (isLoaded) {
        setLoading(false);
    }
  }, [isLoaded, isSignedIn, syncData]);

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    try {
        const token = await getToken();
        if (token) {
            const saved = await saveUserProfile(updatedProfile, token);
            if (saved) setUserProfile(saved);
            showNotification("Profile synced with Cloud.", "success");
        }
    } catch (error: any) {
        console.error("Sync Failure:", error);
        showNotification(error.message || "Cloud sync unavailable.", "error");
    }
  };
  
  const handleJobUpdate = async (id: string, status: JobStatus) => {
    setJobs(prev => {
        const updated = prev.map(j => j.id === id ? { ...j, status } : j);
        const job = updated.find(j => j.id === id);
        if (job) getToken().then(t => t && saveJobToDb({ ...job, status }, t));
        return updated;
    });
  };

  const handleUpdateJobFull = async (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    const token = await getToken();
    if (token) await saveJobToDb(updatedJob, token);
  };

  const handleAddJobs = (newJobs: Job[]) => {
    setJobs(prev => {
        const existingUrls = new Set(prev.map(j => j.applicationUrl).filter(Boolean));
        const unique = newJobs.filter(j => !j.applicationUrl || !existingUrls.has(j.applicationUrl));
        return [...unique, ...prev];
    });
    getToken().then(token => {
        if (token) newJobs.forEach(job => saveJobToDb(job, token));
    });
    showNotification(`Imported ${newJobs.length} leads.`, 'success');
  };

  const handleAddManualJob = async (job: Job) => {
      setJobs(prev => [job, ...prev]);
      const token = await getToken();
      if (token) saveJobToDb(job, token);
      setSelectedJobId(job.id);
      setCurrentView(ViewState.TRACKER);
  };

  const handleDeleteJob = async (id: string) => {
      setJobs(prev => prev.filter(j => j.id !== id));
      const token = await getToken();
      if (token) await deleteJobFromDb(id, token);
      showNotification("Job removed.", 'success');
  };

  const handleToggleCheck = (id: string) => {
    const newChecked = new Set(checkedJobIds);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedJobIds(newChecked);
  };

  const handleClearScannedJobs = async () => {
    if (window.confirm("Clear all scanned leads? This won't affect saved applications.")) {
        const detectedIds = jobs.filter(j => j.status === JobStatus.DETECTED).map(j => j.id);
        setJobs(prev => prev.filter(j => j.status !== JobStatus.DETECTED));
        const token = await getToken();
        if (token) {
            for (const id of detectedIds) await deleteJobFromDb(id, token);
        }
        setCheckedJobIds(new Set());
        showNotification("Scanned list cleared.", "success");
    }
  };

  const tailorDocuments = async (job: Job) => {
      if (!userProfile?.resumeContent) throw new Error("No resume content found.");
      const email = userProfile.email;
      let customizedResumeContent = "";
      let coverLetterContent = "";

      try {
          customizedResumeContent = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent, email);
      } catch (e) {
          customizedResumeContent = await localCustomizeResume(job.title, job.company, job.description, userProfile.resumeContent, email);
      }
      await new Promise(r => setTimeout(r, 1200)); 
      try {
          coverLetterContent = await generateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, email);
      } catch (e) {
          coverLetterContent = await localGenerateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, email);
      }
      return { customizedResumeContent, coverLetterContent };
  };

  const handleBulkGenerateDocs = async () => {
    if (!userProfile?.resumeContent || userProfile.resumeContent.length < 20) {
        showNotification("Upload a resume in Settings first.", "error");
        return;
    }
    setIsBulkProcessing(true);
    const selectedIds = Array.from(checkedJobIds);
    const token = await getToken();
    let count = 0;
    try {
        for (const id of selectedIds) {
            const job = jobs.find(j => j.id === id);
            if (!job || job.customizedResume) continue;
            showNotification(`Generating docs for ${job.company}...`, 'success');
            const { customizedResumeContent, coverLetterContent } = await tailorDocuments(job);
            const updatedJob = { ...job, customizedResume: customizedResumeContent, coverLetter: coverLetterContent, status: JobStatus.SAVED };
            setJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
            if (token) await saveJobToDb(updatedJob, token);
            count++;
            await new Promise(r => setTimeout(r, 1000));
        }
        showNotification(`Finished AI tailoring for ${count} jobs.`, "success");
    } catch (e) {
        showNotification("Process interrupted.", "error");
    } finally {
        setIsBulkProcessing(false);
        setCheckedJobIds(new Set());
    }
  };

  const handleIndividualGenerate = async (job: Job) => {
    if (!userProfile?.resumeContent || userProfile.resumeContent.length < 20) {
        showNotification("Upload a resume in Settings first.", "error");
        return;
    }
    showNotification(`Tailoring Resume & Letter for ${job.company}...`, 'success');
    try {
        const { customizedResumeContent, coverLetterContent } = await tailorDocuments(job);
        const updatedJob = { ...job, customizedResume: customizedResumeContent, coverLetter: coverLetterContent, status: JobStatus.SAVED };
        setJobs(prev => prev.map(j => j.id === job.id ? updatedJob : j));
        const token = await getToken();
        if (token) await saveJobToDb(updatedJob, token);
        showNotification("Tailoring complete.", "success");
    } catch (e) {
        showNotification("AI tailoring failed.", "error");
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600"/>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Auth onLogin={() => {}} onSwitchToSignup={() => {}} />;
  }

  const isProfileEmpty = !userProfile?.resumeContent || userProfile.resumeContent.trim().length < 10;
  const trackedJobsCount = jobs.filter(j => j.status !== JobStatus.DETECTED).length;
  const detectedJobsCount = jobs.filter(j => j.status === JobStatus.DETECTED).length;
  const currentSelectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {notification && (
        <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />
      )}
      <aside className="w-64 bg-white border-e border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
               <Briefcase className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-900">JobFlow</span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
        <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => { setCurrentView(ViewState.DASHBOARD); setSelectedJobId(null); }} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.DASHBOARD ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
            <LayoutDashboard className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Dashboard</span>
          </button>
          <button onClick={() => { setCurrentView(ViewState.SELECTED_JOBS); setSelectedJobId(null); }} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SELECTED_JOBS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
            <SearchIcon className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Scanned Jobs</span>
            {detectedJobsCount > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">{detectedJobsCount}</span>}
          </button>
          <button onClick={() => { setCurrentView(ViewState.TRACKER); setSelectedJobId(null); }} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.TRACKER ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
            <List className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Applications</span>
            {trackedJobsCount > 0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">{trackedJobsCount}</span>}
          </button>
          <button onClick={() => { setCurrentView(ViewState.EMAILS); setSelectedJobId(null); }} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.EMAILS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Mail className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Inbox Scanner</span>
          </button>
          <div className="my-2 border-t border-slate-100" />
          <button onClick={() => setCurrentView(ViewState.SUBSCRIPTION)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SUBSCRIPTION ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
            <CreditCard className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Subscription</span>
          </button>
          <button onClick={() => setCurrentView(ViewState.SUPPORT)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SUPPORT ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
            <LifeBuoy className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Support</span>
          </button>
          <button onClick={() => setCurrentView(ViewState.MANUAL)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.MANUAL ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
            <BookOpen className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Help Guide</span>
          </button>
          <button onClick={() => setCurrentView(ViewState.SETTINGS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SETTINGS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}>
            <SettingsIcon className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Settings</span>
          </button>
        </div>
        <div className="p-4 border-t border-slate-200 mt-auto">
             <button onClick={() => signOut()} className="w-full flex items-center px-3 py-2.5 rounded-lg text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors font-bold text-sm">
                 <LogOut className="w-4 h-4 me-3" />
                 Sign Out
             </button>
        </div>
      </aside>
      <main className="flex-1 overflow-hidden relative">
        {currentView === ViewState.DASHBOARD && (
          <div className="h-full overflow-y-auto p-8 animate-in fade-in">
            {isProfileEmpty && (
              <div className="mb-8 p-4 bg-indigo-600 rounded-2xl flex items-center justify-between shadow-xl shadow-indigo-100 text-white">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <AlertCircle className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold">Complete your profile</h4>
                    <p className="text-xs text-indigo-100">Upload your resume to enable AI tailored assets.</p>
                  </div>
                </div>
                <button onClick={() => setCurrentView(ViewState.SETTINGS)} className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center gap-2">Setup Profile <ArrowRight className="w-4 h-4" /></button>
              </div>
            )}
            <DashboardStats jobs={jobs} userProfile={userProfile!} />
          </div>
        )}
        {currentView === ViewState.SELECTED_JOBS && (
            <div className="h-full overflow-y-auto p-8 animate-in fade-in pb-32">
                <div className="mb-8 flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Scanned Jobs</h1>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Found from your inbox</p>
                    </div>
                    {detectedJobsCount > 0 && <button onClick={handleClearScannedJobs} className="flex items-center gap-2 px-3 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-xl text-xs font-black uppercase transition-all"><Trash2 className="w-4 h-4" /> Clear Scanned</button>}
                </div>
                {jobs.filter(j => j.status === JobStatus.DETECTED).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {jobs.filter(j => j.status === JobStatus.DETECTED).map(job => (
                            <JobCard key={job.id} job={job} onClick={(j) => { setSelectedJobId(j.id); }} isSelected={selectedJobId === job.id} isChecked={checkedJobIds.has(job.id)} onToggleCheck={handleToggleCheck} onAutoApply={(e, j) => handleIndividualGenerate(j)} />
                        ))}
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">
                        <Mail className="w-16 h-16 mb-4 opacity-10" /><p className="font-bold text-slate-600">No new jobs found from scan.</p>
                        <button onClick={() => setCurrentView(ViewState.EMAILS)} className="mt-4 text-xs font-black text-indigo-600 uppercase tracking-widest">Start Scanning</button>
                    </div>
                )}
                {checkedJobIds.size > 0 && (
                    <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 bg-slate-900 text-white px-6 py-4 rounded-[2rem] shadow-2xl flex items-center gap-8 border border-white/10 animate-in slide-in-from-bottom-10">
                        <div className="flex items-center gap-3"><span className="bg-indigo-600 text-[10px] font-black px-2 py-1 rounded-full">{checkedJobIds.size}</span><span className="text-xs font-bold uppercase tracking-widest">Selected</span></div>
                        <button onClick={handleBulkGenerateDocs} disabled={isBulkProcessing} className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all">{isBulkProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />} Bulk Tailor Assets</button>
                        <button onClick={() => setCheckedJobIds(new Set())} className="p-2 text-slate-400 hover:text-white"><X className="w-5 h-5" /></button>
                    </div>
                )}
            </div>
        )}
        {currentView === ViewState.TRACKER && <ApplicationTracker jobs={jobs} onUpdateStatus={handleJobUpdate} onDelete={handleDeleteJob} onSelect={(j) => { setSelectedJobId(j.id); }} />}
        {currentView === ViewState.SETTINGS && <div className="h-full p-8 overflow-y-auto animate-in fade-in"><Settings userProfile={userProfile!} onUpdate={handleUpdateProfile} dirHandle={dirHandle} onDirHandleChange={setDirHandle} jobs={jobs} showNotification={showNotification} onReset={() => signOut()} /></div>}
        {currentView === ViewState.EMAILS && <div className="h-full p-6 animate-in fade-in"><InboxScanner onImport={handleAddJobs} sessionAccount={sessionAccount} onConnectSession={setSessionAccount} onDisconnectSession={() => setSessionAccount(null)} showNotification={showNotification} userPreferences={userProfile?.preferences} /></div>}
        {currentView === ViewState.SUBSCRIPTION && <Subscription userProfile={userProfile!} onUpdateProfile={handleUpdateProfile} showNotification={showNotification} />}
        {currentView === ViewState.SUPPORT && <Support />}
        {currentView === ViewState.MANUAL && <UserManual userProfile={userProfile!} />}
        {selectedJobId && currentSelectedJob && (
            <div className="absolute inset-0 z-50 bg-slate-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-4">
                    <button onClick={() => setSelectedJobId(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-5 h-5" /></button>
                    <div className="flex items-center gap-2 text-sm text-slate-500 font-medium"><span>Applications</span> <ChevronRight className="w-4 h-4" /> <span>{currentSelectedJob.company}</span></div>
                </div>
                <div className="flex-1 overflow-hidden">
                    <JobDetail job={currentSelectedJob} userProfile={userProfile!} onUpdateStatus={handleJobUpdate} onUpdateJob={handleUpdateJobFull} onClose={() => setSelectedJobId(null)} showNotification={showNotification} />
                </div>
            </div>
        )}
      </main>
      <AddJobModal isOpen={isAddJobModalOpen} onClose={() => setIsAddJobModalOpen(false)} onAdd={handleAddManualJob} />
    </div>
  );
};
