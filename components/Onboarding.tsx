import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { UserProfile } from '../types';
import { Upload, User, Briefcase, Check, AlertCircle, Loader2, Globe, Lock, Eye, EyeOff, FileText, CheckCircle } from 'lucide-react';
import { createVirtualDirectory } from '../services/fileSystemService';
import { NotificationType } from './NotificationToast';
import { translations, LanguageCode } from '../services/localization';
import { saveUserProfile } from '../services/dbService';

interface OnboardingProps {
  onComplete: (profile: UserProfile) => void;
  onDirHandleChange: (handle: any) => void;
  dirHandle: any;
  showNotification: (msg: string, type: NotificationType) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete, onDirHandleChange, dirHandle, showNotification }) => {
  const { user } = useUser();
  const { getToken } = useAuth();
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Language State
  const [currentLang, setCurrentLang] = useState<LanguageCode>('en');

  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    phone: '',
    targetRoles: '',
    targetLocations: '',
    minSalary: '',
    remoteOnly: false,
    resumeContent: '',
    resumeFileName: ''
  });

  const t = (key: keyof typeof translations['en']) => translations[currentLang][key] || key;
  const isRtl = currentLang === 'ar';

  useEffect(() => {
      if (step === 3 && !dirHandle) {
          const defaultPath = 'C:\\JobFlow_Data';
          const virtualHandle = createVirtualDirectory(defaultPath);
          onDirHandleChange(virtualHandle);
      }
  }, [step, dirHandle, onDirHandleChange]);

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

  const handleSubmit = async () => {
    setIsLoading(true);
    setError('');

    try {
        const token = await getToken();
        if (!token) throw new Error("Auth token missing");

        const profile: UserProfile = {
            id: user!.id,
            fullName: formData.fullName,
            email: user!.primaryEmailAddress?.emailAddress || '',
            password: '',
            phone: formData.phone,
            resumeContent: formData.resumeContent,
            resumeFileName: formData.resumeFileName,
            onboardedAt: new Date().toISOString(),
            preferences: {
                targetRoles: formData.targetRoles.split(',').map(s => s.trim()).filter(s => s),
                targetLocations: formData.targetLocations.split(',').map(s => s.trim()).filter(s => s),
                minSalary: formData.minSalary,
                remoteOnly: formData.remoteOnly,
                language: currentLang 
            },
            connectedAccounts: [],
            plan: 'pro'
        };

        await saveUserProfile(profile, token);
        onComplete(profile);
        
    } catch (err: any) {
        setError(err.message || 'Error saving setup.');
        showNotification(err.message, 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-200 relative">
        <div className={`absolute top-4 ${isRtl ? 'left-4' : 'right-4'} z-10`}>
            <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
                <Globe className="w-4 h-4 text-slate-500 mx-1" />
                <select value={currentLang} onChange={(e) => setCurrentLang(e.target.value as LanguageCode)} className="bg-transparent text-xs font-medium text-slate-600 outline-none py-1 cursor-pointer">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ar">العربية</option>
                </select>
            </div>
        </div>

        <div className="bg-slate-50 p-6 border-b border-slate-100">
            <div className="flex items-center justify-between mb-2">
                <h1 className="text-2xl font-bold text-slate-900">{t('welcome_title')}</h1>
                <span className="text-sm font-medium text-indigo-600 px-4">Step {step} / 3</span>
            </div>
            <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-500 ease-out" style={{ width: `${(step / 3) * 100}%` }} />
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
                            <input type="text" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('phone')}</label>
                            <input type="tel" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                    </div>
                    <button disabled={!formData.fullName} onClick={() => setStep(2)} className="w-full mt-6 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700 disabled:opacity-50">
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
                        <input type="text" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.targetRoles} onChange={e => setFormData({...formData, targetRoles: e.target.value})} />
                    </div>
                    <div className="flex space-x-4">
                        <div className="flex-1">
                            <label className="block text-sm font-medium text-slate-700 mb-1">{t('min_salary')}</label>
                            <input type="text" className="w-full p-3 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500" value={formData.minSalary} onChange={e => setFormData({...formData, minSalary: e.target.value})} />
                        </div>
                        <div className={`flex items-end pb-3 ${isRtl ? 'mr-4' : 'ml-4'}`}>
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" checked={formData.remoteOnly} onChange={e => setFormData({...formData, remoteOnly: e.target.checked})} className="w-5 h-5 text-indigo-600 border-slate-300 rounded" />
                                <span className={`text-slate-700 font-medium ${isRtl ? 'mr-2' : 'ml-2'}`}>{t('remote_only')}</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex space-x-3 mt-6 rtl:space-x-reverse">
                        <button onClick={() => setStep(1)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50">{t('back')}</button>
                        <button onClick={() => setStep(3)} className="flex-1 bg-indigo-600 text-white py-3 rounded-lg font-medium hover:bg-indigo-700">{t('next_step_3')}</button>
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
                    
                    <div className="relative group">
                        <input type="file" accept=".txt" onChange={handleFileRead} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 group-hover:border-indigo-500 group-hover:bg-indigo-50 transition-all">
                             <div className="bg-white p-3 rounded-full shadow-sm mb-3 inline-block">
                                <FileText className="w-8 h-8 text-indigo-600" />
                            </div>
                            <h3 className="text-indigo-600 font-bold text-lg mb-1 group-hover:underline">{t('click_upload')}</h3>
                            <span className="text-slate-400 text-sm">Supported format: .txt</span>
                        </div>
                    </div>

                    <textarea className="w-full h-40 p-4 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-xs text-slate-600" value={formData.resumeContent} onChange={e => setFormData({...formData, resumeContent: e.target.value})} placeholder="Or paste your resume text content here..." />
                    
                    <div className="flex space-x-3 mt-6 rtl:space-x-reverse">
                        <button onClick={() => setStep(2)} className="flex-1 bg-white border border-slate-300 text-slate-700 py-3 rounded-lg font-medium hover:bg-slate-50">{t('back')}</button>
                        <button disabled={!formData.resumeContent || isLoading} onClick={handleSubmit} className="flex-1 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700 disabled:opacity-50 flex justify-center items-center shadow-md">
                            {isLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                            {t('complete_setup')}
                        </button>
                    </div>
                 </div>
            )}
        </div>
      </div>
      <div className="mt-8 text-center text-slate-400 text-sm">
        <p>&copy; 2025 JobFlow AI. Powered by Neon & Clerk.</p>
      </div>
    </div>
  );
};