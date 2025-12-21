import { Job, UserProfile } from '../types';

/**
 * Service to interact with Neon PostgreSQL via Vercel Serverless Functions.
 * This service uses the Clerk identity token to authenticate requests to the backend.
 */

// Use an absolute path for the API base to ensure it works across different route levels
const API_BASE = '/api';

export const saveUserProfile = async (profile: UserProfile, clerkToken: string) => {
    const response = await fetch(`${API_BASE}/profile`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${clerkToken}`
        },
        body: JSON.stringify(profile)
    });
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to save profile to Neon');
    }
    return response.json();
};

export const getUserProfile = async (clerkToken: string): Promise<UserProfile | null> => {
    const response = await fetch(`${API_BASE}/profile`, {
        headers: {
            'Authorization': `Bearer ${clerkToken}`
        }
    });
    if (response.status === 404) return null;
    if (!response.ok) throw new Error('Failed to fetch profile from Neon');
    return response.json();
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
        console.error('Failed to save job to Neon');
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
        console.error('Failed to delete job from Neon');
    }
};

export const isProductionMode = () => true;