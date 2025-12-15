

export enum JobStatus {
  DETECTED = 'Detected', // Found in email
  REVIEW = 'In Review', // User looking at it
  SAVED = 'Saved', // Saved for later
  APPLIED_AUTO = 'Auto-Applied',
  APPLIED_MANUAL = 'Applied Manually',
  INTERVIEW = 'Interview',
  REJECTED = 'Rejected',
  OFFER = 'Offer'
}

export enum ViewState {
  DASHBOARD = 'DASHBOARD',
  SELECTED_JOBS = 'SELECTED_JOBS', // Now primarily "Scanned Jobs"
  TRACKER = 'TRACKER', // New "My Applications"
  EMAILS = 'EMAILS',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS',
  MANUAL = 'MANUAL',
  SUPPORT = 'SUPPORT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  REVIEW_SELECTION = 'REVIEW_SELECTION',
  GENERATED_JOBS_LIST = 'GENERATED_JOBS_LIST'
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryRange?: string;
  description: string;
  source: 'Gmail' | 'LinkedIn' | 'Indeed' | 'Imported Link';
  detectedAt: string; // ISO Date
  status: JobStatus;
  matchScore: number; // 0-100
  requirements: string[];
  coverLetter?: string;
  customizedResume?: string; // AI Rewritten resume specific to this job
  notes?: string;
  logoUrl?: string;
  applicationUrl?: string;
}

export interface UserStats {
  totalDetected: number;
  autoApplied: number;
  manualRequired: number;
  interviews: number;
  successRate: number;
}

export interface UserPreferences {
  targetRoles: string[];
  targetLocations: string[];
  minSalary: string;
  remoteOnly: boolean;
  shareUrl?: string; // URL for marketing ads
  language: 'en' | 'es' | 'fr' | 'de' | 'ar'; // Added Arabic
}

export interface EmailAccount {
  id: string;
  provider: 'Gmail' | 'Outlook' | 'Yahoo' | 'IMAP';
  emailAddress: string;
  isConnected: boolean;
  lastSynced: string;
  icon?: string;
  accessToken?: string;
}

export interface UserProfile {
  id: string; // Unique ID based on email
  fullName: string;
  email: string; // Main profile email
  password?: string; // Encrypted (simulated) password
  phone: string;
  resumeContent: string; // The raw text of the master resume for AI
  resumeFileName?: string;
  preferences: UserPreferences;
  onboardedAt: string;
  connectedAccounts: EmailAccount[];
  plan: 'free' | 'pro';
  subscriptionExpiry?: string;
}

// --- UTILITY: Central Subscription Check ---
export const isSubscriptionValid = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  // Unlocked: All users (Free & Pro) have access to AI features
  return true;
};