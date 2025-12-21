import React, { useMemo } from 'react';
import { Job, JobStatus, UserProfile } from '../types';
import { Send, Filter, Users, Star, BarChart3, TrendingUp } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, Cell } from 'recharts';
import { translations } from '../services/localization';

interface DashboardStatsProps {
  jobs: Job[];
  onFilterChange?: (status: string) => void;
  userProfile?: UserProfile;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({ jobs, onFilterChange, userProfile }) => {
  
  // Localization
  const lang = userProfile?.preferences.language || 'en';
  const t = (key: keyof typeof translations['en']) => translations[lang][key] || key;

  // Filter out DETECTED jobs for tracking analytics (only focus on what user is acting on)
  const trackedJobs = useMemo(() => jobs.filter(j => j.status !== JobStatus.DETECTED), [jobs]);

  // Calculate Stats Dynamically
  const stats = useMemo(() => {
    return {
      active: trackedJobs.length,
      applied: trackedJobs.filter(j => j.status === JobStatus.APPLIED_AUTO || j.status === JobStatus.APPLIED_MANUAL).length,
      interviews: trackedJobs.filter(j => j.status === JobStatus.INTERVIEW).length,
      offers: trackedJobs.filter(j => j.status === JobStatus.OFFER).length,
    };
  }, [trackedJobs]);

  // Funnel Data
  const funnelData = [
      { name: 'Saved', value: trackedJobs.length, color: '#94a3b8' },
      { name: 'Applied', value: stats.applied, color: '#6366f1' },
      { name: 'Interview', value: stats.interviews, color: '#8b5cf6' },
      { name: 'Offer', value: stats.offers, color: '#10b981' },
  ];

  // Calculate Chart Data (Last 7 Days) for Activity
  const chartData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' }); 
      
      const count = trackedJobs.filter(job => {
        const jobDate = new Date(job.detectedAt); // Using detectedAt as proxy for activity date
        return jobDate.getDate() === d.getDate() && 
               jobDate.getMonth() === d.getMonth() && 
               jobDate.getFullYear() === d.getFullYear();
      }).length;

      days.push({ name: dateStr, activity: count });
    }
    return days;
  }, [trackedJobs]);

  const handleCardClick = (status: string) => {
      if (onFilterChange) {
          onFilterChange(status);
      }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div 
            className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 transition-colors"
        >
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tracked Jobs</p>
            <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.active}</h3>
            <p className="text-xs text-slate-400 mt-1">Total in your pipeline</p>
          </div>
          <div className="p-3 bg-slate-100 text-slate-600 rounded-lg">
            <Filter className="w-6 h-6" />
          </div>
        </div>
        
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-colors">
          <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Applications Sent</p>
            <h3 className="text-3xl font-bold text-indigo-600 mt-1">{stats.applied}</h3>
            <p className="text-xs text-slate-400 mt-1">
                {stats.active > 0 ? `${Math.round((stats.applied / stats.active) * 100)}% application rate` : '0% rate'}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Send className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-purple-300 transition-colors">
           <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interviews</p>
            <h3 className="text-3xl font-bold text-purple-600 mt-1">{stats.interviews}</h3>
            <p className="text-xs text-slate-400 mt-1">
                {stats.applied > 0 ? `${Math.round((stats.interviews / stats.applied) * 100)}% conversion` : '0% conversion'}
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-green-300 transition-colors">
           <div>
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Offers</p>
            <h3 className="text-3xl font-bold text-green-600 mt-1">{stats.offers}</h3>
            <p className="text-xs text-slate-400 mt-1">Congrats!</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-lg">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Conversion Funnel */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 flex items-center mb-6">
                <BarChart3 className="w-4 h-4 me-2 text-indigo-500" />
                Application Funnel
            </h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={funnelData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                        <XAxis type="number" hide />
                        <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 12, fill: '#64748b', fontWeight: 600}} width={80}/>
                        <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={32}>
                            {funnelData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
          </div>

          {/* Activity Chart */}
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="font-bold text-slate-900 flex items-center mb-6">
                <TrendingUp className="w-4 h-4 me-2 text-indigo-500" />
                Tracker Activity (7 Days)
            </h3>
            <div style={{ width: '100%', height: 250 }}>
                <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                    <linearGradient id="colorActivity" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis 
                    dataKey="name" 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    dy={10}
                    />
                    <YAxis 
                    axisLine={false} 
                    tickLine={false} 
                    tick={{fill: '#94a3b8', fontSize: 12}}
                    allowDecimals={false}
                    />
                    <Tooltip 
                    contentStyle={{
                        backgroundColor: '#fff', 
                        borderRadius: '8px', 
                        border: '1px solid #e2e8f0',
                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
                    }}
                    itemStyle={{color: '#475569', fontSize: '12px', fontWeight: 600}}
                    cursor={{stroke: '#cbd5e1', strokeWidth: 1}}
                    />
                    <Area 
                    type="monotone" 
                    dataKey="activity" 
                    stroke="#6366f1" 
                    strokeWidth={3}
                    fillOpacity={1} 
                    fill="url(#colorActivity)" 
                    />
                </AreaChart>
                </ResponsiveContainer>
            </div>
          </div>
      </div>
    </div>
  );
};