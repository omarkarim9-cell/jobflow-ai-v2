
import React from 'react';
import { Job, JobStatus } from '../types';
import { Building2, MapPin, Calendar, StickyNote, Download, Send, Wand2 } from 'lucide-react';
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
    openSafeApplicationUrl(job);
  };

  const docsReady = !!job.customizedResume;

  return (
    <div 
      onClick={() => onClick(job)}
      className={`p-4 mb-3 rounded-xl border cursor-pointer transition-all duration-200 relative group ${
        isSelected 
          ? 'bg-white border-indigo-500 shadow-md ring-1 ring-indigo-500' 
          : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center gap-3 overflow-hidden">
           {/* Checkbox for Bulk Selection */}
           <div 
             onClick={handleCheckboxClick}
             className={`w-5 h-5 rounded border flex items-center justify-center transition-colors shrink-0 ${
               isChecked ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400 bg-white'
             }`}
           >
             {isChecked && <div className="w-2.5 h-2.5 bg-white rounded-sm" />}
           </div>

           <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center text-slate-500 font-bold text-lg shrink-0">
             {job.logoUrl ? <img src={job.logoUrl} alt={job.company} className="w-full h-full object-cover rounded-lg"/> : job.company.charAt(0)}
           </div>
           <div className="min-w-0 flex-1">
             <h3 className="font-semibold text-slate-900 leading-tight truncate pe-2">{job.title}</h3>
             <p className="text-sm text-slate-500 flex items-center mt-0.5 truncate">
               <Building2 className="w-3 h-3 me-1 shrink-0" /> {job.company}
             </p>
           </div>
        </div>
        <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border whitespace-nowrap shrink-0 ${getStatusColor(job.status)}`}>
          {job.status}
        </span>
      </div>

      <div className="flex items-center gap-4 text-xs text-slate-500 mt-3 ms-8">
        <span className="flex items-center truncate">
          <MapPin className="w-3 h-3 me-1 shrink-0" /> {job.location}
        </span>
        <span className="flex items-center shrink-0">
          <Calendar className="w-3 h-3 me-1 shrink-0" /> {new Date(job.detectedAt).toLocaleDateString()}
        </span>
        {job.notes && (
            <span className="flex items-center text-yellow-600 bg-yellow-50 px-1.5 py-0.5 rounded" title="Has Notes">
                <StickyNote className="w-3 h-3 me-1" /> Note
            </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-between ms-8">
         <div className="flex items-center gap-1">
            <div className="text-xs font-medium text-slate-400">Match:</div>
            <div className={`text-xs font-bold ${job.matchScore > 80 ? 'text-green-600' : 'text-yellow-600'}`}>
              {job.matchScore}%
            </div>
         </div>
         
         <div className="flex gap-2">
            {docsReady && (
                <>
                    <button 
                        onClick={(e) => handleDownload(e, job.customizedResume!, `${job.company.replace(/\s+/g, '_')}_Resume.txt`)}
                        className="text-xs bg-white text-slate-600 hover:text-indigo-600 border border-slate-200 hover:border-indigo-200 px-2 py-1 rounded flex items-center transition-colors shadow-sm"
                        title="Download Resume"
                    >
                        <Download className="w-3 h-3" />
                    </button>
                </>
            )}

            {/* Apply Button - Always visible if URL exists */}
            <button 
                onClick={handleApply}
                className="text-xs bg-green-600 text-white hover:bg-green-700 px-3 py-1 rounded border border-green-600 font-medium flex items-center transition-colors shadow-sm"
            >
                Apply <Send className="w-3 h-3 ms-1" />
            </button>

            {/* Auto-Apply Button (only if docs NOT ready yet) */}
            {!docsReady && (job.status === JobStatus.DETECTED || job.status === JobStatus.SAVED) && (
                 <button 
                   onClick={(e) => onAutoApply(e, job)}
                   className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-2 py-1 rounded border border-indigo-200 font-medium flex items-center transition-colors"
                 >
                    <Wand2 className="w-3 h-3 me-1" />
                    Auto-Apply
                 </button>
            )}
         </div>
      </div>
    </div>
  );
};
