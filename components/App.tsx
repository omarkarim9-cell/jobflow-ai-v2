import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Job, JobStatus, ViewState, UserProfile, EmailAccount } from '../types';
import { DashboardStats } from './DashboardStats';
import { JobCard } from './JobCard';
import { InboxScanner } from './InboxScanner';
import { Settings } from './Settings';
import { UserManual } from './UserManual';
import { Subscription } from './Subscription';
import { Support } from './Support';
import { AddJobModal } from './AddJobModal';
import { Auth } from './Auth';
import { ApplicationTracker } from './ApplicationTracker';
import { NotificationToast, NotificationType } from './NotificationToast';
import { createVirtualDirectory } from '../services/fileSystemService';
import { LanguageCode } from '../services/localization';
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
  Search as SearchIcon,
  Loader2,
  List,
  LogOut,
  CreditCard,
  BookOpen,
  LifeBuoy,
  AlertCircle,
  ArrowRight
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
          }
          
          setUserProfile(profile);
          
          const dbJobs = await fetchJobsFromDb(token).catch(() => []);
          setJobs(dbJobs);
          
          const storedPath = localStorage.getItem('jobflow_project_path');
          if (storedPath) setDirHandle(createVirtualDirectory(storedPath));
          
          setCurrentView(ViewState.DASHBOARD);
      } catch (e) {
          console.error("Sync error:", e);
          showNotification("Cloud sync failed.", "error");
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
            await saveUserProfile(updatedProfile, token);
            showNotification("Profile updated.", "success");
        }
    } catch (error) {
        showNotification("Local save successful.", "error");
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

  const handleAddJobs = (newJobs: Job[]) => {
    setJobs(prev => {
        const existingUrls = new Set(prev.map(j => j.applicationUrl).filter(Boolean));
        const unique = newJobs.filter(j => !j.applicationUrl || !existingUrls.has(j.applicationUrl));
        return [...unique, ...prev];
    });
    
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
          <button 
            onClick={() => setCurrentView(ViewState.DASHBOARD)} 
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.DASHBOARD ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <LayoutDashboard className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Dashboard</span>
          </button>
          
          <button 
            onClick={() => setCurrentView(ViewState.SELECTED_JOBS)} 
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SELECTED_JOBS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <SearchIcon className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Scanned Jobs</span>
            {detectedJobsCount > 0 && <span className="bg-amber-100 text-amber-700 text-[10px] font-black px-2 py-0.5 rounded-full">{detectedJobsCount}</span>}
          </button>

          <button 
            onClick={() => setCurrentView(ViewState.TRACKER)} 
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.TRACKER ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
            <List className="w-5 h-5 me-3" />
            <span className="flex-1 text-start text-sm">Applications</span>
            {trackedJobsCount > 0 && <span className="bg-indigo-100 text-indigo-700 text-[10px] font-black px-2 py-0.5 rounded-full">{trackedJobsCount}</span>}
          </button>
          
          <button 
            onClick={() => setCurrentView(ViewState.EMAILS)} 
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.EMAILS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
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
          
          <button 
            onClick={() => setCurrentView(ViewState.SETTINGS)} 
            className={`w-full flex items-center px-3 py-2.5 rounded-lg mb-1 transition-all ${currentView === ViewState.SETTINGS ? 'bg-indigo-50 text-indigo-700 font-bold' : 'text-slate-600 hover:bg-slate-100'}`}
          >
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
                    <p className="text-xs text-indigo-100">AI needs your resume to customize applications.</p>
                  </div>
                </div>
                <button 
                  onClick={() => setCurrentView(ViewState.SETTINGS)}
                  className="bg-white text-indigo-600 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-colors flex items-center gap-2"
                >
                  Setup Profile <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
            <DashboardStats jobs={jobs} userProfile={userProfile!} />
          </div>
        )}
        
        {currentView === ViewState.SELECTED_JOBS && (
            <div className="h-full overflow-y-auto p-8 animate-in fade-in">
                <div className="mb-6"><h1 className="text-2xl font-black text-slate-900 tracking-tight">Scanned Jobs</h1></div>
                {jobs.filter(j => j.status === JobStatus.DETECTED).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {jobs.filter(j => j.status === JobStatus.DETECTED).map(job => (
                            <JobCard key={job.id} job={job} onClick={(j) => setSelectedJobId(j.id)} isSelected={selectedJobId === job.id} isChecked={checkedJobIds.has(job.id)} onToggleCheck={handleToggleCheck} onAutoApply={() => {}} />
                        ))}
                    </div>
                ) : (
                    <div className="h-96 flex flex-col items-center justify-center text-slate-400 bg-white rounded-[2rem] border border-dashed border-slate-200">
                        <Mail className="w-16 h-16 mb-4 opacity-10" /><p className="font-bold text-slate-600">No scanned jobs.</p>
                    </div>
                )}
            </div>
        )}

        {currentView === ViewState.TRACKER && <ApplicationTracker jobs={jobs} onUpdateStatus={handleJobUpdate} onDelete={handleDeleteJob} onSelect={(j) => { setSelectedJobId(j.id); setCurrentView(ViewState.SELECTED_JOBS); }} />}
        {currentView === ViewState.SETTINGS && <div className="h-full p-8 overflow-y-auto animate-in fade-in"><Settings userProfile={userProfile!} onUpdate={handleUpdateProfile} dirHandle={dirHandle} onDirHandleChange={setDirHandle} jobs={jobs} showNotification={showNotification} onReset={() => signOut()} /></div>}
        {currentView === ViewState.EMAILS && <div className="h-full p-6 animate-in fade-in"><InboxScanner onImport={handleAddJobs} sessionAccount={sessionAccount} onConnectSession={setSessionAccount} onDisconnectSession={() => setSessionAccount(null)} showNotification={showNotification} userPreferences={userProfile?.preferences} /></div>}
        {currentView === ViewState.SUBSCRIPTION && <Subscription userProfile={userProfile!} onUpdateProfile={handleUpdateProfile} showNotification={showNotification} />}
        {currentView === ViewState.SUPPORT && <Support />}
        {currentView === ViewState.MANUAL && <UserManual userProfile={userProfile!} />}
      </main>

      <AddJobModal isOpen={isAddJobModalOpen} onClose={() => setIsAddJobModalOpen(false)} onAdd={handleAddManualJob} />
    </div>
  );
};