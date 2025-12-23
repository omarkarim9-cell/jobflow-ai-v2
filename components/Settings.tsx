import React, { useState, useEffect } from 'react';
import { UserProfile, Job } from '../types';
import { Save, User, Briefcase, FileText, Languages, Upload, AlertTriangle, Cloud, CheckCircle2, Download } from 'lucide-react';
import { NotificationType } from './NotificationToast';
import { translations, LanguageCode } from '../services/localization';

interface SettingsProps {
  userProfile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
  dirHandle: any;
  onDirHandleChange: (handle: any) => void;
  jobs: Job[];
  showNotification: (msg: string, type: NotificationType) => void;
  onReset: () => void;
}

export const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdate, showNotification, jobs, onReset }) => {
  const [formData, setFormData] = useState<UserProfile>({
      ...userProfile,
      preferences: userProfile?.preferences || { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' }
  });
  
  const [rolesInput, setRolesInput] = useState((userProfile?.preferences?.targetRoles || []).join(', '));
  const [locationsInput, setLocationsInput] = useState((userProfile?.preferences?.targetLocations || []).join(', '));

  const [isDirty, setIsDirty] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const langRaw = formData?.preferences?.language || 'en';
  const lang = (translations.hasOwnProperty(langRaw) ? langRaw : 'en') as LanguageCode;
  const t = (key: keyof typeof translations['en']) => {
      const pack = translations[lang] || translations['en'];
      // @ts-ignore
      return pack[key] || translations['en'][key] || key;
  };
  const isRtl = lang === 'ar';

  useEffect(() => {
      if (userProfile) {
          setFormData({
              ...userProfile,
              preferences: userProfile.preferences || { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' }
          });
          setRolesInput((userProfile.preferences?.targetRoles || []).join(', '));
          setLocationsInput((userProfile.preferences?.targetLocations || []).join(', '));
      }
  }, [userProfile]);

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setIsDirty(true);
    setShowSuccess(false);
  };

  const handlePrefChange = (field: string, value: any) => {
      setFormData(prev => ({
          ...prev,
          preferences: { ...prev.preferences, [field]: value }
      }));
      setIsDirty(true);
      setShowSuccess(false);
  };

  const handleRolesChange = (val: string) => {
      setRolesInput(val);
      const cleanArray = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      setFormData(prev => ({
          ...prev,
          preferences: { ...prev.preferences, targetRoles: cleanArray }
      }));
      setIsDirty(true);
  };

  const handleLocationsChange = (val: string) => {
      setLocationsInput(val);
      const cleanArray = val.split(',').map(s => s.trim()).filter(s => s.length > 0);
      setFormData(prev => ({
          ...prev,
          preferences: { ...prev.preferences, targetLocations: cleanArray }
      }));
      setIsDirty(true);
  };

  const handleSave = () => {
      onUpdate(formData);
      setIsDirty(false);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      showNotification("Settings saved to your profile.", 'success');
  };

  const handleDownloadBackup = () => {
    const backupData = {
        profile: formData,
        jobs: jobs,
        version: "3.1",
        exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `JobFlow_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showNotification("Backup file generated.", 'success');
  };
  
  const handleResetData = async () => {
    if(window.confirm("Reset job search preferences? This will not delete saved applications.")) {
        const cleanProfile: UserProfile = {
            ...userProfile,
            preferences: {
                targetRoles: [],
                targetLocations: [],
                minSalary: '',
                remoteOnly: false,
                language: 'en'
            }
        };
        setRolesInput("");
        setLocationsInput("");
        onUpdate(cleanProfile);
        showNotification("Preferences reset.", 'success');
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
  
      if (file.type === "text/plain") {
          const reader = new FileReader();
          reader.onload = (event) => {
              const text = event.target?.result as string;
              const updatedProfile = { 
                  ...formData, 
                  resumeContent: text,
                  resumeFileName: file.name
              };
              onUpdate(updatedProfile);
              showNotification("Master resume uploaded.", 'success');
          };
          reader.readAsText(file);
      } else {
          showNotification("Please upload a .txt file.", 'error');
      }
      e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32" dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start">
            <div>
                <h2 className="text-3xl font-black text-slate-900 flex items-center">
                    <User className={`w-8 h-8 text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`} />
                    Platform Settings
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-2 uppercase tracking-[0.2em]">Version 3.1 Pro Configuration</p>
            </div>
            <button 
                onClick={handleDownloadBackup}
                className="flex items-center gap-2 px-4 py-2 bg-slate-50 text-slate-600 hover:bg-indigo-50 hover:text-indigo-600 rounded-xl text-xs font-black uppercase transition-all border border-slate-100"
            >
                <Download className="w-4 h-4" /> Save a Copy
            </button>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
              <h3 className="text-sm font-black text-slate-900 flex items-center uppercase tracking-widest">
                   <Cloud className={`w-6 h-6 text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`} />
                   Sync Status
              </h3>
              <span className="bg-emerald-50 text-emerald-700 text-[10px] font-black px-4 py-2 rounded-full border border-emerald-100 flex items-center uppercase tracking-tighter">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-2"/> Encrypted & Connected
              </span>
          </div>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
               <p className="text-xs text-slate-500 leading-relaxed font-bold uppercase tracking-widest opacity-60">
                   Your profile and job data are synchronized across all devices using enterprise-grade encryption.
               </p>
          </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex items-center mb-10">
             <div className={`p-5 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-5' : 'mr-5'}`}>
                 <Briefcase className="w-7 h-7" />
             </div>
             <div>
                 <h3 className="text-xl font-black text-slate-900 tracking-tight">{t('pref_title')}</h3>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Smart Search Criteria</p>
             </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t('target_roles')}</label>
               <input 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold text-slate-700"
                  value={rolesInput}
                  onChange={(e) => handleRolesChange(e.target.value)}
                  placeholder="e.g. Frontend Dev, Manager"
               />
           </div>
           
           <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t('target_loc')}</label>
               <input 
                  type="text" 
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-bold text-slate-700"
                  value={locationsInput}
                  onChange={(e) => handleLocationsChange(e.target.value)}
                  placeholder="e.g. Remote, Europe"
               />
           </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center">
             <div className={`p-5 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-5' : 'mr-5'}`}>
                 <Languages className="w-7 h-7" />
             </div>
             <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('lang_label')}</h3>
                 <p className="text-xs text-slate-500 font-bold mt-1">Platform interface language</p>
             </div>
          </div>
          <div className="bg-slate-50 rounded-2xl px-8 py-4 border border-slate-200">
              <select 
                  value={lang}
                  onChange={(e) => handlePrefChange('language', e.target.value)}
                  className="bg-transparent text-sm font-black text-slate-700 outline-none cursor-pointer"
              >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ar">العربية</option>
              </select>
          </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center mb-10">
            <div className="flex items-center">
                <div className={`p-5 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-5' : 'mr-5'}`}>
                    <FileText className="w-7 h-7" />
                </div>
                <div>
                    <h3 className="text-xl font-black text-slate-900 tracking-tight">Master Resume</h3>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mt-1">Source for AI personalizations</p>
                </div>
            </div>
            <div className="relative overflow-hidden group">
                <input 
                    type="file" 
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer z-10" 
                />
                <button className="bg-indigo-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-xl shadow-indigo-100">
                    <Upload className="w-5 h-5" /> Import (.txt)
                </button>
            </div>
        </div>

        <textarea 
            className="w-full h-96 p-8 bg-slate-50 border border-slate-200 rounded-3xl font-mono text-[11px] text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
            value={formData.resumeContent}
            onChange={(e) => handleChange('resumeContent', e.target.value)}
            placeholder="Paste your resume content for AI processing..."
        />
      </div>

      <div className="bg-red-50 p-10 rounded-[2.5rem] border border-red-100">
           <h3 className="text-red-900 font-black mb-8 flex items-center uppercase tracking-[0.2em] text-xs">
               <AlertTriangle className="w-5 h-5 mr-3" /> System Controls
           </h3>
           <div className="flex flex-wrap gap-6">
               <button 
                    onClick={handleResetData}
                    className="bg-white border border-red-200 text-red-600 px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all"
               >
                   Reset Preferences
               </button>
               <button 
                    onClick={onReset}
                    className="bg-red-600 text-white px-8 py-4 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-xl shadow-red-100"
               >
                   Sign Out
               </button>
           </div>
      </div>

      <div className={`fixed bottom-10 ${isRtl ? 'left-10' : 'right-10'} z-40 transition-all duration-700 transform ${isDirty ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-90 pointer-events-none'}`}>
          <button 
              onClick={handleSave}
              className="bg-slate-900 text-white px-12 py-6 rounded-full font-black text-sm shadow-2xl hover:bg-black transition-all flex items-center gap-4 border border-white/10"
          >
              <Save className="w-6 h-6" />
              Sync Changes
          </button>
      </div>

      {showSuccess && (
          <div className={`fixed bottom-10 ${isRtl ? 'left-10' : 'right-10'} z-40 bg-green-600 text-white px-12 py-6 rounded-full font-black text-sm shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-10 duration-500`}>
              <CheckCircle2 className="w-6 h-6" />
              Configuration Updated
          </div>
      )}
    </div>
  );
};