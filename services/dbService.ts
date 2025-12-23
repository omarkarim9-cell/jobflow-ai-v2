import { Job, UserProfile, UserPreferences } from '../types';

/**
 * Service to interact with Neon PostgreSQL via Vercel Serverless Functions.
 */

const API_BASE = '/api';

/**
 * Normalizes user preferences specifically to ensure targetRoles and other arrays 
 * are correctly mapped regardless of database naming convention.
 */
const normalizePreferences = (prefs: any): UserPreferences => {
    if (!prefs) return { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' };
    
    // Support both camelCase (frontend) and snake_case (database)
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
    // Explicitly mapping all fields to ensure the backend receives what it expects.
    // We send both camelCase and snake_case top-level fields for maximum compatibility.
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
        connected_accounts: profile.connectedAccounts || [],
        plan: profile.plan || 'free',
        // Preferences is a nested object often stored as JSONB in Neon
        preferences: {
            targetRoles: profile.preferences.targetRoles,
            target_roles: profile.preferences.targetRoles,
            targetLocations: profile.preferences.targetLocations,
            target_locations: profile.preferences.targetLocations,
            minSalary: profile.preferences.minSalary,
            min_salary: profile.preferences.minSalary,
            remoteOnly: profile.preferences.remoteOnly,
            remote_only: profile.preferences.remoteOnly,
            shareUrl: profile.preferences.shareUrl,
            share_url: profile.preferences.shareUrl,
            language: profile.preferences.language
        }
    };

    console.debug("[JobFlow DB] Saving Profile Payload:", payload);

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
            const errorText = await response.text();
            console.error("[JobFlow DB] Server Error Response:", errorText);
            throw new Error(`Cloud save failed (${response.status}). If the error persists, please contact support.`);
        }
        
        const data = await response.json();
        return normalizeProfile(data);
    } catch (err: any) {
        console.error("[JobFlow DB] Connection Exception:", err);
        throw err;
    }
};

export const getUserProfile = async (clerkToken: string): Promise<UserProfile | null> => {
    const response = await fetch(`${API_BASE}/profile`, {
        headers: {
            'Authorization': `Bearer ${clerkToken}`
        }
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch profile from cloud');
    const data = await response.json();
    return normalizeProfile(data);
};

export const fetchJobsFromDb = async (clerkToken: string): Promise<Job[]> => {
    const response = await fetch(`${API_BASE}/jobs`, {
        headers: {
            'Authorization': `Bearer ${clerkToken}`
        }
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.jobs || [];
};

export const saveJobToDb = async (job: Job, clerkToken: string) => {
    const response = await fetch(`${API_BASE}/jobs`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clerkToken}`
        },
        body: JSON.stringify(job)
    });
    if (!response.ok) {
        console.error('Failed to save job to cloud');
    }
};

export const deleteJobFromDb = async (jobId: string, clerkToken: string) => {
    const response = await fetch(`${API_BASE}/jobs/${jobId}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${clerkToken}`
        }
    });
    if (!response.ok) {
        console.error('Failed to delete job from cloud');
    }
};

export const isProductionMode = () => true;
