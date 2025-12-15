
import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { Upload, User, Briefcase, Check, AlertCircle, Database, Loader2, FolderInput, Globe, Lock, Eye, EyeOff, FileText, Mail, Send, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react';
import { getDirectoryHandle, readFileFromDirectory, createVirtualDirectory } from '../services/fileSystemService';
import { NotificationType } from './NotificationToast';
import { translations, LanguageCode } from '../services/localization';
import { isProductionMode, signUpUser, saveUserProfile, resendVerificationEmail } from '../services/supabaseClient';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onDirHandleChange: (handle: any) => void;
  dirHandle: any;
  showNotification: (msg: string, type: NotificationType) => void;
}

// Helper to safely encode Unicode strings to Base64
const safeBase64 = (str: string) => {
    try {
        return btoa(str);
    } catch (e) {
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
            String.fromCharCode(parseInt(p1, 16))
        ));
    }
};

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onDirHandleChange, dirHandle, showNotification }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [verificationPending, setVerificationPending] = useState(false);
  
  // Resend Logic
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendSuccess, setResendSuccess] = useState('');

  // Password Visibility State
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Language State
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    targetRoles: '',
    targetLocations: '',
    minSalary: '',
    remoteOnly: false,
    resumeContent: '',
    resumeFileName: ''
  });

  // Helper for translation
  const t = (key: keyof typeof translations['en']) => translations[currentLang][key] || key;
  const isRtl = currentLang === 'ar';

  // Auto-connect to default virtual folder silently when reaching Step 3
  useEffect(() => {
      if (step === 3 && !dirHandle) {
          const defaultPath = 'C:\\JobFlow_Data';
          const virtualHandle = createVirtualDirectory(defaultPath);
          onDirHandleChange(virtualHandle);
      }
  }, [step, dirHandle, onDirHandleChange]);

  // Cooldown Timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleFileRead = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain") {
        const reader = new FileReader();
        reader.onload = (event) => {
            setFormData(prev => ({
                ...prev,
                resumeContent: event.target?.result as string,
                resumeFileName: file.name
            }));
            showNotification("Resume loaded successfully", 'success');
        };
        reader.readAsText(file);
    } else {
        showNotification("Please upload a .txt file", 'error');
    }
  };
  
  const validateStep1 = () => {
      if (!formData.email || !formData.fullName || !formData.password || !formData.confirmPassword) return false;
      if (formData.password !== formData.confirmPassword) return false;
      return true;
  };

  const handleResend = async () => {
      if (resendCooldown > 0) return;
      setIsResending(true);
      setResendSuccess('');
      setError('');
      try {
          await resendVerificationEmail(formData.email);
          setResendSuccess(`Sent to ${formData.email}`);
          setResendCooldown(60);
      } catch (e: any) {
          setError(e.message || "Failed to resend");
      } finally {
          setIsResending(false);
      }
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
        const profile: UserProfile = {
            id: safeBase64(formData.email), 
            fullName: formData.fullName,
            email: formData.email,
            password: '', // Don't store password in profile object
            phone: formData.phone,
            resumeContent: formData.resumeContent,
            resumeFileName: formData.resumeFileName,
            onboardedAt: new Date().toISOString(),
            preferences: {
                targetRoles: formData.targetRoles.split(',').map(s => s.trim()).filter(s => s),
                targetLocations: formData.targetLocations.split(',').map(s => s.trim()).filter(s => s),
                minSalary: formData.minSalary,
                remoteOnly: formData.remoteOnly,
                shareUrl: window.location.origin,
                language: currentLang 
            },
            connectedAccounts: [],
            plan: 'pro'
        };

        // 1. If Production Mode, create user in Supabase
        if (isProductionMode()) {
            // Pass user metadata so it persists during the verification gap
            const authData = await signUpUser(formData.email, formData.password, {
                fullName: profile.fullName,
                preferences: profile.preferences,
            });
            
            if (authData.user && authData.session) {
                // Scenario A: Email confirmation disabled in Supabase. We are logged in.
                await saveUserProfile(profile, authData.user.id);
                profile.id = authData.user.id;
                onComplete(profile);
            } else if (authData.user && !authData.session) {
                // Scenario B: Email confirmation required. We are NOT logged in yet.
                // We save profile to localStorage as a backup, but the metadata logic in Auth.tsx
                // is the primary recovery method now.
                localStorage.setItem('jobflow_pending_profile', JSON.stringify({
                    ...profile,
                    id: authData.user.id // Use real ID
                }));
                setVerificationPending(true);
                return;
            } else {
                throw new Error("Signup failed. Please try again.");
            }
        } else {
            // 2. Fallback for demo mode
            profile.password = formData.password; 
            localStorage.setItem('jobflow_user', JSON.stringify(profile));
            onComplete(profile);
        }
        
    } catch (err: any) {
        console.error(err);
        const msg = err.message || 'Error during signup.';
        
        // Handle "User already registered" gracefully
        if (msg.includes("already registered")) {
            showNotification("Account already exists. Redirecting to Login...", 'error');
            setTimeout(() => window.location.reload(), 2000);
            return;
        }

        setError(msg);
        showNotification(msg, 'error');
    } finally {
        setIsLoading(false);
    }
  };
  
  // View for Email Verification Required
  if (verificationPending) {
      return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 text-center border border-slate-200 animate-in zoom-in-95">
                <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Mail className="w-8 h-8 text-indigo-600" />
                </div>
                <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your email</h2>
                <p className="text-slate-600 mb-6 leading-relaxed">
                    We sent a confirmation link to <strong>{formData.email}</strong>.<br/>
                    Please click the link to verify your account.
                </p>
                
                {resendSuccess && (
                     <div className="mb-4 p-3 bg-green-50 text-green-700 text-sm rounded-lg flex items-center justify-center border border-green-200">
                         <CheckCircle className="w-4 h-4 mr-2" /> {resendSuccess}
                     </div>
                )}
                
                {error && (
                     <div className="mb-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg border border-red-200">
                         {error}
                     </div>
                )}

                <div className="space-y-3">
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700 transition-colors shadow-md"
                    >
                        I have verified my email
                    </button>
                    
                    <button 
                        onClick={handleResend}
                        disabled={isResending || resendCooldown > 0}
                        className="w-full bg-white text-slate-600 border border-slate-300 py-3 rounded-xl font-medium hover:bg-slate-50 transition-colors flex items-center justify-center disabled:opacity-50"
                    >
                        {isResending ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : <RefreshCw className="w-4 h-4 mr-2"/>}
                        {resendCooldown > 0 ? `Wait ${resendCooldown}s` : "Resend Verification Email"}
                    </button>

                    <button 
                         onClick={() => setVerificationPending(false)}
                         className="text-sm text-slate-400 hover:text-indigo-600 mt-2 flex items-center justify-center w-full"
                    >
                        <ArrowLeft className="w-3 h-3 mr-1"/> Back
                    </button>
                </div>
            </div>
        </div>
      );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 relative">
        
        {/* Language Selector */}
        <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-10`}>
            <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
                <Globe className="w-4 h-4 text-slate-500 mx-1" />
                <select 
                    value={currentLang}
                    onChange={(e) => setCurrentLang(e.target.value as LanguageCode)}
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

        {/* Progress Header */}
        <div className="bg-slate-50 p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{t('welcome_title')}</h1>
                <span className="text-sm font-medium text-indigo-600 px-4">Step {step} / 3</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div 
                    className="h-full bg-indigo-600 transition-all duration-500 ease-out"
                    style={{ width: `${(step / 3) * 100}%` }}
                />
            </div>
        </div>

        <div className="p-8">
            {step === 1 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                    <div className="flex items-center mb-4 text-slate-800">
                        <div className={`p-2 bg-indigo-100 rounded-lg text-indigo-600 ${isRtl ? 'ml-3' : 'mr-3'}`}>
                            <User className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-semibold">{t('step_1_title')}</h2>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('full_name')}</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.fullName}
                                onChange={e => setFormData({...formData, fullName: e.target.value})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('email_addr')}</label>
                            <input 
                                type="email" 
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.email}
                                onChange={e => setFormData({...formData, email: e.target.value})}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth_password')}</label>
                                <div className="relative">
                                    <Lock className={`absolute top-3 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                                    <input 
                                        type={showPassword ? "text" : "password"}
                                        className={`w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isRtl ? 'pr-9 pl-9' : 'pl-9 pr-9'}`}
                                        value={formData.password}
                                        onChange={e => setFormData({...formData, password: e.target.value})}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className={`absolute top-3 text-slate-400 hover:text-slate-600 ${isRtl ? 'left-3' : 'right-3'}`}
                                    >
                                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                             <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1">{t('auth_confirm_password')}</label>
                                <div className="relative">
                                    <Lock className={`absolute top-3 w-4 h-4 text-slate-400 ${isRtl ? 'right-3' : 'left-3'}`} />
                                    <input 
                                        type={showConfirmPassword ? "text" : "password"}
                                        className={`w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none ${isRtl ? 'pr-9 pl-9' : 'pl-9 pr-9'}`}
                                        value={formData.confirmPassword}
                                        onChange={e => setFormData({...formData, confirmPassword: e.target.value})}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        className={`absolute top-3 text-slate-400 hover:text-slate-600 ${isRtl ? 'left-3' : 'right-3'}`}
                                    >
                                        {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>
                        {formData.password && formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="text-xs text-red-500 flex items-center">
                                <AlertCircle className="w-3 h-3 mr-1"/> {t('auth_pass_mismatch')}
                            </p>
                        )}

                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('phone')}</label>
                            <input 
                                type="tel" 
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.phone}
                                onChange={e => setFormData({...formData, phone: e.target.value})}
                            />
                        </div>
                    </div>
                    <button 
                        disabled={!validateStep1()}
                        onClick={() => setStep(2)}
                        className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        {t('next_step_2')}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                     <div className="flex items-center mb-4 text-slate-800">
                        <div className={`p-2 bg-indigo-100 rounded-lg text-indigo-600 ${isRtl ? 'ml-3' : 'mr-3'}`}>
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-semibold">{t('step_2_title')}</h2>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('target_roles')}</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.targetRoles}
                            onChange={e => setFormData({...formData, targetRoles: e.target.value})}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">{t('target_loc')}</label>
                        <input 
                            type="text" 
                            className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                            value={formData.targetLocations}
                            onChange={e => setFormData({...formData, targetLocations: e.target.value})}
                        />
                    </div>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('min_salary')}</label>
                            <input 
                                type="text" 
                                className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                                value={formData.minSalary}
                                onChange={e => setFormData({...formData, minSalary: e.target.value})}
                            />
                        </div>
                        <div className={`flex items-end pb-3 ${isRtl ? 'mr-4' : 'ml-4'}`}>
                            <label className="flex items-center cursor-pointer">
                                <input 
                                    type="checkbox" 
                                    checked={formData.remoteOnly}
                                    onChange={e => setFormData({...formData, remoteOnly: e.target.checked})}
                                    className="w-5 h-5 text-indigo-600 border-slate-300 rounded focus:ring-indigo-500"
                                />
                                <span className={`text-slate-700 font-medium ${isRtl ? 'mr-2' : 'ml-2'}`}>{t('remote_only')}</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex space-x-3 mt-6 rtl:space-x-reverse">
                        <button 
                            onClick={() => setStep(1)}
                            className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                            {t('back')}
                        </button>
                        <button 
                            onClick={() => setStep(3)}
                            className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 transition-colors"
                        >
                            {t('next_step_3')}
                        </button>
                    </div>
                </div>
            )}

            {step === 3 && (
                 <div className="space-y-4 animate-in fade-in slide-in-from-right-8 duration-300">
                    <div className="flex items-center mb-4 text-slate-800">
                        <div className={`p-2 bg-indigo-100 rounded-lg text-indigo-600 ${isRtl ? 'ml-3' : 'mr-3'}`}>
                            <Upload className="w-6 h-6" />
                        </div>
                        <h2 className="text-lg font-semibold">{t('step_3_title')}</h2>
                    </div>
                    
                    <p className="text-sm text-slate-600">
                        Upload your Master Resume text file. Our AI will use this to generate tailored resumes for every job application.
                    </p>

                    <div className="relative group">
                        <input 
                            type="file" 
                            accept=".txt"
                            onChange={handleFileRead}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                            id="resume-upload"
                        />
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 group-hover:border-indigo-500 group-hover:bg-indigo-50 transition-all">
                             <div className="bg-white p-3 rounded-full shadow-sm mb-3 inline-block">
                                <FileText className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h3 className="text-indigo-600 font-bold text-lg mb-1 group-hover:underline">{t('click_upload')}</h3>
                            <span className="text-slate-400 text-sm">Supported format: .txt</span>
                        </div>
                    </div>

                    {formData.resumeFileName && (
                         <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg">
                             <Check className="w-4 h-4 text-green-600 mr-2" />
                             <span className="text-sm text-green-800 font-medium">{formData.resumeFileName} loaded</span>
                         </div>
                    )}

                    <div className="relative pt-4">
                        <div className="relative flex items-center py-2 mb-2">
                            <div className="flex-grow border-t border-slate-200"></div>
                            <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-bold">{t('upload_manual')}</span>
                            <div className="flex-grow border-t border-slate-200"></div>
                        </div>

                        <label className="block text-sm font-medium text-slate-700 mb-1 flex justify-between">
                           {t('paste_resume')}
                        </label>
                        <textarea 
                            className="w-full h-40 p-4 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none font-mono text-xs text-slate-600 placeholder:text-slate-300"
                            value={formData.resumeContent}
                            onChange={e => setFormData({...formData, resumeContent: e.target.value})}
                            placeholder="Or paste your resume text content here..."
                        />
                    </div>
                    
                    {error && (
                         <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg flex items-center">
                             <AlertCircle className="w-4 h-4 mr-2" /> {error}
                         </div>
                    )}

                    <div className="flex space-x-3 mt-6 rtl:space-x-reverse">
                        <button 
                            onClick={() => setStep(2)}
                            className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50 transition-colors"
                        >
                            {t('back')}
                        </button>
                        <button 
                            disabled={!formData.resumeContent || isLoading}
                            onClick={handleSubmit}
                            className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 transition-colors flex justify-center items-center shadow-md"
                        >
                            {isLoading ? <Loader2 className={`w-4 h-4 animate-spin ${isRtl ? 'ml-2' : 'mr-2'}`} /> : <Check className={`w-4 h-4 ${isRtl ? 'ml-2' : 'mr-2'}`} />}
                            {isLoading ? t('finishing') : t('complete_setup')}
                        </button>
                    </div>
                 </div>
            )}
        </div>
      </div>
      
      <div className="mt-8 text-center text-slate-400 text-sm">
        <p>&copy; 2025 JobFlow AI. {isProductionMode() ? 'Database Connected.' : 'Demo Mode.'}</p>
      </div>
    </div>
  );
};
