
import React, { useState, useEffect } from 'react';
import { Briefcase, Lock, Mail, AlertCircle, Loader2, Eye, EyeOff, Database, Settings, X, Send, RefreshCw, CheckCircle, ArrowLeft, Code, Globe, HelpCircle } from 'lucide-react';
import { UserProfile } from '../types';
import { translations, LanguageCode } from '../services/localization';
import { signInUser, signUpUser, getUserProfile, isProductionMode, configureSupabase, saveUserProfile, resendVerificationEmail, testSupabaseConnection, HARDCODED_SUPABASE_URL, HARDCODED_SUPABASE_KEY } from '../services/supabaseClient';

interface AuthProps {
  onLogin: (profile: UserProfile) => void;
  onSwitchToSignup: () => void;
  onSoftReset?: () => void; // Optional soft reset handler to prevent browser reload crashes
}

export const Auth: React.FC<AuthProps> = ({ onLogin, onSwitchToSignup, onSoftReset }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [lang, setLang] = useState<LanguageCode>('en');
  
  // Database Config Modal
  const [showDbConfig, setShowDbConfig] = useState(false);
  const [dbUrl, setDbUrl] = useState('');
  const [dbKey, setDbKey] = useState('');
  const [isTestingConnection, setIsTestingConnection] = useState(false);

  // Email Verification Logic
  const [verificationPending, setVerificationPending] = useState(false);
  const [showResend, setShowResend] = useState(false); // For generic errors
  const [resendSuccess, setResendSuccess] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0); // Cooldown timer

  // Detect stored language preference if possible (or default en)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('jobflow_user');
      if (stored) {
        const p = JSON.parse(stored);
        if (p.preferences?.language) setLang(p.preferences.language);
      }
      
      // Load stored DB keys if any
      const storedUrl = localStorage.getItem('jobflow_sb_url');
      const storedKey = localStorage.getItem('jobflow_sb_key');
      if (storedUrl) setDbUrl(storedUrl);
      if (storedKey) setDbKey(storedKey);
      
    } catch (e) {}
  }, []);

  // Cooldown Timer Effect
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;
  const isRtl = lang === 'ar';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setShowResend(false);
    setResendSuccess('');
    
    const cleanEmail = email.trim();

    // 1. Try Supabase Login (Real DB)
    if (isProductionMode()) {
        try {
             const authData = await signInUser(cleanEmail, password);
             if (authData.user) {
                 // Try to fetch existing profile
                 let profile = await getUserProfile(authData.user.id);
                 
                 // AUTO-RECOVERY: If profile is missing (row not created yet),
                 // try to reconstruct it from Auth Metadata (saved during signup).
                 if (!profile && authData.user.user_metadata) {
                     console.log("Profile missing. Attempting recovery from Metadata...");
                     const meta = authData.user.user_metadata;
                     
                     // Only reconstruct if we have minimal data
                     if (meta.fullName || meta.preferences) {
                         const recoveredProfile: UserProfile = {
                             id: authData.user.id,
                             fullName: meta.fullName || 'User',
                             email: authData.user.email || cleanEmail,
                             password: '',
                             phone: '',
                             resumeContent: meta.resumeContent || '', // Might be partial/empty
                             connectedAccounts: [],
                             preferences: meta.preferences || {
                                 targetRoles: [],
                                 targetLocations: [],
                                 minSalary: '',
                                 remoteOnly: false,
                                 language: 'en'
                             },
                             plan: 'free',
                             onboardedAt: new Date().toISOString()
                         };
                         
                         // Save immediately to DB to fix the "missing row" issue permanently
                         await saveUserProfile(recoveredProfile, authData.user.id);
                         profile = recoveredProfile;
                     }
                 }

                 // Last Resort: Check Local Storage Pending Profile
                 if (!profile) {
                     const pending = localStorage.getItem('jobflow_pending_profile');
                     if (pending) {
                         try {
                             const pendingProfile = JSON.parse(pending);
                             pendingProfile.id = authData.user.id;
                             await saveUserProfile(pendingProfile, authData.user.id);
                             profile = pendingProfile;
                             localStorage.removeItem('jobflow_pending_profile');
                         } catch (e) {
                             console.error("Failed to sync pending profile", e);
                         }
                     }
                 }
                 
                 if (profile) {
                     onLogin(profile);
                     return;
                 } else {
                     // Create skeleton profile if absolutely nothing exists
                     const skeletonProfile: UserProfile = {
                         id: authData.user.id,
                         fullName: 'User',
                         email: authData.user.email || cleanEmail,
                         password: '',
                         phone: '',
                         resumeContent: '',
                         connectedAccounts: [],
                         preferences: {
                             targetRoles: [],
                             targetLocations: [],
                             minSalary: '',
                             remoteOnly: false,
                             language: 'en'
                         },
                         plan: 'free',
                         onboardedAt: new Date().toISOString()
                     };
                     await saveUserProfile(skeletonProfile, authData.user.id);
                     onLogin(skeletonProfile);
                 }
             }
        } catch (err: any) {
            console.error("Supabase Login Failed", err);
            const errMsg = err.message || '';
            
            if (errMsg.includes("Email not confirmed")) {
                setVerificationPending(true);
                setIsLoading(false);
                return;
            }
            
            // Handle Network/Fetch Errors specificially
            if (errMsg.includes('Failed to fetch') || errMsg.includes('Network request failed') || errMsg.includes('connection')) {
                setError('Connection Failed. The server is unreachable.');
                // Provide visual cue to use offline mode
            } else if (errMsg.includes("Invalid login credentials")) {
                setError("Invalid credentials. If you just signed up, please check your email to verify your account.");
                setShowResend(true);
            } else {
                setError(errMsg || 'Login failed.');
                setShowResend(true);
            }

        } finally {
            setIsLoading(false);
        }
        return;
    }

    // 2. Fallback to LocalStorage (Demo Mode)
    setTimeout(() => {
      try {
        const storedUser = localStorage.getItem('jobflow_user');
        if (!storedUser) {
           setError('No local account found. Connect Database?');
           setShowResend(true); 
           setIsLoading(false);
           return;
        }

        const profile: UserProfile = JSON.parse(storedUser);
        
        if (profile.email.toLowerCase() === cleanEmail.toLowerCase()) {
            if (profile.password === password) {
                onLogin(profile); 
            } else if (!profile.password) {
                onLogin(profile); 
            } else {
                setError('Incorrect password.');
            }
        } else {
            setError('Email not found locally.');
            setShowResend(true);
        }
      } catch (err) {
        setError('Authentication failed.');
      }
      setIsLoading(false);
    }, 1000);
  };

  const handleResendVerification = async () => {
      if (!isProductionMode()) {
          if(confirm("You are currently in Demo Mode (Disconnected). You must connect to the Database to verify emails. Connect now?")) {
              setShowDbConfig(true);
          }
          return;
      }

      if (!email) {
          setError("Enter your email address first.");
          return;
      }
      
      if (resendCooldown > 0) return;

      setIsResending(true);
      setError('');
      setResendSuccess('');
      
      try {
          await resendVerificationEmail(email.trim());
          setResendSuccess(`Sent! Check ${email} (and Spam).`);
          setResendCooldown(60); 
      } catch (e: any) {
          const msg = e.message || "";
          if (msg.includes("rate limit")) {
              setError("Too many attempts. Please wait an hour before retrying.");
          } else {
              setError(msg || "Failed to resend. Please try again later.");
          }
      } finally {
          setIsResending(false);
      }
  };

  const handleSimulatedSocialLogin = (provider: string) => {
      setIsLoading(true);
      setTimeout(() => {
          const dummyProfile: UserProfile = {
              id: `social-${Date.now()}`,
              fullName: `${provider} User`,
              email: `user@${provider.toLowerCase()}.com`,
              password: '',
              phone: '',
              onboardedAt: new Date().toISOString(),
              resumeContent: '',
              connectedAccounts: [],
              preferences: {
                  targetRoles: [],
                  targetLocations: [],
                  minSalary: '',
                  remoteOnly: false,
                  language: 'en'
              },
              plan: 'free'
          };
          onLogin(dummyProfile);
          setIsLoading(false);
      }, 1500);
  };
  
  const handleAutofill = () => {
      if (HARDCODED_SUPABASE_URL && HARDCODED_SUPABASE_KEY) {
          setDbUrl(HARDCODED_SUPABASE_URL);
          setDbKey(HARDCODED_SUPABASE_KEY);
      } else {
          alert("To use this, edit services/supabaseClient.ts and paste your keys into the HARDCODED variables at the top.");
      }
  };

  const handleSaveDbConfig = async () => {
      if (!dbUrl || !dbKey) {
          alert("Please enter both URL and Key");
          return;
      }
      
      const cleanUrl = dbUrl.trim();
      const cleanKey = dbKey.trim();

      if (!cleanUrl.startsWith('https://') && !cleanUrl.includes('localhost')) {
          alert("Invalid URL format. Must start with https://");
          return;
      }

      setIsTestingConnection(true);
      try {
          // Validate first
          await testSupabaseConnection(cleanUrl, cleanKey);
          
          // If successful, save keys
          configureSupabase(cleanUrl, cleanKey);
          
          // Use Soft Reset if available (prevents crash), else fallback to hard reload
          if (onSoftReset) {
              setIsTestingConnection(false);
              setShowDbConfig(false);
              onSoftReset();
          } else {
              window.location.reload();
          }
          
      } catch (e: any) {
          let alertMsg = `Connection Failed: ${e.message}.`;
          if (e.message.includes("Failed to fetch")) {
              alertMsg += "\n\nTip: This often happens if a firewall or ad-blocker is blocking the connection.";
          }
          alert(alertMsg);
          setIsTestingConnection(false);
      }
  };

  if (verificationPending) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-amber-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Verify your email</h2>
                <p className="text-slate-600 mb-2 leading-relaxed">
                    We sent a link to:
                </p>
                <p className="font-bold text-slate-800 text-lg mb-4 bg-slate-50 p-2 rounded border border-slate-200 inline-block px-4">
                    {email}
                </p>
                <p className="text-xs text-slate-500 mb-6">
                    Not visible? Check <strong>Spam</strong> or <strong>Promotions</strong> folder.
                </p>
                
                {/* TROUBLESHOOTING BOX */}
                <div className="mb-6 bg-blue-50 border border-blue-100 p-4 rounded-lg text-left text-xs text-blue-900 shadow-sm">
                    <div className="flex items-center mb-2 font-bold text-blue-800">
                        <HelpCircle className="w-4 h-4 mr-2"/> Troubleshooting: Link Redirects to Localhost?
                    </div>
                    <p className="leading-relaxed mb-2 opacity-90">
                        If clicking "Confirm Email" sends you to a broken localhost page, you need to whitelist this app's URL in Supabase.
                    </p>
                    <ol className="list-decimal list-inside space-y-1 mb-2 opacity-80 pl-1">
                        <li>Go to Supabase Dashboard > Authentication > URL Configuration</li>
                        <li>Add this URL to <strong>Redirect URLs</strong>:</li>
                    </ol>
                    <code className="block bg-white p-2 rounded border border-blue-200 font-mono text-[10px] break-all select-all">
                        {window.location.origin}
                    </code>
                </div>
                
                {resendSuccess && (
                     <div className="mb-6 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex flex-col items-center justify-center border border-green-200">
                         <div className="flex items-center font-bold mb-1">
                             <CheckCircle className="w-4 h-4 mr-2"/> Email Sent!
                         </div>
                         <span className="text-xs">Wait 1-2 mins.</span>
                     </div>
                )}
                
                {error && (
                     <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                         {error}
                     </div>
                )}

                <div className="space-y-3">
                    <button 
                        onClick={(e) => handleLogin(e)}
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : "I've clicked the link"}
                    </button>
                    
                    <button 
                        onClick={handleResendVerification}
                        disabled={isResending || resendCooldown > 0}
                        className="w-full bg-white text-slate-700 border border-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center justify-center disabled:opacity-60"
                    >
                        {isResending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <Send className="w-4 h-4 mr-2"/>}
                        {resendCooldown > 0 ? `Wait ${resendCooldown}s to Resend` : "Resend Email"}
                    </button>
                    
                    <button 
                        onClick={() => setVerificationPending(false)}
                        className="text-sm text-slate-500 hover:text-indigo-600 hover:underline mt-4 flex items-center justify-center w-full"
                    >
                        <ArrowLeft className="w-3 h-3 mr-1" /> Wrong email? Fix it
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
       <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 relative">
          
          {/* Language Selector */}
          <div className="absolute top-4 right-4 z-10 rtl:right-auto rtl:left-4">
            <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
                <Globe className="w-4 h-4 text-slate-500 mx-1" />
                <select 
                    value={lang}
                    onChange={(e) => setLang(e.target.value as LanguageCode)}
                    className="bg-transparent text-xs font-medium text-slate-600 outline-none py-1 cursor-pointer"
                >
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ar">العربية</option>
                </select>
            </div>
          </div>

          <div className="p-8">
              <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
                     <Briefcase className="text-white w-6 h-6" />
                  </div>
                  <h1 className="text-2xl font-bold text-slate-900">{t('auth_login_title')}</h1>
                  <p className="text-slate-500 mt-2">Sign in to manage your automated job search.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth_email')}</label>
                      <div className="relative">
                          <Mail className="absolute top-3 w-5 h-5 text-slate-400 start-3" />
                          <input 
                              type="email" 
                              required
                              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all ps-10"
                              placeholder="name@example.com"
                              value={email}
                              onChange={(e) => setEmail(e.target.value)}
                          />
                      </div>
                  </div>

                  <div>
                      <div className="flex justify-between items-center mb-1">
                          <label className="block text-sm font-medium text-slate-700">{t('auth_password')}</label>
                          <a href="#" className="text-xs text-indigo-600 hover:underline">{t('auth_forgot')}</a>
                      </div>
                      <div className="relative">
                          <Lock className="absolute top-3 w-5 h-5 text-slate-400 start-3" />
                          <input 
                              type={showPassword ? "text" : "password"} 
                              required
                              className="w-full p-3 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 transition-all ps-10 pe-10"
                              placeholder="••••••••"
                              value={password}
                              onChange={(e) => setPassword(e.target.value)}
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute top-3 text-slate-400 hover:text-slate-600 end-3"
                          >
                            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                          </button>
                      </div>
                  </div>

                  {error && (
                      <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm flex flex-col items-start space-y-2 animate-in fade-in">
                          <div className="flex items-start">
                             <AlertCircle className="w-4 h-4 me-2 mt-0.5 shrink-0" />
                             <p>{error}</p>
                          </div>
                          
                          {/* AUTO-RECOVERY OPTION */}
                          {(error.includes('Connection Failed') || error.includes('Network') || error.includes('Database')) && (
                              <button 
                                type="button" 
                                onClick={() => {
                                    localStorage.setItem('jobflow_force_offline', 'true');
                                    window.location.reload();
                                }}
                                className="text-xs font-bold underline mt-1 hover:text-red-800 text-red-700"
                              >
                                  Switch to Offline Demo Mode
                              </button>
                          )}
                      </div>
                  )}

                  {resendSuccess && (
                      <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm flex items-center animate-in fade-in">
                          <CheckCircle className="w-4 h-4 me-2" />
                          {resendSuccess}
                      </div>
                  )}

                  <button 
                      type="submit" 
                      disabled={isLoading}
                      className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-md hover:shadow-lg flex justify-center items-center disabled:opacity-70"
                  >
                      {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : t('auth_btn_login')}
                  </button>
                  
                  {showResend && (
                      <button 
                        type="button"
                        onClick={handleResendVerification}
                        disabled={isResending || resendCooldown > 0}
                        className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 py-2 rounded-lg transition-colors flex items-center justify-center mt-2 disabled:opacity-60"
                      >
                          {isResending ? <Loader2 className="w-3 h-3 animate-spin me-2" /> : <RefreshCw className="w-3 h-3 me-2" />}
                          {resendCooldown > 0 ? `Wait ${resendCooldown}s` : (isProductionMode() ? "Resend Verification Link" : "Config missing? Connect Database")}
                      </button>
                  )}
              </form>
              
              <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-slate-200"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-slate-500">{t('auth_or')}</span>
                    </div>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                    <button onClick={() => handleSimulatedSocialLogin('Google')} className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-200 rounded-xl shadow-sm bg-white hover:bg-slate-50 transition-colors">
                        <svg className="h-5 w-5" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.26z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    </button>
                    <button onClick={() => handleSimulatedSocialLogin('Microsoft')} className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-200 rounded-xl shadow-sm bg-white hover:bg-slate-50 transition-colors">
                        <svg className="h-5 w-5" viewBox="0 0 23 23"><path fill="#f3f3f3" d="M0 0h23v23H0z" /><path fill="#f35325" d="M1 1h10v10H1z" /><path fill="#81bc06" d="M12 1h10v10H12z" /><path fill="#05a6f0" d="M1 12h10v10H1z" /><path fill="#ffba08" d="M12 12h10v10H12z" /></svg>
                    </button>
                    <button onClick={() => handleSimulatedSocialLogin('Apple')} className="w-full inline-flex justify-center py-2.5 px-4 border border-slate-200 rounded-xl shadow-sm bg-white hover:bg-slate-50 transition-colors">
                        <svg className="h-5 w-5 text-black" fill="currentColor" viewBox="0 0 24 24"><path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.74 1.18 0 2.45-1.62 3.57-1.62 1.05.06 2.04.48 2.65 1.19-2.9 1.4-2.47 5.76.62 7.18-.75 2.12-2.02 4.19-1.92 5.48zM12 6.45C11.5 3.96 14.88 2 17.06 2c.2 2.87-3.11 4.95-5.06 4.45z"/></svg>
                    </button>
                </div>
              </div>

              <div className="mt-6 text-center">
                  <p className="text-sm text-slate-600">
                      {t('auth_no_account')} {' '}
                      <button onClick={onSwitchToSignup} className="text-indigo-600 font-bold hover:underline">
                          {t('auth_btn_signup')}
                      </button>
                  </p>
                  
                  <div className="flex flex-col gap-3 mt-6">
                      <button 
                        onClick={() => setShowDbConfig(true)}
                        className="text-xs text-slate-400 hover:text-indigo-600 hover:underline flex items-center justify-center mx-auto"
                      >
                          <Settings className="w-3 h-3 me-1" /> Configure Database Connection
                      </button>
                      
                      <button 
                          type="button"
                          onClick={() => {
                              localStorage.setItem('jobflow_force_offline', 'true');
                              window.location.reload();
                          }}
                          className="text-xs text-slate-500 hover:text-indigo-600 hover:underline flex items-center justify-center mx-auto border border-slate-200 rounded px-3 py-1.5 hover:bg-slate-50 transition-colors"
                      >
                          <Database className="w-3 h-3 me-1" /> Continue as Guest (Offline)
                      </button>
                  </div>
              </div>
          </div>
       </div>

       {/* DATABASE CONFIG MODAL */}
       {showDbConfig && (
           <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6 animate-in zoom-in-95">
                   <div className="flex justify-between items-center mb-4">
                       <h3 className="text-lg font-bold text-slate-900 flex items-center">
                           <Database className="w-5 h-5 me-2 text-indigo-600"/> Configure Database
                       </h3>
                       <button onClick={() => setShowDbConfig(false)} className="text-slate-400 hover:text-slate-600">
                           <X className="w-5 h-5" />
                       </button>
                   </div>
                   <p className="text-sm text-slate-600 mb-4">
                       Enter your Supabase credentials below to enable real cloud storage.
                   </p>
                   
                   <div className="space-y-4">
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Project URL</label>
                           <input 
                               type="text" 
                               value={dbUrl}
                               onChange={(e) => setDbUrl(e.target.value)}
                               className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                               placeholder="https://xyz.supabase.co"
                           />
                       </div>
                       <div>
                           <label className="block text-sm font-medium text-slate-700 mb-1">Anon / Public Key</label>
                           <input 
                               type="text" 
                               value={dbKey}
                               onChange={(e) => setDbKey(e.target.value)}
                               className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono"
                               placeholder="eyJh..."
                           />
                       </div>
                       
                       <div className="flex justify-between items-center pt-2">
                           <button
                               onClick={handleAutofill}
                               className="text-xs text-indigo-600 font-bold hover:underline flex items-center bg-indigo-50 px-3 py-2 rounded-lg"
                               title="Fills from services/supabaseClient.ts"
                           >
                               <Code className="w-3 h-3 me-1" /> Auto-Fill from Code
                           </button>
                           
                           <button 
                               onClick={handleSaveDbConfig}
                               disabled={isTestingConnection}
                               className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 flex items-center disabled:opacity-50"
                           >
                               {isTestingConnection ? <Loader2 className="w-4 h-4 animate-spin me-2"/> : "Connect & Restart"}
                           </button>
                       </div>
                   </div>
                   
                   <div className="mt-4 bg-slate-50 p-3 rounded text-xs text-slate-500 border border-slate-100">
                       Don't have a database? <a href="https://supabase.com" target="_blank" className="text-indigo-600 underline">Create one for free</a>.
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};
