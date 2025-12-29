import React, { useState } from 'react';
import { Job, JobStatus } from '../types';
import { X, Link as LinkIcon, Loader2, Sparkles, Edit3 } from 'lucide-react';
import { extractJobFromUrl } from '../services/geminiService';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (job: Job) => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [mode, setMode] = useState<'url' | 'manual'>('url');
  const [jobUrl, setJobUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');
  
  // Manual entry fields
  const [manualData, setManualData] = useState({
    title: '',
    company: '',
    location: '',
    description: '',
    url: ''
  });

  const handleExtractFromUrl = async () => {
    if (!jobUrl.trim()) {
      setError('Please enter a job URL');
      return;
    }

    try {
      new URL(jobUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsExtracting(true);
    setError('');

    try {
      const { data } = await extractJobFromUrl(jobUrl);
      
      const extractionFailed = data.title.includes('Failed') || data.title.includes('Manual Entry');
      
      if (extractionFailed) {
        // Switch to manual mode with URL pre-filled
        setMode('manual');
        setManualData({ ...manualData, url: jobUrl });
        setError('Auto-extraction failed. Please enter details manually.');
        setIsExtracting(false);
        return;
      }
      
      const newJob: Job = {
        id: `manual-${Date.now()}`,
        title: data.title,
        company: data.company,
        location: data.location || 'Remote',
        salaryRange: data.salaryRange || '',
        description: data.description,
        source: 'Imported Link',
        detectedAt: new Date().toISOString(),
        status: JobStatus.SAVED,
        matchScore: 75,
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
        applicationUrl: jobUrl,
        logoUrl: '',
        notes: 'Extracted via AI'
      };

      onAdd(newJob);
      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Job extraction error:', err);
      setError('Extraction failed. Switch to manual entry?');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleManualSubmit = () => {
    if (!manualData.title.trim() || !manualData.company.trim()) {
      setError('Title and Company are required');
      return;
    }

    const newJob: Job = {
      id: `manual-${Date.now()}`,
      title: manualData.title,
      company: manualData.company,
      location: manualData.location || 'Remote',
      salaryRange: '',
      description: manualData.description || 'No description provided',
      source: 'Imported Link',
      detectedAt: new Date().toISOString(),
      status: JobStatus.SAVED,
      matchScore: 70,
      requirements: [],
      applicationUrl: manualData.url || '',
      logoUrl: '',
      notes: 'Manually entered'
    };

    onAdd(newJob);
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setJobUrl('');
    setManualData({ title: '', company: '', location: '', description: '', url: '' });
    setError('');
    setMode('url');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExtracting && mode === 'url') {
      handleExtractFromUrl();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-200 sticky top-0 bg-white z-10">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              {mode === 'url' ? <Sparkles className="w-6 h-6 text-indigo-600" /> : <Edit3 className="w-6 h-6 text-indigo-600" />}
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Add Job</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                {mode === 'url' ? 'Extract from URL or enter manually' : 'Enter job details manually'}
              </p>
            </div>
          </div>
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            disabled={isExtracting}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="p-6 border-b border-slate-200">
          <div className="flex gap-2 bg-slate-100 rounded-xl p-1">
            <button
              onClick={() => setMode('url')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                mode === 'url' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Sparkles className="w-4 h-4 inline mr-2" />
              AI Extract
            </button>
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
                mode === 'manual' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-600'
              }`}
            >
              <Edit3 className="w-4 h-4 inline mr-2" />
              Manual Entry
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {mode === 'url' ? (
            <>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">
                  Job Posting URL
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                  <input
                    type="url"
                    value={jobUrl}
                    onChange={(e) => {
                      setJobUrl(e.target.value);
                      setError('');
                    }}
                    onKeyPress={handleKeyPress}
                    placeholder="https://linkedin.com/jobs/... or indeed.com/..."
                    className="w-full pl-12 pr-4 py-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm font-medium text-slate-700 placeholder:text-slate-400"
                    disabled={isExtracting}
                  />
                </div>
                {error && (
                  <p className="text-xs font-bold text-red-600 flex items-center gap-2">
                    <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                    {error}
                  </p>
                )}
              </div>

              <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
                <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3">
                  Supported Platforms
                </p>
                <div className="flex flex-wrap gap-2">
                  {['LinkedIn', 'Indeed', 'Glassdoor', 'Monster', 'Company Sites'].map((platform) => (
                    <span
                      key={platform}
                      className="px-3 py-1.5 bg-white text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Job Title *
                  </label>
                  <input
                    type="text"
                    value={manualData.title}
                    onChange={(e) => setManualData({ ...manualData, title: e.target.value })}
                    placeholder="e.g. Senior Frontend Developer"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Company *
                  </label>
                  <input
                    type="text"
                    value={manualData.company}
                    onChange={(e) => setManualData({ ...manualData, company: e.target.value })}
                    placeholder="e.g. Google"
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={manualData.location}
                    onChange={(e) => setManualData({ ...manualData, location: e.target.value })}
                    placeholder="e.g. Remote, San Francisco, etc."
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Application URL
                  </label>
                  <input
                    type="url"
                    value={manualData.url}
                    onChange={(e) => setManualData({ ...manualData, url: e.target.value })}
                    placeholder="https://..."
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest block mb-2">
                    Job Description
                  </label>
                  <textarea
                    value={manualData.description}
                    onChange={(e) => setManualData({ ...manualData, description: e.target.value })}
                    placeholder="Paste job description here..."
                    rows={6}
                    className="w-full p-4 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none text-sm font-medium resize-none"
                  />
                </div>
              </div>

              {error && (
                <p className="text-xs font-bold text-red-600 flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-600 rounded-full"></span>
                  {error}
                </p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-8 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
          <button
            onClick={() => { resetForm(); onClose(); }}
            className="px-6 py-3 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-200 transition-colors uppercase tracking-widest"
            disabled={isExtracting}
          >
            Cancel
          </button>
          <button
            onClick={mode === 'url' ? handleExtractFromUrl : handleManualSubmit}
            disabled={(mode === 'url' && (!jobUrl.trim() || isExtracting)) || (mode === 'manual' && (!manualData.title.trim() || !manualData.company.trim()))}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : mode === 'url' ? (
              <>
                <Sparkles className="w-4 h-4" />
                Extract Job
              </>
            ) : (
              <>
                <Edit3 className="w-4 h-4" />
                Add Job
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};