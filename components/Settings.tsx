
import React, { useState } from 'react';
import { UserProfile, Job } from '../types';
import { User, Briefcase, FileText } from 'lucide-react';
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
  
  const lang = (formData?.preferences?.language || 'en') as LanguageCode;
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;

  const handleSave = () => {
      onUpdate(formData);
      setIsDirty(false);
      showNotification("Settings synced.", 'success');
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-32">
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <div className="flex justify-between items-center">
            <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-3xl bg-slate-100 flex items-center justify-center overflow-hidden border-4 border-white shadow-xl">
                    <User className="w-10 h-10 text-slate-300" />
                </div>
                <div>
                    <h2 className="text-3xl font-black text-slate-900">{formData.fullName}</h2>
                    <p className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-widest">{formData.email}</p>
                </div>
            </div>
            <button onClick={handleSave} disabled={!isDirty} className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-black text-xs uppercase hover:bg-indigo-700 disabled:opacity-50 transition-all">Save Changes</button>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center">
            <Briefcase className="w-5 h-5 mr-4 text-indigo-600" /> Job Preferences
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
           <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('target_roles')}</label>
               <input type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={rolesInput} onChange={(e) => { setRolesInput(e.target.value); setIsDirty(true); }} />
           </div>
           <div className="space-y-4">
               <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('target_loc')}</label>
               <input type="text" className="w-full p-5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-bold" value={locationsInput} onChange={(e) => { setLocationsInput(e.target.value); setIsDirty(true); }} />
           </div>
        </div>
      </div>

      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm">
        <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-10 flex items-center">
            <FileText className="w-5 h-5 mr-4 text-indigo-600" /> Master Resume
        </h3>
        <textarea 
            className="w-full h-96 p-8 bg-slate-50 border border-slate-200 rounded-3xl font-mono text-[11px] text-slate-600 resize-none leading-relaxed"
            value={formData.resumeContent}
            onChange={(e) => { setFormData({...formData, resumeContent: e.target.value}); setIsDirty(true); }}
        />
      </div>
    </div>
  );
};
