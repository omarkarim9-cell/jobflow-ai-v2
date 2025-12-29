import { useAuth } from "@clerk/clerk-react";
import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import { ClerkProvider, useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Database, Activity, Terminal, Send, CheckCircle, XCircle, Loader2, ArrowRight, RefreshCw, ShieldCheck, AlertTriangle } from 'lucide-react';

const getClerkKey = () => {
    // @ts-ignore
    const envKey = import.meta.env?.VITE_CLERK_PUBLISHABLE_KEY || (window as any).process?.env?.VITE_CLERK_PUBLISHABLE_KEY;
    // Removed old hardcoded fallback to ensure new project keys are used
    return envKey || "";
};

const LabApp: React.FC = () => {
    const { isSignedIn, user, isLoaded } = useUser();
    const { getToken } = useAuth();
    const [logs, setLogs] = useState<{msg: string, type: 'info'|'success'|'error', time: string}[]>([]);
    const [loading, setLoading] = useState(false);
    const [tokenStatus, setTokenStatus] = useState<'checking' | 'ready' | 'missing'>('checking');

    const addLog = (msg: string, type: 'info'|'success'|'error' = 'info') => {
        setLogs(prev => [{ msg, type, time: new Date().toLocaleTimeString() }, ...prev]);
    };

    useEffect(() => {
        if (isSignedIn) {
            getToken().then(t => {
                setTokenStatus(t ? 'ready' : 'missing');
                if (t) addLog("Clerk Bearer Token successfully generated.", "info");
            });
        }
    }, [isSignedIn, getToken]);

    const runRawFetchTest = async (type: 'profile' | 'job') => {
        if (!user?.id) {
            addLog("Error: Identity not found. Please refresh.", "error");
            return;
        }

        setLoading(true);
        addLog(`Initiating injection test for ${type}...`, 'info');
        
        try {
            const token = await getToken();
            if (!token) throw new Error("Clerk session invalid. Please log out and back in.");

            const endpoint = type === 'profile' ? '/api/profile' : '/api/jobs';
            const payload = type === 'profile' ? {
                fullName: user.fullName || 'Test User',
                email: user.primaryEmailAddress?.emailAddress || 'test@example.com',
                resumeContent: 'Manual laboratory injection test.',
                preferences: { targetRoles: ['Manual Tester'], targetLocations: ['Remote'] }
            } : {
                id: `manual-lab-${Date.now()}`,
                title: 'Manual DB Insertion Test',
                company: 'Lab Systems Inc',
                status: 'Saved',
                source: 'Manual'
            };

            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                    'x-clerk-user-id': user.id // Standard header fallback
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json().catch(() => ({}));
            
            if (response.ok) {
                addLog(`Success! Server accepted injection for ${type}.`, 'success');
            } else {
                addLog(`Failed (${response.status}): ${data.error || data.details || 'Check console'}`, 'error');
                if (response.status === 401) {
                    addLog("Diagnostic: The server did not recognize the session headers.", "error");
                }
            }
        } catch (e: any) {
            addLog(`Request Exception: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    if (!isLoaded) {
        return <div className="h-screen bg-slate-900 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500"/></div>;
    }

    if (!isSignedIn) {
        return (
            <div className="h-screen flex flex-col items-center justify-center p-6 text-center bg-slate-900">
                <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl">
                    <Database className="text-white w-8 h-8" />
                </div>
                <h1 className="text-3xl font-black mb-2 text-white tracking-tight">Identity Authentication</h1>
                <p className="text-slate-400 mb-8 max-w-sm">Please sign in to provide the required Bearer Token for the database endpoints.</p>
                <div className="p-4 bg-white rounded-2xl shadow-lg scale-110">
                    <UserButton />
                </div>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-8">
            <header className="flex items-center justify-between border-b border-slate-800 pb-8">
                <div className="flex items-center gap-6">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-900/40">
                        <Activity className="text-white w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-white tracking-tight">Neon DB Infrastructure Lab</h1>
                        <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] mt-1">Clerk Identity: {user?.id}</p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className={`px-3 py-1.5 rounded-lg text-[10px] font-black flex items-center gap-2 ${tokenStatus === 'ready' ? 'bg-emerald-900/30 text-emerald-400 border border-emerald-900/50' : 'bg-amber-900/30 text-amber-400 border border-amber-900/50'}`}>
                        {tokenStatus === 'ready' ? <ShieldCheck className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                        TOKEN: {tokenStatus.toUpperCase()}
                    </div>
                    <button onClick={() => window.location.reload()} className="p-2 text-slate-400 hover:text-white transition-colors"><RefreshCw className="w-5 h-5" /></button>
                    <UserButton afterSignOutUrl="/tester.html" />
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="bg-slate-800 rounded-[2.5rem] p-10 border border-slate-700/50 space-y-8 shadow-2xl">
                    <div>
                        <h2 className="text-xs font-black uppercase tracking-[0.3em] text-indigo-400 mb-2">Endpoint Injection</h2>
                        <p className="text-xs text-slate-500 leading-relaxed">Directly trigger the serverless handlers with current auth context. This bypasses the main app frontend entirely.</p>
                    </div>
                    <div className="space-y-4">
                        <button 
                            onClick={() => runRawFetchTest('profile')}
                            disabled={loading || tokenStatus !== 'ready'}
                            className="w-full bg-indigo-600 hover:bg-indigo-700 p-5 rounded-2xl flex items-center justify-between font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 group"
                        >
                            Inject Profile Seed <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                        <button 
                            onClick={() => runRawFetchTest('job')}
                            disabled={loading || tokenStatus !== 'ready'}
                            className="w-full bg-slate-700 hover:bg-slate-600 p-5 rounded-2xl flex items-center justify-between font-black text-xs uppercase tracking-widest transition-all disabled:opacity-50 group"
                        >
                            Inject Job Seed <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </button>
                    </div>
                </div>

                <div className="bg-black rounded-[2.5rem] p-8 border border-slate-800 flex flex-col h-[550px] shadow-2xl">
                    <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800/50">
                        <h2 className="text-xs font-black uppercase tracking-widest text-emerald-400 flex items-center gap-2">
                            <Terminal className="w-4 h-4" /> Live Connection Log
                        </h2>
                        {loading && <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />}
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-4 custom-scrollbar mono text-[11px] leading-relaxed">
                        {logs.length === 0 && <p className="text-slate-700 italic">// Monitoring initialized...</p>}
                        {logs.map((log, i) => (
                            <div key={i} className={`p-4 rounded-2xl border ${log.type === 'success' ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' : log.type === 'error' ? 'bg-red-950/20 text-red-400 border-red-900/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                                <span className="opacity-20 mr-2 font-bold">{log.time}</span> {log.msg}
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

const clerkKey = getClerkKey();
if (!clerkKey) {
    document.body.innerHTML = "<div style='color:white; padding:20px; font-family:sans-serif;'><h1>Clerk Key Missing</h1><p>Please set VITE_CLERK_PUBLISHABLE_KEY in your environment.</p></div>";
} else {
    const root = ReactDOM.createRoot(document.getElementById('tester-root')!);
    root.render(
        <React.StrictMode>
            <ClerkProvider publishableKey={clerkKey}>
                <LabApp />
            </ClerkProvider>
        </React.StrictMode>
    );
}