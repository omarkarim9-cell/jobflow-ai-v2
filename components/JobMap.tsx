
import React, { useState, useEffect } from 'react';
import { MapPin, Search, Loader2, Navigation, ExternalLink } from 'lucide-react';
import { searchNearbyJobs } from '../services/geminiService';
import { Job } from '../types';

interface JobMapProps {
  onImport: (jobs: Job[]) => void;
  targetRole?: string;
}

export const JobMap: React.FC<JobMapProps> = ({ onImport, targetRole }) => {
  const [loading, setLoading] = useState(false);
  const [nearbyJobs, setNearbyJobs] = useState<Job[]>([]);
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => setCoords({ lat: 40.7128, lng: -74.0060 }) // Default NYC
      );
    }
  }, []);

  const handleSearch = async () => {
    if (!coords) return;
    setLoading(true);
    try {
      const results = await searchNearbyJobs(coords.lat, coords.lng, targetRole || "Software Engineer");
      setNearbyJobs(results);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">Geographic Discovery</h2>
          <p className="text-xs text-slate-400 font-bold uppercase mt-1">Grounding with Google Maps</p>
        </div>
        <button 
          onClick={handleSearch}
          disabled={loading || !coords}
          className="bg-indigo-600 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-700 shadow-xl shadow-indigo-100 transition-all"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
          Find Nearby Jobs
        </button>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-slate-200 rounded-[2.5rem] overflow-hidden relative border-4 border-white shadow-xl flex items-center justify-center">
            <div className="absolute inset-0 opacity-40 bg-[url('https://www.google.com/maps/vt/pb=!1m4!1m3!1i12!2i1224!3i2534!2m3!1e0!2sm!3i482381503!3m8!2sen!3sus!5e1105!12m4!1e68!2m2!1sset!2sRoadmap!4e0!5m1!1e0!23i4111425')] bg-cover"></div>
            {coords && (
                <div className="relative z-10 flex flex-col items-center">
                    <div className="w-10 h-10 bg-indigo-600 rounded-full border-4 border-white shadow-2xl flex items-center justify-center animate-bounce">
                        <MapPin className="w-5 h-5 text-white" />
                    </div>
                    <span className="mt-2 text-[10px] font-black uppercase text-indigo-900 bg-white/80 px-3 py-1 rounded-full backdrop-blur-sm">Your Location</span>
                </div>
            )}
        </div>

        <div className="space-y-4 overflow-y-auto max-h-[600px] pr-2 custom-scrollbar">
            {nearbyJobs.map(job => (
                <div key={job.id} className="bg-white p-5 rounded-2xl border border-slate-200 hover:border-indigo-300 transition-all shadow-sm group">
                    <h3 className="font-bold text-slate-900 leading-tight">{job.title}</h3>
                    <p className="text-xs text-indigo-600 font-bold mt-1 uppercase">{job.company}</p>
                    <div className="flex items-center gap-4 mt-4 text-[10px] font-bold text-slate-400 uppercase">
                        <span className="flex items-center"><MapPin className="w-3 h-3 mr-1" /> {job.location}</span>
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-50 flex gap-2">
                        <button 
                            onClick={() => onImport([job])}
                            className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-colors"
                        >
                            Import Lead
                        </button>
                        <a 
                            href={job.applicationUrl} 
                            target="_blank"
                            className="p-2 bg-slate-50 text-slate-400 rounded-xl hover:text-indigo-600 transition-colors"
                        >
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>
            ))}
            {!loading && nearbyJobs.length === 0 && (
                <div className="h-48 flex flex-col items-center justify-center text-center text-slate-400">
                    <Search className="w-10 h-10 opacity-20 mb-2" />
                    <p className="text-xs font-bold uppercase">No roles discovered yet.</p>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};
