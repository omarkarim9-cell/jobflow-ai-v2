import React, { useState, useEffect, useMemo } from 'react';
import { Job, JobStatus, ViewState, UserStats, UserProfile, EmailAccount } from '../types';
import { DashboardStats } from './components/DashboardStats';
import { JobCard } from './components/JobCard';
import { JobDetail } from './components/JobDetail';
import { InboxScanner } from './components/InboxScanner';
import { Onboarding } from './components/Onboarding';
import { Settings } from './components/Settings';
import { UserManual } from './components/UserManual';
import { Subscription } from './components/Subscription';
import { Support } from './components/Support';
import { EmailConnectModal } from './components/EmailConnectModal';
import { AddJobModal } from './components/AddJobModal';
import { Auth } from './components/Auth';
import { NotificationToast, NotificationType } from './components/NotificationToast';
import { generateCoverLetter, customizeResume, getSmartApplicationUrl } from './services/geminiService';
import { writeFileToDirectory, createVirtualDirectory } from './services/fileSystemService';
import { translations, LanguageCode } from './services/localization';
import { isProductionMode, saveUserProfile, fetchJobsFromDb, signOutUser, deleteAllJobsFromDb } from './services/supabaseClient';
import { 
  LayoutDashboard, 
  Briefcase, 
  Mail, 
  PieChart, 
  Settings as SettingsIcon, 
  PlusCircle,
  Search,
  Filter,
  LogOut,
  Bell,
  Loader2,
  ShieldCheck,
  CheckSquare,
  Sparkles,
  X,
  SlidersHorizontal,
  Download,
  HardDrive,
  FileDown,
  BookOpen,
  RotateCcw,
  Globe,
  CreditCard,
  Star,
  Trash2,
  Lock,
  LifeBuoy,
  Wand2,
  FileText,
  Copy,
  Check,
  ExternalLink,
  Bug,
  Search as SearchIcon,
  Eye,
  ArrowLeft,
  List,
  AlertCircle
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
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filtering State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [checkedJobIds, setCheckedJobIds] = useState<Set<string>>(new Set());
  
  // Bulk Actions State
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [bulkAppliedIds, setBulkAppliedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  // Auto Apply Trigger State (Single Job)
  const [triggerAutoApply, setTriggerAutoApply] = useState(false);

  // Session Account State (Lifted for Persistence)
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

  // Initial Load (Session Check)
  useEffect(() => {
    const sessionUser = sessionStorage.getItem('jobflow_session_user');
    
    if (sessionUser) {
        try {
            const parsedUser = JSON.parse(sessionUser);
            if (!parsedUser.connectedAccounts) parsedUser.connectedAccounts = [];
            if (!parsedUser.preferences.language) parsedUser.preferences.language = 'en';
            if (!parsedUser.plan) parsedUser.plan = 'free';
            
            setUserProfile(parsedUser);
            setIsAuthenticated(true);
            
            if (isProductionMode()) {
                fetchJobsFromDb(parsedUser.id).then(dbJobs => {
                    setJobs(dbJobs);
                    // Backup to local just in case, but rely on DB
                    localStorage.setItem('jobflow_jobs', JSON.stringify(dbJobs));
                });
            } else {
                const storedJobs = localStorage.getItem('jobflow_jobs');
                if (storedJobs) {
                     try { setJobs(JSON.parse(storedJobs)); } catch (e) { setJobs([]); }
                }
            }
            
            const storedPath = localStorage.getItem('jobflow_project_path');
            if (storedPath) setDirHandle(createVirtualDirectory(storedPath));

        } catch (e) {
            console.error("Session load error", e);
        }
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated && !loading) {
        // Backup to local storage
        localStorage.setItem('jobflow_jobs', JSON.stringify(jobs));
    }
  }, [jobs, loading, isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated && dirHandle && dirHandle.isVirtual) {
        localStorage.setItem('jobflow_project_path', dirHandle.name);
    }
  }, [dirHandle, isAuthenticated]);

  // --- ON LOGIN: Check for missing info and redirect to Settings ---
  const checkRequirementsAndRedirect = (profile: UserProfile) => {
     const hasResume = profile.resumeContent && profile.resumeContent.length > 50;
     // Note: We removed the persistent account check since accounts are now session-only
     if (!hasResume) {
         setCurrentView(ViewState.SETTINGS);
         setTimeout(() => {
            showNotification("Setup Required: Please upload a resume to start.", 'error');
         }, 800);
     }
  };

  const handleLogin = (profile: UserProfile) => {
      // 1. CLEAN SLATE PROTOCOL
      if (isProductionMode()) {
          localStorage.removeItem('jobflow_user'); // Remove demo profile
          localStorage.removeItem('jobflow_jobs'); // Remove demo jobs
      }

      // 2. Set Session
      sessionStorage.setItem('jobflow_session_user', JSON.stringify(profile));
      setUserProfile(profile);
      setIsAuthenticated(true);
      
      // 3. Load Jobs
      if (isProductionMode()) {
          setJobs([]); // Clear UI immediately
          fetchJobsFromDb(profile.id).then(dbJobs => {
              setJobs(dbJobs);
              localStorage.setItem('jobflow_jobs', JSON.stringify(dbJobs));
          });
      } else {
          // Demo Mode: Load from Local Storage if available
          const storedJobs = localStorage.getItem('jobflow_jobs');
          if (storedJobs) {
               try { setJobs(JSON.parse(storedJobs)); } catch (e) { setJobs([]); }
          }
      }
      
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
          // 1. FORCE DELETE JOBS FROM DB if logged in
          if (isProductionMode() && userProfile?.id) {
             console.log("Wiping jobs from DB for user", userProfile.id);
             await deleteAllJobsFromDb(userProfile.id);
          }

          // 2. Sign out from Supabase to invalidate backend session
          await signOutUser();
      } catch (e) {
          console.error("Sign out error", e);
      } finally {
          // 3. Clear Session
          sessionStorage.clear();
          
          // 4. Clear Persisted Data
          localStorage.removeItem('jobflow_session_user');
          localStorage.removeItem('jobflow_user'); // Clear Demo Profile
          localStorage.removeItem('jobflow_jobs'); // Clear Jobs
          localStorage.removeItem('jobflow_project_path'); // Clear Virtual Dir
          
          // 5. Safe State Reset (No Reload to prevent crash)
          setIsAuthenticated(false);
          setUserProfile(null);
          setJobs([]);
          setDirHandle(null);
          setCheckedJobIds(new Set());
          setSessionAccount(null); // Clear session connection
          setCurrentView(ViewState.DASHBOARD);
          setShowSignup(false);
      }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    sessionStorage.setItem('jobflow_session_user', JSON.stringify(updatedProfile));
    
    // Only update local storage if we are NOT in production (Demo mode)
    if (!isProductionMode()) {
        localStorage.setItem('jobflow_user', JSON.stringify(updatedProfile));
    }
    
    // Sync to Supabase if connected
    if (isProductionMode()) {
        if (!updatedProfile.id) {
             console.error("Cannot save profile: Missing ID");
             return;
        }
        try {
            await saveUserProfile(updatedProfile, updatedProfile.id);
        } catch (e) {
            console.error("Failed to save profile to Supabase:", e);
            showNotification("Saved locally, but failed to sync to cloud.", 'error');
        }
    }
  };
  
  const handleJobUpdate = (id: string, status: JobStatus) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
  };
  
  const handleJobDataUpdate = async (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    if (dirHandle && updatedJob.customizedResume) {
       try {
           const safeName = updatedJob.company.replace(/[^a-z0-9]/gi, '_');
           await writeFileToDirectory(dirHandle, `${safeName}_Resume.txt`, updatedJob.customizedResume);
       } catch (e) { showNotification("Failed to auto-save to disk", 'error'); }
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
      setSelectedJobId(job.id);
      setCurrentView(ViewState.SELECTED_JOBS);
  };

  const handleClearAllJobs = async () => {
    if (window.confirm("Are you sure you want to clear ALL jobs? This action cannot be undone.")) {
        
        // 1. Wipe Database if Connected (Wait for it to prevent race conditions)
        if (isProductionMode() && userProfile?.id) {
             try {
                 const result = await deleteAllJobsFromDb(userProfile.id);
                 if (result?.error) {
                     showNotification(`DB Error: ${result.error.message || 'Failed to delete'}. Trying local clean...`, 'error');
                 }
             } catch (e) {
                 console.error("Failed to delete from DB", e);
             }
        }
        
        // 2. Clear State
        setJobs([]);
        setCheckedJobIds(new Set());
        setSelectedJobId(null);
        
        // 3. Wipe Local Storage
        localStorage.removeItem('jobflow_jobs');
        
        // 4. Reset Filter
        setFilterStatus('ALL');
        
        showNotification("All jobs cleared.", 'success');
    }
  };

  const handleToggleCheck = (id: string) => {
    const newChecked = new Set(checkedJobIds);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedJobIds(newChecked);
  };
  
  const handleRemoveFromSelection = (id: string) => {
      const newChecked = new Set(checkedJobIds);
      newChecked.delete(id);
      setCheckedJobIds(newChecked);
  };

  // --- BULK GENERATION LOGIC ---
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
              // 1. Customize Resume
              const newResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
              
              // 2. Generate Cover Letter
              const newLetter = await generateCoverLetter(
                  job.title,
                  job.company,
                  job.description,
                  userProfile.resumeContent,
                  userProfile.fullName,
                  userProfile.email
              );

              // 3. Update Job State
              const updatedJob = {
                  ...job,
                  customizedResume: newResume,
                  coverLetter: newLetter,
                  status: JobStatus.SAVED // Move to saved if detected
              };
              
              setJobs(prev => prev.map(j => j.id === id ? updatedJob : j));
              
              // Collect for List
              generatedResults.push({
                  jobId: job.id,
                  jobTitle: job.title,
                  company: job.company,
                  resume: newResume,
                  letter: newLetter,
                  applicationUrl: job.applicationUrl
              });

              // 4. Save to Disk (if connected)
              if (dirHandle) {
                  const safeName = job.company.replace(/[^a-z0-9]/gi, '_');
                  await writeFileToDirectory(dirHandle, `${safeName}_Resume.txt`, newResume);
                  await writeFileToDirectory(dirHandle, `${safeName}_CoverLetter.txt`, newLetter);
              }

          } catch (e) {
              console.error(`Failed for job ${id}`, e);
          }
          // Delay to prevent rate limiting (3s)
          await new Promise(r => setTimeout(r, 3000));
      }

      setIsBulkGenerating(false);
      setBulkProgress('');
      setCheckedJobIds(new Set()); // Clear selection
      setBulkResults(generatedResults);
      setBulkAppliedIds(new Set());
      
      // Redirect to the new "Generated Jobs" screen
      setCurrentView(ViewState.GENERATED_JOBS_LIST);
      showNotification("Bulk preparation complete!", 'success');
  };
  
  const handleCopyText = (text: string, id: string) => {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
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
  
  const handleViewJobExternal = (jobTitle: string, jobCompany: string, applicationUrl?: string) => {
      // Use the new robust open handler
      const job: Job = { title: jobTitle, company: jobCompany, applicationUrl } as Job;
      openSafeApplicationUrl(job);
  };

  const checkProPlan = () => {
      // AI features are now available to all users (Free & Pro)
      return true;
  };

  const handleStatusFilterFromDashboard = (status: string) => {
      setFilterStatus(status);
      setCurrentView(ViewState.SELECTED_JOBS);
  };
  
  // Renamed handler to reflect functionality
  const handlePrepareApplication = (e: React.MouseEvent, job: Job) => {
      e.stopPropagation();
      if (!checkProPlan()) return;
      setSelectedJobId(job.id);
      setTriggerAutoApply(true);
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter(job => {
      const search = searchQuery.toLowerCase();
      const matchesSearch = job.title.toLowerCase().includes(search) || job.company.toLowerCase().includes(search);
      const matchesStatus = filterStatus === 'ALL' || job.status === filterStatus;
      return matchesSearch && matchesStatus;
    });
  }, [jobs, searchQuery, filterStatus]);

  const handleExportCsv = () => {
    if (filteredJobs.length === 0) {
        showNotification("No jobs to export", 'error');
        return;
    }
    const headers = ['Title', 'Company', 'Location', 'Status', 'Source', 'Match Score', 'Detected At', 'Application URL'];
    const rows = filteredJobs.map(job => [
        `"${job.title.replace(/"/g, '""')}"`,
        `"${job.company.replace(/"/g, '""')}"`,
        `"${job.location.replace(/"/g, '""')}"`,
        job.status,
        job.source,
        `${job.matchScore}%`,
        new Date(job.detectedAt).toLocaleDateString(),
        `"${job.applicationUrl || ''}"`
    ]);
    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `jobflow_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showNotification("Jobs exported to CSV", 'success');
  };

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

      <aside className="w-64 bg-white border-e border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
             <Briefcase className="text-white w-5 h-5" />
          </div>
          <span className="font-bold text-xl text-slate-900">JobFlow AI</span>
        </div>
        
        {/* Menu Items - Scrollable */}
        <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 px-3 mt-2">Platform</div>
          {[
              {v: ViewState.DASHBOARD, i: LayoutDashboard, l: t('nav_dashboard')},
              {v: ViewState.SELECTED_JOBS, i: Briefcase, l: t('nav_jobs'), c: jobs.length},
              {v: ViewState.EMAILS, i: Mail, l: t('nav_inbox')},
              {v: ViewState.ANALYTICS, i: PieChart, l: t('nav_analytics')},
              {v: ViewState.SETTINGS, i: SettingsIcon, l: t('nav_settings')},
              {v: ViewState.SUBSCRIPTION, i: CreditCard, l: t('nav_subscription')},
              {v: ViewState.MANUAL, i: BookOpen, l: t('nav_help')},
              {v: ViewState.SUPPORT, i: LifeBuoy, l: 'Contact Support'}
          ].map(item => (
             <button key={item.v} onClick={() => setCurrentView(item.v)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === item.v ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
                <item.i className="w-5 h-5 me-3 rtl:flip" />
                <span className="flex-1 text-start">{item.l}</span>
                {item.c !== undefined && <span className="bg-slate-100 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{item.c}</span>}
             </button>
          ))}
        </div>

        {/* Logout Button Fixed at Bottom with White on Blue Style */}
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

      <main className="flex-1 overflow-hidden relative">
        {currentView === ViewState.DASHBOARD && (
          <div className="h-full overflow-y-auto p-8">
             <div className="flex justify-between items-center mb-8">
                <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                </div>
             </div>
             <DashboardStats jobs={jobs} onFilterChange={handleStatusFilterFromDashboard} userProfile={userProfile} />
             
             <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                     <h3 className="font-bold text-slate-900 mb-4 flex items-center"><Star className="w-4 h-4 text-yellow-500 me-2"/> Top Matched Jobs</h3>
                     <div className="space-y-3">
                         {jobs.filter(j => j.status === JobStatus.DETECTED).sort((a,b) => b.matchScore - a.matchScore).slice(0,3).map(job => (
                             <div key={job.id} onClick={() => { setSelectedJobId(job.id); setCurrentView(ViewState.SELECTED_JOBS); }} className="flex justify-between items-center p-3 hover:bg-slate-50 rounded-lg cursor-pointer border border-transparent hover:border-slate-100 transition-colors">
                                 <div>
                                     <div className="font-medium text-slate-900 text-sm">{job.title}</div>
                                     <div className="text-xs text-slate-500">{job.company}</div>
                                 </div>
                                 <div className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">{job.matchScore}%</div>
                             </div>
                         ))}
                         {jobs.filter(j => j.status === JobStatus.DETECTED).length === 0 && <p className="text-sm text-slate-400 italic">No new jobs detected.</p>}
                     </div>
                 </div>
                 
                 <div className="bg-indigo-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                     <div className="relative z-10">
                        <h3 className="font-bold text-lg mb-2">Bulk Generation</h3>
                        <p className="text-indigo-100 text-sm mb-4">Select multiple jobs in the "Selected Jobs" tab to generate resumes and cover letters for all of them at once.</p>
                        <button onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} className="bg-white text-indigo-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors">Go to Jobs</button>
                     </div>
                     <Sparkles className="absolute -bottom-4 -right-4 w-32 h-32 text-indigo-500/50 rtl:right-auto rtl:-left-4" />
                 </div>
             </div>
          </div>
        )}

        {currentView === ViewState.SELECTED_JOBS && (
          <div className="flex h-full">
            <div className="w-1/3 min-w-[320px] bg-white border-e border-slate-200 flex flex-col z-10">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 mb-3">
                  <div className="relative flex-1">
                    <Search className="absolute top-2.5 w-4 h-4 text-slate-400 start-3" />
                    <input 
                      type="text" 
                      placeholder="Search jobs..." 
                      className="w-full py-2 bg-white border border-slate-300 rounded-lg text-sm outline-none focus:border-indigo-500 transition-colors ps-9 pe-4"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                  
                  {/* Bulk Prepare Button - Always Visible */}
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
                      Bulk Prepare
                  </button>
                  
                  {/* CHANGED: Replaced Icon Button with clear text label "Clear List" in RED */}
                  <button 
                     onClick={handleClearAllJobs}
                     className="bg-red-50 text-red-600 px-3 py-2 rounded-lg hover:bg-red-100 transition-colors border border-red-200 text-xs font-bold whitespace-nowrap"
                     title="Clear All Jobs"
                  >
                      Clear List
                  </button>

                  <button 
                     onClick={() => setIsAddJobModalOpen(true)}
                     className="bg-indigo-50 text-indigo-600 p-2 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-200"
                     title="Add Manual Job"
                  >
                      <PlusCircle className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center justify-between">
                    <div className="flex space-x-1 overflow-x-auto no-scrollbar">
                        {['ALL', JobStatus.DETECTED, JobStatus.APPLIED_AUTO, JobStatus.SAVED].map(status => (
                            <button
                                key={status}
                                onClick={() => setFilterStatus(status)}
                                className={`px-2.5 py-1 text-xs font-medium rounded-md whitespace-nowrap transition-colors ${filterStatus === status ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
                            >
                                {status === 'ALL' ? 'All' : status}
                            </button>
                        ))}
                    </div>
                </div>
                
                {/* Selection Counter */}
                {checkedJobIds.size > 0 && (
                    <div className="mt-2 text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-1 rounded text-center border border-indigo-100">
                        {checkedJobIds.size} Job{checkedJobIds.size > 1 ? 's' : ''} Selected
                    </div>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-3 bg-slate-50 custom-scrollbar">
                {filteredJobs.length > 0 ? (
                    filteredJobs.map(job => (
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
                        No jobs found.
                    </div>
                )}
              </div>
              
              <div className="p-3 border-t border-slate-200 bg-white flex justify-between items-center text-xs text-slate-500">
                  <span>{filteredJobs.length} jobs listed</span>
                  <button onClick={handleExportCsv} className="flex items-center hover:text-indigo-600">
                      <FileDown className="w-3 h-3 me-1"/> Export CSV
                  </button>
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
                    <p className="text-sm">Or check your Inbox to find new ones</p>
                 </div>
               )}
            </div>
          </div>
        )}
        
        {/* --- REVIEW SELECTION (FOR LINK CHECKING) --- */}
        {currentView === ViewState.REVIEW_SELECTION && (
            <div className="h-full flex flex-col bg-white">
                <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50">
                     <div>
                        <h1 className="text-2xl font-bold text-slate-900">Job List</h1>
                        <p className="text-slate-500 mt-1">Reviewing {checkedJobIds.size} selected jobs.</p>
                     </div>
                     <button 
                        onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} 
                        className="bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg hover:bg-slate-50 font-medium flex items-center shadow-sm"
                    >
                         <ArrowLeft className="w-4 h-4 me-2 rtl:rotate-180" /> Back
                     </button>
                </div>
                <div className="flex-1 overflow-y-auto p-8 bg-slate-50/30">
                     <div className="max-w-4xl mx-auto space-y-4">
                         {jobs.filter(j => checkedJobIds.has(j.id)).map(job => (
                             <div key={job.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-200 transition-colors">
                                 <div className="flex items-center space-x-5 overflow-hidden">
                                     <div className="w-12 h-12 bg-indigo-50 rounded-lg flex items-center justify-center text-xl font-bold text-indigo-600 shrink-0">
                                         {job.company.charAt(0)}
                                     </div>
                                     <div className="min-w-0">
                                         <h3 className="font-bold text-slate-900 text-lg truncate">{job.title}</h3>
                                         <p className="text-slate-500 flex items-center truncate">
                                             {job.company}
                                             <span className="mx-2 text-slate-300">•</span>
                                             {job.location}
                                         </p>
                                     </div>
                                 </div>
                                 <div className="flex items-center space-x-3 shrink-0 ms-4">
                                     <button 
                                        onClick={() => handleViewJobExternal(job.title, job.company, job.applicationUrl)}
                                        className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold hover:bg-indigo-700 flex items-center shadow-md hover:shadow-lg transition-all"
                                     >
                                         <ExternalLink className="w-4 h-4 me-2" /> View Job
                                     </button>
                                     <button 
                                        onClick={() => handleRemoveFromSelection(job.id)}
                                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                         <Trash2 className="w-5 h-5" />
                                     </button>
                                 </div>
                             </div>
                         ))}
                     </div>
                </div>
            </div>
        )}

        {/* --- GENERATED JOBS LIST (DEDICATED SCREEN) --- */}
        {currentView === ViewState.GENERATED_JOBS_LIST && (
            <div className="h-full flex flex-col bg-slate-50 overflow-hidden">
                <div className="p-6 border-b border-slate-200 bg-white shadow-sm z-10 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center">
                           <CheckSquare className="w-6 h-6 me-3 text-green-600"/> Application Ready
                        </h1>
                        <p className="text-slate-600 mt-1">
                            Successfully generated documents for <strong>{bulkResults.length}</strong> jobs.
                        </p>
                    </div>
                    <button 
                        onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} 
                        className="bg-slate-100 text-slate-700 px-5 py-2.5 rounded-lg hover:bg-slate-200 font-medium flex items-center"
                    >
                        Done
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
                                
                                {!hasLink && (
                                  <div className="mt-2 flex items-center gap-2 text-amber-600 text-xs bg-amber-50 p-1.5 rounded w-fit px-2">
                                    <AlertCircle size={14} />
                                    <span>Link not found - Search fallback active</span>
                                  </div>
                                )}
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
                                      title="Download Resume"
                                    >
                                      <FileText size={14} /> Resume
                                    </button>
                                    <button
                                      onClick={() => handleDownloadText(`${job.company}_CoverLetter.txt`, job.letter)}
                                      className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition text-xs font-medium"
                                      title="Download Cover Letter"
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
                <div className="mt-8 bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-500">
                    <PieChart className="w-12 h-12 mx-auto mb-4 text-slate-300"/>
                    <h3 className="text-lg font-medium text-slate-700">Detailed Insights Coming Soon</h3>
                    <p>Advanced metrics about your application conversion rates will appear here.</p>
                </div>
            </div>
        )}

        {currentView === ViewState.SETTINGS && (
           <div className="h-full p-8 overflow-y-auto bg-slate-50">
               <Settings 
                  // Use a combination key to force re-render when accounts change length
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

      {/* Global Modals */}
      <AddJobModal 
         isOpen={isAddJobModalOpen}
         onClose={() => setIsAddJobModalOpen(false)}
         onAdd={handleAddManualJob}
      />
    </div>
  );
};
