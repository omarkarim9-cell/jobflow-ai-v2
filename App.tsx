
import React, { useState, useEffect, useCallback } from 'react';
import { useUser, useAuth, UserButton } from '@clerk/clerk-react';
import { Job, JobStatus, ViewState, UserProfile, EmailAccount } from './types';
import { DashboardStats } from './components/DashboardStats';
import { JobCard } from './components/JobCard';
import { InboxScanner } from './components/InboxScanner';
import { Settings } from './components/Settings';
import { Auth } from './components/Auth';
import { ApplicationTracker } from './components/ApplicationTracker';
import { DebugView } from './components/DebugView';
import { NotificationToast, NotificationType } from './components/NotificationToast';
import { LanguageCode } from './services/localization';
import { 
  fetchJobsFromDb, 
  getUserProfile, 
  saveUserProfile, 
  saveJobToDb, 
  deleteJobFromDb 
} from './services/dbService';
import { 
  LayoutDashboard, 
  Briefcase, 
  Mail, 
  Settings as SettingsIcon, 
  Search as SearchIcon,
  Loader2,
  List,
  LogOut,
  X,
  Terminal,
  Fingerprint,
  Database
} from 'lucide-react';
import { JobDetail } from './components/JobDetail';

export const App: React.FC = () => {
  const { isLoaded, isSignedIn, user } = useUser();
  const { getToken, signOut } = useAuth();
