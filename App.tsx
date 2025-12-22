import React, { useState, useEffect, useMemo } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Job, JobStatus, ViewState, UserProfile, EmailAccount } from './types';
import { DashboardStats } from './components/DashboardStats';
import { JobCard } from './components/JobCard';
import { JobDetail } from './components/JobDetail';
import { InboxScanner } from './components/InboxScanner';
import { Onboarding } from './components/Onboarding';
import { Settings } from './components/Settings';
import { AddJobModal } from './components/AddJobModal';
import { Auth } from './components/Auth';
import { ApplicationTracker } from './components/ApplicationTracker';
import { NotificationToast, NotificationType } from './components/NotificationToast';
import { writeFileToDirectory, createVirtualDirectory } from './services/fileSystemService';
import { translations, LanguageCode } from './services/localization';
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
  Loader2,
  List,
  LogOut,
  Search as SearchIcon
} from 'lucide-react';

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

  const lang = (userProfile?.preferences?.language as LanguageCode) || 'en';
  const isRtl = lang === 'ar';

  const showNotification = (message: string, type: NotificationType) => {
      setNotification({ message, type });
  };

  const needsOnboarding = useMemo(() => {
    return userProfile && (!userProfile.resumeContent || userProfile.resumeContent.trim().length < 10);
  }, [userProfile]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
        syncData();
    } else if (isLoaded) {
        setLoading(false);
    }
  }, [isLoaded, isSignedIn]);

  const syncData = async () => {
      setLoading(true);
      try {
          const token = await getToken();
          if (!token) return;

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
              await saveUserProfile(profile, token);
          }
          setUserProfile(profile);
          
          const dbJobs = await fetchJobsFromDb(token);
          // FIX: Include all jobs in the local state, even DETECTED ones
          setJobs(dbJobs);
          
          const storedPath = localStorage.getItem('jobflow_project_path');
          if (storedPath) setDirHandle(createVirtualDirectory(storedPath));
      } catch (e) {
          console.error("Data Sync Error", e);
      } finally {
          setLoading(false);
      }
  };

  const handleUpdateProfile = async (updatedProfile: UserProfile) => {
    setUserProfile(updatedProfile);
    const token = await getToken();
    if (token) await saveUserProfile(updatedProfile, token);
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
    // Persist to DB
    getToken().then(token => {
        if (token) newJobs.forEach(job => saveJobToDb(job, token));
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

  if (!isLoaded || loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;
  if (!isSignedIn) return <Auth onLogin={() => {}} onSwitchToSignup={() => {}} />;

  if (needsOnboarding) {
    return <Onboarding onComplete={handleUpdateProfile} onDirHandleChange={setDirHandle} dirHandle={dirHandle} showNotification={showNotification} />;
  }

  const trackedJobsCount = jobs.filter(j => j.status !== JobStatus.DETECTED).length;
  const detectedJobsCount = jobs.filter(j => j.status === JobStatus.DETECTED).length;

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
            <span className="flex-1 text-start font-bold text-sm">Dashboard</span>
          </button>
          
          <button onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.SELECTED_JOBS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <SearchIcon className="w-5 h-5 me-3" />
            <span className="flex-1 text-start font-bold text-sm">Scanned Jobs</span>
            {detectedJobsCount > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">{detectedJobsCount}</span>}
          </button>

          <button onClick={() => setCurrentView(ViewState.TRACKER)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.TRACKER ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <List className="w-5 h-5 me-3" />
            <span className="flex-1 text-start font-bold text-sm">Applications</span>
            {trackedJobsCount > 0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">{trackedJobsCount}</span>}
          </button>
          
          <button onClick={() => setCurrentView(ViewState.EMAILS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.EMAILS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <Mail className="w-5 h-5 me-3" />
            <span className="flex-1 text-start font-bold text-sm">Inbox Scanner</span>
          </button>
          
          <button onClick={() => setCurrentView(ViewState.SETTINGS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 ${currentView === ViewState.SETTINGS ? 'bg-indigo-50 text-indigo-700 font-medium' : 'text-slate-600 hover:bg-slate-100'}`}>
            <SettingsIcon className="w-5 h-5 me-3" />
            <span className="flex-1 text-start font-bold text-sm">Settings</span>
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
        {currentView === ViewState.DASHBOARD && <div className="h-full overflow-y-auto p-8"><DashboardStats jobs={jobs} userProfile={userProfile!} /></div>}
        
        {currentView === ViewState.SELECTED_JOBS && (
            <div className="h-full overflow-y-auto p-8">
                <div className="mb-6 flex justify-between items-end">
                    <div>
                        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Scanned Jobs</h1>
                        <p className="text-xs text-slate-500 mt-1 uppercase tracking-widest font-bold">New leads detected from inbox</p>
                    </div>
                </div>
                {jobs.filter(j => j.status === JobStatus.DETECTED).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {jobs.filter(j => j.status === JobStatus.DETECTED).map(job => (
                            <JobCard 
                                key={job.id} 
                                job={job} 
                                onClick={(j) => { setSelectedJobId(j.id); }}
                                isSelected={selectedJobId === job.id}
                                isChecked={checkedJobIds.has(job.id)}
                                onToggleCheck={handleToggleCheck}
                                onAutoApply={(e) => {}}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">
                        <Mail className="w-16 h-16 mb-4 opacity-10" />
                        <p className="font-bold text-slate-600">No scanned jobs to review.</p>
                        <p className="text-xs mt-1">Run the Inbox Scanner to find new opportunities.</p>
                    </div>
                )}
            </div>
        )}

        {currentView === ViewState.TRACKER && <ApplicationTracker jobs={jobs} onUpdateStatus={handleJobUpdate} onDelete={handleDeleteJob} onSelect={(j) => { setSelectedJobId(j.id); setCurrentView(ViewState.SELECTED_JOBS); }} />}
        {currentView === ViewState.SETTINGS && <div className="h-full p-8 overflow-y-auto"><Settings userProfile={userProfile!} onUpdate={handleUpdateProfile} dirHandle={dirHandle} onDirHandleChange={setDirHandle} jobs={jobs} showNotification={showNotification} onReset={() => signOut()} /></div>}
        {currentView === ViewState.EMAILS && <div className="h-full p-6"><InboxScanner onImport={handleAddJobs} sessionAccount={sessionAccount} onConnectSession={setSessionAccount} onDisconnectSession={() => setSessionAccount(null)} showNotification={showNotification} userPreferences={userProfile?.preferences} /></div>}
      </main>

      <AddJobModal isOpen={isAddJobModalOpen} onClose={() => setIsAddJobModalOpen(false)} onAdd={handleAddManualJob} />
    </div>
  );
};