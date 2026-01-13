import React, { useState } from 'react';
import { UserProfile } from '../types';
import { 
    Book, 
    Mail, 
    Share2, 
    LayoutDashboard, 
    CheckCircle, 
    AlertCircle,
    FileText,
    Sparkles,
    Search as SearchIcon,
    List as ListIcon,
    UserPlus
} from 'lucide-react';

interface UserManualProps {
  userProfile: UserProfile;
}

export const UserManual: React.FC<UserManualProps> = ({ userProfile }) => {
  const [activeTab, setActiveTab] = useState<'walkthrough' | 'gmail' | 'docs' | 'share'>('walkthrough');

  return (
    <div className="flex h-full bg-slate-50 overflow-hidden">
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
            <div className="p-6">
                <h2 className="text-lg font-bold text-slate-900 flex items-center">
                    <Book className="w-5 h-5 mr-2 text-indigo-600" /> Help Center
                </h2>
                <p className="text-[10px] font-black uppercase text-slate-400 mt-1 tracking-widest">Platform Manual</p>
            </div>
            <nav className="px-3 space-y-1 flex-1">
                <button onClick={() => setActiveTab('walkthrough')} className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'walkthrough' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <LayoutDashboard className="w-4 h-4 mr-3" /> App Walkthrough
                </button>
                <button onClick={() => setActiveTab('gmail')} className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'gmail' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <Mail className="w-4 h-4 mr-3" /> Gmail Connection
                </button>
                <button onClick={() => setActiveTab('docs')} className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'docs' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <FileText className="w-4 h-4 mr-3" /> AI Documents
                </button>
                <button onClick={() => setActiveTab('share')} className={`w-full flex items-center px-4 py-3 rounded-xl text-xs font-bold transition-all ${activeTab === 'share' ? 'bg-indigo-50 text-indigo-700' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <Share2 className="w-4 h-4 mr-3" /> Share Platform
                </button>
            </nav>
        </aside>

        <div className="flex-1 overflow-y-auto bg-slate-50/30 p-12">
            <div className="max-w-3xl mx-auto">
                {activeTab === 'walkthrough' && (
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200 animate-in fade-in duration-500">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">App Walkthrough</h1>
                        <p className="text-slate-500 mt-2">Master the JobFlow ecosystem in minutes.</p>
                        
                        <div className="mt-12 space-y-10">
                            <div className="flex gap-6">
                                <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                                    <UserPlus className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">1. Complete Your Profile</h3>
                                    <p className="text-sm text-slate-500 mt-2">Upload your Master Resume in .txt format. This is the source truth for all AI documents.</p>
                                </div>
                            </div>
                            <div className="flex gap-6">
                                <div className="w-12 h-12 bg-purple-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg">
                                    <SearchIcon className="w-6 h-6" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-black text-slate-800">2. Scan Your Inbox</h3>
                                    <p className="text-sm text-slate-500 mt-2">Connect Gmail via the guide. Use the scanner to pull high-quality leads into your list.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'gmail' && (
                    <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200 animate-in fade-in duration-500">
                        <h1 className="text-3xl font-black text-slate-900 tracking-tight">Gmail Connection Guide</h1>
                        <p className="text-slate-500 mt-2 leading-relaxed">Securely link your inbox using a temporary Access Token.</p>

                        <div className="mt-10 p-6 bg-amber-50 border border-amber-200 rounded-2xl flex gap-4">
                            <AlertCircle className="w-6 h-6 text-amber-600 shrink-0" />
                            <div>
                                <p className="text-xs font-black text-amber-800 uppercase tracking-widest">Crucial: Step 3 Confusion</p>
                                <p className="text-xs text-amber-700 mt-1 leading-relaxed">
                                    When you click <strong>"Exchange authorization code for tokens"</strong>, the page often jumps automatically to Step 3. 
                                    <strong>DO NOT WORRY.</strong> Simply scroll back up slightly or find the "Access Token" field in the middle column. 
                                    Copy the long string starting with <strong>ya29...</strong> and paste it back into JobFlow.
                                </p>
                            </div>
                        </div>

                        <div className="mt-12 space-y-10">
                            <div className="relative pl-10 border-l-2 border-slate-100">
                                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-indigo-600 border-4 border-white ring-1 ring-indigo-600"></div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Step 1: Scopes</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">In <a href="https://developers.google.com/oauthplayground" target="_blank" className="text-indigo-600 font-bold underline">Google OAuth Playground</a>, paste this scope in Step 1:</p>
                                <code className="block w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-[10px] mt-3 font-mono text-slate-600 truncate">https://www.googleapis.com/auth/gmail.readonly</code>
                            </div>
                            <div className="relative pl-10 border-l-2 border-slate-100">
                                <div className="absolute left-[-9px] top-0 w-4 h-4 rounded-full bg-slate-200 border-4 border-white"></div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Step 2: Authorize</h3>
                                <p className="text-xs text-slate-500 mt-2 leading-relaxed">Log in and click <strong>"Exchange authorization code for tokens"</strong>. If the page jumps to Step 3, look back at the middle column for the Token.</p>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};
