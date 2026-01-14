 
// types.ts

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
  // add other fields if you use them
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
  updatedAt?: string | Date;
}
=======
// types.ts

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
  // add other fields if you use them
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
  updatedAt?: string | Date;
}
   45a145927e075b37a66e9b4d7b268d3499230129
