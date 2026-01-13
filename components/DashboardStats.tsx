import React, { useMemo } from 'react';
import { Job, JobStatus, UserProfile } from '../types.ts';
import {
  Send,
  Users,
  Star,
  BarChart3,
  TrendingUp,
  Search,
  Settings as SettingsIcon,
  AlertCircle,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { translations } from '../services/localization';

interface DashboardStatsProps {
  jobs: Job[];
  onFilterChange?: (status: string) => void;
  userProfile?: UserProfile;
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  jobs,
  onFilterChange,
  userProfile,
}) => {
  const lang = userProfile?.preferences?.language || 'en';
  const t = (key: keyof (typeof translations)['en']) =>
    translations[lang][key] || key;

  const trackedJobs = useMemo(
    () => jobs.filter(j => j.status !== JobStatus.DETECTED),
    [jobs]
  );
  const detectedJobsCount = useMemo(
    () => jobs.filter(j => j.status === JobStatus.DETECTED).length,
    [jobs]
  );

  const stats = useMemo(() => {
    return {
      total: jobs.length,
      active: trackedJobs.length,
      applied: trackedJobs.filter(
        j =>
          j.status === JobStatus.APPLIED_AUTO ||
          j.status === JobStatus.APPLIED_MANUAL
      ).length,
      interviews: trackedJobs.filter(
        j => j.status === JobStatus.INTERVIEW
      ).length,
      offers: trackedJobs.filter(j => j.status === JobStatus.OFFER).length,
    };
  }, [jobs, trackedJobs]);

  const funnelData = [
    { name: 'Scanned', value: stats.total, color: '#94a3b8' },
    { name: 'Saved', value: stats.active, color: '#6366f1' },
    { name: 'Applied', value: stats.applied, color: '#8b5cf6' },
    { name: 'Interview', value: stats.interviews, color: '#10b981' },
  ];

  const chartData = useMemo(() => {
    const days: { name: string; activity: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('en-US', { weekday: 'short' });

      const count = jobs.filter(job => {
        const jobDate = new Date(job.detectedAt);
        return (
          jobDate.getDate() === d.getDate() &&
          jobDate.getMonth() === d.getMonth() &&
          jobDate.getFullYear() === d.getFullYear()
        );
      }).length;

      days.push({ name: dateStr, activity: count });
    }
    return days;
  }, [jobs]);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Top banner row */}
      <div className="flex flex-col md:flex-row gap-4">
        {/* Profile Sync banner with button */}
        <div className="flex-1 bg-indigo-600 border border-indigo-500 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-sm text-white">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-10 h-10 bg-indigo-500 rounded-xl flex items-center justify-center text-white shrink-0">
              <SettingsIcon className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs font-black uppercase tracking-tight flex items-center">
                <AlertCircle className="w-3 h-3 mr-1 text-indigo-100" /> Profile
                Sync Required
              </h3>
              <p className="text-[10px] text-indigo-50 font-medium leading-relaxed mt-0.5">
                Verify your <strong>Target Roles</strong> and{' '}
                <strong>Master Resume</strong> in Settings to optimize AI job
                extraction.
              </p>
            </div>
          </div>
          <button
            onClick={() =>
              window.dispatchEvent(
                new CustomEvent('jobflow:navigate-settings')
              )
            }
            className="px-4 py-2 bg-white text-indigo-700 border border-white/0 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-indigo-50 hover:border-indigo-100 transition-all shrink-0"
          >
            Go to Settings
          </button>
        </div>
      </div>

      {/* Metrics cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-slate-300 transition-all hover:shadow-md group">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Total Scanned
            </p>
            <h3 className="text-3xl font-black text-slate-900 mt-1">
              {stats.total}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              {detectedJobsCount} New Leads
            </p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-400 rounded-xl group-hover:bg-slate-100 transition-colors">
            <Search className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-indigo-300 transition-all hover:shadow-md group">
          <div>
            <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              Applications
            </p>
            <h3 className="text-3xl font-black text-indigo-600 mt-1">
              {stats.applied}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              {stats.active > 0
                ? `${Math.round((stats.applied / stats.active) * 100)}% Rate`
                : '0% Rate'}
            </p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-500 rounded-xl group-hover:bg-indigo-100 transition-colors">
            <Send className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-purple-300 transition-all hover:shadow-md group">
          <div>
            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-widest">
              Interviews
            </p>
            <h3 className="text-3xl font-black text-purple-600 mt-1">
              {stats.interviews}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">
              {stats.applied > 0
                ? `${Math.round((stats.interviews / stats.applied) * 100)}% Conv`
                : '0% Conv'}
            </p>
          </div>
          <div className="p-3 bg-purple-50 text-purple-500 rounded-xl group-hover:bg-purple-100 transition-colors">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between hover:border-emerald-300 transition-all hover:shadow-md group">
          <div>
            <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              Offers
            </p>
            <h3 className="text-3xl font-black text-emerald-600 mt-1">
              {stats.offers}
            </h3>
            <p className="text-[10px] text-slate-400 mt-1">Success Target</p>
          </div>
          <div className="p-3 bg-emerald-50 text-emerald-500 rounded-xl group-hover:bg-emerald-100 transition-colors">
            <Star className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center mb-8">
            <BarChart3 className="w-4 h-4 me-2 text-indigo-500" />
            Pipeline Funnel
          </h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <XAxis type="number" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  axisLine={false}
                  tickLine={false}
                  tick={{
                    fontSize: 10,
                    fill: '#94a3b8',
                    fontWeight: 800,
                  }}
                  width={80}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow:
                      '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="value" radius={[0, 6, 6, 0]} barSize={24}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h3 className="text-xs font-black text-slate-900 uppercase tracking-widest flex items-center mb-8">
            <TrendingUp className="w-4 h-4 me-2 text-indigo-500" />
            Activity Trend
          </h3>
          <div style={{ width: '100%', height: 250 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient
                    id="colorActivity"
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="5%"
                      stopColor="#6366f1"
                      stopOpacity={0.1}
                    />
                    <stop
                      offset="95%"
                      stopColor="#6366f1"
                      stopOpacity={0}
                    />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="#f1f5f9"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10, fill: '#94a3b8' }}
                />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: 'none',
                    boxShadow:
                      '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="activity"
                  stroke="#6366f1"
                  strokeWidth={2}
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