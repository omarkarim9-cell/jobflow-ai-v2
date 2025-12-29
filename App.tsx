
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Job, JobStatus, ViewState, UserProfile, EmailAccount } from './types';
import { DashboardStats } from './components/DashboardStats';
import { JobCard } from './components/JobCard';
import { InboxScanner } from './components/InboxScanner';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { ApplicationTracker } from './components/ApplicationTracker';
import { DebugView } from './components/DebugView';
import { AddJobModal } from './components/AddJobModal';
import { AutomationModal } from './AutomationModal';
import { NotificationToast, NotificationType } from './components/NotificationToast';
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
  Plus,
  Terminal,
  RefreshCw
} from 'lucide-react';
import { JobDetail } from './components/JobDetail';

const OWNER_EMAIL = 'omar.karim9@gmail.com';

export const App: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken, signOut } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [applyingJobId, setApplyingJobId] = useState<string | null>(null);
  const [sessionAccount, setSessionAccount] = useState<EmailAccount | null>(null);
  const [notification, setNotification] = useState<{message: string, type: NotificationType} | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const isOwner = user?.primaryEmailAddress?.emailAddress === OWNER_EMAIL;
  const isRtl = userProfile?.preferences?.language === 'ar';

  const showNotification = useCallback((message: string, type: NotificationType) => {
      setNotification({ message, type });
  }, []);

  const syncData = useCallback(async (isManual: boolean = false) => {
      if (!navigator.onLine) {
          showNotification("Offline mode. Database sync paused.", "error");
          return;
      }
      setIsSyncing(true);
      try {
          const token = await getToken();
          if (!token) { setLoading(false); setIsSyncing(false); return; }
          const profile = await getUserProfile(token);
          if (profile) setUserProfile(profile);
          const dbJobs = await fetchJobsFromDb(token);
          setJobs(dbJobs);
          if (isManual) showNotification("Workspace synced.", "success");
      } catch (e) {
          showNotification("Sync failed. Using cache.", "error");
      } finally {
          setLoading(false);
          setIsSyncing(false);
      }
  }, [getToken, showNotification]);

  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); syncData(); };
    const handleOffline = () => { setIsOnline(false); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    if (isLoaded && isSignedIn) syncData();
    else if (isLoaded) setLoading(false);
    return () => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
    };
  }, [isLoaded, isSignedIn, syncData]);

  const handleUpdateJob = useCallback(async (updated: Job) => {
    setJobs(prev => prev.map(j => j.id === updated.id ? updated : j));
    const token = await getToken();
    if (token) await saveJobToDb(updated, token);
  }, [getToken]);

  const currentSelectedJob = useMemo(() => jobs.find(j => j.id === selectedJobId), [jobs, selectedJobId]);
  const applyingJob = useMemo(() => jobs.find(j => j.id === applyingJobId), [jobs, applyingJobId]);
  const isResumeMissing = !userProfile?.resumeContent || userProfile.resumeContent.length < 50;

  if (!isLoaded || (isSignedIn && loading && !userProfile)) {
    return <div className="h-screen flex flex-col items-center justify-center bg-slate-50"><Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2"/><p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Loading Flow...</p></div>;
  }
  if (!isSignedIn) return <Auth onLogin={() => {}} onSwitchToSignup={() => {}} />;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden" dir={isRtl ? 'rtl' : 'ltr'}>
      {notification && <NotificationToast message={notification.message} type={notification.type} onClose={() => setNotification(null)} />}
      <AddJobModal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} onAdd={(j) => { setJobs(p => [j, ...p]); handleUpdateJob(j); }} />
      {applyingJob && <AutomationModal isOpen={!!applyingJobId} job={applyingJob} userProfile={userProfile!} onClose={() => setApplyingJobId(null)} onComplete={() => handleUpdateJob({...applyingJob, status: JobStatus.APPLIED_AUTO})} />}

      <aside className="w-64 bg-white border-e border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center relative shadow-lg">
                <Briefcase className="text-white w-5 h-5" />
                {isSyncing && <div className="absolute -top-1 -right-1 w-3 h-3 bg-white rounded-full flex items-center justify-center"><RefreshCw className="w-2 h-2 text-indigo-600 animate-spin" /></div>}
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">JobFlow</span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
        <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
          <button onClick={() => setCurrentView(ViewState.DASHBOARD)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.DASHBOARD ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><LayoutDashboard className="w-5 h-5 me-3" /> Dashboard</button>
          <button onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SELECTED_JOBS ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><SearchIcon className="w-5 h-5 me-3" /> Scanned Leads</button>
          <button onClick={() => setCurrentView(ViewState.TRACKER)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.TRACKER ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><List className="w-5 h-5 me-3" /> Applications</button>
          <button onClick={() => setCurrentView(ViewState.EMAILS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.EMAILS ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><Mail className="w-5 h-5 me-3" /> Inbox Scanner</button>
          <div className="my-2 border-t border-slate-100" />
          <button onClick={() => setCurrentView(ViewState.SETTINGS)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SETTINGS ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm' : 'text-slate-600 hover:bg-slate-50'}`}><SettingsIcon className="w-5 h-5 me-3" /> Settings</button>
          {isOwner && <button onClick={() => setCurrentView(ViewState.DEBUG)} className={`w-full flex items-center px-3 py-2.5 rounded-lg mt-4 ${currentView === ViewState.DEBUG ? 'bg-slate-900 text-white font-bold' : 'text-slate-400 hover:bg-slate-100'}`}><Terminal className="w-5 h-5 me-3" /> Dev Console</button>}
        </div>
        <div className="p-4 border-t border-slate-200"><button onClick={() => signOut()} className="w-full flex items-center px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-600 font-bold text-xs uppercase tracking-widest"><LogOut className="w-4 h-4 me-3" /> Sign Out</button></div>
      </aside>
      
      <main className="flex-1 overflow-hidden relative flex flex-col">
        {!isOnline && <div className="bg-amber-500 text-white px-6 py-2 flex items-center justify-between text-[10px] font-black uppercase tracking-widest animate-in slide-in-from-top"><span>Connection lost. Cloud sync paused.</span></div>}

        <div className="flex-1 overflow-hidden relative">
            {currentView === ViewState.DASHBOARD && (
                <div className="h-full overflow-y-auto p-8">
                    {isResumeMissing && <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-[2rem] flex items-center justify-between shadow-sm animate-in fade-in duration-500"><div><h3 className="text-sm font-black text-amber-900 uppercase">Resume Missing</h3><p className="text-xs text-amber-700 mt-0.5">Configure in Settings to unlock AI features.</p></div><button onClick={() => setCurrentView(ViewState.SETTINGS)} className="px-6 py-3 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-black uppercase">Setup Now</button></div>}
                    <DashboardStats jobs={jobs} userProfile={userProfile!} />
                </div>
            )}
            
            {currentView === ViewState.SELECTED_JOBS && (
                <div className="h-full overflow-y-auto p-8">
                    <div className="flex justify-between items-center mb-8"><h2 className="text-2xl font-black text-slate-900 tracking-tight">Scanned Leads</h2><button onClick={() => setIsAddModalOpen(true)} className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase flex items-center gap-2 shadow-xl"><Plus className="w-4 h-4" /> Add Lead</button></div>
                    {jobs.filter(j => j.status === JobStatus.DETECTED).length === 0 ? (
                        <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400"><SearchIcon className="w-10 h-10 mb-4 opacity-20" /><p className="font-bold text-xs uppercase tracking-widest text-center">No leads found.</p></div>
                    ) : (
                        jobs.filter(j => j.status === JobStatus.DETECTED).map(j => (
                            <JobCard key={j.id} job={j} onClick={setSelectedJobId.bind(null, j.id)} isSelected={selectedJobId === j.id} isChecked={false} onToggleCheck={() => {}} onAutoApply={(e, job) => setApplyingJobId(job.id)} />
                        ))
                    )}
                </div>
            )}

            {currentView === ViewState.TRACKER && <ApplicationTracker jobs={jobs} onUpdateStatus={async (id, s) => { const job = jobs.find(j => j.id === id); if (job) handleUpdateJob({...job, status: s}); }} onDelete={async (id) => { setJobs(prev => prev.filter(j => j.id !== id)); const token = await getToken(); if (token) await deleteJobFromDb(id, token); }} onSelect={(j) => setSelectedJobId(j.id)} />}
            {currentView === ViewState.SETTINGS && <div className="h-full p-8 overflow-y-auto"><Settings userProfile={userProfile!} onUpdate={(p) => { setUserProfile(p); saveUserProfile(p, ''); }} dirHandle={null} onDirHandleChange={() => {}} jobs={jobs} showNotification={showNotification} onReset={() => signOut()} isOwner={isOwner} /></div>}
            {currentView === ViewState.EMAILS && <div className="h-full p-6"><InboxScanner onImport={(newJobs) => { setJobs(prev => [...newJobs, ...prev]); newJobs.forEach(handleUpdateJob); }} sessionAccount={sessionAccount} onConnectSession={setSessionAccount} onDisconnectSession={() => setSessionAccount(null)} showNotification={showNotification} userPreferences={userProfile?.preferences} resumeContent={userProfile?.resumeContent} /></div>}
            
            {selectedJobId && currentSelectedJob && (
                <div className="absolute inset-0 z-50 bg-slate-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
                    <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between"><div className="flex items-center gap-4"><button onClick={() => setSelectedJobId(null)} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"><X className="w-5 h-5" /></button><span className="text-sm font-bold text-slate-400">/ {currentSelectedJob.company}</span></div><span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border bg-indigo-50 text-indigo-600 border-indigo-100">{currentSelectedJob.status}</span></div>
                    <div className="flex-1 overflow-hidden"><JobDetail job={currentSelectedJob} userProfile={userProfile!} onUpdateStatus={() => {}} onUpdateJob={handleUpdateJob} onClose={() => setSelectedJobId(null)} showNotification={showNotification} /></div>
                </div>
            )}
        </div>
      </main>
    </div>
  );
};
