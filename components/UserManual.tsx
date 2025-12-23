import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Book, Mail, Zap, HelpCircle, Share2, Copy, LayoutDashboard, Briefcase, Settings as SettingsIcon, CheckCircle, ShieldCheck, Key, Lock, MousePointerClick, UserPlus } from 'lucide-react';

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
        <aside className="w-64 bg-white border-r border-slate-200 flex flex-col overflow-y-auto">
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
        </aside>

        <div className="flex-1 overflow-y-auto p-8">
            <div className="max-w-4xl mx-auto">
                {activeTab === 'guide' ? (
                    <div className="space-y-8 animate-in fade-in">
                        <section className="bg-white p-8 rounded-2xl shadow-sm border border-indigo-100">
                            <h1 className="text-3xl font-bold text-slate-900 mb-2">Application Guide</h1>
                            <p className="text-slate-600 leading-relaxed">
                                Welcome to JobFlow AI. This guide provides a walkthrough of the platform features.
                            </p>
                        </section>

                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center">
                                 <UserPlus className="w-5 h-5 mr-3 text-slate-600" />
                                 <h2 className="text-lg font-bold text-slate-800">1. Onboarding</h2>
                             </div>
                             <div className="p-6">
                                 <p className="text-sm text-slate-600 mb-4">Complete your profile to unlock AI features:</p>
                                 <ul className="list-disc list-inside space-y-2 text-sm text-slate-700">
                                     <li>Upload a master resume (.txt format)</li>
                                     <li>Define your target job roles</li>
                                     <li>Set your preferred locations</li>
                                 </ul>
                             </div>
                        </section>

                        <section className="bg-white rounded-2xl border border-indigo-200 shadow-md overflow-hidden">
                             <div className="bg-indigo-50 p-4 border-b border-indigo-100 flex items-center">
                                 <ShieldCheck className="w-5 h-5 mr-3 text-indigo-600" />
                                 <h2 className="text-lg font-bold text-indigo-900">2. Security & Email</h2>
                             </div>
                             <div className="p-6">
                                 <h3 className="font-bold text-slate-900 mb-2">Why Token Access?</h3>
                                 <p className="text-sm text-slate-700 leading-relaxed">
                                     JobFlow uses secure temporary tokens to read job-related headers from your inbox. We never store or see your primary account password.
                                 </p>
                             </div>
                        </section>

                        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="bg-slate-50 p-4 border-b border-slate-200 flex items-center">
                                 <Mail className="w-5 h-5 mr-3 text-purple-600" />
                                 <h2 className="text-lg font-bold text-slate-800">3. Inbox Scanner</h2>
                             </div>
                             <div className="p-6">
                                 <p className="text-sm text-slate-600">
                                     The scanner finds job leads in your email. Results are transient and cleared on refresh unless saved specifically to the tracker.
                                 </p>
                             </div>
                        </section>
                    </div>
                ) : (
                    <div className="max-w-2xl mx-auto space-y-6">
                         {ads.map((ad, index) => (
                             <div key={ad.id} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                                 <div className="flex justify-between items-center mb-3">
                                     <h3 className="font-bold text-slate-800">{ad.platform}</h3>
                                     <button 
                                         onClick={() => handleCopy(ad.content, index)}
                                         className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center bg-indigo-50 px-3 py-1.5 rounded-lg"
                                     >
                                         {copiedIndex === index ? <CheckCircle className="w-4 h-4 mr-1"/> : <Copy className="w-4 h-4 mr-1"/>}
                                         {copiedIndex === index ? 'Copied' : 'Copy'}
                                     </button>
                                 </div>
                                 <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
                                     <p className="text-sm text-slate-600 whitespace-pre-wrap">{ad.content}</p>
                                 </div>
                             </div>
                         ))}
                    </div>
                )}
            </div>
        </div>
    </div>
  );
};