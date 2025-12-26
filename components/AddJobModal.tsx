
import React, { useState } from 'react';
import { Job, JobStatus } from '../types';
import { X, Building2, MapPin, Globe, Plus, Briefcase, Wand2, Loader2, Link2, ExternalLink, Check } from 'lucide-react';
import { extractJobFromUrl } from '../services/geminiService';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (job: Job) => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasExtracted, setHasExtracted] = useState(false);
  const [sources, setSources] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    title: '',
    company: '',
    location: '',
    salaryRange: '',
    applicationUrl: '',
    description: '',
    requirements: ''
  });

  if (!isOpen) return null;

  const handleAutoFill = async () => {
    if (!formData.applicationUrl) return;
    
    setIsAnalyzing(true);
    setSources([]);
    try {
      const result = await extractJobFromUrl(formData.applicationUrl);
      
      setFormData(prev => ({
        ...prev,
        title: result.data.title || prev.title,
        company: result.data.company || prev.company,
        location: result.data.location || prev.location,
        description: result.data.description || prev.description,
        requirements: result.data.requirements || prev.requirements
      }));
      setSources(result.sources);
      setHasExtracted(true);
    } catch (error) {
      console.error("Failed to auto-fill", error);
      alert("Could not extract details. Please enter manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newJob: Job = {
      id: `manual-${Date.now()}`,
      title: formData.title || 'Untitled Role',
      company: formData.company || 'Check Description',
      location: formData.location || 'Remote',
      salaryRange: formData.salaryRange,
      description: formData.description,
      source: 'Imported Link', 
      detectedAt: new Date().toISOString(),
      status: JobStatus.SAVED,
      matchScore: 100, 
      requirements: formData.requirements ? formData.requirements.split(',').map(r => r.trim()).filter(r => r) : [],
      applicationUrl: formData.applicationUrl,
      notes: sources.length > 0 ? `Verified via AI Search` : 'Added manually'
    };

    onAdd(newJob);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 border border-slate-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/90 backdrop-blur-md z-10">
          <h2 className="text-xl font-black text-slate-900 flex items-center tracking-tight uppercase">
            <Plus className="w-6 h-6 mr-3 text-indigo-600" />
            Add Job Lead
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          {/* AI Extraction Bar */}
          <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100/50">
            <label className="block text-[10px] font-black text-indigo-900 mb-3 uppercase tracking-[0.2em] flex items-center">
              <Link2 className="w-4 h-4 mr-2" />
              Intelligence Auto-Fill
            </label>
            <div className="flex gap-3">
               <div className="relative flex-1">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <input 
                    type="url" 
                    className="w-full pl-11 pr-4 py-3.5 border border-white rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold bg-white shadow-inner"
                    placeholder="Paste Job URL (LinkedIn, Indeed, Career Site)..."
                    value={formData.applicationUrl}
                    onChange={e => setFormData({...formData, applicationUrl: e.target.value})}
                  />
               </div>
               <button 
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!formData.applicationUrl || isAnalyzing}
                  className={`px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl transition-all flex items-center justify-center ${
                    hasExtracted ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white hover:bg-indigo-700'
                  }`}
               >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : hasExtracted ? <Check className="w-4 h-4 mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  {isAnalyzing ? 'Mapping...' : hasExtracted ? 'Updated' : 'Extract'}
               </button>
            </div>
          </div>

          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Title</label>
                <div className="relative">
                  <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="text" className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Company</label>
                <div className="relative">
                  <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input required type="text" className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" value={formData.company} onChange={e => setFormData({...formData, company: e.target.value})} />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input type="text" className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Salary Estimate</label>
                <input type="text" className="w-full px-4 py-3.5 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-bold text-slate-700" placeholder="e.g. $120k - $150k" value={formData.salaryRange} onChange={e => setFormData({...formData, salaryRange: e.target.value})} />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Job Description</label>
              <textarea required className="w-full p-6 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-600 leading-relaxed h-64 resize-none font-medium" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Paste full job description here..." />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-3.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
            <button type="submit" disabled={!formData.title || !formData.company} className="px-10 py-3.5 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all disabled:opacity-50">Create Job</button>
          </div>
        </form>
      </div>
    </div>
  );
};
