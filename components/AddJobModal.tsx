import React, { useState } from 'react';
import { Job, JobStatus } from '../types';
import { X, Link as LinkIcon, Loader2, Sparkles } from 'lucide-react';
import { extractJobFromUrl } from '../services/geminiService';

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (job: Job) => void;
}

export const AddJobModal: React.FC<AddJobModalProps> = ({ isOpen, onClose, onAdd }) => {
  const [jobUrl, setJobUrl] = useState('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState('');

  const handleExtract = async () => {
    if (!jobUrl.trim()) {
      setError('Please enter a job URL');
      return;
    }

    // Validate URL format
    try {
      new URL(jobUrl);
    } catch {
      setError('Please enter a valid URL');
      return;
    }

    setIsExtracting(true);
    setError('');

    try {
      const { data, sources } = await extractJobFromUrl(jobUrl);
      
      // Create job object
      const newJob: Job = {
        id: `manual-${Date.now()}`,
        title: data.title || 'Job Title',
        company: data.company || 'Company',
        location: data.location || 'Location not specified',
        salaryRange: data.salaryRange || '',
        description: data.description || 'No description available',
        source: 'Imported Link',
        detectedAt: new Date().toISOString(),
        status: JobStatus.SAVED,
        matchScore: 75,
        requirements: Array.isArray(data.requirements) ? data.requirements : [],
        applicationUrl: jobUrl,
        logoUrl: '',
        notes: sources.length > 0 ? `Extracted from ${sources.length} sources` : ''
      };

      onAdd(newJob);
      setJobUrl('');
      onClose();
    } catch (err: any) {
      console.error('Job extraction error:', err);
      setError('Failed to extract job details. Please try again or enter details manually.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isExtracting) {
      handleExtract();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-slate-200">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 rounded-2xl">
              <Sparkles className="w-6 h-6 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-900">Add Job from URL</h2>
              <p className="text-sm text-slate-500 font-medium mt-1">
                Paste a job posting link and AI will extract the details
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
            disabled={isExtracting}
          >
            <X className="w-5 h-5 text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-8 space-y-6">
          {/* URL Input */}
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

          {/* Supported Platforms */}
          <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100">
            <p className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-3">
              Supported Platforms
            </p>
            <div className="flex flex-wrap gap-2">
              {['LinkedIn', 'Indeed', 'Glassdoor', 'Monster', 'ZipRecruiter', 'Company Sites'].map((platform) => (
                <span
                  key={platform}
                  className="px-3 py-1.5 bg-white text-indigo-700 rounded-xl text-xs font-bold border border-indigo-200"
                >
                  {platform}
                </span>
              ))}
            </div>
          </div>

          {/* How it works */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <p className="text-xs font-black text-slate-600 uppercase tracking-widest mb-2">
              How it works
            </p>
            <ol className="space-y-2 text-xs text-slate-600 font-medium">
              <li className="flex gap-2">
                <span className="text-indigo-600 font-black">1.</span>
                <span>AI extracts job title, company, and description from the URL</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-600 font-black">2.</span>
                <span>Job is added to your Applications list</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-600 font-black">3.</span>
                <span>You can then generate tailored resume & cover letter</span>
              </li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-8 border-t border-slate-200 bg-slate-50 rounded-b-3xl">
          <button
            onClick={onClose}
            className="px-6 py-3 rounded-xl text-sm font-black text-slate-600 hover:bg-slate-200 transition-colors uppercase tracking-widest"
            disabled={isExtracting}
          >
            Cancel
          </button>
          <button
            onClick={handleExtract}
            disabled={isExtracting || !jobUrl.trim()}
            className="px-8 py-3 bg-indigo-600 text-white rounded-xl text-sm font-black uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isExtracting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Extracting...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                Extract Job
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};