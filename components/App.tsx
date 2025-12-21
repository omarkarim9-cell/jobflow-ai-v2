import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Job, JobStatus, ViewState, UserProfile, EmailAccount } from '../types';
import { DashboardStats } from './DashboardStats';
import { JobCard } from './JobCard';
import { JobDetail } from './JobDetail';
import { InboxScanner } from './InboxScanner';
import { Onboarding } from './Onboarding';
import { Settings } from './Settings';
import { UserManual } from './UserManual';
import { Subscription } from './Subscription';
import { Support } from './Support';
import { AddJobModal } from './AddJobModal';
import { Auth } from './Auth';
import { ApplicationTracker } from './ApplicationTracker';
import { NotificationToast, NotificationType } from './NotificationToast';
import { generateCoverLetter, customizeResume } from '../services/geminiService';
import { writeFileToDirectory, createVirtualDirectory } from '../services/fileSystemService';
import { translations, LanguageCode } from '../services/localization';
import { 
  fetchJobsFromDb, 
  getUserProfile, 
  saveUserProfile, 
  saveJobToDb, 
  deleteJobFromDb 
} from '../services/dbService';
import { 
  LayoutDashboard, 
  Briefcase, 
  Mail, 
  Settings as SettingsIcon, 
  PlusCircle,
  Search,
  Loader2,
  CheckSquare,
  Sparkles,
  ExternalLink,
  Search as SearchIcon,
  List,
  CreditCard,
  BookOpen,
  LifeBuoy,
  FileText,
  LogOut
} from 'lucide-react';

interface BulkResult {
  jobId: string;
  jobTitle: string;
  company: string;
  resume: string;
  letter: string;
  applicationUrl?: string;
}

export const App: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [isAddJobModalOpen, setIsAddJobModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [checkedJobIds, setCheckedJobIds] = useState<Set<string>>(new Set());
  const [isBulkGenerating, setIsBulkGenerating] = useState(false);
  const [bulkProgress, setBulkProgress] = useState('');
  const [bulkResults, setBulkResults] = useState<BulkResult[]>([]);
  const [sessionAccount, setSessionAccount] = useState<EmailAccount | null>(null);
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);

  const lang = (userProfile?.preferences.language as LanguageCode) || 'en';
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;
  const isRtl = lang === 'ar';

  const showNotification = (message: string, type: NotificationType) => {
      setNotification({ message, type });
  };

  // Check if onboarding is needed (profile exists but no resume content)
  const needsOnboarding = useMemo(() => {
    return userProfile && (!userProfile.resumeContent || userProfile.resumeContent.trim().length < 10);
  }, [userProfile]);

  // --- NEON DB SYNC ---
  useEffect(() => {
    if (isLoaded && isSignedIn) {
        syncWithNeon();
    } else if (isLoaded) {
        setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const syncWithNeon = async () => {
      setLoading(true);
      try {
          const token = await getToken();
          if (!token) return;

          let profile = await getUserProfile(token);
          if (!profile) {
              // Create a shell profile if it doesn't exist in Neon yet
              profile = {
                  id: user!.id,
                  fullName: user!.fullName || 'User',
                  email: user!.primaryEmailAddress?.emailAddress || '',
                  password: '',
                  phone: '',
                  resumeContent: '',
                  connectedAccounts: [],
                  preferences: { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' },
                  plan: 'free',
                  onboardedAt: new Date().toISOString()
              };
              await saveUserProfile(profile, token);
          }
          setUserProfile(profile);
          
          const dbJobs = await fetchJobsFromDb(token);
          setJobs(dbJobs.filter(j => j.status !== JobStatus.DETECTED));
          
          const storedPath = localStorage.getItem('jobflow_project_path');
          if (storedPath) setDirHandle(createVirtualDirectory(storedPath));
      } catch (e) {
          console.error("Neon Sync Error", e);
          showNotification("Database connection failed.", "error");
      } finally {
          setLoading(false);
      }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    const token = await getToken();
    if (token) await saveUserProfile(updatedProfile, token);
    showNotification("Profile synced successfully.", 'success');
  };
  
  const handleJobUpdate = async (id: string, status: JobStatus) => {
    setJobs(prev => {
        const updated = prev.map(j => j.id === id ? { ...j, status } : j);
        const job = updated.find(j => j.id === id);
        if (job) getToken().then(t => t && saveJobToDb({ ...job, status }, t));
        return updated;
    });
  };
  
  const handleJobDataUpdate = async (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    const token = await getToken();
    if (token) saveJobToDb(updatedJob, token);
    
    if (dirHandle && updatedJob.customizedResume) {
       const safeName = updatedJob.company.replace(/[^a-z0-9]/gi, '_');
       await writeFileToDirectory(dirHandle, `${safeName}_Resume.txt`, updatedJob.customizedResume);
    }
  };

  const handleAddJobs = (newJobs: Job[]) => {
    setJobs(prev => {
        const existingUrls = new Set(prev.map(j => j.applicationUrl).filter(Boolean));
        const unique = newJobs.filter(j => !j.applicationUrl || !existingUrls.has(j.applicationUrl));
        return [...unique, ...prev];
    });
    showNotification(`Imported ${newJobs.length} jobs.`, 'success');
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

  const handleBulkGenerate = async () => {
    if (!userProfile?.resumeContent) {
        showNotification("Missing Master Resume. Go to Settings.", 'error');
        return;
    }
    setIsBulkGenerating(true);
    const idsToProcess = Array.from(checkedJobIds);
    const token = await getToken();

    for (const id of idsToProcess) {
        const job = jobs.find(j => j.id === id);
        if (!job) continue;
        try {
            const newResume = await customizeResume(job.title, job.company, job.description, userProfile.resumeContent);
            const newLetter = await generateCoverLetter(job.title, job.company, job.description, userProfile.resumeContent, userProfile.fullName, userProfile.email);
            const updatedJob = { ...job, customizedResume: newResume, coverLetter: newLetter, status: JobStatus.SAVED };
            setJobs(prev => prev.map(j => j.id === id ? updatedJob : j));
            if (token) saveJobToDb(updatedJob, token);
        } catch (e) { console.error(e); }
    }
    setIsBulkGenerating(false);
    showNotification("Bulk processing complete.", 'success');
    setCheckedJobIds(new Set());
  };

  if (!isLoaded || loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;
  }

  if (!isSignedIn) {
    return <Auth onLogin={() => {}} onSwitchToSignup={() => {}} />;
  }

  // If signed in but profile is empty, force onboarding
  if (needsOnboarding) {
    return (
      <Onboarding 
        onComplete={handleUpdateProfile}
        onDirHandleChange={setDirHandle}
        dirHandle={dirHandle}
        showNotification={showNotification}
      />
    );
  }

  const trackedJobsCount = jobs.filter(j => j.status !== JobStatus.DETECTED).length;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}

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
          <button onClick={() => setCurrentView(ViewState.DASHBOARD)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.DASHBOARD ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <LayoutDashboard className="w-5 h-5 me-3" />
            <span className="flex-1 text-start">Dashboard</span>
          </button>
          <button onClick={() => setCurrentView(ViewState.TRACKER)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.TRACKER ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <List className="w-5 h-5 me-3" />
            <span className="flex-1 text-start">Applications</span>
            {trackedJobsCount > 0 && <span className="bg-indigo-100 text-indigo-700 text-xs font-bold px-2 py-0.5 rounded-full">{trackedJobsCount}</span>}
          </button>
          <button onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.SELECTED_JOBS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Briefcase className="w-5 h-5 me-3" />
            <span className="flex-1 text-start">Selected Jobs</span>
          </button>
          <button onClick={() => setCurrentView(ViewState.EMAILS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.EMAILS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Mail className="w-5 h-5 me-3" />
            <span className="flex-1 text-start">Inbox Scanner</span>
          </button>
          <button onClick={() => setCurrentView(ViewState.SETTINGS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.SETTINGS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <SettingsIcon className="w-5 h-5 me-3" />
            <span className="flex-1 text-start">Settings</span>
          </button>
        </div>

        <div className="p-4 border-t border-slate-200 mt-auto">
             <div className="px-3 py-4 bg-slate-50 rounded-xl mb-4 text-xs text-slate-500 border border-slate-100">
                <p className="font-bold text-slate-700 mb-1">Neon DB Status</p>
                <div className="flex items-center gap-1.5 text-green-600">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                    Connected & Secure
                </div>
             </div>
        </div>
      </aside>

      <main className="flex-1 overflow-hidden relative">
        {currentView === ViewState.DASHBOARD && <div className="h-full overflow-y-auto p-8"><DashboardStats jobs={jobs} userProfile={userProfile!} /></div>}
        {currentView === ViewState.TRACKER && <ApplicationTracker jobs={jobs} onUpdateStatus={handleJobUpdate} onDelete={handleDeleteJob} onSelect={(j) => { setSelectedJobId(j.id); setCurrentView(ViewState.SELECTED_JOBS); }} />}
        {currentView === ViewState.SETTINGS && <div className="h-full p-8 overflow-y-auto"><Settings userProfile={userProfile!} onUpdate={handleUpdateProfile} dirHandle={dirHandle} onDirHandleChange={setDirHandle} jobs={jobs} showNotification={showNotification} onReset={() => {}} /></div>}
        {currentView === ViewState.EMAILS && <div className="h-full p-6"><InboxScanner onImport={handleAddJobs} sessionAccount={sessionAccount} onConnectSession={setSessionAccount} onDisconnectSession={() => setSessionAccount(null)} showNotification={showNotification} userPreferences={userProfile?.preferences} /></div>}
        {currentView === ViewState.SELECTED_JOBS && (
          <div className="flex h-full">
            <div className="w-1/3 min-w-[320px] bg-white border-e border-slate-200 flex flex-col z-10">
              <div className="p-4 border-b border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2">
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
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-3 bg-slate-50 custom-scrollbar">
                {jobs.filter(j => j.status === JobStatus.DETECTED).map(job => (
                  <JobCard 
                      key={job.id} 
                      job={job} 
                      onClick={(j) => setSelectedJobId(j.id)}
                      isSelected={selectedJobId === job.id}
                      isChecked={checkedJobIds.has(job.id)}
                      onToggleCheck={handleToggleCheck}
                      onAutoApply={() => {}}
                  />
                ))}
              </div>
            </div>
            <div className="flex-1 bg-slate-50">
              {selectedJobId ? (
                <JobDetail 
                  job={jobs.find(j => j.id === selectedJobId)!} 
                  userProfile={userProfile!} 
                  onUpdateStatus={handleJobUpdate} 
                  onUpdateJob={handleJobDataUpdate} 
                />
              ) : (
                <div className="h-full flex items-center justify-center text-slate-400">Select a job to view details</div>
              )}
            </div>
          </div>
        )}
      </main>

      <AddJobModal isOpen={isAddJobModalOpen} onClose={() => setIsAddJobModalOpen(false)} onAdd={handleAddManualJob} />
    </div>
  );
};