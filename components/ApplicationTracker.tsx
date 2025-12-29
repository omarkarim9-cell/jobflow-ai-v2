
import React, { useState, useMemo } from 'react';
import { Job, JobStatus } from '../types';
import { Search, ExternalLink, Trash2, ArrowUpDown, Archive, CheckCircle2, Clock, XCircle, Briefcase, Download } from 'lucide-react';

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

  const { activeJobs, archivedJobs } = useMemo(() => {
    const active: Job[] = [];
    const archived: Job[] = [];
    jobs.forEach(j => {
        if (j.status === JobStatus.DETECTED) return;
        if (j.status === JobStatus.REJECTED || j.status === JobStatus.OFFER) archived.push(j);
        else active.push(j);
    });
    return { activeJobs: active, archivedJobs: archived };
  }, [jobs]);

  const currentList = activeTab === 'active' ? activeJobs : archivedJobs;

  const filteredJobs = useMemo(() => {
    let result = currentList;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(j => j.title.toLowerCase().includes(q) || j.company.toLowerCase().includes(q));
    }
    return result.sort((a, b) => {
      const aVal = a[sortConfig.key] || '';
      const bVal = b[sortConfig.key] || '';
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [currentList, search, sortConfig]);

  const handleExportCsv = () => {
    const headers = ['Title', 'Company', 'Location', 'Status', 'Date Detected', 'URL'];
    const rows = filteredJobs.map(j => [
        j.title, 
        j.company, 
        j.location, 
        j.status, 
        new Date(j.detectedAt).toLocaleDateString(), 
        j.applicationUrl || ''
    ]);
    
    const csvContent = [headers, ...rows].map(e => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `JobFlow_Export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getStatusBadge = (status: JobStatus) => {
      switch (status) {
          case JobStatus.SAVED: return <span className="bg-slate-100 text-slate-700 px-2 py-1 rounded text-xs font-bold border border-slate-200 flex items-center w-fit"><Clock className="w-3 h-3 mr-1"/> Saved</span>;
          case JobStatus.APPLIED_AUTO: return <span className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded text-xs font-bold border border-indigo-200 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Applied (AI)</span>;
          case JobStatus.APPLIED_MANUAL: return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded text-xs font-bold border border-blue-200 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Applied</span>;
          case JobStatus.INTERVIEW: return <span className="bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold border border-purple-200 flex items-center w-fit"><Briefcase className="w-3 h-3 mr-1"/> Interview</span>;
          case JobStatus.OFFER: return <span className="bg-green-100 text-green-700 px-2 py-1 rounded text-xs font-bold border border-green-200 flex items-center w-fit"><CheckCircle2 className="w-3 h-3 mr-1"/> Offer</span>;
          case JobStatus.REJECTED: return <span className="bg-red-50 text-red-600 px-2 py-1 rounded text-xs font-bold border border-red-100 flex items-center w-fit"><XCircle className="w-3 h-3 mr-1"/> Not Interested</span>;
          default: return null;
      }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      <div className="p-8 bg-white border-b border-slate-200">
        <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-black text-slate-900 tracking-tight uppercase">Application Pipeline</h1>
            <button 
                onClick={handleExportCsv}
                className="flex items-center gap-2 px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-600 hover:bg-slate-50 transition-all shadow-sm"
            >
                <Download className="w-4 h-4" /> Export CSV
            </button>
        </div>
        
        <div className="flex items-center gap-4 mb-6">
             <button onClick={() => setActiveTab('active')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'active' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>Active ({activeJobs.length})</button>
             <button onClick={() => setActiveTab('archived')} className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'archived' ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200 hover:bg-slate-50'}`}>Archived ({archivedJobs.length})</button>
        </div>

        <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-300" />
            <input type="text" placeholder="Filter pipeline by company or role..." className="w-full pl-11 pr-4 py-3.5 border border-slate-200 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white border border-slate-200 rounded-[2rem] shadow-sm overflow-hidden min-w-[900px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <th className="p-6 cursor-pointer hover:text-slate-900" onClick={() => setSortConfig({key: 'company', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Company</th>
                <th className="p-6 cursor-pointer hover:text-slate-900" onClick={() => setSortConfig({key: 'title', direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'})}>Position</th>
                <th className="p-6">Status</th>
                <th className="p-6">Date</th>
                <th className="p-6 text-right">Review</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-50/30 transition-colors group">
                  <td className="p-6 font-bold text-slate-900 flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-sm">{job.company.charAt(0)}</div>
                    {job.company}
                  </td>
                  <td className="p-6">
                    <div className="font-bold text-slate-700 text-sm">{job.title}</div>
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">{job.location}</div>
                  </td>
                  <td className="p-6">{getStatusBadge(job.status)}</td>
                  <td className="p-6 text-xs font-bold text-slate-400">{new Date(job.detectedAt).toLocaleDateString()}</td>
                  <td className="p-6 text-right">
                    <button onClick={() => onSelect(job)} className="p-3 bg-slate-50 text-slate-400 rounded-xl hover:bg-indigo-50 hover:text-indigo-600 transition-all"><ExternalLink className="w-4 h-4" /></button>
                  </td>
                </tr>
              ))}
              {filteredJobs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-20 text-center">
                    <Archive className="w-12 h-12 text-slate-100 mx-auto mb-4" />
                    <p className="text-xs font-black text-slate-300 uppercase tracking-widest">No matching records found.</p>
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
