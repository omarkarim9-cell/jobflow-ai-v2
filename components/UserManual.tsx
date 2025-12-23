import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
    Book, 
    Mail, 
    Zap, 
    HelpCircle, 
    Share2, 
    Copy, 
    LayoutDashboard, 
    Briefcase, 
    Settings as SettingsIcon, 
    CheckCircle, 
    ShieldCheck, 
    Key, 
    Lock, 
    MousePointerClick, 
    UserPlus,
    Info,
    ExternalLink,
    AlertCircle,
    FileText,
    Sparkles,
    Cloud
} from 'lucide-react';

interface UserManualProps {
  userProfile: UserProfile;
}

export const UserManual: React.FC<UserManualProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'walkthrough' | 'gmail' | 'docs' | 'share'>('walkthrough');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const activeUrl = userProfile.preferences.shareUrl || window.location.origin;

  const ads = [
      {
          id: 0,
          platform: 'Social Media',
          content: `Stop applying manually. Let AI do the work. Meet JobFlow - The intelligent agent that scans your inbox, rewrites your resume, and applies for you. Try the Beta: ${activeUrl}`
      },
      {
          id: 1,
          platform: 'Direct Message',
          content: `Hey! Check out this new app I'm using called JobFlow. It uses AI to automatically write resumes and apply to jobs found in my email. Link: ${activeUrl}`
      }
  ];

  const handleCopy = (text: string, index: number) => {
      navigator.clipboard.writeText(text);
      setCopiedIndex(index);
      setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto shrink-0">
            <div className="p-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                    <Book className="w-5 h-5 mr-2 text-indigo-600" /> Help Center
                </h2>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Platform Manual</p>
            </div>
            <nav className="px-3 space-y-1 flex-1">
                <button 
                    onClick={() => setActiveTab('walkthrough')}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'walkthrough' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <LayoutDashboard className="w-4 h-4 mr-3" /> App Walkthrough
                </button>
                <button 
                    onClick={() => setActiveTab('gmail')}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'gmail' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Mail className="w-4 h-4 mr-3" /> Gmail Connection Guide
                </button>
                <button 
                    onClick={() => setActiveTab('docs')}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'docs' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <FileText className="w-4 h-4 mr-3" /> AI Documents
                </button>
                <button 
                    onClick={() => setActiveTab('share')}
                    className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'share' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Share2 className="w-4 h-4 mr-3" /> Share Platform
                </button>
            </nav>
            <div className="p-6 border-t border-slate-100">
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
                    <p className="text-[10px] font-bold text-emerald-600 uppercase flex items-center gap-1.5">
                        <CheckCircle className="w-3 h-3" /> System Live
                    </p>
                </div>
            </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-12">
            <div className="max-w-3xl mx-auto">
                
                {/* 1. WALKTHROUGH TAB */}
                {activeTab === 'walkthrough' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">App Walkthrough</h1>
                            <p className="text-slate-500 mt-2 leading-relaxed">Everything you need to know about navigating and utilizing the JobFlow AI ecosystem.</p>
                            
                            <div className="mt-12 space-y-12">
                                <div className="flex gap-6">
                                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-indigo-100">
                                        <UserPlus className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">1. Complete Your Profile</h3>
                                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Start in the <strong>Settings</strong> tab. Upload your "Master Resume" in .txt format. This document is the source material for all AI-tailored content.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6">
                                    <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-purple-100">
                                        <SearchIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">2. Scan Your Inbox</h3>
                                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Navigate to <strong>Inbox Scanner</strong>. Connect your Gmail account using our secure token guide. Click "Scan Now" to extract IT-specific job leads found in your emails.</p>
                                    </div>
                                </div>

                                <div className="flex gap-6">
                                    <div className="w-12 h-12 bg-emerald-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-100">
                                        <ListIcon className="w-6 h-6" />
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-slate-800">3. Manage Your Pipeline</h3>
                                        <p className="text-sm text-slate-500 mt-2 leading-relaxed">Saved jobs appear in <strong>Applications</strong>. Use this board to track your progress from "Saved" to "Interview" and "Offer".</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 2. GMAIL CONNECTION GUIDE */}
                {activeTab === 'gmail' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gmail Connection Guide</h1>
                            <p className="text-slate-500 mt-2 leading-relaxed">Follow these steps carefully to generate a temporary secure access token for the Inbox Scanner.</p>

                            <div className="mt-10 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex gap-4">
                                <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                                <div>
                                    <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Crucial Note</p>
                                    <p className="text-xs text-amber-700 mt-1 leading-relaxed">The Google OAuth Playground interface can be confusing. When you click <strong>"Exchange authorization code for tokens"</strong>, the playground will automatically jump to "Step 3". If you lose your place, look for the "Access Token" field or refer to the center column to find the long string starting with <strong>ya29...</strong></p>
                                </div>
                            </div>

                            <div className="mt-12 space-y-10">
                                <div className="relative pl-10 border-l-2 border-slate-100">
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white ring-1 ring-indigo-600"></div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Step 1: Authorization</h3>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">Open the <a href="https://developers.google.com/oauthplayground" target="_blank" className="text-indigo-600 font-bold underline">Google OAuth Playground</a>. In Step 1 (left side), paste this scope into the input box and click Authorize APIs:</p>
                                    <code className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] mt-3 font-mono text-slate-600 truncate">https://www.googleapis.com/auth/gmail.readonly</code>
                                </div>

                                <div className="relative pl-10 border-l-2 border-slate-100">
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-4 border-white"></div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Step 2: Generate Token</h3>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">After signing into your Google account, you will see a blue button: <strong>"Exchange authorization code for tokens"</strong>. Click it.</p>
                                </div>

                                <div className="relative pl-10 border-l-2 border-slate-100">
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-4 border-white"></div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Step 3: Copy Access Token</h3>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">The page will refresh/scroll. Locate the <strong>Access Token</strong> field (starts with <strong>ya29</strong>). Copy this long string. <strong>If the page jumps to Step 3, just scroll down to find the Access Token box again.</strong></p>
                                </div>

                                <div className="relative pl-10">
                                    <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-emerald-500 border-4 border-white ring-1 ring-emerald-500"></div>
                                    <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Step 4: Paste in JobFlow</h3>
                                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">Go back to the Inbox Scanner, click "Connect Email", and paste the token into the text area. Click <strong>Start Session</strong>.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* 3. AI DOCUMENTS TAB */}
                {activeTab === 'docs' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">AI Document Generation</h1>
                            <p className="text-slate-500 mt-2 leading-relaxed">Learn how our AI engine crafts high-impact, personalized job assets.</p>

                            <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h4 className="text-sm font-black text-indigo-600 uppercase tracking-widest mb-3">Tailored Resume</h4>
                                    <p className="text-xs text-slate-600 leading-relaxed">Our AI analyzes the job description keywords and re-phrases your professional summary and experience bullet points to match the target role perfectly.</p>
                                </div>
                                <div className="p-6 bg-slate-50 rounded-3xl border border-slate-100">
                                    <h4 className="text-sm font-black text-purple-600 uppercase tracking-widest mb-3">Cover Letter</h4>
                                    <p className="text-xs text-slate-600 leading-relaxed">A persuasive 3-paragraph letter is drafted for every job, highlighting your background and specifically addressing the company's requirements.</p>
                                </div>
                            </div>

                            <div className="mt-10 space-y-4">
                                <h3 className="text-lg font-black text-slate-800">How to Generate</h3>
                                <p className="text-sm text-slate-500 leading-relaxed">Open any job from your list and click the large button labeled <strong>"Generated Resume and Letter"</strong>. The AI will process for 2-3 seconds and switch you to the preview tab where you can download or edit the content.</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* 4. SHARE TAB */}
                {activeTab === 'share' && (
                    <div className="space-y-8 animate-in fade-in duration-500">
                        <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
                            <h1 className="text-3xl font-black text-slate-900 tracking-tight">Share the Platform</h1>
                            <p className="text-slate-500 mt-2 leading-relaxed">Help your colleagues automate their job search by sharing your unique beta link.</p>
                            
                            <div className="mt-10 space-y-6">
                                {ads.map((ad, index) => (
                                    <div key={ad.id} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 group">
                                        <div className="flex justify-between items-center mb-4">
                                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{ad.platform} Copy</h3>
                                            <button 
                                                onClick={() => handleCopy(ad.content, index)}
                                                className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-tight hover:bg-indigo-50 hover:text-indigo-600 transition-all shadow-sm"
                                            >
                                                {copiedIndex === index ? 'Copied!' : 'Copy Text'}
                                            </button>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-xs text-slate-600 leading-relaxed italic">
                                            "{ad.content}"
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    </div>
  );
};

// Internal utility icons
const SearchIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
);

const ListIcon = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" x2="21" y1="6" y2="6"/><line x1="8" x2="21" y1="12" y2="12"/><line x1="8" x2="21" y1="18" y2="18"/><line x1="3" x2="3.01" y1="6" y2="6"/><line x1="3" x2="3.01" y1="12" y2="12"/><line x1="3" x2="3.01" y1="18" y2="18"/></svg>
);
