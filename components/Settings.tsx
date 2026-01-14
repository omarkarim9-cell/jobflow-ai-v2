<<<<<<< HEAD

import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Job } from '../types';
import { User, Briefcase, FileText, CheckCircle2, Upload, Loader2, Save, RotateCcw } from 'lucide-react';
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

export const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdate, showNotification }) => {
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [rolesInput, setRolesInput] = useState((userProfile?.preferences?.targetRoles || []).join(', '));
  const [locationsInput, setLocationsInput] = useState((userProfile?.preferences?.targetLocations || []).join(', '));
  const [isDirty, setIsDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lang = (formData?.preferences?.language || 'en') as LanguageCode;
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;

  // Sync internal state if userProfile changes from outside
  useEffect(() => {
    setFormData(userProfile);
    setRolesInput((userProfile?.preferences?.targetRoles || []).join(', '));
    setLocationsInput((userProfile?.preferences?.targetLocations || []).join(', '));
    setIsDirty(false);
  }, [userProfile]);

  const handleSave = () => {
      const updatedProfile: UserProfile = {
          ...formData,
          preferences: {
              ...formData.preferences,
              targetRoles: rolesInput.split(',').map(s => s.trim()).filter(s => s),
              targetLocations: locationsInput.split(',').map(s => s.trim()).filter(s => s),
          }
      };
      
      onUpdate(updatedProfile);
      setIsDirty(false);
      showNotification("Settings synced successfully.", 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith('.txt')) {
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setFormData(prev => ({
                ...prev,
                resumeContent: content,
                resumeFileName: file.name
            }));
            setIsDirty(true);
            setIsUploading(false);
            showNotification(`Resume "${file.name}" loaded successfully. Don't forget to save.`, 'success');
        };
        reader.onerror = () => {
            setIsUploading(false);
            showNotification("Failed to read the file.", 'error');
        };
        reader.readAsText(file);
    } else {
        showNotification("Please upload a standard text file (.txt).", 'error');
    }
  };

  const resetForm = () => {
    setFormData(userProfile);
    setRolesInput((userProfile?.preferences?.targetRoles || []).join(', '));
    setLocationsInput((userProfile?.preferences?.targetLocations || []).join(', '));
    setIsDirty(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    <User className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900">{formData.fullName}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{formData.email}</p>
                </div>
            </div>
            <div className="flex gap-3">
                 <button 
                  onClick={handleSave} 
                  disabled={!isDirty} 
                  className={`flex px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl items-center gap-2 ${
                    isDirty 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100' 
                    : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                  }`}
                >
                  {isDirty && <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center">
            <Briefcase className="w-5 h-5 mr-4 text-indigo-600" /> Job Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('target_roles')}</label>
               <input 
                 type="text" 
                 className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                 value={rolesInput} 
                 placeholder="e.g. React Developer, UI Designer"
                 onChange={(e) => { setRolesInput(e.target.value); setIsDirty(true); }} 
               />
               <p className="text-[10px] text-slate-400 font-medium">AI uses these keywords to filter your inbox.</p>
           </div>
           <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('target_loc')}</label>
               <input 
                 type="text" 
                 className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                 value={locationsInput} 
                 placeholder="e.g. Remote, New York, Europe"
                 onChange={(e) => { setLocationsInput(e.target.value); setIsDirty(true); }} 
               />
               <p className="text-[10px] text-slate-400 font-medium">Used for geographic discovery & filtering.</p>
           </div>
        </div>
      </div>

      {/* Resume Section */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                <FileText className="w-5 h-5 mr-4 text-indigo-600" /> Master Resume
            </h3>
            <div className="flex items-center gap-3">
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Resume (.txt)
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".txt" 
                    className="hidden" 
                />
            </div>
        </div>
        <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                This content acts as your <strong>Source of Truth</strong>. AI uses this text to regenerate customized documents.
                {formData.resumeFileName && <span className="block mt-2 text-indigo-600">Active File: {formData.resumeFileName}</span>}
            </p>
            <textarea 
                className="w-full h-96 p-8 bg-slate-50 border border-slate-200 rounded-3xl font-mono text-[11px] text-slate-600 resize-none leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={formData.resumeContent}
                placeholder="Paste your resume content or use the upload button above..."
                onChange={(e) => { setFormData({...formData, resumeContent: e.target.value}); setIsDirty(true); }}
            />
        </div>
      </div>

      {/* Floating Action Bar */}
      {isDirty && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-2xl pointer-events-none animate-in slide-in-from-bottom-10 duration-500">
              <div className="bg-slate-900/95 backdrop-blur-xl text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between border border-white/10 pointer-events-auto">
                  <div className="hidden sm:block">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Unsaved Changes</p>
                      <p className="text-xs font-bold opacity-60">Your profile is out of sync</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button 
                        onClick={resetForm}
                        className="flex-1 sm:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                          <RotateCcw className="w-3 h-3" />
                          Discard
                      </button>
                      <button 
                        onClick={handleSave}
                        className="flex-[2] sm:flex-none px-10 py-4 bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"
                      >
                          <Save className="w-4 h-4" />
                          Save Now
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
=======

import React, { useState, useRef, useEffect } from 'react';
import { UserProfile, Job } from '../types';
import { User, Briefcase, FileText, CheckCircle2, Upload, Loader2, Save, RotateCcw } from 'lucide-react';
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

export const Settings: React.FC<SettingsProps> = ({ userProfile, onUpdate, showNotification }) => {
  const [formData, setFormData] = useState<UserProfile>(userProfile);
  const [rolesInput, setRolesInput] = useState((userProfile?.preferences?.targetRoles || []).join(', '));
  const [locationsInput, setLocationsInput] = useState((userProfile?.preferences?.targetLocations || []).join(', '));
  const [isDirty, setIsDirty] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const lang = (formData?.preferences?.language || 'en') as LanguageCode;
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;

  // Sync internal state if userProfile changes from outside
  useEffect(() => {
    setFormData(userProfile);
    setRolesInput((userProfile?.preferences?.targetRoles || []).join(', '));
    setLocationsInput((userProfile?.preferences?.targetLocations || []).join(', '));
    setIsDirty(false);
  }, [userProfile]);

  const handleSave = () => {
      const updatedProfile: UserProfile = {
          ...formData,
          preferences: {
              ...formData.preferences,
              targetRoles: rolesInput.split(',').map(s => s.trim()).filter(s => s),
              targetLocations: locationsInput.split(',').map(s => s.trim()).filter(s => s),
          }
      };
      
      onUpdate(updatedProfile);
      setIsDirty(false);
      showNotification("Settings synced successfully.", 'success');
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type === "text/plain" || file.name.endsWith('.txt')) {
        setIsUploading(true);
        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target?.result as string;
            setFormData(prev => ({
                ...prev,
                resumeContent: content,
                resumeFileName: file.name
            }));
            setIsDirty(true);
            setIsUploading(false);
            showNotification(`Resume "${file.name}" loaded successfully. Don't forget to save.`, 'success');
        };
        reader.onerror = () => {
            setIsUploading(false);
            showNotification("Failed to read the file.", 'error');
        };
        reader.readAsText(file);
    } else {
        showNotification("Please upload a standard text file (.txt).", 'error');
    }
  };

  const resetForm = () => {
    setFormData(userProfile);
    setRolesInput((userProfile?.preferences?.targetRoles || []).join(', '));
    setLocationsInput((userProfile?.preferences?.targetLocations || []).join(', '));
    setIsDirty(false);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-40 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-2 h-full bg-indigo-600"></div>
        <div className="flex flex-col sm:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    <User className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900">{formData.fullName}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{formData.email}</p>
                </div>
            </div>
            <div className="flex gap-3">
                 <button 
                  onClick={handleSave} 
                  disabled={!isDirty} 
                  className={`flex px-8 py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all shadow-xl items-center gap-2 ${
                    isDirty 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-100' 
                    : 'bg-slate-100 text-slate-400 shadow-none cursor-not-allowed'
                  }`}
                >
                  {isDirty && <CheckCircle2 className="w-4 h-4" />}
                  Save Changes
                </button>
            </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center">
            <Briefcase className="w-5 h-5 mr-4 text-indigo-600" /> Job Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('target_roles')}</label>
               <input 
                 type="text" 
                 className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                 value={rolesInput} 
                 placeholder="e.g. React Developer, UI Designer"
                 onChange={(e) => { setRolesInput(e.target.value); setIsDirty(true); }} 
               />
               <p className="text-[10px] text-slate-400 font-medium">AI uses these keywords to filter your inbox.</p>
           </div>
           <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('target_loc')}</label>
               <input 
                 type="text" 
                 className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500 transition-all" 
                 value={locationsInput} 
                 placeholder="e.g. Remote, New York, Europe"
                 onChange={(e) => { setLocationsInput(e.target.value); setIsDirty(true); }} 
               />
               <p className="text-[10px] text-slate-400 font-medium">Used for geographic discovery & filtering.</p>
           </div>
        </div>
      </div>

      {/* Resume Section */}
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-10">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center">
                <FileText className="w-5 h-5 mr-4 text-indigo-600" /> Master Resume
            </h3>
            <div className="flex items-center gap-3">
                 <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-3 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all border border-indigo-100"
                >
                    {isUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                    Upload Resume (.txt)
                </button>
                <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".txt" 
                    className="hidden" 
                />
            </div>
        </div>
        <div className="space-y-4">
            <p className="text-xs text-slate-500 leading-relaxed font-medium bg-slate-50 p-4 rounded-xl border border-slate-100">
                This content acts as your <strong>Source of Truth</strong>. AI uses this text to regenerate customized documents.
                {formData.resumeFileName && <span className="block mt-2 text-indigo-600">Active File: {formData.resumeFileName}</span>}
            </p>
            <textarea 
                className="w-full h-96 p-8 bg-slate-50 border border-slate-200 rounded-3xl font-mono text-[11px] text-slate-600 resize-none leading-relaxed outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                value={formData.resumeContent}
                placeholder="Paste your resume content or use the upload button above..."
                onChange={(e) => { setFormData({...formData, resumeContent: e.target.value}); setIsDirty(true); }}
            />
        </div>
      </div>

      {/* Floating Action Bar */}
      {isDirty && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] w-[90%] max-w-2xl pointer-events-none animate-in slide-in-from-bottom-10 duration-500">
              <div className="bg-slate-900/95 backdrop-blur-xl text-white p-6 rounded-[2.5rem] shadow-2xl flex items-center justify-between border border-white/10 pointer-events-auto">
                  <div className="hidden sm:block">
                      <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] mb-0.5">Unsaved Changes</p>
                      <p className="text-xs font-bold opacity-60">Your profile is out of sync</p>
                  </div>
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                      <button 
                        onClick={resetForm}
                        className="flex-1 sm:flex-none px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-white hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                      >
                          <RotateCcw className="w-3 h-3" />
                          Discard
                      </button>
                      <button 
                        onClick={handleSave}
                        className="flex-[2] sm:flex-none px-10 py-4 bg-indigo-600 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-indigo-500 transition-all shadow-lg shadow-indigo-900/40"
                      >
                          <Save className="w-4 h-4" />
                          Save Now
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
>>>>>>> 45a145927e075b37a66e9b4d7b268d3499230129
