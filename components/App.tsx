
import React, { useState, useEffect, useMemo } from 'react';
import { Job, JobStatus, ViewState, UserProfile, EmailAccount } from '../types';
import { DashboardStats } from './components/DashboardStats';
import { JobCard } from './components/JobCard';
import { JobDetail } from './components/JobDetail';
import { InboxScanner } from './components/InboxScanner';
import { Onboarding } from './components/Onboarding';
import { Settings } from './components/Settings';
import { UserManual } from './components/UserManual';
import { Subscription } from './components/Subscription';
import { Support } from './components/Support';
import { AddJobModal } from './components/AddJobModal';
import { Auth } from './components/Auth';
import { ApplicationTracker } from './components/ApplicationTracker';
import { NotificationToast, NotificationType } from './components/NotificationToast';
import { generateCoverLetter, customizeResume } from './services/geminiService';
import { writeFileToDirectory, createVirtualDirectory } from './services/fileSystemService';
import { translations, LanguageCode } from './services/localization';
import { isProductionMode, saveUserProfile, fetchJobsFromDb, signOutUser, saveJobToDb, deleteJobFromDb } from './services/supabaseClient';
import { 
  LayoutDashboard, 
  Briefcase, 
  Mail, 
  PieChart, 
  Settings as SettingsIcon, 
  PlusCircle,
  Search,
  LogOut,
  Loader2,
  CheckSquare,
  Sparkles,
  ExternalLink,
  Search as SearchIcon,
  List,
  CreditCard,
  BookOpen,
  LifeBuoy,
  FileText
} from 'lucide-react';
import { openSafeApplicationUrl } from './services/automationService';

// Interface for Bulk Results
interface BulkResult {
  jobId: string;
  jobTitle: string;
  company: string;
  resume: string;
  letter: string;
  applicationUrl?: string;
}

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Auth States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showSignup, setShowSignup] = useState(false);

  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [checkedJobIds, setCheckedJobIds] = useState<Set<string>>(new Set());
  
  // Bulk Actions State
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  
  // Auto Apply Trigger State (Single Job)
  const [triggerAutoApply, setTriggerAutoApply] = useState(false);

  // Session Account State
  const [sessionAccount, setSessionAccount] = useState<EmailAccount | null>(null);

  // File System State
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);

  // Localization Helper
  const lang = (userProfile?.preferences.language as LanguageCode) || 'en';
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;
  const isRtl = lang === 'ar';

  const showNotification = (message: string, type: NotificationType) => {
      setNotification({ message, type });
  };

  // --- INITIAL LOAD ---
  useEffect(() => {
    const sessionUser = sessionStorage.getItem('jobflow_session_user');
    
    if (sessionUser) {
        try {
            const parsedUser = JSON.parse(sessionUser);
            // Default fallbacks
            if (!parsedUser.connectedAccounts) parsedUser.connectedAccounts = [];
            if (!parsedUser.preferences.language) parsedUser.preferences.language = 'en';
            if (!parsedUser.plan) parsedUser.plan = 'free';
            
            setUserProfile(parsedUser);
            setIsAuthenticated(true);
            
            // Clean Slate Load for Page Refresh
            loadJobsClearingScanned(parsedUser.id);
            
            const storedPath = localStorage.getItem('jobflow_project_path');
            if (storedPath) setDirHandle(createVirtualDirectory(storedPath));

        } catch (e) {
            console.error("Session load error", e);
        }
    }
    setLoading(false);
  }, []);

  // --- PERSISTENCE ---
  useEffect(() => {
    if (isAuthenticated && !loading && !isProductionMode()) {
        localStorage.setItem('jobflow_jobs', JSON.stringify(jobs));
    }
  }, [jobs, loading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && dirHandle && dirHandle.isVirtual) {
        localStorage.setItem('jobflow_project_path', dirHandle.name);
    }
  }, [dirHandle, isAuthenticated]);

  // --- JOB LOADING LOGIC (CLEAN SLATE) ---
  const loadJobsClearingScanned = (userId: string) => {
      if (isProductionMode()) {
          fetchJobsFromDb(userId).then(dbJobs => {
              // FILTER: Remove 'DETECTED' status jobs (Scanned/Inbox) to keep view clean on login
              // Keep SAVED, APPLIED, REJECTED, etc.
              const trackedJobs = dbJobs.filter(j => j.status !== JobStatus.DETECTED);
              setJobs(trackedJobs);
          });
      } else {
          const storedJobs = localStorage.getItem('jobflow_jobs');
          if (storedJobs) {
               try { 
                   const parsed = JSON.parse(storedJobs) as Job[];
                   const trackedJobs = parsed.filter(j => j.status !== JobStatus.DETECTED);
                   setJobs(trackedJobs);
               } catch (e) { setJobs([]); }
          }
      }
  };

  // --- AUTH HANDLERS ---
  const checkRequirementsAndRedirect = (profile: UserProfile) => {
     const hasResume = profile.resumeContent && profile.resumeContent.length > 50;
     if (!hasResume) {
         setCurrentView(ViewState.SETTINGS);
         setTimeout(() => {
            showNotification("Setup Required: Please upload a resume to start.", 'error');
         }, 800);
     }
  };

  const handleLogin = (profile: UserProfile) => {
      sessionStorage.setItem('jobflow_session_user', JSON.stringify(profile));
      setUserProfile(profile);
      setIsAuthenticated(true);
      
      // CRITICAL: Load jobs but CLEAR the scanned inbox
      loadJobsClearingScanned(profile.id);
      
      const storedPath = localStorage.getItem('jobflow_project_path');
      if (storedPath) setDirHandle(createVirtualDirectory(storedPath));
      
      checkRequirementsAndRedirect(profile);
  };

  const handleSignupComplete = (profile: UserProfile) => {
      localStorage.setItem('jobflow_user', JSON.stringify(profile));
      sessionStorage.setItem('jobflow_session_user', JSON.stringify(profile));
      setUserProfile(profile);
      setIsAuthenticated(true);
      setJobs([]); 
      checkRequirementsAndRedirect(profile);
  };

  const handleSignOut = async () => {
      try {
          await signOutUser();
      } catch (e) {
          console.error("Sign out error", e);
      } finally {
          sessionStorage.clear();
          localStorage.removeItem('jobflow_session_user');
          localStorage.removeItem('jobflow_jobs'); 
          localStorage.removeItem('jobflow_project_path'); 
          
          setIsAuthenticated(false);
          setUserProfile(null);
          setJobs([]);
          setDirHandle(null);
          setCheckedJobIds(new Set());
          setSessionAccount(null); 
          setCurrentView(ViewState.DASHBOARD);
          setShowSignup(false);
      }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    sessionStorage.setItem('jobflow_session_user', JSON.stringify(updatedProfile));
    
    if (!isProductionMode()) {
        localStorage.setItem('jobflow_user', JSON.stringify(updatedProfile));
    }
    
    if (isProductionMode()) {
        if (!updatedProfile.id) return;
        try {
            await saveUserProfile(updatedProfile, updatedProfile.id);
        } catch (e) {
            console.error("Failed to save profile to Supabase:", e);
        }
    }
  };
  
  // --- JOB MANAGEMENT ---
  const handleJobUpdate = (id: string, status: JobStatus) => {
    setJobs(prev => {
        const updated = prev.map(j => j.id === id ? { ...j, status } : j);
        const job = updated.find(j => j.id === id);
        if (job && isProductionMode() && userProfile?.id) {
            saveJobToDb({ ...job, status }, userProfile.id);
        }
        return updated;
    });
  };
  
  const handleJobDataUpdate = async (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    if (isProductionMode() && userProfile?.id) {
        saveJobToDb(updatedJob, userProfile.id);
    }
    if (dirHandle && updatedJob.customizedResume) {
       try {
           const safeName = updatedJob.company.replace(/[^a-z0-9]/gi, '_');
           await writeFileToDirectory(dirHandle, `${safeName}_Resume.txt`, updatedJob.customizedResume);
       } catch (e) { }
    }
  };

  const handleAddJobs = (newJobs: Job[]) => {
    setJobs(prev => {
        const existingUrls = new Set(prev.map(j => j.applicationUrl).filter(Boolean));
        const existingIds = new Set(prev.map(j => j.id));
        
        const unique = newJobs.filter(j => {
            if (j.applicationUrl && existingUrls.has(j.applicationUrl)) return false;
            if (existingIds.has(j.id)) return false;
            return true;
        });
        return [...unique, ...prev];
    });
    showNotification(`Imported ${newJobs.length} jobs.`, 'success');
  };
  
  const handleAddManualJob = (job: Job) => {
      setJobs(prev => [job, ...prev]);
      if (isProductionMode() && userProfile?.id) {
          saveJobToDb(job, userProfile.id);
      }
      setSelectedJobId(job.id);
      setCurrentView(ViewState.TRACKER); // Go to tracker for manual adds
  };

  const handleClearScannedJobs = () => {
      // Clear ONLY Detected jobs from UI state
      setJobs(prev => prev.filter(j => j.status !== JobStatus.DETECTED));
      showNotification("Scanned jobs cleared.", 'success');
  };

  const handleDeleteJob = async (id: string) => {
      setJobs(prev => prev.filter(j => j.id !== id));
      if (isProductionMode() && userProfile?.id) {
          await deleteJobFromDb(id);
      }
      showNotification("Job removed.", 'success');
  };

  const handleToggleCheck = (id: string) => {
    const newChecked = new Set(checkedJobIds);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedJobIds(newChecked);
  };
  
  // --- BULK GENERATION (FREE AI) ---
  const handleBulkGenerate = async () => {
      if (!userProfile?.resumeContent) {
          showNotification("Missing Master Resume. Go to Settings.", 'error');
          return;
      }
      if (checkedJobIds.size === 0) return;

      setIsBulkGenerating(true);
      const idsToProcess = Array.from(checkedJobIds);
      let count = 0;
      const generatedResults: BulkResult[] = [];

      for (const id of idsToProcess) {
          const job = jobs.find(j => j.id === id);
          if (!job) continue;
          
          count++;
          setBulkProgress(`Preparing docs for ${job.company} (${count}/${idsToProcess.length})...`);

          try {
              // 1. Customize Resume (Uses Local Free AI)
              const newResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
              
              // 2. Generate Cover Letter (Uses Local Free AI)
              const newLetter = await generateCoverLetter(
                  job.title,
                  job.company,
                  job.description,
                  userProfile.resumeContent,
                  userProfile.fullName,
                  userProfile.email
              );

              // 3. Update Job State & Move to SAVED so it appears in Tracker
              const updatedJob = {
                  ...job,
                  customizedResume: newResume,
                  coverLetter: newLetter,
                  status: JobStatus.SAVED 
              };
              
              setJobs(prev => prev.map(j => j.id === id ? updatedJob : j));
              
              if (isProductionMode() && userProfile.id) {
                  saveJobToDb(updatedJob, userProfile.id);
              }
              
              generatedResults.push({
                  jobId: job.id,
                  jobTitle: job.title,
                  company: job.company,
                  resume: newResume,
                  letter: newLetter,
                  applicationUrl: job.applicationUrl
              });

              if (dirHandle) {
                  const safeName = job.company.replace(/[^a-z0-9]/gi, '_');
                  await writeFileToDirectory(dirHandle, `${safeName}_Resume.txt`, newResume);
                  await writeFileToDirectory(dirHandle, `${safeName}_CoverLetter.txt`, newLetter);
              }

          } catch (e) {
              console.error(`Failed for job ${id}`, e);
          }
          await new Promise(r => setTimeout(r, 200)); 
      }

      setIsBulkGenerating(false);
      setBulkProgress('');
      setCheckedJobIds(new Set()); 
      setBulkResults(generatedResults);
      
      setCurrentView(ViewState.GENERATED_JOBS_LIST);
      showNotification("Bulk preparation complete!", 'success');
  };
  
  const handleViewJobExternal = (jobTitle: string, jobCompany: string, applicationUrl?: string) => {
      const job: Job = { title: jobTitle, company: jobCompany, applicationUrl } as Job;
      openSafeApplicationUrl(job);
  };
  
  const handlePrepareApplication = (e: React.MouseEvent, job: Job) => {
      e.stopPropagation();
      setSelectedJobId(job.id);
      setTriggerAutoApply(true);
  };

  const handleDownloadText = (filename: string, content: string) => {
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

  const handleStatusFilterFromDashboard = (status: string) => {
      setFilterStatus(status);
      setCurrentView(ViewState.TRACKER); // Dashboard clicks go to Tracker now
  };

  // --- DERIVED STATE ---
  const scannedJobs = useMemo(() => {
    return jobs.filter(job => {
      const isScanned = job.status === JobStatus.DETECTED;
      if (!isScanned) return false;
      const search = searchQuery.toLowerCase();
      return job.title.toLowerCase().includes(search) || job.company.toLowerCase().includes(search);
    });
  }, [jobs, searchQuery]);

  const trackedJobsCount = useMemo(() => {
      return jobs.filter(j => j.status !== JobStatus.DETECTED).length;
  }, [jobs]);

  if (loading) return <div className="h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;

  if (!isAuthenticated || !userProfile) {
      if (showSignup) {
          return (
            <>
                <Onboarding 
                    onComplete={handleSignupComplete} 
                    onDirHandleChange={setDirHandle} 
                    dirHandle={dirHandle} 
                    showNotification={showNotification} 
                />
                <div className="fixed bottom-4 left-0 right-0 text-center">
                    <button onClick={() => setShowSignup(false)} className="text-sm text-slate-500 hover:underline">
                        Already have an account? Sign In
                    </button>
                </div>
                {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
            </>
          );
      } else {
          return (
             <>
                 <Auth onLogin={handleLogin} onSwitchToSignup={() => setShowSignup(true)} />
                 {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
             </>
          );
      }
  }

  const selectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

      {/* --- SIDEBAR --- */}
      <aside className="w-64 bg-white border-e border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
             <Briefcase className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-900">JobFlow AI</span>
        </div>
        
        <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 mt-2">Platform</div>
          
          <button onClick={() => setCurrentView(ViewState.DASHBOARD)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.DASHBOARD ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <LayoutDashboard className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">{t('nav_dashboard')}</span>
          </button>

          {/* APPLICATION TRACKER BUTTON (Explicitly Added) */}
          <button onClick={() => setCurrentView(ViewState.TRACKER)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.TRACKER ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <List className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">My Applications</span>
            {trackedJobsCount > 0 && <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{trackedJobsCount}</span>}
          </button>
          
          <button onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.SELECTED_JOBS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Briefcase className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">{t('nav_jobs')}</span>
            {scannedJobs.length > 0 && <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{scannedJobs.length}</span>}
          </button>

          <button onClick={() => setCurrentView(ViewState.EMAILS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.EMAILS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Mail className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">{t('nav_inbox')}</span>
          </button>

          <button onClick={() => setCurrentView(ViewState.ANALYTICS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.ANALYTICS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <PieChart className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">{t('nav_analytics')}</span>
          </button>

          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 mt-4">Settings</div>
          
          <button onClick={() => setCurrentView(ViewState.SETTINGS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.SETTINGS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <SettingsIcon className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">{t('nav_settings')}</span>
          </button>

          <button onClick={() => setCurrentView(ViewState.SUBSCRIPTION)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.SUBSCRIPTION ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <CreditCard className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">{t('nav_subscription')}</span>
          </button>

          <button onClick={() => setCurrentView(ViewState.MANUAL)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.MANUAL ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <BookOpen className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">{t('nav_help')}</span>
          </button>

          <button onClick={() => setCurrentView(ViewState.SUPPORT)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.SUPPORT ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <LifeBuoy className="w-5 h-5 me-3 rtl:flip" />
            <span className="flex-1 text-start">Support</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-200 mt-auto bg-white">
             <button 
                onClick={handleSignOut}
                className="w-full flex items-center px-3 py-2.5 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors font-medium shadow-sm"
             >
                 <LogOut className="w-5 h-5 me-3 rtl:rotate-180" />
                 <span className="flex-1 text-start">{t('reset_app')}</span>
             </button>
        </div>
      </aside>

      {/* --- MAIN CONTENT AREA --- */}
      <main className="flex-1 overflow-hidden relative">
        
        {/* DASHBOARD VIEW */}
        {currentView === ViewState.DASHBOARD && (
          <div className="h-full overflow-y-auto p-8">
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
             </div>
             <DashboardStats jobs={jobs} onFilterChange={handleStatusFilterFromDashboard} userProfile={userProfile} />
             
             {/* QUICK ACTION CARDS */}
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-all group" onClick={() => setCurrentView(ViewState.TRACKER)}>
                     <div className="flex items-center justify-between mb-2">
                         <h3 className="font-bold text-slate-900 group-hover:text-indigo-700">Tracked Applications</h3>
                         <Briefcase className="w-5 h-5 text-indigo-600"/>
                     </div>
                     <p className="text-sm text-slate-500">View and manage the status of your {trackedJobsCount} active applications.</p>
                 </div>
                 
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm cursor-pointer hover:border-indigo-300 transition-all group" onClick={() => setCurrentView(ViewState.EMAILS)}>
                     <div className="flex items-center justify-between mb-2">
                         <h3 className="font-bold text-slate-900 group-hover:text-indigo-700">Scan for New Jobs</h3>
                         <Mail className="w-5 h-5 text-indigo-600"/>
                     </div>
                     <p className="text-sm text-slate-500">Connect to email and find new opportunities automatically.</p>
                 </div>
             </div>
          </div>
        )}

        {/* TRACKER VIEW (THE REQUESTED FEATURE) */}
        {currentView === ViewState.TRACKER && (
             <ApplicationTracker 
                jobs={jobs}
                onUpdateStatus={handleJobUpdate}
                onDelete={handleDeleteJob}
                onSelect={(job) => {
                    setSelectedJobId(job.id);
                    setCurrentView(ViewState.SELECTED_JOBS);
                }}
             />
        )}

        {/* SCANNED JOBS VIEW */}
        {currentView === ViewState.SELECTED_JOBS && (
          <div className="flex h-full">
            <div className="w-1/3 min-w-[320px] bg-white border-e border-slate-200 flex flex-col z-10">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute top-2.5 w-4 h-4 text-slate-400 start-3" />
                    <input 
                      type="text" 
                      placeholder="Search scanned jobs..." 
                      className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors ps-9 pe-4"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  <button 
                     onClick={handleBulkGenerate}
                     disabled={checkedJobIds.size === 0 || isBulkGenerating}
                     className={`px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center justify-center font-medium text-xs whitespace-nowrap ${
                         checkedJobIds.size > 0 
                         ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                         : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                     }`}
                     title="Bulk Prepare Selected Jobs"
                  >
                      {isBulkGenerating ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Sparkles className="w-4 h-4 me-1" />}
                      Bulk Add
                  </button>
                  
                  <button 
                     onClick={handleClearScannedJobs}
                     className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-200 text-xs font-bold whitespace-nowrap"
                     title="Clear All Scanned Jobs"
                  >
                      Clear
                  </button>

                  <button 
                     onClick={() => setIsAddJobModalOpen(true)}
                     className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                     title="Add Manual Job"
                  >
                      <PlusCircle className="w-5 h-5" />
                  </button>
                </div>
                
                {checkedJobIds.size > 0 && (
                    <div className="mt-2 text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded text-center border border-indigo-100">
                        {checkedJobIds.size} Job{checkedJobIds.size > 1 ? 's' : ''} Selected
                    </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 bg-slate-50 custom-scrollbar">
                {scannedJobs.length > 0 ? (
                    scannedJobs.map(job => (
                    <JobCard 
                        key={job.id} 
                        job={job} 
                        onClick={(j) => setSelectedJobId(j.id)}
                        isSelected={selectedJobId === job.id}
                        isChecked={checkedJobIds.has(job.id)}
                        onToggleCheck={handleToggleCheck}
                        onAutoApply={handlePrepareApplication}
                    />
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-sm">
                        <Search className="w-8 h-8 mb-2 opacity-50"/>
                        No scanned jobs. Check Inbox.
                    </div>
                )}
              </div>
            </div>

            <div className="flex-1 bg-slate-50 overflow-hidden relative">
               {selectedJob ? (
                 <div className="h-full p-6 overflow-y-auto">
                    <JobDetail 
                        job={selectedJob} 
                        userProfile={userProfile}
                        onUpdateStatus={handleJobUpdate} 
                        onUpdateJob={handleJobDataUpdate}
                        dirHandle={dirHandle}
                        triggerAutoApply={triggerAutoApply && selectedJobId === selectedJob.id}
                        onAutoApplyHandled={() => setTriggerAutoApply(false)}
                        onOpenSettings={() => setCurrentView(ViewState.SETTINGS)}
                        showNotification={showNotification}
                    />
                 </div>
               ) : (
                 <div className="h-full flex flex-col items-center justify-center text-slate-400">
                    <Briefcase className="w-16 h-16 mb-4 text-slate-300" />
                    <p className="text-lg font-medium text-slate-500">Select a job to view details</p>
                 </div>
               )}
            </div>
          </div>
        )}
        
        {/* GENERATED JOBS LIST */}
        {currentView === ViewState.GENERATED_JOBS_LIST && (
            <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                           <CheckSquare className="w-6 h-6 me-3 text-green-600"/> Application Ready
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Generated documents for <strong>{bulkResults.length}</strong> jobs. They are now saved in "My Applications".
                        </p>
                    </div>
                    <button 
                        onClick={() => setCurrentView(ViewState.TRACKER)} 
                        className="bg-indigo-600 text-white px-5 py-2.5 rounded-lg hover:bg-indigo-700 font-medium flex items-center shadow-sm"
                    >
                        Go to My Applications
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                     <div className="max-w-5xl mx-auto space-y-4">
                        {bulkResults.map((job, index) => {
                          const hasLink = !!job.applicationUrl;
                          return (
                            <div key={job.jobId} className="bg-white rounded-lg shadow-sm p-6 flex items-start gap-4 border border-slate-200 hover:border-indigo-200 transition-colors">
                              <div className="w-12 h-12 bg-gradient-to-br from-indigo-50 to-white rounded-lg border border-slate-100 flex items-center justify-center text-lg font-bold text-indigo-700 shrink-0">
                                  {job.company.charAt(0)}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <h2 className="text-lg font-bold text-slate-900 truncate">{job.jobTitle}</h2>
                                <p className="text-slate-600 font-medium truncate">{job.company}</p>
                              </div>
                              
                              <div className="flex flex-col gap-2 shrink-0 ms-4">
                                <button
                                  onClick={() => handleViewJobExternal(job.jobTitle, job.company, job.applicationUrl)}
                                  className={`flex items-center justify-center gap-2 px-4 py-2 text-white rounded-lg transition whitespace-nowrap shadow-sm font-medium ${!hasLink ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                >
                                  {!hasLink ? <SearchIcon size={16} /> : <ExternalLink size={16} />}
                                  {!hasLink ? 'Search Job' : 'Open Job'}
                                </button>
                                
                                <div className="flex gap-2">
                                     <button
                                      onClick={() => handleDownloadText(`${job.company}_Resume.txt`, job.resume)}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-medium"
                                    >
                                      <FileText size={14} /> Resume
                                    </button>
                                     <button
                                      onClick={() => handleDownloadText(`${job.company}_Letter.txt`, job.letter)}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-medium"
                                    >
                                      <FileText size={14} /> Letter
                                    </button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                     </div>
                </div>
            </div>
        )}

        {currentView === ViewState.EMAILS && (
           <div className="h-full p-6 overflow-hidden">
               <InboxScanner 
                  onImport={handleAddJobs} 
                  dirHandle={dirHandle}
                  showNotification={showNotification}
                  userPreferences={userProfile.preferences}
                  onOpenSettings={() => setCurrentView(ViewState.SETTINGS)}
                  sessionAccount={sessionAccount}
                  onConnectSession={(acc) => setSessionAccount(acc)}
                  onDisconnectSession={() => setSessionAccount(null)}
               />
           </div>
        )}
        
        {currentView === ViewState.ANALYTICS && (
            <div className="h-full p-8 overflow-y-auto">
                <h1 className="text-2xl font-bold text-slate-900 mb-8">Analytics Overview</h1>
                <DashboardStats jobs={jobs} userProfile={userProfile} />
            </div>
        )}

        {currentView === ViewState.SETTINGS && (
           <div className="h-full p-8 overflow-y-auto bg-slate-50">
               <Settings 
                  key={userProfile.id}
                  userProfile={userProfile} 
                  onUpdate={handleUpdateProfile} 
                  dirHandle={dirHandle}
                  onDirHandleChange={setDirHandle}
                  jobs={jobs}
                  showNotification={showNotification}
                  onReset={handleSignOut}
               />
           </div>
        )}
        
        {currentView === ViewState.SUBSCRIPTION && (
            <Subscription 
                userProfile={userProfile}
                onUpdateProfile={handleUpdateProfile}
                showNotification={showNotification}
            />
        )}

        {currentView === ViewState.MANUAL && (
            <UserManual userProfile={userProfile} />
        )}

        {currentView === ViewState.SUPPORT && (
            <Support />
        )}
      </main>

      <AddJobModal 
         isOpen={isAddJobModalOpen}
         onClose={() => setIsAddJobModalOpen(false)}
         onAdd={handleAddManualJob}
      />
    </div>
  );
};
