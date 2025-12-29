
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
  SELECTED_JOBS = 'SELECTED_JOBS', 
  TRACKER = 'TRACKER', 
  EMAILS = 'EMAILS',
  ANALYTICS = 'ANALYTICS',
  SETTINGS = 'SETTINGS',
  MANUAL = 'MANUAL',
  SUPPORT = 'SUPPORT',
  SUBSCRIPTION = 'SUBSCRIPTION',
  REVIEW_SELECTION = 'REVIEW_SELECTION',
  GENERATED_JOBS_LIST = 'GENERATED_JOBS_LIST',
  ONBOARDING = 'ONBOARDING',
  INTERVIEW_PREP = 'INTERVIEW_PREP',
  DEBUG = 'DEBUG'
}

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salaryRange?: string;
  description: string;
  // Updated source type to include 'Google Maps' and 'Manual' to support discovery features and manual entry.
  source: 'Gmail' | 'LinkedIn' | 'Indeed' | 'Imported Link' | 'Google Maps' | 'Manual';
  detectedAt: string; 
  status: JobStatus;
  matchScore: number; 
  fitReason?: string;
  requirements: string[];
  coverLetter?: string;
  customizedResume?: string; 
  notes?: string;
  logoUrl?: string;
  applicationUrl?: string;
}

export interface UserPreferences {
  targetRoles: string[];
  targetLocations: string[];
  minSalary: string;
  remoteOnly: boolean;
  shareUrl?: string; 
  language: 'en' | 'es' | 'fr' | 'de' | 'ar';
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
  id: string; 
  fullName: string;
  email: string; 
  avatarUrl?: string;
  phone: string;
  resumeContent: string; 
  resumeFileName?: string;
  preferences: UserPreferences;
  onboardedAt: string | null;
  connectedAccounts: EmailAccount[];
  plan: 'free' | 'pro';
  subscriptionExpiry?: string;
}

export const isSubscriptionValid = (profile: UserProfile | null): boolean => {
  if (!profile) return false;
  return true;
};
