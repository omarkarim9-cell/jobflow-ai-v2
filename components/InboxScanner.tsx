
import React, { useState, useEffect, useRef } from 'react';
import { Job, JobStatus, EmailAccount, UserPreferences, isSubscriptionValid, UserProfile } from '../types';
import { Mail, Search, Trash2, AlertCircle, Settings, RefreshCw, Calendar, Link, X, Loader2, StopCircle } from 'lucide-react';
import { extractJobsFromEmailHtml } from '../services/geminiService';
import { localExtractJobs } from '../services/localAiService'; // Direct Import
import { listMessages, getMessageBody, decodeEmailBody } from '../services/gmailService';
import { NotificationType } from './NotificationToast';
import { EmailConnectModal } from './EmailConnectModal';

interface InboxScannerProps {
  onImport: (jobs: Job[]) => void;
  dirHandle?: any;
  showNotification: (msg: string, type: NotificationType) => void;
  userPreferences?: UserPreferences;
  onOpenSettings?: () => void;
  sessionAccount: EmailAccount | null;
  onConnectSession?: (account: EmailAccount) => void;
  onDisconnectSession?: () => void;
}

// Helper to safely encode Unicode strings to Base64
const safeBase64 = (str: string) => {
    try {
        return btoa(str);
    } catch (e) {
        // Fallback for Unicode characters
        return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => 
            String.fromCharCode(parseInt(p1, 16))
        ));
    }
};

export const InboxScanner: React.FC<InboxScannerProps> = ({ 
    onImport, 
    showNotification, 
    userPreferences, 
    onOpenSettings,
    sessionAccount,
    onConnectSession = (_: EmailAccount) => {},
    onDisconnectSession = () => {}
}) => {
  const [emails, setEmails] = useState<any[]>([]); 
  const [isScanning, setIsScanning] = useState(false);
  const [tokenExpired, setTokenExpired] = useState(false);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  
  // Batch State
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [progress, setProgress] = useState('');
  const [dateRange, setDateRange] = useState('3'); // Default 3 days

  const isMounted = useRef(true);
  const abortController = useRef<AbortController | null>(null);

  // Safety Timeout to prevent infinite spinning
  useEffect(() => {
    let safetyTimer: ReturnType<typeof setTimeout>;
    if (isScanning || isBatchProcessing) {
        safetyTimer = setTimeout(() => {
            if (isMounted.current && (isScanning || isBatchProcessing)) {
                handleStopScan();
                showNotification("Scan took too long and was reset.", 'error');
            }
        }, 90000); // 90 second hard limit
    }
    return () => clearTimeout(safetyTimer);
  }, [isScanning, isBatchProcessing]);

  const calculateMatch = (job: Partial<Job>): { score: number, isMatch: boolean } => {
      if (!userPreferences) return { score: 100, isMatch: true };

      const { targetRoles, targetLocations, remoteOnly } = userPreferences;
      const title = (job.title || '').toLowerCase();
      const location = (job.location || '').toLowerCase();
      
      let roleMatch = targetRoles.length === 0;
      let locMatch = targetLocations.length === 0;
      let score = 0;

      // Check Roles using Regex for Whole Word Matching
      if (targetRoles.length > 0) {
          roleMatch = targetRoles.some(r => {
              const escaped = r.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
              const regex = new RegExp(`(?:^|[\\s\\W])${escaped}(?:$|[\\s\\W])`, 'i');
              return regex.test(title);
          });
          if (roleMatch) score += 50;
      } else {
          score += 50;
      }

      // Check Location
      if (targetLocations.length > 0) {
          locMatch = targetLocations.some(l => location.includes(l.toLowerCase()));
          if (locMatch) score += 50;
      } else {
          score += 50;
      }
      
      // Check Remote
      if (remoteOnly) {
          if (location.includes('remote') || title.includes('remote')) {
              score += 10;
          } else {
              locMatch = false; 
          }
      }

      return { score, isMatch: roleMatch && locMatch };
  };

  const handleStopScan = () => {
      if (abortController.current) {
          abortController.current.abort();
      }
      setIsScanning(false);
      setIsBatchProcessing(false);
      setProgress('Stopped by user');
  };

  const handleBatchAnalyze = async (emailList = emails) => {
      if (emailList.length === 0) return;
      setIsBatchProcessing(true);
      abortController.current = new AbortController();
      
      const uniqueJobsMap = new Map<string, Partial<Job>>();
      const batchSize = 5; 
      
      let processedCount = 0;

      try {
          for (let i = 0; i < emailList.length; i += batchSize) {
              if (abortController.current?.signal.aborted || !isMounted.current) return;

              const chunk = emailList.slice(i, i + batchSize);
              
              await Promise.all(chunk.map(async (email) => {
                  if (!email.isRealGmail || !email.accessToken) return;
                  try {
                      const bodyData = await getMessageBody(email.accessToken, email.id);
                      const htmlContent = decodeEmailBody(bodyData);
                      
                      // USE DIRECT LOCAL EXTRACTION FOR SPEED AND RELIABILITY
                      // Pass target roles to filter immediately
                      const extracted = localExtractJobs(htmlContent, userPreferences?.targetRoles || []);
                      
                      extracted.forEach(job => {
                          const { score, isMatch } = calculateMatch(job);
                          
                          // Filter out low scores if preferences are set
                          if (userPreferences?.targetRoles?.length && !isMatch) return;

                          const stableId = job.applicationUrl 
                            ? safeBase64(job.applicationUrl) 
                            : `job-${Date.now()}-${Math.random()}`;
                             
                          if (job.applicationUrl && !uniqueJobsMap.has(job.applicationUrl)) {
                                 uniqueJobsMap.set(job.applicationUrl, { 
                                     ...job, 
                                     id: stableId, 
                                     source: 'Gmail', 
                                     matchScore: score 
                                 });
                          }
                      });
                  } catch (e: any) {
                      if (e.message === 'TOKEN_EXPIRED') {
                           setTokenExpired(true);
                      }
                      console.warn(`Error processing email ${email.id}`, e);
                  }
              }));

              processedCount += chunk.length;
              if (isMounted.current) {
                  setProgress(`Analyzing ${Math.min(processedCount, emailList.length)} / ${emailList.length} emails...`);
              }
              await new Promise(r => setTimeout(r, 100));
          }
          
          if (abortController.current?.signal.aborted || !isMounted.current) return;

          const allJobs = Array.from(uniqueJobsMap.values()).sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0));
          
          if (allJobs.length === 0) {
              if (emailList[0]?.isRealGmail) {
                 showNotification("No matching jobs found. Try adjusting settings.", 'error');
              }
          } else {
              const newJobs: Job[] = allJobs.map((job, index) => ({
                  id: job.id || `imported-${Date.now()}-${index}`, 
                  title: job.title || 'Unknown Role',
                  company: job.company || 'Unknown Company',
                  location: job.location || 'Remote',
                  salaryRange: job.salaryRange,
                  description: job.description || '',
                  source: 'Gmail',
                  detectedAt: new Date().toISOString(),
                  status: JobStatus.DETECTED,
                  matchScore: job.matchScore || 50,
                  requirements: [],
                  applicationUrl: job.applicationUrl
              }));

              try {
                  onImport(newJobs);
              } catch (e) {
                  console.error("Import failed", e);
                  showNotification("Failed to import jobs to list.", 'error');
              }
          }

      } catch (e: any) {
          if (isMounted.current && !abortController.current?.signal.aborted) {
             showNotification("Batch processing interrupted.", 'error');
          }
      } finally {
          if (isMounted.current) {
              setIsBatchProcessing(false);
              setProgress('');
          }
      }
  };

  const handleScanRealInbox = async () => {
      setTokenExpired(false);
      
      if (!sessionAccount || !sessionAccount.accessToken) {
          setIsConnectModalOpen(true);
          return;
      }

      if (isMounted.current) {
         setIsScanning(true);
         showNotification(`Scanning ${sessionAccount.emailAddress}...`, 'success');
      }

      setEmails([]);

      try {
          if (sessionAccount.provider === 'Gmail') {
              // Fetch logic
              const query = `subject:(job OR jobs OR vacancy OR career OR hiring OR opportunity) newer_than:${dateRange}d`;
              const messages = await listMessages(sessionAccount.accessToken, 30, query);
              
              if (isMounted.current) {
                  const realEmails = messages.map((msg: any) => ({
                      id: msg.id,
                      from: 'Gmail API',
                      subject: `Email ID: ${msg.id}`, 
                      date: 'Recent',
                      read: false,
                      bodySnippet: 'Ready to analyze',
                      isRealGmail: true,
                      accessToken: sessionAccount.accessToken
                  }));
                  setEmails(realEmails);
                  
                  if (realEmails.length === 0) {
                      showNotification(`No job emails found in the last ${dateRange} days.`, 'error');
                  } else {
                      await handleBatchAnalyze(realEmails); 
                  }
              }
          } else {
              // Simulation Logic for Outlook/Yahoo
              await new Promise(r => setTimeout(r, 2000)); 

              const mockEmails = [
                  { 
                      id: 'msg-1', 
                      from: 'LinkedIn Job Alerts', 
                      subject: '30 new jobs for "React Developer"', 
                      date: 'Today', 
                      read: false, 
                      bodySnippet: '... click to view jobs ...',
                      isRealGmail: false,
                      accessToken: 'simulated'
                  }
              ];
              
              if (isMounted.current) {
                  setEmails(mockEmails);
                  
                  const mockJob: Job = {
                      id: `imported-${sessionAccount.provider}-${Date.now()}`,
                      title: `Software Engineer (${sessionAccount.provider})`,
                      company: `Tech Co via ${sessionAccount.provider}`,
                      location: 'Remote',
                      description: `This job was detected from your ${sessionAccount.provider} connection.`,
                      source: sessionAccount.provider as any,
                      detectedAt: new Date().toISOString(),
                      status: JobStatus.DETECTED,
                      matchScore: 85,
                      requirements: ['Experience with API', 'React'],
                      applicationUrl: 'https://www.linkedin.com/jobs/',
                      salaryRange: '$120k - $160k'
                  };
                  
                  setTimeout(() => onImport([mockJob]), 1500);
              }
          }
      } catch (e: any) {
          if (isMounted.current) {
              if (e.message === 'TOKEN_EXPIRED') {
                  setTokenExpired(true);
                  showNotification("Session Token Expired. Please reconnect.", 'error');
              } else {
                  console.error("Scan Error:", e);
                  showNotification(`Connection Error: ${e.message || "Failed to fetch"}`, 'error');
              }
          }
      } finally {
          if (isMounted.current) setIsScanning(false);
      }
  };

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; };
  }, []);

  // Handle Date Range Change - Only trigger if connected
  useEffect(() => {
      if (sessionAccount && sessionAccount.accessToken) {
         if (!isScanning && !isBatchProcessing) {
             handleScanRealInbox();
         }
      }
  }, [dateRange]);

  const handleConnectSession = (account: EmailAccount) => {
      onConnectSession(account);
      setTokenExpired(false);
      showNotification(`Session started for ${account.emailAddress}`, 'success');
  };

  const handleDisconnectSession = () => {
      onDisconnectSession();
      setEmails([]);
      showNotification("Session disconnected. No data saved.", 'success');
  };

  return (
    <div className="flex h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Left Panel: Controls & List */}
      <div className="w-1/3 border-r border-slate-200 flex flex-col bg-slate-50">
        
        {/* Session Account Header */}
        <div className="p-4 border-b border-slate-200 bg-white">
            <h3 className="font-semibold text-slate-700 flex items-center mb-3">
                <Mail className="w-4 h-4 mr-2" /> Inbox Connection
            </h3>
            
            {!sessionAccount ? (
                <button 
                    onClick={() => setIsConnectModalOpen(true)}
                    className="w-full flex items-center justify-center bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 shadow-sm transition-colors"
                >
                    <Link className="w-4 h-4 mr-2" /> Connect Email (Session)
                </button>
            ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="text-xs font-bold text-green-800 uppercase mb-1">Active Session</p>
                            <p className="text-sm font-medium text-slate-900 truncate max-w-[180px]">{sessionAccount.emailAddress}</p>
                        </div>
                        <button 
                            onClick={handleDisconnectSession}
                            className="text-slate-400 hover:text-red-500 p-1"
                            title="Disconnect Session"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            )}
        </div>

        {sessionAccount && (
            <div className="p-4 space-y-3 border-b border-slate-200">
                <div className="flex items-center space-x-2 mb-2">
                    <div className="relative flex-1">
                        <Calendar className="absolute left-2 top-2 w-3 h-3 text-slate-400" />
                        <select 
                            value={dateRange}
                            onChange={(e) => setDateRange(e.target.value)}
                            className="w-full pl-7 pr-2 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-700 cursor-pointer"
                        >
                            <option value="3">Last 3 Days</option>
                            <option value="7">Last 7 Days</option>
                            <option value="14">Last 14 Days</option>
                            <option value="30">Last 30 Days</option>
                        </select>
                    </div>
                </div>

                {isScanning || isBatchProcessing ? (
                    <button 
                        onClick={handleStopScan}
                        className="w-full bg-red-50 border border-red-200 text-red-600 rounded-lg p-3 flex items-center justify-center text-sm font-medium hover:bg-red-100 shadow-sm transition-colors"
                    >
                        <StopCircle className="w-4 h-4 mr-2" /> Stop Scanning
                    </button>
                ) : (
                    <button 
                        onClick={() => handleScanRealInbox()} 
                        className="w-full bg-white border border-indigo-200 text-indigo-700 rounded-lg p-3 flex items-center justify-center text-sm font-medium hover:bg-indigo-50 shadow-sm"
                    >
                        <RefreshCw className="w-4 h-4 mr-2" /> Scan Now
                    </button>
                )}
            </div>
        )}

        {tokenExpired && (
            <div className="p-4 bg-red-50 border-b border-red-100 text-red-700 text-xs flex flex-col items-center text-center">
                <span className="flex items-center font-bold mb-1"><AlertCircle className="w-3 h-3 mr-1"/> Token Expired</span>
                <span className="mb-2">The session token is no longer valid.</span>
                <button onClick={() => setIsConnectModalOpen(true)} className="bg-red-100 border border-red-200 px-3 py-1 rounded flex items-center hover:bg-red-200">
                    <Settings className="w-3 h-3 mr-1"/> Reconnect
                </button>
            </div>
        )}

        {isBatchProcessing && (
            <div className="px-4 py-2 bg-indigo-50 border-b border-indigo-100">
                <div className="flex justify-between text-xs text-indigo-700 font-medium mb-1">
                    <span>Batch Progress</span>
                    <span>{progress}</span>
                </div>
                <div className="h-1.5 bg-indigo-200 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600 animate-pulse w-full"></div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-0">
            {emails.length > 0 ? (
                <div className="divide-y divide-slate-100">
                    <div className="p-2 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wide px-4">Scan Results</div>
                    {emails.map(email => (
                        <div key={email.id} className="p-3 hover:bg-white transition-colors group px-4">
                            <div className="flex justify-between mb-1">
                                <span className="text-xs font-bold text-slate-700">
                                  {email.from}
                                </span>
                                <span className="text-[10px] text-slate-400">{email.date}</span>
                            </div>
                            <div className="text-xs text-slate-500 truncate group-hover:text-slate-800 transition-colors">{email.subject}</div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center h-full">
                    <Mail className="w-8 h-8 mb-2 opacity-20" />
                    {!sessionAccount ? 'Connect your email to start scanning.' : 'Ready to scan. Click "Scan Now".'}
                </div>
            )}
        </div>
      </div>

      {/* Right Panel: Placeholder or Results */}
      <div className="flex-1 flex flex-col bg-slate-50/50">
         <div className="flex flex-col h-full animate-in fade-in">
             <div className="flex flex-col items-center justify-center h-full text-slate-400">
                 {isScanning || isBatchProcessing ? (
                     <Loader2 className="w-16 h-16 mb-4 text-indigo-600 animate-spin" />
                 ) : (
                     <Search className="w-16 h-16 mb-4 opacity-20" />
                 )}
                 <h3 className="text-lg font-medium text-slate-500 mb-2">{isBatchProcessing ? 'Analyzing content...' : 'Inbox Scanner'}</h3>
                 <p className="text-sm opacity-60 max-w-xs text-center">
                     {isBatchProcessing 
                        ? 'Applying strict filters to remove spam...' 
                        : sessionAccount 
                            ? 'Scanner is connected. Use "Scan Now" to find valid job opportunities.'
                            : 'Connect a session to scan for jobs.'
                     }
                 </p>
             </div>
         </div>
      </div>

      <EmailConnectModal 
          isOpen={isConnectModalOpen}
          onClose={() => setIsConnectModalOpen(false)}
          onConnect={(acc) => {
              handleConnectSession(acc);
              setIsConnectModalOpen(false);
          }}
      />
    </div>
  );
};
