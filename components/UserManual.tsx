
import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Book, Mail, Zap, HelpCircle, Share2, Copy, LayoutDashboard, Briefcase, Settings as SettingsIcon, CreditCard, LogOut, CheckCircle, ShieldCheck, Key, Lock, MousePointerClick, UserPlus } from 'lucide-react';

interface UserManualProps {
  userProfile: UserProfile;
}

export const UserManual: React.FC<UserManualProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'share'>('guide');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const activeUrl = userProfile.preferences.shareUrl || window.location.origin;

  const ads = [
      {
          id: 0,
          platform: 'Facebook / LinkedIn',
          content: `🚀 Stop applying manually. Let AI do the work.\n\nMeet JobFlow (Beta) – The intelligent agent that scans your inbox for leads, rewrites your resume for every job, and applies for you.\n\n✅ Auto-detects jobs from email\n✅ AI-rewrites resume for every single application\n✅ 100% Private & Secure\n\nTry the Beta: ${activeUrl}\n#JobSearch #AI #CareerHacks`
      },
      {
          id: 1,
          platform: 'WhatsApp / Message',
          content: `Hey! Check out this new app I'm using called JobFlow. It uses AI to automatically write resumes and apply to jobs found in my email. It's in Beta right now but saves so much time. Link: ${activeUrl}`
      }
  ];

  const handleCopy = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
        {/* Sidebar */}
        <div className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
            <div className="p-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                    <Book className="w-5 h-5 mr-2 text-indigo-600" /> Help Center
                </h2>
            </div>
            <div className="px-3 space-y-1">
                <button 
                    onClick={() => setActiveTab('guide')}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'guide' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <HelpCircle className="w-4 h-4 mr-3" /> App Walkthrough
                </button>
                <button 
                    onClick={() => setActiveTab('share')}
                    className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activeTab === 'share' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-600 hover:bg-slate-50'}`}
                >
                    <Share2 className="w-4 h-4 mr-3" /> Share Beta
                </button>
            </div>
            <div className="mt-auto p-4 border-t border-slate-100">
                <div className="bg-slate-100 rounded p-3 text-xs text-slate-500">
                    <p className="font-bold text-slate-700">JobFlow AI Beta</p>
                    <p>Version 1.4.0</p>
                    <p className="mt-1">Status: Stable</p>
                </div>
            </div>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            <div className="max-w-4xl mx-auto">
                {activeTab === 'guide' ? (
                    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 pb-12">
                        
                         {/* Intro Hero */}
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-indigo-100 relative overflow-hidden">
                            <div className="absolute top-0 right-0 bg-indigo-50 w-64 h-64 rounded-full -mr-32 -mt-32 opacity-50"></div>
                            <h1 className="text-3xl font-bold text-slate-900 mb-2 relative z-10">Application Guide</h1>
                            <p className="text-slate-600 relative z-10 max-w-2xl leading-relaxed">
                                Welcome to JobFlow AI. This guide provides a complete, step-by-step walkthrough of the application, starting from your first login to applying for your dream job.
                            </p>
                        </div>

                        {/* 1. Login & Onboarding */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center">
                                 <div className="p-2 bg-slate-200 rounded-lg text-slate-600 mr-3">
                                     <UserPlus className="w-5 h-5" />
                                 </div>
                                 <h2 className="text-lg font-bold text-slate-800">1. Getting Started: Login & Onboarding</h2>
                             </div>
                             <div className="p-6">
                                 <h3 className="font-bold text-slate-900 mb-3">Secure Account Creation</h3>
                                 <p className="text-sm text-slate-600 mb-4">
                                     When you first open JobFlow AI, you will be asked to create an account.
                                 </p>
                                 <ol className="list-decimal list-inside space-y-3 text-sm text-slate-700 bg-slate-50 p-4 rounded-lg border border-slate-100">
                                     <li><strong>Sign Up:</strong> Enter your Name, Email, and Password. Note that your account is locked to your browser's secure storage.</li>
                                     <li><strong>Preferences:</strong> Tell us what you are looking for (e.g., "React Developer", "Remote"). This filters out irrelevant emails later.</li>
                                     <li><strong>Master Resume:</strong> Upload your base resume (.txt format). The AI uses this as a source of truth to write tailored versions for each job.</li>
                                 </ol>
                             </div>
                        </section>

                        {/* 2. Dashboard */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center">
                                 <div className="p-2 bg-blue-100 rounded-lg text-blue-600 mr-3">
                                     <LayoutDashboard className="w-5 h-5" />
                                 </div>
                                 <h2 className="text-lg font-bold text-slate-800">2. Dashboard Overview</h2>
                             </div>
                             <div className="p-6">
                                 <p className="text-sm text-slate-600 mb-4">
                                     Once logged in, you land on the Dashboard. This is your command center.
                                 </p>
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                     <div className="border border-slate-100 rounded-lg p-3">
                                         <span className="font-bold text-slate-800 text-sm">Stats Cards</span>
                                         <p className="text-xs text-slate-500 mt-1">Quickly see how many jobs were detected, applied to, or require action.</p>
                                     </div>
                                     <div className="border border-slate-100 rounded-lg p-3">
                                         <span className="font-bold text-slate-800 text-sm">Velocity Chart</span>
                                         <p className="text-xs text-slate-500 mt-1">Track your job search momentum over the last 7 days.</p>
                                     </div>
                                 </div>
                             </div>
                        </section>

                        {/* 3. Connecting Email (Security Explanation) */}
                        <section className="bg-white rounded-2xl border border-indigo-200 shadow-md overflow-hidden relative">
                             <div className="absolute top-0 right-0 w-20 h-20 bg-indigo-50 rounded-bl-full z-0"></div>
                             <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex items-center relative z-10">
                                 <div className="p-2 bg-white rounded-lg text-indigo-600 mr-3 border border-indigo-100">
                                     <ShieldCheck className="w-5 h-5" />
                                 </div>
                                 <h2 className="text-lg font-bold text-indigo-900">3. Connecting Your Email (Important)</h2>
                             </div>
                             <div className="p-6 relative z-10">
                                 <h3 className="font-bold text-slate-900 mb-3 flex items-center">
                                     <Lock className="w-4 h-4 mr-2 text-indigo-600" />
                                     Why we ask for a Token, not a Password
                                 </h3>
                                 <p className="text-sm text-slate-700 leading-relaxed mb-4">
                                     To scan your inbox for jobs, we need permission to read your emails. However, <strong>we do not want your password</strong>. Your security is paramount.
                                 </p>
                                 
                                 <div className="bg-white p-4 rounded-xl border border-indigo-100 shadow-sm mb-4">
                                     <h4 className="text-sm font-bold text-indigo-700 mb-2">How it works:</h4>
                                     <ul className="space-y-2 text-sm text-slate-600">
                                         <li className="flex items-start">
                                             <Key className="w-4 h-4 mr-2 text-slate-400 mt-0.5 shrink-0" />
                                             <span><strong>Provider Issued:</strong> You get an "Access Token" directly from Google/Microsoft.</span>
                                         </li>
                                         <li className="flex items-start">
                                             <Zap className="w-4 h-4 mr-2 text-slate-400 mt-0.5 shrink-0" />
                                             <span><strong>Temporary:</strong> Tokens expire quickly (usually 1 hour). Even if someone stole it, it would be useless shortly after.</span>
                                         </li>
                                         <li className="flex items-start">
                                             <ShieldCheck className="w-4 h-4 mr-2 text-slate-400 mt-0.5 shrink-0" />
                                             <span><strong>Limited Scope:</strong> The token only allows us to <em>read</em> email headers to find jobs. We cannot change your password or settings.</span>
                                         </li>
                                     </ul>
                                 </div>
                                 <p className="text-xs text-slate-500 italic">
                                     * Navigate to <strong>Settings > Connected Accounts</strong> or <strong>Inbox Scanner</strong> to start the secure connection wizard.
                                 </p>
                             </div>
                        </section>

                        {/* 4. Inbox Scanner */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center">
                                 <div className="p-2 bg-purple-100 rounded-lg text-purple-600 mr-3">
                                     <Mail className="w-5 h-5" />
                                 </div>
                                 <h2 className="text-lg font-bold text-slate-800">4. Scanning & Importing</h2>
                             </div>
                             <div className="p-6">
                                 <ol className="space-y-4 text-sm text-slate-700">
                                     <li className="flex items-start">
                                         <div className="bg-slate-100 font-bold px-2 rounded mr-3">1</div>
                                         <p>Go to the <strong>Inbox Scanner</strong> tab.</p>
                                     </li>
                                     <li className="flex items-start">
                                         <div className="bg-slate-100 font-bold px-2 rounded mr-3">2</div>
                                         <p>Select a date range (e.g., "Last 3 Days").</p>
                                     </li>
                                     <li className="flex items-start">
                                         <div className="bg-slate-100 font-bold px-2 rounded mr-3">3</div>
                                         <p>Click <strong>Refresh Scan</strong>. The AI will read your emails, find job keywords (like "Hiring"), and import them to your list automatically.</p>
                                     </li>
                                 </ol>
                             </div>
                        </section>

                        {/* 5. Selected Jobs & AI */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center">
                                 <div className="p-2 bg-indigo-100 rounded-lg text-indigo-600 mr-3">
                                     <Briefcase className="w-5 h-5" />
                                 </div>
                                 <h2 className="text-lg font-bold text-slate-800">5. Applying with AI</h2>
                             </div>
                             <div className="p-6">
                                 <p className="text-sm text-slate-600 mb-4">
                                     Navigate to <strong>Selected Jobs</strong> to see everything found in your inbox.
                                 </p>
                                 <div className="space-y-4">
                                     <div className="flex flex-col md:flex-row gap-4">
                                          <div className="flex-1 bg-slate-50 p-4 rounded-lg">
                                              <h4 className="font-bold text-slate-800 text-sm mb-2">View Details</h4>
                                              <p className="text-xs text-slate-600">Click any job card to see the description, salary, and requirements on the right panel.</p>
                                          </div>
                                          <div className="flex-1 bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                                              <h4 className="font-bold text-indigo-900 text-sm mb-2 flex items-center"><MousePointerClick className="w-3 h-3 mr-1"/> Auto-Apply</h4>
                                              <p className="text-xs text-indigo-800">
                                                  Click <strong>Write & Apply</strong>. The AI will:
                                                  <br/>1. Read the job description.
                                                  <br/>2. Rewrite your resume to match it.
                                                  <br/>3. Generate a cover letter.
                                                  <br/>4. Launch the application portal.
                                              </p>
                                          </div>
                                     </div>
                                 </div>
                             </div>
                        </section>

                         {/* 6. Settings */}
                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center">
                                 <div className="p-2 bg-slate-200 rounded-lg text-slate-600 mr-3">
                                     <SettingsIcon className="w-5 h-5" />
                                 </div>
                                 <h2 className="text-lg font-bold text-slate-800">6. Settings & Data</h2>
                             </div>
                             <div className="p-6">
                                 <p className="text-sm text-slate-600">
                                     Use the Settings tab to update your <strong>Target Roles</strong> (to refine search results), update your <strong>Master Resume</strong>, or change the application language.
                                 </p>
                             </div>
                        </section>

                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4">
                        <div className="text-center mb-8">
                             <h1 className="text-2xl font-bold text-slate-900">Spread the Word</h1>
                             <p className="text-slate-500 mt-2">Help us grow by sharing the beta with your network.</p>
                             <p className="text-xs text-indigo-600 mt-1 font-medium bg-indigo-50 inline-block px-3 py-1 rounded-full">
                                 Active Link: {activeUrl}
                             </p>
                        </div>
                        
                        <div className="space-y-6">
                             {ads.map((ad, index) => (
                                 <div key={ad.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm relative group">
                                     <div className="flex justify-between items-center mb-3">
                                         <h3 className="font-bold text-slate-800">{ad.platform}</h3>
                                         <button 
                                             onClick={() => handleCopy(ad.content, index)}
                                             className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
                                         >
                                             {copiedIndex === index ? <CheckCircle className="w-4 h-4 mr-1"/> : <Copy className="w-4 h-4 mr-1"/>}
                                             {copiedIndex === index ? 'Copied!' : 'Copy Text'}
                                         </button>
                                     </div>
                                     <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                         <p className="text-sm text-slate-600 whitespace-pre-wrap font-medium">{ad.content}</p>
                                     </div>
                                 </div>
                             ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
