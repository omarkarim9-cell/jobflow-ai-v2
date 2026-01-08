// types.ts

// ===== Jobs =====
export type JobStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source: string;            // e.g. 'linkedin', 'indeed'
  status: JobStatus;
  appliedAt?: string;        // ISO date
  createdAt?: string;        // ISO date
  updatedAt?: string;        // ISO date
}

// ===== View / UI =====
export type ViewState = 'dashboard' | 'jobs' | 'inbox' | 'analytics' | 'settings';

// ===== Email / accounts =====
export interface EmailAccount {
  id: string;
  provider: string;          // e.g. 'gmail'
  email: string;
  accessToken?: string;
  refreshToken?: string;
}

// ===== Profile / preferences =====
export interface UserPreferences {
  targetRoles: string[];
  targetLocations: string[];
  minSalary: string;
  remoteOnly: boolean;
  language: string;
}

export interface ConnectedAccount {
  provider: string;
  accountId: string;
}

export interface UserProfile {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  resumeContent: string;
  resumeFileName: string;
  preferences: UserPreferences | any;
  connectedAccounts: ConnectedAccount[] | any[];
  plan: string;
  dailyAiCredits: number;
  totalAiUsed: number;
  onboardedAt?: string;      // used in App.tsx initial profile
  updatedAt?: string | Date;
}
