import React, { useCallback, useEffect, useState } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Job, JobStatus, ViewState, UserProfile, EmailAccount } from '../types';
import { DashboardStats } from './DashboardStats';
import { JobCard } from './JobCard';
import { InboxScanner } from './InboxScanner';
import { Settings } from './Settings';
import { Auth } from './Auth';
import { ApplicationTracker } from './ApplicationTracker';
import { DebugView } from './DebugView';
import { AddJobModal } from './AddJobModal';
import { NotificationToast, NotificationType } from './NotificationToast';
import { LanguageCode } from '../services/localization';
import {
  fetchJobsFromDb,
  getUserProfile,
  saveUserProfile,
  saveJobToDb,
  deleteJobFromDb,
} from '../services/dbService';
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
  AlertCircle,
} from 'lucide-react';
import { JobDetail } from './JobDetail';

export const App: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken, signOut } = useAuth();

  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [sessionAccount, setSessionAccount] = useState<EmailAccount | null>(null);
  const [notification, setNotification] = useState<{
    message: string;
    type: NotificationType;
  } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  const lang = (userProfile?.preferences?.language as LanguageCode) || 'en';
  const isRtl = lang === 'ar';

  const showNotification = useCallback((message: string, type: NotificationType) => {
    setNotification({ message, type });
  }, []);
const syncData = useCallback(async () => {
  setLoading(true);
  try {
    const token = await getToken();
    if (!token || !user) {
      setLoading(false);
      return;
    }
    
    // 🔥 FIX 1: CLEAR localStorage per user
    localStorage.removeItem('jobs');
    localStorage.removeItem('userProfile');
    
    // 🔥 FIX 2: FAIL HARD if DB fails - NO local fallback
    const profile: UserProfile = await getUserProfile(token);
    const dbJobs: Job[] = await fetchJobsFromDb(token);
    
    // Create profile if missing
    if (!profile.id) {
      const newProfile: UserProfile = {
        id: user.id,
        fullName: user.fullName,
        email: user.primaryEmailAddress?.emailAddress,
        phone: '',
        resumeContent: '',
        onboardedAt: new Date().toISOString(),
        preferences: { targetRoles: [], targetLocations: [], minSalary: 0, remoteOnly: false, language: 'en', connectedAccounts: [], plan: 'pro' }
      };
      await saveUserProfile(newProfile, token);
      setUserProfile(newProfile);
    } else {
      setUserProfile(profile);
    }
    
    setJobs(dbJobs);
    
  } catch (e) {
    console.error('🚨 CRITICAL SYNC ERROR - DB DOWN?', e);
    showNotification('Database sync failed. Please refresh.', 'error');
  } finally {
    setLoading(false);
  }
}, [user?.id, getToken, showNotification]); // 🔥 user?.id triggers rebind
  // Trigger initial sync after Clerk has loaded and user is signed in
  // Change from [isLoaded, isSignedIn] → [user?.id]
useEffect(() => {
  if (!isLoaded || !isSignedIn || !user?.id) return;
  syncData();
}, [user?.id, syncData]); // 🔥 Triggers on NEW user login


  const handleNavigate = useCallback((view: ViewState) => {
    setCurrentView(view);
    setSelectedJobId(null); // close job detail overlay on navigation
  }, []);
  

  // Listener for dashboard banner "Go to Settings" button
  useEffect(() => {
    const handler = () => handleNavigate(ViewState.SETTINGS);
    window.addEventListener('jobflow:navigate-settings', handler);
    return () => window.removeEventListener('jobflow:navigate-settings', handler);
  }, [handleNavigate]);

  const handleUpdateProfile = async (updated: UserProfile) => {
    setUserProfile(updated);
    const token = await getToken();
    if (token) await saveUserProfile(updated, token);
  };

  const handleUpdateJob = async (updated: Job) => {
    setJobs(prev => prev.map(j => (j.id === updated.id ? updated : j)));
    const token = await getToken();
    if (token) await saveJobToDb(updated, token);
  };

  const handleAddJob = async (job: Job) => {
    setJobs(prev => [job, ...prev]);
    const token = await getToken();
    if (token) await saveJobToDb(job, token);
    showNotification('Job lead added successfully!', 'success');
  };

  if (!isLoaded) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Loading Flow...
        </p>
      </div>
    );
  }

  if (!isSignedIn) {
    return <Auth onLogin={() => { }} onSwitchToSignup={() => { }} />;
  }

  if (loading && !userProfile) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50">
        <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mb-4" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-400">
          Syncing Workspace...
        </p>
      </div>
    );
  }

  const currentSelectedJob = jobs.find(j => j.id === selectedJobId);
  const isResumeMissing =
    !userProfile?.resumeContent || userProfile.resumeContent.length < 50;

  return (
    <div
      className="flex h-screen bg-slate-50 overflow-hidden"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      {notification && (
        <NotificationToast
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <AddJobModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onAdd={handleAddJob}
      />

      <aside className="w-64 bg-white border-e border-slate-200 flex flex-col shrink-0 z-20">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-100">
              <Briefcase className="text-white w-5 h-5" />
            </div>
            <span className="font-bold text-xl text-slate-900 tracking-tight">
              JobFlow
            </span>
          </div>
          <UserButton afterSignOutUrl="/" />
        </div>
        <div className="flex-1 px-4 py-2 overflow-y-auto custom-scrollbar">
          <button
            onClick={() => handleNavigate(ViewState.DASHBOARD)}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.DASHBOARD
                ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <LayoutDashboard className="w-5 h-5 me-3" /> Dashboard
          </button>
          <button
            onClick={() => handleNavigate(ViewState.SELECTED_JOBS)}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SELECTED_JOBS
                ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <SearchIcon className="w-5 h-5 me-3" /> Scanned Jobs
          </button>
          <button
            onClick={() => handleNavigate(ViewState.TRACKER)}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.TRACKER
                ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <List className="w-5 h-5 me-3" /> Applications
          </button>
          <button
            onClick={() => handleNavigate(ViewState.EMAILS)}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.EMAILS
                ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <Mail className="w-5 h-5 me-3" /> Inbox Scanner
          </button>
          <div className="my-2 border-t border-slate-100" />
          <button
            onClick={() => handleNavigate(ViewState.SETTINGS)}
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SETTINGS
                ? 'bg-indigo-50 text-indigo-700 font-bold shadow-sm'
                : 'text-slate-600 hover:bg-slate-50'
              }`}
          >
            <SettingsIcon className="w-5 h-5 me-3" /> Settings
          </button>
        </div>
        <div className="p-4 border-t border-slate-200 mt-auto">
         <button
  onClick={async () => {
    localStorage.clear();  // 🔥 LOCATION: Clears ALL on logout
    await signOut();
  }}
  className="w-full flex items-center px-3 py-2.5 rounded-lg text-slate-400 hover:text-red-600 transition-colors font-bold text-xs uppercase tracking-widest"
>
  <LogOut className="w-4 h-4 me-3" /> Sign Out
</button>

        </div>
      </aside>

      <main className="flex-1 overflow-hidden relative">
        {currentView === ViewState.DASHBOARD && (
          <div className="h-full overflow-y-auto p-8">
            {isResumeMissing && (
              <div className="mb-8 p-6 bg-amber-50 border border-amber-200 rounded-[2rem] flex items-center justify-between shadow-sm animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-amber-100 rounded-2xl flex items-center justify-center text-amber-600 shrink-0">
                    <AlertCircle className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-amber-900 uppercase tracking-tight">
                      Resume Not Configured
                    </h3>
                    <p className="text-xs text-amber-700 mt-0.5">
                      Please upload your master resume in Settings to enable AI
                      document generation.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => handleNavigate(ViewState.SETTINGS)}
                  className="px-6 py-3 bg-white border border-amber-200 text-amber-700 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-amber-100 transition-all shadow-sm"
                >
                  Configure Now
                </button>
              </div>
            )}
            <DashboardStats jobs={jobs} userProfile={userProfile!} />
          </div>
        )}

        {currentView === ViewState.SELECTED_JOBS && (
          <div className="h-full overflow-y-auto p-8">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                Scanned Leads
              </h2>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
              >
                <Plus className="w-4 h-4" /> Add Manual Lead
              </button>
            </div>
            {jobs.filter(j => j.status === JobStatus.DETECTED).length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center border-2 border-dashed border-slate-200 rounded-[2rem] text-slate-400">
                <SearchIcon className="w-10 h-10 mb-4 opacity-20" />
                <p className="font-bold text-xs uppercase tracking-widest text-center">
                  No jobs found in scanner.
                  <br />
                  Run the Inbox Scanner or add manually.
                </p>
              </div>
            ) : (
              jobs
                .filter(j => j.status === JobStatus.DETECTED)
                .map(j => (
                  <JobCard
                    key={j.id}
                    job={j}
                    onClick={job => setSelectedJobId(job.id)}
                    isSelected={selectedJobId === j.id}
                    isChecked={false}
                    onToggleCheck={() => { }}
                    onAutoApply={() => { }}
                  />
                ))
            )}
          </div>
        )}

        {currentView === ViewState.TRACKER && (
          <ApplicationTracker
            jobs={jobs}
            onUpdateStatus={async (id, s) => {
              const job = jobs.find(j => j.id === id);
              if (job) handleUpdateJob({ ...job, status: s });
            }}
            onDelete={async id => {
              setJobs(prev => prev.filter(j => j.id !== id));
              const token = await getToken();
              if (token) await deleteJobFromDb(id, token);
            }}
            onSelect={j => setSelectedJobId(j.id)}
          />
        )}

        {currentView === ViewState.SETTINGS && (
          <div className="h-full p-8 overflow-y-auto">
            <Settings
              userProfile={userProfile!}
              onUpdate={handleUpdateProfile}
              dirHandle={null}
              onDirHandleChange={() => { }}
              jobs={jobs}
              showNotification={showNotification}
              onReset={() => signOut()}
            />
          </div>
        )}

        {currentView === ViewState.EMAILS && (
          <div className="h-full p-6">
            <InboxScanner
              onImport={async newJobs => {
                setJobs(prev => [...newJobs, ...prev]);
                const token = await getToken();
                if (token) for (const j of newJobs) await saveJobToDb(j, token);
              }}
              sessionAccount={sessionAccount}
              onConnectSession={setSessionAccount}
              onDisconnectSession={() => setSessionAccount(null)}
              showNotification={showNotification}
              userPreferences={userProfile?.preferences}
            />
          </div>
        )}

        {selectedJobId && currentSelectedJob && (
          <div className="absolute inset-0 z-50 bg-slate-50 overflow-hidden flex flex-col animate-in slide-in-from-right duration-300 shadow-2xl">
            <div className="p-4 bg-white border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setSelectedJobId(null)}
                  className="p-2 hover:bg-slate-100 rounded-lg text-slate-500"
                >
                  <X className="w-5 h-5" />
                </button>
                <span className="text-sm font-bold text-slate-400">
                  / Viewing {currentSelectedJob.company}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${currentSelectedJob.status === JobStatus.DETECTED
                      ? 'bg-blue-50 text-blue-600 border-blue-100'
                      : 'bg-indigo-50 text-indigo-600 border-indigo-100'
                    }`}
                >
                  {currentSelectedJob.status}
                </span>
              </div>
            </div>
            <div className="flex-1 overflow-hidden">
              <JobDetail
                job={currentSelectedJob}
                userProfile={userProfile!}
                onUpdateStatus={() => { }}
                onUpdateJob={handleUpdateJob}
                onClose={() => setSelectedJobId(null)}
                showNotification={showNotification}
              />
            </div>
          </div>
        )}
      </main>
    </div>
  );
};
