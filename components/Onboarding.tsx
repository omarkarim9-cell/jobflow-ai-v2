import React, { useState, useEffect } from 'react';
import { useUser, useAuth } from '@clerk/clerk-react';
import { UserProfile } from '../types';
import { Upload, User, Briefcase, Check, Globe, Loader2, FileText } from 'lucide-react';
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
          const defaultPath = 'JobFlow_Data';
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

    try {
        const token = await getToken();
        if (!token) throw new Error("Authentication required");

        const profile: UserProfile = {
            id: user!.id,
            fullName: formData.fullName,
            email: user!.primaryEmailAddress?.emailAddress || '',
            // Fix: Removed password field as it is not present in UserProfile type
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
        showNotification(err.message || 'Error during setup', 'error');
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="w-full max-w-2xl bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200 relative animate-in zoom-in-95 duration-700">
        <div className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} z-10`}>
            <div className="flex items-center bg-slate-50 rounded-2xl px-3 py-1.5 border border-slate-200">
                <Globe className="w-4 h-4 text-slate-500 mx-1.5" />
                <select value={currentLang} onChange={(e) => setCurrentLang(e.target.value as LanguageCode)} className="bg-transparent text-[10px] font-black uppercase text-slate-600 outline-none cursor-pointer">
                    <option value="en">English</option>
                    <option value="es">Español</option>
                    <option value="fr">Français</option>
                    <option value="de">Deutsch</option>
                    <option value="ar">العربية</option>
                </select>
            </div>
        </div>

        <div className="bg-slate-50/50 p-8 border-b border-slate-100">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">{t('welcome_title')}</h1>
                <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">Step {step} of 3</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
                <div className="h-full bg-indigo-600 transition-all duration-700 ease-out" style={{ width: `${(step / 3) * 100}%` }} />
            </div>
        </div>

        <div className="p-10">
            {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center mb-6">
                        <div className={`p-4 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                            <User className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('step_1_title')}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Basic Identity</p>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('full_name')}</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value})} />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('phone')}</label>
                            <input type="tel" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                        </div>
                    </div>
                    <button disabled={!formData.fullName} onClick={() => setStep(2)} className="w-full mt-8 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 disabled:opacity-50 shadow-xl shadow-indigo-100 transition-all">
                        {t('next_step_2')}
                    </button>
                </div>
            )}

            {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                     <div className="flex items-center mb-6 text-slate-800">
                        <div className={`p-4 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                            <Briefcase className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('step_2_title')}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Goal Alignment</p>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('target_roles')}</label>
                        <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700" value={formData.targetRoles} onChange={e => setFormData({...formData, targetRoles: e.target.value})} placeholder="e.g. React Developer, UI Designer" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('min_salary')}</label>
                            <input type="text" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm font-bold text-slate-700" value={formData.minSalary} onChange={e => setFormData({...formData, minSalary: e.target.value})} />
                        </div>
                        <div className={`flex items-end pb-4 ${isRtl ? 'mr-4' : 'ml-4'}`}>
                            <label className="flex items-center cursor-pointer">
                                <input type="checkbox" checked={formData.remoteOnly} onChange={e => setFormData({...formData, remoteOnly: e.target.checked})} className="w-6 h-6 text-indigo-600 border-slate-300 rounded-xl" />
                                <span className={`text-xs font-black uppercase tracking-widest text-slate-700 ${isRtl ? 'mr-3' : 'ml-3'}`}>{t('remote_only')}</span>
                            </label>
                        </div>
                    </div>

                    <div className="flex gap-4 mt-8 rtl:flex-row-reverse">
                        <button onClick={() => setStep(1)} className="flex-1 bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">{t('back')}</button>
                        <button onClick={() => setStep(3)} className="flex-1 bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all">{t('next_step_3')}</button>
                    </div>
                </div>
            )}

            {step === 3 && (
                 <div className="space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
                    <div className="flex items-center mb-6 text-slate-800">
                        <div className={`p-4 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                            <Upload className="w-6 h-6" />
                        </div>
                        <div>
                            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">{t('step_3_title')}</h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-1">Intelligence Mapping</p>
                        </div>
                    </div>
                    
                    <div className="relative group">
                        <input type="file" accept=".txt" onChange={handleFileRead} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" />
                        <div className="border-2 border-dashed border-slate-200 rounded-[2rem] p-10 text-center bg-slate-50/50 group-hover:border-indigo-500 group-hover:bg-indigo-50 transition-all duration-300">
                             <div className="bg-white p-4 rounded-3xl shadow-lg border border-slate-100 mb-4 inline-block transform group-hover:scale-110 transition-transform">
                                <FileText className="w-10 h-10 text-indigo-600" />
                            </div>
                            <h3 className="text-slate-900 font-black text-sm uppercase tracking-widest mb-2">{t('click_upload')}</h3>
                            <span className="text-slate-400 text-[10px] font-bold uppercase">Standard Text Format (.txt)</span>
                        </div>
                    </div>

                    <textarea className="w-full h-48 p-6 bg-slate-50 border border-slate-200 rounded-3xl outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-[10px] text-slate-600 leading-relaxed" value={formData.resumeContent} onChange={e => setFormData({...formData, resumeContent: e.target.value})} placeholder="Or paste your resume content here..." />
                    
                    <div className="flex gap-4 mt-8 rtl:flex-row-reverse">
                        <button onClick={() => setStep(2)} className="flex-1 bg-white border border-slate-200 text-slate-400 py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-slate-50 transition-all">{t('back')}</button>
                        <button disabled={!formData.resumeContent || isLoading} onClick={handleSubmit} className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-green-700 disabled:opacity-50 flex justify-center items-center shadow-xl shadow-green-100 transition-all">
                            {isLoading ? <Loader2 className="w-5 h-5 animate-spin mr-3" /> : <Check className="w-5 h-5 mr-3" />}
                            {t('complete_setup')}
                        </button>
                    </div>
                 </div>
            )}
        </div>
      </div>
      <div className="mt-12 text-center">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">&copy; 2025 JobFlow Platform</p>
      </div>
    </div>
  );
};