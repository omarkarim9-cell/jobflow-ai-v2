import { Job, UserProfile, UserPreferences } from '../types';

/**
 * Service to interact with Neon PostgreSQL via Vercel Serverless Functions.
 */

const API_BASE = '/api';

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
        // Fix: Removed password field as it is not present in UserProfile type
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
    // Construct payload explicitly mapping camelCase frontend fields to what the API POST expects
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
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Profile sync failed (${response.status}): ${errorBody}`);
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
        console.warn("[JobFlow DB] Get profile failed.");
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
        console.warn("[JobFlow DB] Fetch jobs failed.");
        return [];
    }
};

export const saveJobToDb = async (job: Job, clerkToken: string) => {
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
            console.error("[JobFlow DB] Job save status error:", response.status);
        }
    } catch (e) {
        console.warn("[JobFlow DB] Save job failed.");
    }
};

export const deleteJobFromDb = async (jobId: string, clerkToken: string) => {
    try {
        // Send as query param to match API handler flexibility
        await fetch(`${API_BASE}/jobs?id=${jobId}`, {
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