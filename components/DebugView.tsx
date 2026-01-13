
import React, { useState } from 'react';
import { useAuth, useUser } from '@clerk/clerk-react';
import { Database, Terminal, Send, User as UserIcon, Briefcase, CheckCircle, AlertCircle, Loader2, Sparkles, RefreshCcw } from 'lucide-react';
import { saveUserProfile, saveJobToDb } from '../services/dbService';
import { UserProfile, Job, JobStatus } from '../types';

export const DebugView: React.FC = () => {
    const { getToken } = useAuth();
    const { user } = useUser();
    const [loading, setLoading] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const [error, setError] = useState<string | null>(null);

    const [profileData, setProfileData] = useState({
        fullName: user?.fullName || 'Demo User',
        phone: '555-0100',
        resumeContent: 'Passionate software engineer with 5 years of experience in React and Node.js.'
    });

    const [jobData, setJobData] = useState({
        title: 'Senior Frontend Engineer',
        company: 'CloudFlow Systems',
        description: 'Building the future of automation with modern web technologies.'
    });

    const seedDemoData = async () => {
        setLoading('seed');
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("No Clerk session found. Please refresh.");

            // 1. Seed Profile
            const mockProfile: UserProfile = {
                id: user!.id,
                fullName: profileData.fullName,
                email: user!.primaryEmailAddress?.emailAddress || '',
                phone: profileData.phone,
                resumeContent: profileData.resumeContent,
                onboardedAt: new Date().toISOString(),
                preferences: {
                    targetRoles: ['Frontend Engineer', 'Fullstack Developer'],
                    targetLocations: ['Remote', 'San Francisco'],
                    minSalary: '120000',
                    remoteOnly: true,
                    language: 'en'
                },
                connectedAccounts: [],
                plan: 'pro'
            };
            await saveUserProfile(mockProfile, token);

            // 2. Seed Jobs
            const sampleJobs = [
                { title: 'React Architect', company: 'Neon Labs', desc: 'Direct Neon DB integration role.' },
                { title: 'Backend Lead', company: 'Prisma Core', desc: 'Managing high-scale APIs.' },
                { title: 'UI Specialist', company: 'Tailwind Design', desc: 'Crafting beautiful components.' }
            ];

            for (const s of sampleJobs) {
                const job: Job = {
                    id: `demo-${Math.random().toString(36).substr(2, 9)}`,
                    title: s.title,
                    company: s.company,
                    location: 'Remote',
                    description: s.desc,
                    source: 'LinkedIn',
                    detectedAt: new Date().toISOString(),
                    status: JobStatus.SAVED,
                    matchScore: 95,
                    requirements: ['React', 'TypeScript'],
                    applicationUrl: 'https://example.com'
                };
                await saveJobToDb(job, token);
            }

            setResult({ status: 'SUCCESS', message: 'Profile and 3 jobs seeded to Neon.' });
            window.location.reload(); // Reload to show data
        } catch (e: any) {
            setError(e.message);
        } finally {
            setLoading(null);
        }
    };

    const testProfileSync = async () => {
        setLoading('profile');
        setError(null);
        try {
            const token = await getToken();
            if (!token) throw new Error("No token");
            const res = await saveUserProfile({
                ...profileData,
                id: user!.id,
                email: user!.primaryEmailAddress?.emailAddress || '',
                preferences: { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' },
                onboardedAt: new Date().toISOString(),
                connectedAccounts: [],
                plan: 'pro'
            } as any, token);
            setResult(res);
        } catch (e: any) { setError(e.message); }
        finally { setLoading(null); }
    };

    return (
        <div className="max-w-6xl mx-auto p-8 space-y-8">
            <header className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3 tracking-tight">
                        <Terminal className="w-8 h-8 text-indigo-600" />
                        Developer Console
                    </h1>
                    <p className="text-slate-500 mt-1 font-medium italic">Monitor Neon DB sync and manage test data.</p>
                </div>
                <button 
                    onClick={seedDemoData}
                    disabled={loading !== null}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center gap-2 transition-all disabled:opacity-50"
                >
                    {loading === 'seed' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                    Seed Demo Data
                </button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm p-8 space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <UserIcon className="w-5 h-5 text-indigo-600" />
                        <h2 className="font-black text-slate-800 uppercase text-sm tracking-widest">Profile API</h2>
                    </div>
                    <div className="space-y-4">
                        <input className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold" value={profileData.fullName} onChange={e => setProfileData({...profileData, fullName: e.target.value})} />
                        <textarea className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs h-24" value={profileData.resumeContent} onChange={e => setProfileData({...profileData, resumeContent: e.target.value})} />
                    </div>
                    <button onClick={testProfileSync} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Manual Post Profile</button>
                </div>

                <div className="bg-slate-900 rounded-[2rem] p-8 text-indigo-400 font-mono text-xs border border-slate-800 shadow-2xl flex flex-col h-full">
                    <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-4">
                        <span className="flex items-center gap-2 uppercase tracking-widest font-bold"><Terminal className="w-4 h-4" /> Execution Logs</span>
                        <button onClick={() => setResult(null)} className="text-slate-500 hover:text-white"><RefreshCcw className="w-3 h-3" /></button>
                    </div>
                    {error && <div className="mb-4 p-4 bg-red-900/30 border border-red-500/50 text-red-400 rounded-xl flex items-center gap-3"><AlertCircle className="w-5 h-5" /> <div><p className="font-bold">Error</p><p>{error}</p></div></div>}
                    {result && <div className="mb-4 p-4 bg-green-900/30 border border-green-500/50 text-green-400 rounded-xl flex items-center gap-3"><CheckCircle className="w-5 h-5" /> <div><p className="font-bold uppercase">Success</p></div></div>}
                    <div className="flex-1 bg-black/40 rounded-xl p-6 overflow-auto max-h-64 custom-scrollbar">
                        {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : <p className="opacity-30 italic">// Waiting for command...</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};
