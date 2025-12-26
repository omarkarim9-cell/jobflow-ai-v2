
import React, { useState } from 'react';
import { Job, JobStatus } from '../types';
import { X, Building2, MapPin, Globe, FileText, Plus, Briefcase, Wand2, Loader2, Link2, ExternalLink } from 'lucide-react';
import { extractJobFromUrl } from '../services/geminiService';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (job: Job) => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
      
      if (!result.data.title || result.data.title === 'Unknown' || result.data.title === 'Unknown Role') {
          alert("The link provided does not contain readable job details. Please fill in the details manually.");
          return;
      }

      setFormData(prev => ({
        ...prev,
        title: result.data.title,
        company: result.data.company,
        location: result.data.location,
        description: result.data.description,
        requirements: result.data.requirements || ''
      }));
      setSources(result.sources);
    } catch (error) {
      console.error("Failed to auto-fill", error);
      alert("Could not auto-extract job details. Please check the URL or fill the details manually.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const newJob: Job = {
      id: `manual-${Date.now()}`,
      title: formData.title || 'Untitled Role',
      company: formData.company || 'Unknown Company',
      location: formData.location || 'Remote',
      salaryRange: formData.salaryRange,
      description: formData.description,
      source: 'LinkedIn', 
      detectedAt: new Date().toISOString(),
      status: JobStatus.SAVED,
      matchScore: 0, 
      requirements: formData.requirements ? formData.requirements.split(',').map(r => r.trim()).filter(r => r) : [],
      applicationUrl: formData.applicationUrl,
      notes: sources.length > 0 ? `Verified via: ${sources.map(s => s.web?.uri).join(', ')}` : 'Added manually'
    };

    onAdd(newJob);
    setFormData({
      title: '',
      company: '',
      location: '',
      salaryRange: '',
      applicationUrl: '',
      description: '',
      requirements: ''
    });
    setSources([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-300 border border-slate-200">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white/80 backdrop-blur-md z-10">
          <h2 className="text-xl font-black text-slate-900 flex items-center tracking-tight">
            <Plus className="w-6 h-6 mr-3 text-indigo-600" />
            Add Job Lead
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-8">
          
          <div className="bg-indigo-50/50 p-6 rounded-[2rem] border border-indigo-100/50">
            <label className="block text-[10px] font-black text-indigo-900 mb-3 uppercase tracking-widest flex items-center">
              <Link2 className="w-4 h-4 mr-2" />
              Intelligence Auto-Fill
            </label>
            <div className="flex gap-3">
               <div className="relative flex-1">
                  <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-400" />
                  <input 
                    type="url" 
                    className="w-full pl-11 pr-4 py-3.5 border border-indigo-200/50 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm font-medium bg-white"
                    placeholder="Paste LinkedIn or Indeed URL..."
                    value={formData.applicationUrl}
                    onChange={e => setFormData({...formData, applicationUrl: e.target.value})}
                  />
               </div>
               <button 
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!formData.applicationUrl || isAnalyzing}
                  className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 disabled:opacity-70 flex items-center transition-all"
               >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  {isAnalyzing ? 'Mapping...' : 'Extract'}
               </button>
            </div>
            {sources.length > 0 && (
                <div className="mt-4 p-4 bg-white/50 rounded-2xl border border-indigo-100">
                    <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2 flex items-center">
                        <Globe className="w-3 h-3 mr-1" /> Grounding Sources
                    </p>
                    <div className="flex flex-wrap gap-2">
                        {sources.map((source, i) => (
                            <a key={i} href={source.web?.uri} target="_blank" rel="noopener" className="text-[10px] font-bold text-slate-500 hover:text-indigo-600 flex items-center bg-white px-2 py-1 rounded-lg border border-slate-100 transition-colors">
                                {source.web?.title || 'Verified Source'} <ExternalLink className="w-2.5 h-2.5 ml-1" />
                            </a>
                        ))}
                    </div>
                </div>
            )}
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
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Description</label>
              <textarea required className="w-full p-6 border border-slate-200 rounded-3xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm text-slate-600 leading-relaxed h-48 resize-none" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
            </div>
          </div>

          <div className="pt-6 flex justify-end gap-3 border-t border-slate-100">
            <button type="button" onClick={onClose} className="px-6 py-3.5 text-xs font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors">Cancel</button>
            <button type="submit" disabled={!formData.title || !formData.description} className="px-8 py-3.5 bg-slate-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl transition-all disabled:opacity-50">Create Job</button>
          </div>
        </form>
      </div>
    </div>
  );
};
