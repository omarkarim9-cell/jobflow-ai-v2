import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Job, UserProfile } from '../types';

// ============================================================================
// 1. PASTE YOUR SUPABASE CREDENTIALS HERE TO HARDCODE THEM
//    If you fill these in, you can use the "Auto-Fill" button in the UI.
// ============================================================================
export const HARDCODED_SUPABASE_URL = 'https://ucshykexrvwdjfjhxpps.supabase.co'; 
export const HARDCODED_SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVjc2h5a2V4cnZ3ZGpmamh4cHBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQwODYxMTYsImV4cCI6MjA3OTY2MjExNn0.HQBTghIQleRoU_hlj2QIcC7LkpZG8M2yUygtNR-kwUQ';
// ============================================================================

// Helper strict URL validation
const isValidUrl = (url: string) => {
    if (!url || url.includes('YOUR_SUPABASE')) return false;
    try {
        const u = new URL(url);
        return u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1';
    } catch (e) {
        return false;
    }
};

const isValidKey = (key: string) => key && key.length > 20 && !key.includes('YOUR_SUPABASE');

function HARDCODED_VAL(val: string) { return val ? val.trim() : ''; }

// Define exported binding FIRST to avoid ReferenceError
export let supabase: SupabaseClient | null = null;

// Initialization Logic
export const initSupabaseClient = () => {
    // Check if user forced offline mode (Demo Mode)
    const FORCE_OFFLINE = typeof window !== 'undefined' ? localStorage.getItem('jobflow_force_offline') === 'true' : false;

    if (FORCE_OFFLINE) {
        supabase = null;
        console.log("Supabase Client: Forced Offline Mode");
        return;
    }

    // Check LocalStorage for dynamic configuration
    const STORED_URL = typeof window !== 'undefined' ? localStorage.getItem('jobflow_sb_url') : null;
    const STORED_KEY = typeof window !== 'undefined' ? localStorage.getItem('jobflow_sb_key') : null;

    const finalUrl = (STORED_URL && STORED_URL.length > 10) ? STORED_URL : HARDCODED_VAL(HARDCODED_SUPABASE_URL);
    const finalKey = (STORED_KEY && STORED_KEY.length > 10) ? STORED_KEY : HARDCODED_VAL(HARDCODED_SUPABASE_KEY);

    let clientInstance: SupabaseClient | null = null;

    try {
        if (isValidUrl(finalUrl) && isValidKey(finalKey)) {
            clientInstance = createClient(finalUrl, finalKey, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true,
                    detectSessionInUrl: true
                }
            });
            console.log("Supabase Client Initialized");
        }
    } catch (error) {
        console.error("Supabase client initialization failed:", error);
    }
    
    // Update the exported binding
    supabase = clientInstance;
};

// Initial run
initSupabaseClient();

export const isProductionMode = () => {
    return !!supabase;
};

export const configureSupabase = (url: string, key: string) => {
    localStorage.setItem('jobflow_sb_url', url.trim());
    localStorage.setItem('jobflow_sb_key', key.trim());
    localStorage.removeItem('jobflow_force_offline'); // Clear offline flag to enable connection
    initSupabaseClient(); // Re-initialize immediately
};

export const clearSupabaseConfig = () => {
    localStorage.removeItem('jobflow_sb_url');
    localStorage.removeItem('jobflow_sb_key');
    // Explicitly force offline mode when clearing config to prevent auto-reconnect to hardcoded values
    localStorage.setItem('jobflow_force_offline', 'true');
    initSupabaseClient(); // Re-initialize (to null)
};

export const testSupabaseConnection = async (url: string, key: string) => {
    try {
        // 1. Syntax Check
        const u = new URL(url);
        if (u.protocol !== 'https:' && u.hostname !== 'localhost') {
            throw new Error("URL must start with https:// (unless localhost)");
        }

        // 2. Client Init Check
        const tempClient = createClient(url, key, {
            auth: {
                persistSession: false,
                autoRefreshToken: false,
                detectSessionInUrl: false
            },
            global: {
                fetch: (url, options) => {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), 5000); 
                    return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeoutId));
                }
            }
        });

        // 3. Network/API Check
        const { data, error } = await tempClient.auth.getSession();
        
        if (error) {
            throw error;
        }
        return true;
    } catch (e: any) {
        let msg = e.message || "Connection failed";
        if (e.name === 'AbortError') msg = "Connection timed out. Check URL.";
        if (msg.includes('Failed to fetch')) msg = "Network error. Verify URL is correct and reachable (check ad blockers).";
        throw new Error(msg);
    }
};

// --- AUTH & PROFILE ---

export const signUpUser = async (email: string, password: string, userData?: any) => {
    if (!supabase) throw new Error("Supabase not configured");
    
    // Explicitly set the redirect URL to the current origin
    const redirectUrl = window.location.origin;

    const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
            emailRedirectTo: redirectUrl,
            // STORE ESSENTIAL DATA IN METADATA
            // This ensures we can reconstruct the profile even if the DB insert fails initially
            data: userData 
        }
    });
    if (error) throw error;
    return data;
};

export const resendVerificationEmail = async (email: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    
    const redirectUrl = window.location.origin;
    
    const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
            emailRedirectTo: redirectUrl
        }
    });
    
    if (error) throw error;
};

export const signInUser = async (email: string, password: string) => {
    if (!supabase) throw new Error("Supabase not configured");
    const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
    });
    if (error) throw error;
    return data;
};

export const signOutUser = async () => {
    if (!supabase) return;
    try {
        await supabase.auth.signOut();
    } catch (e) {
        console.error("Sign out error ignored:", e);
    }
};

export const saveUserProfile = async (profile: UserProfile, userId: string) => {
    if (!supabase) return;

    const { error } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            email: profile.email,
            full_name: profile.fullName,
            resume_content: profile.resumeContent,
            preferences: profile.preferences || {},
            // FORCE DEFAULT EMPTY ARRAY IF NULL - FIXES DELETION BUGS
            connected_accounts: profile.connectedAccounts || [], 
            plan: profile.plan,
            updated_at: new Date()
        });

    if (error) {
        console.error("Error saving profile to DB:", error);
        throw new Error(`Failed to save profile: ${error.message}`);
    }
};

export const getUserProfile = async (userId: string): Promise<UserProfile | null> => {
    if (!supabase) return null;

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

    if (error) {
        if (error.code === 'PGRST116') return null;
        console.error("Error fetching profile:", error.message);
        return null;
    }

    return {
        id: data.id,
        fullName: data.full_name,
        email: data.email,
        // Fix: Removed password field as it is not present in UserProfile type
        phone: data.phone || '',
        resumeContent: data.resume_content || '',
        resumeFileName: '',
        preferences: data.preferences || {},
        connectedAccounts: data.connected_accounts || [],
        plan: data.plan || 'free',
        onboardedAt: data.created_at || new Date().toISOString()
    };
};

// --- JOBS ---

export const saveJobToDb = async (job: Job, userId: string) => {
    if (!supabase) return;

    const { error } = await supabase
        .from('jobs')
        .upsert({
            id: job.id,
            user_id: userId,
            title: job.title,
            company: job.company,
            status: job.status,
            data: job
        });

    if (error) console.error("Error saving job:", error.message);
};

export const fetchJobsFromDb = async (userId: string): Promise<Job[]> => {
    if (!supabase) return [];

    const { data, error } = await supabase
        .from('jobs')
        .select('data')
        .eq('user_id', userId);

    if (error) {
        console.error("Error fetching jobs:", error.message);
        // Do not throw here to prevent app crash on load, just return empty
        return [];
    }

    return data.map((row: any) => row.data as Job);
};

export const deleteJobFromDb = async (jobId: string) => {
    if(!supabase) return;
    await supabase.from('jobs').delete().eq('id', jobId);
};

export const deleteAllJobsFromDb = async (userId: string) => {
    if(!supabase) return { error: { message: 'Not connected' } };
    
    // Using eq on user_id to delete all rows for this user
    const { error } = await supabase
        .from('jobs')
        .delete()
        .eq('user_id', userId);
        
    if (error) {
        console.error("Error deleting all jobs:", error);
        return { error };
    }
    return { error: null };
};