import React from 'react';
import { SignIn, SignUp } from '@clerk/clerk-react';
import { Briefcase, ShieldCheck } from 'lucide-react';

interface AuthProps {
  onLogin: (profile: any) => void;
  onSwitchToSignup: () => void;
}

export const Auth: React.FC<AuthProps> = () => {
  const [view, setView] = React.useState<'signin' | 'signup'>('signin');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 selection:bg-indigo-100">
      <div className="w-full max-w-[440px] animate-in fade-in zoom-in-95 duration-500">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-indigo-200 transform -rotate-2 hover:rotate-0 transition-transform">
             <Briefcase className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">JobFlow AI</h1>
          <p className="text-slate-500 mt-2 font-medium">Your automated career agent</p>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="p-1 bg-slate-50 border-b border-slate-100 flex">
                <button 
                    onClick={() => setView('signin')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-t-2xl ${view === 'signin' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Sign In
                </button>
                <button 
                    onClick={() => setView('signup')}
                    className={`flex-1 py-3 text-xs font-bold uppercase tracking-widest transition-all rounded-t-2xl ${view === 'signup' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                >
                    Create Account
                </button>
            </div>

            <div className="p-8">
                {view === 'signin' ? (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <SignIn 
                      appearance={{
                        elements: {
                          rootBox: 'w-full',
                          card: 'shadow-none border-0 p-0 w-full',
                          headerTitle: 'hidden',
                          headerSubtitle: 'hidden',
                          formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-sm font-bold h-11 transition-all shadow-lg shadow-indigo-100',
                          socialButtonsBlockButton: 'border-slate-200 hover:bg-slate-50 h-11 transition-all',
                          footer: 'hidden',
                          formFieldInput: 'h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all rounded-xl',
                          dividerRow: 'my-6',
                          identityPreview: 'bg-slate-50 border-slate-200'
                        }
                      }}
                    />
                  </div>
                ) : (
                  <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <SignUp 
                      appearance={{
                        elements: {
                          rootBox: 'w-full',
                          card: 'shadow-none border-0 p-0 w-full',
                          headerTitle: 'hidden',
                          headerSubtitle: 'hidden',
                          formButtonPrimary: 'bg-indigo-600 hover:bg-indigo-700 text-sm font-bold h-11 transition-all shadow-lg shadow-indigo-100',
                          socialButtonsBlockButton: 'border-slate-200 hover:bg-slate-50 h-11 transition-all',
                          footer: 'hidden',
                          formFieldInput: 'h-11 border-slate-200 focus:border-indigo-500 focus:ring-indigo-500 transition-all rounded-xl',
                          dividerRow: 'my-6'
                        }
                      }}
                    />
                  </div>
                )}
            </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-2 text-[10px] text-slate-400 uppercase tracking-[0.2em] font-bold">
          <ShieldCheck className="w-3 h-3" />
          Secure Enterprise Authentication
        </div>
      </div>
    </div>
  );
};