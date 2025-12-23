import { Job, UserProfile } from '../types';

/**
 * Service to interact with Neon PostgreSQL via Vercel Serverless Functions.
 * This service uses the Clerk identity token to authenticate requests to the backend.
 */

const API_BASE = '/api';

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
        preferences: data.preferences || { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' },
        onboardedAt: data.onboardedAt || data.created_at || data.onboarded_at || new Date().toISOString(),
        connectedAccounts: data.connectedAccounts || data.connected_accounts || [],
        plan: data.plan || 'free',
        subscriptionExpiry: data.subscriptionExpiry || data.subscription_expiry
    };
};

export const saveUserProfile = async (profile: UserProfile, clerkToken: string) => {
    // Explicitly format for the backend to ensure no missing fields
    const payload = {
        ...profile,
        // Ensure snake_case for DB-compatible fields just in case
        full_name: profile.fullName,
        resume_content: profile.resumeContent,
        resume_file_name: profile.resumeFileName,
        connected_accounts: profile.connectedAccounts
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
        throw new Error(errorData.message || 'Failed to save profile to cloud storage');
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