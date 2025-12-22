import React, { useState, useEffect } from 'react';
import { UserProfile, Job } from '../types';
import { Save, User, Briefcase, FileText, Globe, Languages, Upload, AlertTriangle, RotateCcw, Database, CheckCircle2, Cloud } from 'lucide-react';
import { writeFileToDirectory } from '../services/fileSystemService';
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

export const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdate, dirHandle, onDirHandleChange, jobs, showNotification, onReset }) => {
  // Ensure we have a valid object even if the DB returned null/empty for sub-fields
  const [formData, setFormData] = useState<UserProfile>({
      ...userProfile,
      preferences: userProfile?.preferences || { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' }
  });
  
  // Defensive local state
  const [rolesInput, setRolesInput] = useState((userProfile?.preferences?.targetRoles || []).join(', '));
  const [locationsInput, setLocationsInput] = useState((userProfile?.preferences?.targetLocations || []).join(', '));

  const [isDirty, setIsDirty] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Localization Helper with fallback
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
      showNotification("Preferences saved successfully.", 'success');
  };
  
  const handleResetData = async () => {
    if(window.confirm("This will reset your job preferences. Continue?")) {
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
        showNotification("Profile data reset.", 'success');
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
              showNotification("Resume uploaded successfully", 'success');
          };
          reader.readAsText(file);
      } else {
          showNotification("Please upload a .txt file", 'error');
      }
      e.target.value = '';
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-24" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <h2 className="text-2xl font-black text-slate-900 flex items-center">
            <User className={`w-6 h-6 text-indigo-600 ${isRtl ? 'ml-3' : 'mr-3'}`} />
            {t('settings_title')}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t('settings_desc')}</p>
      </div>

      {/* Cloud Status */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-slate-900 flex items-center uppercase tracking-widest">
                   <Cloud className={`w-4 h-4 text-indigo-600 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                   Data Sync Status
              </h3>
              <span className="bg-green-50 text-green-700 text-[10px] font-black px-2.5 py-1 rounded-full border border-green-100 flex items-center uppercase tracking-tighter">
                  <CheckCircle2 className="w-3 h-3 mr-1"/> Cloud Secure
              </span>
          </div>
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
               <p className="text-xs text-slate-500 leading-relaxed">
                   Your profile is securely synchronized with your private database. All changes are encrypted in transit and locked to your identity.
               </p>
          </div>
      </div>

      {/* Preferences Section */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex items-center mb-8">
             <div className={`p-3 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                 <Briefcase className="w-6 h-6" />
             </div>
             <div>
                 <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">{t('pref_title')}</h3>
                 <p className="text-xs text-slate-500">Configure your global search criteria.</p>
             </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
           <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t('target_roles')}</label>
               <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  value={rolesInput}
                  onChange={(e) => handleRolesChange(e.target.value)}
                  placeholder="e.g. Frontend Engineer, React Developer"
               />
               <p className="text-[10px] text-slate-400">Comma separated</p>
           </div>
           
           <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">{t('target_loc')}</label>
               <input 
                  type="text" 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm font-medium"
                  value={locationsInput}
                  onChange={(e) => handleLocationsChange(e.target.value)}
                  placeholder="e.g. Remote, New York"
               />
           </div>
        </div>
      </div>

      {/* Language Section */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center">
             <div className={`p-3 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                 <Languages className="w-5 h-5" />
             </div>
             <div>
                 <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">{t('lang_label')}</h3>
                 <p className="text-xs text-slate-500">Update app UI language.</p>
             </div>
          </div>
          <div className="bg-slate-100 rounded-2xl px-4 py-2 border border-slate-200">
              <select 
                  value={lang}
                  onChange={(e) => handlePrefChange('language', e.target.value)}
                  className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer"
              >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ar">العربية</option>
              </select>
          </div>
      </div>

      {/* Resume Section */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-8">
            <div className="flex items-center">
                <div className={`p-3 bg-indigo-50 rounded-2xl text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-black text-slate-900 uppercase tracking-tight">Master Resume</h3>
                    <p className="text-xs text-slate-500">Primary data for AI customization.</p>
                </div>
            </div>
            <div className="relative overflow-hidden">
                <input 
                    type="file" 
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                />
                <button className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-indigo-700 transition-all flex items-center gap-2">
                    <Upload className="w-3 h-3" /> Upload Resume (.txt)
                </button>
            </div>
        </div>

        <textarea 
            className="w-full h-64 p-5 bg-slate-50 border border-slate-200 rounded-3xl font-mono text-[11px] text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
            value={formData.resumeContent}
            onChange={(e) => handleChange('resumeContent', e.target.value)}
            placeholder="Paste your resume content here..."
        />
      </div>

      {/* Danger Zone */}
      <div className="bg-red-50 p-8 rounded-3xl border border-red-100">
           <h3 className="text-red-900 font-black mb-4 flex items-center uppercase tracking-widest text-xs">
               <AlertTriangle className="w-4 h-4 mr-2" /> Danger Zone
           </h3>
           <div className="flex flex-wrap gap-3">
               <button 
                    onClick={handleResetData}
                    className="bg-white border border-red-200 text-red-600 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all"
               >
                   Reset Data
               </button>
               <button 
                    onClick={onReset}
                    className="bg-red-600 text-white px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-red-700 transition-all shadow-sm"
               >
                   Sign Out
               </button>
           </div>
      </div>

      {/* Floating Save Button */}
      <div className={`fixed bottom-8 ${isRtl ? 'left-8' : 'right-8'} z-40 transition-all duration-500 transform ${isDirty ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-90'}`}>
          <button 
              onClick={handleSave}
              className="bg-slate-900 text-white px-8 py-4 rounded-full font-black text-sm shadow-2xl hover:bg-black transition-all flex items-center gap-3 border border-white/10"
          >
              <Save className="w-5 h-5" />
              Save Changes
          </button>
      </div>

      {showSuccess && (
          <div className={`fixed bottom-8 ${isRtl ? 'left-8' : 'right-8'} z-40 bg-green-600 text-white px-8 py-4 rounded-full font-black text-sm shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-bottom-8 duration-500`}>
              <CheckCircle2 className="w-5 h-5" />
              Saved Successfully
          </div>
      )}
    </div>
  );
};