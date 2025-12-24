
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
import { Auth } from './components/Auth';
import { Onboarding } from './components/Onboarding';
import { ApplicationTracker } from './components/ApplicationTracker';
import { NotificationToast, NotificationType } from './components/NotificationToast';
import { LanguageCode } from './services/localization';
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
  X,
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
  const [sessionAccount, setSessionAccount] = useState<EmailAccount | null>(null);
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);

  const lang = (userProfile?.preferences?.language as LanguageCode) || 'en';
  const isRtl = lang === 'ar';

  const showNotification = useCallback((message: string, type: NotificationType) => {
      setNotification({ message, type });
  }, []);

  const syncData = useCallback(async () => {
      setLoading(true);
      try {
          const token = await getToken();
          if (!token) { setLoading(false); return; }

          let profile = await getUserProfile(token).catch(() => null);
          
          if (!profile && user) {
              setCurrentView(ViewState.ONBOARDING);
          } else if (profile && !profile.onboardedAt) {
              setCurrentView(ViewState.ONBOARDING);
          }
          
          setUserProfile(profile);
          const dbJobs = await fetchJobsFromDb(token).catch(() => []);
          setJobs(dbJobs);
      } catch (e) {
          showNotification("Sync error with Cloud Storage", "error");
      } finally {
          setLoading(false);
      }
  }, [getToken, user, showNotification]);

  useEffect(() => {
    if (isLoaded && isSignedIn) syncData();
    else if (isLoaded) setLoading(false);
  }, [isLoaded, isSignedIn, syncData]);

  const handleUpdateProfile = async (updated: UserProfile) => {
    setUserProfile(updated);
    const token = await getToken();
    if (token) await saveUserProfile(updated, token);
  };

  const handleUpdateJob = async (updated: Job) => {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
    const token = await getToken();
    if (token) await saveJobToDb(updated, token);
  };

  const handleOnboardingComplete = (profile: UserProfile) => {
    setUserProfile(profile);
    setCurrentView(ViewState.DASHBOARD);
    showNotification("Onboarding complete!", "success");
  };

  if (!isLoaded || loading) return <div className="h-screen flex items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600"/></div>;
  if (!isSignedIn) return <Auth onLogin={() => {}} onSwitchToSignup={() => {}} />;
  if (currentView === ViewState.ONBOARDING) return <Onboarding onComplete={handleOnboardingComplete} onDirHandleChange={() => {}} dirHandle={null} showNotification={showNotification} />;

  const currentSelectedJob = jobs.find(j => j.id === selectedJobId);

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <aside className="w-64 bg-white border-e border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center"><Briefcase className="text-white w-5 h-5" /></div>
            <span className="font-bold text-xl text-slate-900">JobFlow</span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
        <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => setCurrentView(ViewState.DASHBOARD)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.DASHBOARD ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}><LayoutDashboard className="w-5 h-5 me-3" /> Dashboard</button>
          <button onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SELECTED_JOBS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}><SearchIcon className="w-5 h-5 me-3" /> Scanned Jobs</button>
          <button onClick={() => setCurrentView(ViewState.TRACKER)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.TRACKER ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}><List className="w-5 h-5 me-3" /> Applications</button>
          <button onClick={() => setCurrentView(ViewState.EMAILS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.EMAILS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}><Mail className="w-5 h-5 me-3" /> Inbox Scanner</button>
          <div className="my-2 border-t border-slate-100" />
          <button onClick={() => setCurrentView(ViewState.SETTINGS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SETTINGS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600'}`}><SettingsIcon className="w-5 h-5 me-3" /> Settings</button>
        </div>
        <div className="p-4 border-t border-slate-200 mt-auto"><button onClick={() => signOut()} className="w-full flex items-center px-3 py-2.5 rounded-lg text-slate-600 hover:text-red-600 transition-colors font-bold text-sm"><LogOut className="w-4 h-4 me-3" /> Sign Out</button></div>
      </aside>
      <main className="flex-1 overflow-hidden relative">
        {currentView === ViewState.DASHBOARD && <div className="h-full overflow-y-auto p-8"><DashboardStats jobs={jobs} userProfile={userProfile!} /></div>}
        {currentView === ViewState.SELECTED_JOBS && <div className="h-full overflow-y-auto p-8">{jobs.filter(j => j.status === JobStatus.DETECTED).map(j => <JobCard key={j.id} job={j} onClick={(job) => setSelectedJobId(job.id)} isSelected={selectedJobId === j.id} isChecked={false} onToggleCheck={() => {}} onAutoApply={() => {}} />)}</div>}
        {currentView === ViewState.TRACKER && <ApplicationTracker jobs={jobs} onUpdateStatus={async (id, s) => {
            const job = jobs.find(j => j.id === id);
            if (job) handleUpdateJob({...job, status: s});
        }} onDelete={async (id) => {
            setJobs(prev => prev.filter(j => j.id !== id));
            const token = await getToken();
            if (token) await deleteJobFromDb(id, token);
        }} onSelect={(j) => setSelectedJobId(j.id)} />}
        {currentView === ViewState.SETTINGS && <div className="h-full p-8 overflow-y-auto"><Settings userProfile={userProfile!} onUpdate={handleUpdateProfile} dirHandle={null} onDirHandleChange={() => {}} jobs={jobs} showNotification={showNotification} onReset={() => signOut()} /></div>}
        {currentView === ViewState.EMAILS && <div className="h-full p-6"><InboxScanner onImport={async (newJobs) => {
            setJobs(prev => [...newJobs, ...prev]);
            const token = await getToken();
            if (token) for (const j of newJobs) await saveJobToDb(j, token);
        }} sessionAccount={sessionAccount} onConnectSession={setSessionAccount} onDisconnectSession={() => setSessionAccount(null)} showNotification={showNotification} userPreferences={userProfile?.preferences} /></div>}
        {selectedJobId && currentSelectedJob && (
            <div className="absolute inset-0 z-50 bg-slate-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300">
                <div className="p-4 bg-white border-b border-slate-200 flex items-center gap-4"><button onClick={() => setSelectedJobId(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-5 h-5" /></button> <span className="text-sm font-bold text-slate-400">/ {currentSelectedJob.company}</span></div>
                <div className="flex-1 overflow-hidden"><JobDetail job={currentSelectedJob} userProfile={userProfile!} onUpdateStatus={() => {}} onUpdateJob={handleUpdateJob} onClose={() => setSelectedJobId(null)} showNotification={showNotification} /></div>
            </div>
        )}
      </main>
    </div>
  );
};
