import { Job, UserProfile, UserPreferences } from '../types';

/**
 * Service to interact with Neon PostgreSQL via Vercel Serverless Functions.
 */

const API_BASE = '/api';
const LOCAL_PROFILE_KEY = 'jobflow_profile_cache';
const LOCAL_JOBS_KEY = 'jobflow_jobs_cache';

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
    localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clerkToken}`
            },
            body: JSON.stringify(profile)
        });
        
        if (!response.ok) {
            const errData = await response.json();
            console.error('[dbService] Profile save failed:', errData);
            throw new Error(errData.message || 'Cloud sync failed');
        }
        
        const data = await response.json();
        const normalized = normalizeProfile(data);
        if (normalized) localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(normalized));
        return normalized || profile;
    } catch (err) {
        console.warn("[dbService] Cloud Save failed:", err);
        return profile;
    }
};

export const getUserProfile = async (clerkToken: string): Promise<UserProfile | null> => {
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            headers: { 'Authorization': `Bearer ${clerkToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            const profile = normalizeProfile(data);
            if (profile) localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
            return profile;
        } else {
            const errData = await response.json().catch(() => ({}));
            console.error('[dbService] Fetch profile failed:', response.status, errData);
        }
    } catch (e) {
        console.warn("[dbService] Fetch profile network error:", e);
    }
    const cached = localStorage.getItem(LOCAL_PROFILE_KEY);
    return cached ? JSON.parse(cached) : null;
};

export const fetchJobsFromDb = async (clerkToken: string): Promise<Job[]> => {
    try {
        const response = await fetch(`${API_BASE}/jobs`, {
            headers: { 'Authorization': `Bearer ${clerkToken}` }
        });
        if (response.ok) {
            const data = await response.json();
            const jobs = data.jobs || [];
            localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobs));
            return jobs;
        } else {
            const errData = await response.json().catch(() => ({}));
            console.error('[dbService] Fetch jobs failed:', response.status, errData);
        }
    } catch (e) {
        console.warn("[dbService] Fetch jobs network error:", e);
    }
    const cached = localStorage.getItem(LOCAL_JOBS_KEY);
    return cached ? JSON.parse(cached) : [];
};

export const saveJobToDb = async (job: Job, clerkToken: string) => {
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
        if (!response.ok) {
            const errData = await response.json();
            console.error('[dbService] Job save failed:', errData);
        }
    } catch (e) {
        console.warn("[dbService] Job save network error:", e);
    }
};

export const deleteJobFromDb = async (jobId: string, clerkToken: string) => {
    const cached = localStorage.getItem(LOCAL_JOBS_KEY);
    if (cached) {
        const jobs: Job[] = JSON.parse(cached);
        localStorage.setItem(LOCAL_JOBS_KEY, JSON.stringify(jobs.filter(j => j.id !== jobId)));
    }
    try {
        await fetch(`${API_BASE}/jobs?id=${jobId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${clerkToken}` }
        });
    } catch (e) {
        console.warn("[dbService] Job delete network error:", e);
    }
};

export const isProductionMode = () => true;