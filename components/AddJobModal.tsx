
import React, { useState } from 'react';
import { Job, JobStatus } from '../types';
import { X, Building2, MapPin, Globe, FileText, Plus, Briefcase, Wand2, Loader2, Link2 } from 'lucide-react';
import { extractJobFromUrl } from '../services/geminiService';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (job: Job) => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
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
    try {
      const result = await extractJobFromUrl(formData.applicationUrl);
      
      // Check for failed extraction
      if (!result.title || result.title === 'Unknown' || result.title === 'Unknown Role') {
          alert("The link provided does not contain readable job details (it might be an opaque tracking link). Please fill in the details manually.");
          // Do not overwrite fields with "Unknown"
          return;
      }

      setFormData(prev => ({
        ...prev,
        title: result.title,
        company: result.company,
        location: result.location,
        description: result.description,
        requirements: result.requirements
      }));
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
      source: 'LinkedIn', // Default for manual
      detectedAt: new Date().toISOString(),
      status: JobStatus.SAVED,
      matchScore: 0, // Will be analyzed later
      requirements: formData.requirements.split(',').map(r => r.trim()).filter(r => r),
      applicationUrl: formData.applicationUrl,
      notes: 'Added manually via link'
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
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in fade-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 className="text-lg font-bold text-slate-900 flex items-center">
            <Plus className="w-5 h-5 mr-2 text-indigo-600" />
            Add Job via Link
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          
          {/* URL Auto-Fill Section */}
          <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
            <label className="block text-sm font-bold text-indigo-900 mb-2 flex items-center">
              <Link2 className="w-4 h-4 mr-2" />
              Paste Job Link to Auto-Fill
            </label>
            <div className="flex space-x-2">
               <div className="relative flex-1">
                  <Globe className="absolute left-3 top-2.5 w-4 h-4 text-indigo-400" />
                  <input 
                    type="url" 
                    className="w-full pl-9 pr-3 py-2.5 border border-indigo-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm bg-white"
                    placeholder="https://www.linkedin.com/jobs/view/..."
                    value={formData.applicationUrl}
                    onChange={e => setFormData({...formData, applicationUrl: e.target.value})}
                  />
               </div>
               <button 
                  type="button"
                  onClick={handleAutoFill}
                  disabled={!formData.applicationUrl || isAnalyzing}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-70 flex items-center"
               >
                  {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Wand2 className="w-4 h-4 mr-2" />}
                  {isAnalyzing ? 'Analyzing...' : 'Auto-Fill'}
               </button>
            </div>
            <p className="text-xs text-indigo-600 mt-2">
              Our AI will analyze the link to extract the company, title, and generate a description.
            </p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Job Details (Editable)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Job Title *</label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. Senior React Engineer"
                    value={formData.title}
                    onChange={e => setFormData({...formData, title: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Company *</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    required
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. Acme Corp"
                    value={formData.company}
                    onChange={e => setFormData({...formData, company: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                    placeholder="e.g. Remote, NY"
                    value={formData.location}
                    onChange={e => setFormData({...formData, location: e.target.value})}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Salary (Optional)</label>
                <input 
                   type="text" 
                   className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                   placeholder="e.g. $120k - $150k"
                   value={formData.salaryRange}
                   onChange={e => setFormData({...formData, salaryRange: e.target.value})}
                />
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">Job Description *</label>
              <div className="relative">
                <FileText className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <textarea 
                  required
                  className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm h-32"
                  placeholder="Job description will be auto-filled here..."
                  value={formData.description}
                  onChange={e => setFormData({...formData, description: e.target.value})}
                />
              </div>
            </div>

            <div>
               <label className="block text-sm font-medium text-slate-700 mb-1">Key Requirements (Comma separated)</label>
               <input 
                  type="text" 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm"
                  placeholder="React, TypeScript, Node.js"
                  value={formData.requirements}
                  onChange={e => setFormData({...formData, requirements: e.target.value})}
               />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-slate-100 mt-2">
            <button 
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-medium"
            >
              Cancel
            </button>
            <button 
              type="submit"
              disabled={!formData.title || !formData.description}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm disabled:opacity-50"
            >
              Save Job
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
