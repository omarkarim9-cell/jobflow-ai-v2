
import React from 'react';
import { Job, JobStatus } from '../types';
import { Building2, MapPin, Calendar, StickyNote, FileText, Sparkles, ExternalLink, Eye } from 'lucide-react';
import { openSafeApplicationUrl } from '../services/automationService';

interface JobCardProps {
  job: Job;
  onClick: (job: Job) => void;
  isSelected: boolean;
  isChecked: boolean;
  onToggleCheck: (id: string) => void;
  onAutoApply: (e: React.MouseEvent, job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onClick, isSelected, isChecked, onToggleCheck, onAutoApply }) => {
  const getStatusColor = (status: JobStatus) => {
    switch (status) {
      case JobStatus.DETECTED: return 'bg-blue-100 text-blue-700 border-blue-200';
      case JobStatus.SAVED: return 'bg-indigo-50 text-indigo-600 border-indigo-200';
      case JobStatus.APPLIED_AUTO: return 'bg-green-100 text-green-700 border-green-200';
      case JobStatus.APPLIED_MANUAL: return 'bg-yellow-100 text-yellow-700 border-yellow-200';
      case JobStatus.REJECTED: return 'bg-red-100 text-red-700 border-red-200';
      case JobStatus.INTERVIEW: return 'bg-purple-100 text-purple-700 border-purple-200';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const handleCheckboxClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleCheck(job.id);
  };

  const handleDownload = (e: React.MouseEvent, content: string, filename: string) => {
    e.stopPropagation();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleApply = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (job.applicationUrl) {
      openSafeApplicationUrl(job);
    }
  };

  const docsReady = !!job.customizedResume;
  const letterReady = !!job.coverLetter;

  return (
    <div 
      onClick={() => onClick(job)}
      className={`p-5 mb-3 rounded-2xl border cursor-pointer transition-all duration-300 relative group ${
        isSelected 
          ? 'bg-white border-indigo-500 shadow-xl ring-1 ring-indigo-500' 
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-lg'
      }`}
    >
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-3 overflow-hidden">
           {/* Checkbox for Bulk Selection */}
           <div 
             onClick={handleCheckboxClick}
             className={`w-6 h-6 rounded-lg border flex items-center justify-center transition-all shrink-0 ${
               isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400 bg-white'
             }`}
           >
             {isChecked && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
           </div>

           <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl shrink-0 border border-slate-100">
             {job.logoUrl ? <img src={job.logoUrl} alt={job.company} className="w-full h-full object-cover rounded-xl"/> : job.company.charAt(0)}
           </div>
           <div className="min-w-0 flex-1">
             <div className="flex items-center gap-1.5">
                <h3 className="font-bold text-slate-900 leading-tight truncate pe-2">{job.title}</h3>
                <button 
                  onClick={handleApply}
                  className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-indigo-600 transition-colors"
                  title="Open Source Link"
                >
                  <ExternalLink className="w-3 h-3" />
                </button>
             </div>
             <p className="text-xs text-slate-500 font-medium flex items-center mt-1 truncate">
               <Building2 className="w-3 h-3 me-1.5 shrink-0" /> {job.company}
             </p>
           </div>
        </div>
        <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-lg border whitespace-nowrap shrink-0 ${getStatusColor(job.status)}`}>
          {job.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-4 ms-9">
        <span className="flex items-center truncate">
          <MapPin className="w-3.5 h-3.5 me-1.5 shrink-0 text-slate-300" /> {job.location}
        </span>
        <span className="flex items-center shrink-0">
          <Calendar className="w-3.5 h-3.5 me-1.5 shrink-0 text-slate-300" /> {new Date(job.detectedAt).toLocaleDateString()}
        </span>
      </div>

      <div className="mt-5 flex items-center justify-between ms-9">
         <div className="flex items-center gap-1.5">
            <div className="text-[10px] font-black text-slate-300 uppercase">Analysis:</div>
            <div className={`text-xs font-black ${job.matchScore > 80 ? 'text-green-600' : 'text-amber-600'}`}>
              {job.matchScore}% Fit
            </div>
         </div>
         
         <div className="flex gap-2">
            {docsReady ? (
                <div className="flex gap-1.5">
                    <button 
                        onClick={(e) => handleDownload(e, job.customizedResume!, `${job.company}_Resume.txt`)}
                        className="text-[10px] font-black uppercase tracking-wider bg-white text-indigo-600 hover:bg-indigo-50 border border-indigo-200 px-2.5 py-1.5 rounded-xl flex items-center transition-all shadow-sm"
                        title="Export Tailored Resume"
                    >
                        <FileText className="w-3.5 h-3.5" />
                    </button>
                    {letterReady && (
                        <button 
                            onClick={(e) => handleDownload(e, job.coverLetter!, `${job.company}_Letter.txt`)}
                            className="text-[10px] font-black uppercase tracking-wider bg-white text-purple-600 hover:bg-purple-50 border border-purple-200 px-2.5 py-1.5 rounded-xl flex items-center transition-all shadow-sm"
                            title="Export Cover Letter"
                        >
                            <StickyNote className="w-3.5 h-3.5" />
                        </button>
                    )}
                    <button 
                        onClick={() => onClick(job)}
                        className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-1.5 rounded-xl border border-indigo-600 flex items-center transition-all shadow-md shadow-indigo-100"
                    >
                        Review <Eye className="w-3.5 h-3.5 ms-2" />
                    </button>
                </div>
            ) : (
                <div className="flex gap-1.5">
                  <button 
                    onClick={() => onClick(job)}
                    className="text-[10px] font-black uppercase tracking-wider bg-white text-slate-600 hover:bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 flex items-center transition-all"
                  >
                    Details
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); onAutoApply(e, job); }}
                    className="text-[10px] font-black uppercase tracking-wider bg-indigo-600 text-white hover:bg-indigo-700 px-4 py-2 rounded-xl border border-indigo-600 flex items-center transition-all shadow-lg shadow-indigo-100"
                  >
                    <Sparkles className="w-3.5 h-3.5 me-2" />
                    Tailor Profile
                  </button>
                </div>
            )}
         </div>
      </div>
    </div>
  );
};
