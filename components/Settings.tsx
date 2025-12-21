import React, { useState, useEffect } from 'react';
import { UserProfile, Job } from '../types';
import { Save, User, Briefcase, FileText, HardDrive, Download, File, Globe, Languages, Upload, AlertTriangle, RotateCcw, Database, XCircle, CheckCircle2, FileJson, Cloud } from 'lucide-react';
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
  const [formData, setFormData] = useState(userProfile);
  
  // Local state for raw text inputs
  const [rolesInput, setRolesInput] = useState(userProfile.preferences.targetRoles.join(', '));
  const [locationsInput, setLocationsInput] = useState(userProfile.preferences.targetLocations.join(', '));

  const [isDirty, setIsDirty] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Localization Helper
  const lang = (userProfile.preferences.language as LanguageCode) || 'en';
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;
  const isRtl = lang === 'ar';

  useEffect(() => {
      setFormData(userProfile);
      setRolesInput(userProfile.preferences.targetRoles.join(', '));
      setLocationsInput(userProfile.preferences.targetLocations.join(', '));
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
  
  const handleRepairProfile = async () => {
    if(window.confirm("This will reset your job preferences. Continue?")) {
        const cleanProfile: UserProfile = {
            ...userProfile,
            preferences: {
                ...userProfile.preferences,
                targetRoles: [],
                targetLocations: []
            }
        };
        setRolesInput("");
        setLocationsInput("");
        onUpdate(cleanProfile);
        showNotification("Profile data reset.", 'success');
    }
  };

  const handleSyncToDisk = async () => {
      if (!dirHandle) return;
      try {
          const data = JSON.stringify(jobs, null, 2);
          await writeFileToDirectory(dirHandle, 'jobs_export.json', data);
          showNotification("Exported 'jobs_export.json' to workspace.", 'success');
      } catch (e) {
          showNotification("Failed to write to disk.", 'error');
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
    <div className="max-w-4xl mx-auto space-y-6 pb-12" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Header */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h2 className="text-xl font-bold text-slate-900 flex items-center">
            <User className={`w-5 h-5 text-indigo-600 ${isRtl ? 'ml-2' : 'mr-2'}`} />
            {t('settings_title')}
        </h2>
        <p className="text-sm text-slate-500 mt-1">{t('settings_desc')}</p>
      </div>

      {/* Database Connection Status */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-slate-900 flex items-center">
                   <Cloud className={`w-5 h-5 text-indigo-600 ${isRtl ? 'ml-2' : 'mr-2'}`} />
                   Neon Cloud Sync
              </h3>
              <span className="bg-green-100 text-green-800 text-xs font-bold px-2 py-1 rounded border border-green-200 flex items-center">
                  <CheckCircle2 className="w-3 h-3 mr-1"/> Verified via Clerk
              </span>
          </div>
          
          <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
               <p className="text-sm text-slate-600">
                   Your profile and job data are automatically synchronized with your <strong>Neon PostgreSQL</strong> database using your secure Clerk session.
               </p>
               <div className="mt-3 flex items-center gap-2 text-xs text-slate-400">
                   <Database className="w-3 h-3" />
                   <span>Endpoint: /api/profile</span>
               </div>
          </div>
      </div>

      {/* Language Selector */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center">
             <div className={`p-2 bg-indigo-50 rounded-lg text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                 <Languages className="w-6 h-6" />
             </div>
             <div>
                 <h3 className="text-sm font-bold text-slate-900">{t('lang_label')}</h3>
                 <p className="text-xs text-slate-500">
                     {userProfile.preferences.language === 'en' ? 'English' : 
                      userProfile.preferences.language === 'es' ? 'Español' : 
                      userProfile.preferences.language === 'fr' ? 'Français' : 
                      userProfile.preferences.language === 'de' ? 'Deutsch' : 'العربية'}
                 </p>
             </div>
          </div>
          <div className="flex items-center bg-slate-100 rounded-lg px-2 py-1 border border-slate-200">
              <Globe className="w-4 h-4 text-slate-500 mx-1" />
              <select 
                  value={userProfile.preferences.language}
                  onChange={(e) => handlePrefChange('language', e.target.value)}
                  className="bg-transparent text-sm font-medium text-slate-700 outline-none py-1 cursor-pointer"
              >
                  <option value="en">English</option>
                  <option value="es">Español</option>
                  <option value="fr">Français</option>
                  <option value="de">Deutsch</option>
                  <option value="ar">العربية</option>
              </select>
          </div>
      </div>

      {/* Preferences Form */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center mb-6">
             <div className={`p-2 bg-indigo-50 rounded-lg text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                 <Briefcase className="w-6 h-6" />
             </div>
             <div>
                 <h3 className="text-lg font-bold text-slate-900">{t('pref_title')}</h3>
                 <p className="text-sm text-slate-500">Customize what jobs the AI looks for.</p>
             </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">{t('target_roles')}</label>
               <input 
                  type="text" 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={rolesInput}
                  onChange={(e) => handleRolesChange(e.target.value)}
                  placeholder="e.g. Frontend Developer, React Engineer"
               />
               <p className="text-xs text-slate-400 mt-1">Separate roles with commas.</p>
           </div>
           
           <div>
               <label className="block text-sm font-bold text-slate-700 mb-2">{t('target_loc')}</label>
               <input 
                  type="text" 
                  className="w-full p-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                  value={locationsInput}
                  onChange={(e) => handleLocationsChange(e.target.value)}
                  placeholder="e.g. Remote, New York"
               />
           </div>
        </div>
      </div>

      {/* Resume Upload */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center">
                <div className={`p-2 bg-indigo-50 rounded-lg text-indigo-600 ${isRtl ? 'ml-4' : 'mr-4'}`}>
                    <FileText className="w-6 h-6" />
                </div>
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Master Resume</h3>
                    <p className="text-sm text-slate-500">The base content used for AI customization.</p>
                </div>
            </div>
        </div>

        <div className="space-y-4">
             <div className="relative group">
                <input 
                    type="file" 
                    accept=".txt"
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" 
                />
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center bg-slate-50 group-hover:border-indigo-500 group-hover:bg-indigo-50 transition-all flex flex-col items-center justify-center">
                    <Upload className="w-8 h-8 text-indigo-400 mb-2 group-hover:scale-110 transition-transform"/>
                    <span className="text-sm font-medium text-slate-600">
                        {formData.resumeFileName ? `Replace ${formData.resumeFileName}` : "Upload .txt file"}
                    </span>
                </div>
            </div>

            <textarea 
                className="w-full h-48 p-4 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-600 focus:ring-2 focus:ring-indigo-500 outline-none resize-none leading-relaxed"
                value={formData.resumeContent}
                onChange={(e) => handleChange('resumeContent', e.target.value)}
                placeholder="Paste your resume text here..."
            />
        </div>
      </div>

      {/* Danger Zone */}
      <div className="mt-8 border-t border-red-100 pt-8">
          <div className="bg-red-50 p-6 rounded-xl border border-red-100">
               <h3 className="text-red-800 font-bold mb-2 flex items-center">
                   <AlertTriangle className="w-5 h-5 mr-2" /> Danger Zone
               </h3>
               <div className="flex space-x-4">
                   <button 
                        onClick={handleRepairProfile}
                        className="bg-white border border-red-200 text-red-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-50 flex items-center"
                   >
                       <RotateCcw className="w-4 h-4 mr-2" /> Repair Profile
                   </button>
                   <button 
                        onClick={onReset}
                        className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700 flex items-center shadow-sm"
                   >
                       <RotateCcw className="w-4 h-4 mr-2" /> Sign Out
                   </button>
               </div>
          </div>
      </div>

      {/* Sticky Save Button */}
      <div className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-30 transition-transform duration-300 ${isDirty ? 'translate-y-0' : 'translate-y-24'}`}>
          <button 
              onClick={handleSave}
              className="bg-indigo-600 text-white px-6 py-3 rounded-full font-bold shadow-xl hover:bg-indigo-700 hover:scale-105 transition-all flex items-center"
          >
              <Save className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              Save Changes
          </button>
      </div>

      {showSuccess && (
          <div className={`fixed bottom-6 ${isRtl ? 'left-6' : 'right-6'} z-30 bg-green-600 text-white px-6 py-3 rounded-full font-bold shadow-xl flex items-center animate-in slide-in-from-bottom-10 fade-in`}>
              <CheckCircle2 className={`w-5 h-5 ${isRtl ? 'ml-2' : 'mr-2'}`} />
              Saved Successfully
          </div>
      )}
    </div>
  );
};