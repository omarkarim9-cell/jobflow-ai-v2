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
    return {
        targetRoles: prefs.targetRoles || prefs.target_roles || [],
        targetLocations: prefs.targetLocations || prefs.target_locations || [],
        minSalary: prefs.minSalary || prefs.min_salary || '',
        remoteOnly: !!(prefs.remoteOnly ?? prefs.remote_only ?? false),
        shareUrl: prefs.shareUrl || prefs.share_url,
        language: prefs.language || 'en'
    };
};

/**
 * Normalizes user profile data from database response to frontend interface.
 * Handles both snake_case (DB) and camelCase (Frontend) for robustness.
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
    // Explicitly format for the backend to ensure no missing fields or mismatches
    const payload = {
        ...profile,
        // Backend compatibility mappings (Dual mapping for safety)
        full_name: profile.fullName,
        resume_content: profile.resumeContent,
        resume_file_name: profile.resumeFileName,
        connected_accounts: profile.connectedAccounts,
        preferences: {
            ...profile.preferences,
            target_roles: profile.preferences.targetRoles,
            target_locations: profile.preferences.targetLocations,
            min_salary: profile.preferences.minSalary,
            remote_only: profile.preferences.remoteOnly,
            share_url: profile.preferences.shareUrl
        }
    };

    const response = await fetch(`${API_BASE}/profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clerkToken}`
        },
        body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error("Cloud Save Failed:", errorData);
        throw new Error(errorData.message || 'Failed to save profile to Neon database');
    }
    
    const data = await response.json();
    return normalizeProfile(data);
};

export const getUserProfile = async (clerkToken: string): Promise<UserProfile | null> => {
    const response = await fetch(`${API_BASE}/profile`, {
        headers: {
            'Authorization': `Bearer ${clerkToken}`
        }
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch profile from cloud storage');
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