import { Job, UserProfile, UserPreferences } from '../types';

/**
 * Service to interact with Neon PostgreSQL via Vercel Serverless Functions.
 */

const API_BASE = '/api';

/**
 * Normalizes user preferences to ensure all potential database naming conventions
 * are correctly mapped to the frontend interface.
 */
const normalizePreferences = (prefs: any): UserPreferences => {
    if (!prefs) return { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' };
    
    return {
        targetRoles: Array.isArray(prefs.targetRoles) ? prefs.targetRoles : 
                     Array.isArray(prefs.target_roles) ? prefs.target_roles : [],
        targetLocations: Array.isArray(prefs.targetLocations) ? prefs.targetLocations : 
                         Array.isArray(prefs.target_locations) ? prefs.target_locations : [],
        minSalary: prefs.minSalary || prefs.min_salary || '',
        remoteOnly: !!(prefs.remoteOnly ?? prefs.remote_only ?? false),
        shareUrl: prefs.shareUrl || prefs.share_url,
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
        fullName: data.fullName || data.full_name || '',
        email: data.email || '',
        password: '',
        phone: data.phone || '',
        resumeContent: data.resumeContent || data.resume_content || '',
        resumeFileName: data.resumeFileName || data.resume_file_name || '',
        preferences: normalizePreferences(data.preferences),
        onboardedAt: data.onboardedAt || data.created_at || data.onboarded_at || new Date().toISOString(),
        connectedAccounts: data.connectedAccounts || data.connected_accounts || [],
        plan: data.plan || 'free',
        subscriptionExpiry: data.subscriptionExpiry || data.subscription_expiry
    };
};

export const saveUserProfile = async (profile: UserProfile, clerkToken: string) => {
    const payload = {
        id: profile.id,
        fullName: profile.fullName,
        full_name: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        resumeContent: profile.resumeContent,
        resume_content: profile.resumeContent,
        resumeFileName: profile.resumeFileName,
        resume_file_name: profile.resumeFileName,
        connectedAccounts: profile.connectedAccounts || [],
        connected_accounts: profile.connectedAccounts || [],
        plan: profile.plan || 'free',
        preferences: profile.preferences
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
        
        if (response.status === 404) {
            console.error("[JobFlow DB] API Endpoint /api/profile not found (404). Check deployment status.");
            throw new Error("Cloud storage endpoint missing. Saving locally for now.");
        }

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Sync failed (${response.status}): ${errorBody}`);
        }
        
        const data = await response.json();
        return normalizeProfile(data);
    } catch (err: any) {
        console.error("[JobFlow DB Sync] Save Exception:", err);
        throw err;
    }
};

export const getUserProfile = async (clerkToken: string): Promise<UserProfile | null> => {
    try {
        const response = await fetch(`${API_BASE}/profile`, {
            headers: {
                'Authorization': `Bearer ${clerkToken}`
            }
        });
        if (response.status === 404) return null;
        if (!response.ok) throw new Error('Failed to fetch profile from cloud');
        const data = await response.json();
        return normalizeProfile(data);
    } catch (e) {
        console.warn("[JobFlow DB] Get profile failed, using local fallback.");
        return null;
    }
};

export const fetchJobsFromDb = async (clerkToken: string): Promise<Job[]> => {
    try {
        const response = await fetch(`${API_BASE}/jobs`, {
            headers: {
                'Authorization': `Bearer ${clerkToken}`
            }
        });
        if (!response.ok) return [];
        const data = await response.json();
        return data.jobs || [];
    } catch (e) {
        return [];
    }
};

export const saveJobToDb = async (job: Job, clerkToken: string) => {
    try {
        await fetch(`${API_BASE}/jobs`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${clerkToken}`
            },
            body: JSON.stringify(job)
        });
    } catch (e) {
        console.warn("[JobFlow DB] Save job failed.");
    }
};

export const deleteJobFromDb = async (jobId: string, clerkToken: string) => {
    try {
        await fetch(`${API_BASE}/jobs/${jobId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${clerkToken}`
            }
        });
    } catch (e) {
        console.warn("[JobFlow DB] Delete job failed.");
    }
};

export const isProductionMode = () => true;
