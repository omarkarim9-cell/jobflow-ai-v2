import React, { useState, useMemo } from 'react';
import { Job, JobStatus } from './types';
import { Search, ExternalLink, Trash2, ArrowUpDown, Archive, CheckCircle2, Clock, XCircle, Briefcase } from 'lucide-react';

interface ApplicationTrackerProps {
  jobs: Job[];
  onUpdateStatus: (id: string, status: JobStatus) => void;
  onDelete: (id: string) => void;
  onSelect: (job: Job) => void;
}

export const ApplicationTracker: React.FC<ApplicationTrackerProps> = ({ jobs, onUpdateStatus, onDelete, onSelect }) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');
  const [sortConfig, setSortConfig] = useState<{ key: keyof Job, direction: 'asc' | 'desc' }>({ key: 'detectedAt', direction: 'desc' });

  // Categorize Jobs
  const { activeJobs, archivedJobs } = useMemo(() => {
    const active: Job[] = [];
    const archived: Job[] = [];

    jobs.forEach(j => {
        if (j.status === JobStatus.DETECTED) return; // Ignore scanner items
        
        if (j.status === JobStatus.REJECTED || j.status === JobStatus.OFFER) {
            archived.push(j);
        } else {
            active.push(j); // Saved, Applied, Interview
        }
    });
    
    return { activeJobs: active, archivedJobs: archived };
  }, [jobs]);

  const currentList = activeTab === 'active' ? activeJobs : archivedJobs;

  const filteredJobs = useMemo(() => {
    let result = currentList;

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(j => 
        j.title.toLowerCase().includes(q) || 
        j.company.toLowerCase().includes(q)
      );
    }

    return result.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentList, search, sortConfig]);

  const handleSort = (key: keyof Job) => {
    setSortConfig(current => ({
      key,
      direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const getStatusBadge = (status: JobStatus) => {
      switch (status) {
          case JobStatus.SAVED: 
            return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200 flex items-center w-fit"><Clock className="w-3 h-3 mr-1"/> Saved</span>;
          case JobStatus.APPLIED_AUTO: 
            return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Applied (AI)</span>;
          case JobStatus.APPLIED_MANUAL: 
            return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Applied</span>;
          case JobStatus.INTERVIEW: 
            return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200 flex items-center w-fit"><Briefcase className="w-3 h-3 mr-1"/> Interview</span>;
          case JobStatus.OFFER: 
            return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Offer</span>;
          case JobStatus.REJECTED: 
            return <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100 flex items-center w-fit"><XCircle className="w-3 h-3 mr-1"/> Not Interested</span>;
          default: return null;
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-6 bg-white border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-4">My Applications</h1>
        
        <div className="flex items-center gap-4 mb-4">
             <button 
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'active' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
             >
                 Active Pipeline ({activeJobs.length})
             </button>
             <button 
                onClick={() => setActiveTab('archived')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${activeTab === 'archived' ? 'bg-slate-600 text-white border-slate-600' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}`}
             >
                 Archived / Not Interested ({archivedJobs.length})
             </button>
        </div>

        <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search application history..." 
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden min-w-[800px]">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('company')}>
                    <div className="flex items-center">Company <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('title')}>
                    <div className="flex items-center">Role <ArrowUpDown className="w-3 h-3 ml-1 opacity-50"/></div>
                </th>
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('status')}>Status</th>
                <th className="p-4 cursor-pointer hover:bg-slate-100" onClick={() => handleSort('detectedAt')}>Date</th>
                <th className="p-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJobs.length > 0 ? (
                filteredJobs.map(job => (
                  <tr key={job.id} className="hover:bg-slate-50/80 transition-colors group">
                    <td className="p-4">
                      <div className="flex items-center">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-sm mr-3">
                          {job.company.charAt(0)}
                        </div>
                        <span className="font-medium text-slate-900">{job.company}</span>
                      </div>
                    </td>
                    <td className="p-4">
                      <div className="font-medium text-slate-700">{job.title}</div>
                      <div className="text-xs text-slate-400">{job.location}</div>
                    </td>
                    <td className="p-4">
                        <div className="flex items-center gap-2">
                             {getStatusBadge(job.status)}
                             {/* Quick Status Changer */}
                             <select 
                                value={job.status}
                                onChange={(e) => onUpdateStatus(job.id, e.target.value as JobStatus)}
                                className="w-4 h-4 opacity-0 group-hover:opacity-100 cursor-pointer absolute ml-20"
                                title="Change Status"
                             >
                                 <option value={JobStatus.SAVED}>Saved</option>
                                 <option value={JobStatus.APPLIED_MANUAL}>Applied</option>
                                 <option value={JobStatus.INTERVIEW}>Interview</option>
                                 <option value={JobStatus.OFFER}>Offer</option>
                                 <option value={JobStatus.REJECTED}>Not Interested</option>
                             </select>
                        </div>
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {new Date(job.detectedAt).toLocaleDateString()}
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => onSelect(job)}
                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="View Details"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </button>
                        <button 
                            onClick={() => {
                                if(window.confirm('Permanently delete this record?')) {
                                    onDelete(job.id);
                                }
                            }}
                            className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center text-slate-400">
                    <div className="flex flex-col items-center">
                       <Archive className="w-12 h-12 mb-3 text-slate-200" />
                       <p className="font-medium">No {activeTab} applications found.</p>
                       <p className="text-sm mt-1">
                           {activeTab === 'active' ? 'Jobs you save or apply to will appear here.' : 'Rejected or archived jobs appear here.'}
                       </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};