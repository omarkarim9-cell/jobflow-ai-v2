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
  const [sessionAccount, setSessionAccount] = useState<EmailAccount | null>(null);
  const [dirHandle, setDirHandle] = useState<any>(null);
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);

  const lang = (userProfile?.preferences.language as LanguageCode) || 'en';
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;
  const isRtl = lang === 'ar';

  const showNotification = (message: string, type: NotificationType) => {
      setNotification({ message, type });
  };

  const needsOnboarding = useMemo(() => {
    return userProfile && (!userProfile.resumeContent || userProfile.resumeContent.trim().length < 10);
  }, [userProfile]);

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
          if (!token) {
              setLoading(false);
              return;
          }

          let profile = await getUserProfile(token).catch(() => null);
          if (!profile) {
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
              await saveUserProfile(profile, token).catch(() => {});
          }
          setUserProfile(profile);
          
          const dbJobs = await fetchJobsFromDb(token).catch(() => []);
          setJobs(dbJobs.filter(j => j.status !== JobStatus.DETECTED));
          
          const storedPath = localStorage.getItem('jobflow_project_path');
          if (storedPath) setDirHandle(createVirtualDirectory(storedPath));
      } catch (e) {
          console.error("Sync Error", e);
      } finally {
          setLoading(false);
      }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    const token = await getToken();
    if (token) await saveUserProfile(updatedProfile, token).catch(() => {});
    showNotification("Profile synced successfully.", 'success');
  };
  
  const handleJobUpdate = async (id: string, status: JobStatus) => {
    setJobs(prev => {
        const updated = prev.map(j => j.id === id ? { ...j, status } : j);
        const job = updated.find(j => j.id === id);
        if (job) getToken().then(t => t && saveJobToDb({ ...job, status }, t).catch(() => {}));
        return updated;
    });
  };
  
  const handleJobDataUpdate = async (updatedJob: Job) => {
    setJobs(prev => prev.map(j => j.id === updatedJob.id ? updatedJob : j));
    const token = await getToken();
    if (token) saveJobToDb(updatedJob, token).catch(() => {});
    
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
      if (token) saveJobToDb(job, token).catch(() => {});
      setSelectedJobId(job.id);
      setCurrentView(ViewState.TRACKER);
  };

  const handleDeleteJob = async (id: string) => {
      setJobs(prev => prev.filter(j => j.id !== id));
      const token = await getToken();
      if (token) await deleteJobFromDb(id, token).catch(() => {});
      showNotification("Job removed.", 'success');
  };

  const handleToggleCheck = (id: string) => {
    const newChecked = new Set(checkedJobIds);
    if (newChecked.has(id)) newChecked.delete(id);
    else newChecked.add(id);
    setCheckedJobIds(newChecked);
  };

  if (!isLoaded || loading) {
    return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;
  }

  if (!isSignedIn) {
    return <Auth onLogin={() => {}} onSwitchToSignup={() => {}} />;
  }

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
      </main>

      <AddJobModal isOpen={isAddJobModalOpen} onClose={() => setIsAddJobModalOpen(false)} onAdd={handleAddManualJob} />
    </div>
  );
};