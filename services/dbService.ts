
import { Job, UserProfile, UserPreferences } from '../types';

/**
 * Service to interact with Neon PostgreSQL via Vercel Serverless Functions.
 * Includes localStorage fallback for robust local development and offline resilience.
 */

const API_BASE = '/api';

const LOCAL_PROFILE_KEY = 'jobflow_profile_cache';
const LOCAL_JOBS_KEY = 'jobflow_jobs_cache';

/**
 * Normalizes user preferences to ensure consistency across the platform.
 */
const normalizePreferences = (prefs: any): UserPreferences => {
    if (!prefs) return { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' };
    
    return {
        targetRoles: Array.isArray(prefs.targetRoles) ? prefs.targetRoles : [],
        targetLocations: Array.isArray(prefs.targetLocations) ? prefs.targetLocations : [],
        minSalary: prefs.minSalary || '',
        remoteOnly: !!(prefs.remoteOnly || false),
        shareUrl: prefs.shareUrl,
        language: prefs.language || 'en'
    };
};

/**
 * Normalizes user profile data from database response to frontend interface.
 */
const normalizeProfile = (data: any): UserProfile | null => {
    if (!data) return null;
    return {
        id: data.id,
        fullName: data.fullName || '',
        email: data.email || '',
        phone: data.phone || '',
        resumeContent: data.resumeContent || '',
        resumeFileName: data.resumeFileName || '',
        preferences: normalizePreferences(data.preferences),
        onboardedAt: data.onboardedAt || new Date().toISOString(),
        connectedAccounts: data.connectedAccounts || [],
        plan: data.plan || 'free',
        subscriptionExpiry: data.subscriptionExpiry
    };
};

export const saveUserProfile = async (profile: UserProfile, clerkToken: string) => {
    // Immediate Local Save (Fallback)
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));

    const payload = {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        resumeContent: profile.resumeContent,
        resumeFileName: profile.resumeFileName,
        preferences: profile.preferences,
        connectedAccounts: profile.connectedAccounts,
        plan: profile.plan || 'free'
    };

    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clerkToken}`
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) throw new Error('Cloud sync failed');
        
        const data = await response.json();
        const normalized = normalizeProfile(data);
        if (normalized) localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(normalized));
        return normalized || profile;
    } catch (err) {
        console.warn("[JobFlow DB Sync] Cloud Save failed, using local only.");
        return profile;
    }
};

export const getUserProfile = async (clerkToken: string): Promise<UserProfile | null> => {
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            headers: {
                'Authorization': `Bearer ${clerkToken}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            const profile = normalizeProfile(data);
            if (profile) {
                localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
                return profile;
            }
        }
    } catch (e) {
        console.warn("[JobFlow DB] Get profile cloud failed, checking local.");
    }

    const cached = localStorage.getItem(LOCAL_PROFILE_KEY);
    return cached ? JSON.parse(cached) : null;
};

export const fetchJobsFromDb = async (clerkToken: string): Promise<Job[]> => {
    try {
        const response = await fetch(`${API_BASE}/jobs`, {
            headers: {
                'Authorization': `Bearer ${clerkToken}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            const jobs = data.jobs || [];
            localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobs));
            return jobs;
        }
    } catch (e) {
        console.warn("[JobFlow DB] Fetch jobs cloud failed, checking local.");
    }

    const cached = localStorage.getItem(LOCAL_JOBS_KEY);
    return cached ? JSON.parse(cached) : [];
};

export const saveJobToDb = async (job: Job, clerkToken: string) => {
    // Local persistence
    const cached = localStorage.getItem(LOCAL_JOBS_KEY);
    const jobs: Job[] = cached ? JSON.parse(cached) : [];
    const index = jobs.findIndex(j => j.id === job.id);
    if (index > -1) jobs[index] = job; else jobs.push(job);
    localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobs));

    try {
        const response = await fetch(`${API_BASE}/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clerkToken}`
            },
            body: JSON.stringify(job)
        });
        return response.ok;
    } catch (e) {
        console.warn("[JobFlow DB] Save job to cloud failed.");
        return false;
    }
};

export const deleteJobFromDb = async (jobId: string, clerkToken: string) => {
    // Local persistence
    const cached = localStorage.getItem(LOCAL_JOBS_KEY);
    if (cached) {
        const jobs: Job[] = JSON.parse(cached);
        localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobs.filter(j => j.id !== jobId)));
    }

    try {
        const response = await fetch(`${API_BASE}/jobs?id=${jobId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${clerkToken}`
            }
        });
        return response.ok;
    } catch (e) {
        console.warn("[JobFlow DB] Delete job from cloud failed.");
        return false;
    }
};

export const isProductionMode = () => true;
