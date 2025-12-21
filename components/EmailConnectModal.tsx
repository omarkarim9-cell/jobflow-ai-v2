import React, { useState, useEffect } from 'react';
import { EmailAccount } from '../types';
import { X, ShieldCheck, Loader2, ExternalLink, Copy, Check, Info, Key, Clock } from 'lucide-react';
import { fetchGmailProfile } from '../services/gmailService';

interface EmailConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (account: EmailAccount) => void;
  currentUserEmail?: string;
}

export const EmailConnectModal: React.FC<EmailConnectModalProps> = ({ isOpen, onClose, onConnect, currentUserEmail }) => {
  const [isConnecting, setIsConnecting] = useState<string | null>(null);
  const [manualEmailInput, setManualEmailInput] = useState('');
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  
  // Token State
  const [accessToken, setAccessToken] = useState('');
  const [copySuccess, setCopySuccess] = useState(false);

  // Pre-fill email when modal opens or currentUserEmail changes
  useEffect(() => {
    if (currentUserEmail) {
      setManualEmailInput(currentUserEmail);
    }
  }, [currentUserEmail, isOpen]);

  if (!isOpen) return null;

  const handleProviderClick = (provider: string) => {
    setSelectedProvider(provider);
    setAccessToken('');
    // Keep the pre-filled email if valid
    if (!manualEmailInput && currentUserEmail) {
        setManualEmailInput(currentUserEmail);
    }
  };

  const handleCopyScope = () => {
      navigator.clipboard.writeText('https://www.googleapis.com/auth/gmail.readonly');
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
  };

  const handleFinalizeConnection = async () => {
    if (!selectedProvider) return;
    
    // Sanitize token input (remove quotes, JSON structure, and "Bearer " prefix)
    let cleanToken = accessToken.trim();
    
    // Handle JSON paste
    if (cleanToken.startsWith('{') && cleanToken.endsWith('}')) {
        try {
            const parsed = JSON.parse(cleanToken);
            if (parsed.access_token) cleanToken = parsed.access_token;
        } catch(e) {}
    }

    if (cleanToken.toLowerCase().startsWith('bearer ')) {
        cleanToken = cleanToken.slice(7).trim();
    }
    // Remove quotes
    cleanToken = cleanToken.replace(/^["'“”]+|["'“”]+$/g, '');
    
    // Gmail requires token in this frontend-only version
    if (selectedProvider === 'Gmail') {
        if (!cleanToken) {
            alert("Please paste a valid Access Token from Google.");
            return;
        }
        if (!cleanToken.startsWith('ya29')) {
             if(!window.confirm("The token doesn't look like a standard Google Access Token (usually starts with 'ya29'). Continue anyway?")) {
                 return;
             }
        }
    }
    
    // Outlook also uses tokens in this simulation (via Graph Explorer)
    if (selectedProvider === 'Outlook' && !cleanToken) {
        alert("Please paste a valid Access Token from Microsoft Graph Explorer.");
        return;
    }

    // Yahoo/Apple uses App Password
    if ((selectedProvider === 'Yahoo' || selectedProvider === 'Apple') && !cleanToken) {
        alert("Please paste your App Password.");
        return;
    }

    if (selectedProvider !== 'Gmail' && !manualEmailInput) {
        alert("Please enter your email address");
        return;
    }

    setIsConnecting(selectedProvider);

    let emailToUse = manualEmailInput || 'user@gmail.com';
    
    // FETCH REAL PROFILE IF GMAIL
    if (selectedProvider === 'Gmail') {
        try {
            const profile = await fetchGmailProfile(cleanToken);
            if (profile.emailAddress) {
                emailToUse = profile.emailAddress;
            }
        } catch (e) {
            console.warn("Could not fetch Gmail profile", e);
             if (!manualEmailInput) {
                 alert("Could not verify token. Please ensure it is valid.");
                 setIsConnecting(null);
                 return;
             }
        }
    }
    
    const newAccount: EmailAccount = {
      id: Math.random().toString(36).substr(2, 9),
      provider: selectedProvider as any,
      emailAddress: emailToUse,
      isConnected: true,
      lastSynced: new Date().toISOString(),
      accessToken: cleanToken
    };
    
    onConnect(newAccount);
    
    // Cleanup
    setIsConnecting(null);
    setSelectedProvider(null);
    setManualEmailInput('');
    setAccessToken('');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col">
        <div className="p-5 border-b border-slate-100 flex justify-between items-center shrink-0">
          <div>
              <h2 className="text-lg font-bold text-slate-900">Start Scanning Session</h2>
              <div className="flex items-center text-xs text-amber-600 mt-1 bg-amber-50 px-2 py-0.5 rounded border border-amber-100 w-fit">
                  <Clock className="w-3 h-3 mr-1" /> Session Only (Token not saved)
              </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-full hover:bg-slate-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          {!selectedProvider ? (
            <>
              <p className="text-sm text-slate-600 mb-5">
                Select your email provider to start a scanning session. The token will be cleared when you refresh the page.
              </p>
              
              <div className="space-y-3">
                <button 
                  onClick={() => handleProviderClick('Gmail')}
                  className="w-full flex items-center p-4 border border-slate-200 rounded-xl hover:border-red-200 hover:bg-red-50 transition-all group"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mr-4 group-hover:scale-110 transition-transform">
                     <span className="text-red-500 font-bold text-xl">G</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">Gmail</div>
                    <div className="text-xs text-slate-500">Direct API Connection</div>
                  </div>
                </button>

                <button 
                  onClick={() => handleProviderClick('Outlook')}
                  className="w-full flex items-center p-4 border border-slate-200 rounded-xl hover:border-blue-200 hover:bg-blue-50 transition-all group"
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mr-4 group-hover:scale-110 transition-transform">
                     <span className="text-blue-600 font-bold text-xl">O</span>
                  </div>
                  <div className="text-left">
                    <div className="font-semibold text-slate-900">Outlook</div>
                    <div className="text-xs text-slate-500">Microsoft Graph API</div>
                  </div>
                </button>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                      onClick={() => handleProviderClick('Yahoo')}
                      className="w-full flex items-center p-3 border border-slate-200 rounded-xl hover:border-purple-200 hover:bg-purple-50 transition-all group"
                    >
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mr-3 group-hover:scale-110 transition-transform">
                         <span className="text-purple-600 font-bold text-lg">Y!</span>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-slate-900 text-sm">Yahoo</div>
                        <div className="text-[10px] text-slate-500">App Pass</div>
                      </div>
                    </button>
                    
                    <button 
                      onClick={() => handleProviderClick('Apple')}
                      className="w-full flex items-center p-3 border border-slate-200 rounded-xl hover:border-gray-300 hover:bg-gray-50 transition-all group"
                    >
                      <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-100 mr-3 group-hover:scale-110 transition-transform">
                         <span className="text-black font-bold text-lg"></span>
                      </div>
                      <div className="text-left">
                        <div className="font-semibold text-slate-900 text-sm">Apple</div>
                        <div className="text-[10px] text-slate-500">App Pass</div>
                      </div>
                    </button>
                </div>
              </div>
            </>
          ) : (
            <div className="animate-in fade-in slide-in-from-right-4">
                <div className="text-center mb-4">
                   <div className="w-12 h-12 bg-indigo-50 rounded-full flex items-center justify-center mx-auto mb-2 text-indigo-600">
                      <ShieldCheck className="w-6 h-6" />
                   </div>
                   <h3 className="font-bold text-slate-900">Authenticate with {selectedProvider}</h3>
                </div>

                {/* GMAIL INSTRUCTIONS */}
                {selectedProvider === 'Gmail' && (
                    <div className="space-y-6">
                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-800">
                            <div className="font-semibold flex items-center mb-1 text-blue-900">
                                <Info className="w-4 h-4 mr-1"/>
                                Secure Connection Guide
                            </div>
                            <p className="leading-relaxed">
                                Since this is a secure client-side app, we cannot redirect you to Google. 
                                Please generate a temporary <strong>Access Token</strong> using Google's official developer tool.
                            </p>
                        </div>

                        <div className="space-y-4 border-l-2 border-slate-200 pl-4 ml-2">
                             <div className="relative">
                                <div className="absolute -left-[21px] top-0 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white ring-1 ring-slate-200"></div>
                                <p className="text-sm font-bold text-slate-900 mb-1">Step 1: Open Google Playground</p>
                                <a 
                                    href="https://developers.google.com/oauthplayground" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 font-medium text-indigo-600 transition-colors shadow-sm"
                                >
                                    Launch Tool <ExternalLink className="w-3 h-3 ml-1"/>
                                </a>
                             </div>

                             <div className="relative pt-2">
                                <div className="absolute -left-[21px] top-2 w-4 h-4 bg-white rounded-full border-2 border-slate-300"></div>
                                <p className="text-sm font-bold text-slate-900 mb-1">Step 2: Input Scope</p>
                                <div className="flex space-x-2">
                                    <code className="flex-1 bg-slate-100 p-2 rounded text-[10px] border border-slate-200 truncate font-mono text-slate-600">
                                        https://www.googleapis.com/auth/gmail.readonly
                                    </code>
                                    <button 
                                        onClick={handleCopyScope}
                                        className="px-3 py-1 text-slate-600 hover:text-indigo-600 bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center" 
                                        title="Copy to clipboard"
                                    >
                                         {copySuccess ? <Check className="w-3 h-3"/> : <Copy className="w-3 h-3"/>}
                                    </button>
                                </div>
                             </div>

                             <div className="relative pt-2">
                                <div className="absolute -left-[21px] top-2 w-4 h-4 bg-white rounded-full border-2 border-slate-300"></div>
                                <p className="text-sm font-bold text-slate-900 mb-1">Step 3: Authorize & Copy Token</p>
                             </div>
                        </div>
                    </div>
                )}

                {/* OUTLOOK INSTRUCTIONS */}
                {selectedProvider === 'Outlook' && (
                    <div className="space-y-6">
                         <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-xs text-blue-800">
                            <div className="font-semibold flex items-center mb-1 text-blue-900">
                                <Info className="w-4 h-4 mr-1"/>
                                Microsoft Graph API
                            </div>
                            <p className="leading-relaxed">
                                Use the Microsoft Graph Explorer to get a temporary token for reading mail.
                            </p>
                        </div>

                        <div className="space-y-4 border-l-2 border-slate-200 pl-4 ml-2">
                             <div className="relative">
                                <div className="absolute -left-[21px] top-0 w-4 h-4 bg-indigo-600 rounded-full border-2 border-white ring-1 ring-slate-200"></div>
                                <p className="text-sm font-bold text-slate-900 mb-1">Step 1: Open Graph Explorer</p>
                                <a 
                                    href="https://developer.microsoft.com/en-us/graph/graph-explorer" 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center text-xs bg-white border border-slate-300 px-3 py-1.5 rounded-md hover:bg-slate-50 font-medium text-indigo-600 transition-colors shadow-sm"
                                >
                                    Launch Explorer <ExternalLink className="w-3 h-3 ml-1"/>
                                </a>
                             </div>
                             <div className="relative pt-2">
                                <div className="absolute -left-[21px] top-2 w-4 h-4 bg-white rounded-full border-2 border-slate-300"></div>
                                <p className="text-sm font-bold text-slate-900 mb-1">Step 2: Sign In & Copy Access Token</p>
                                <p className="text-xs text-slate-500">Click the "Access Token" tab in the tool to verify.</p>
                             </div>
                        </div>
                        
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Your Outlook Email</label>
                            <input 
                                type="email"
                                placeholder="name@outlook.com"
                                className="w-full p-2 bg-white border border-slate-300 rounded text-sm outline-none focus:border-indigo-500"
                                value={manualEmailInput}
                                onChange={(e) => setManualEmailInput(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {/* YAHOO / APPLE INSTRUCTIONS */}
                {(selectedProvider === 'Yahoo' || selectedProvider === 'Apple') && (
                    <div className="space-y-6">
                         <div className="bg-purple-50 p-4 rounded-lg border border-purple-100 text-xs text-purple-800">
                            <div className="font-semibold flex items-center mb-1 text-purple-900">
                                <Info className="w-4 h-4 mr-1"/>
                                App Password Required
                            </div>
                            <p className="leading-relaxed">
                                {selectedProvider} requires a generated "App Password" for third-party apps.
                            </p>
                        </div>

                        <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 bg-slate-50 p-4 rounded-lg border border-slate-200">
                            <li>Go to <strong>{selectedProvider} Account Security</strong>.</li>
                            <li>Click <strong>Generate App Password</strong>.</li>
                            <li>Name it "JobFlow" and copy the code.</li>
                        </ol>
                        
                        <div className="pt-2">
                            <label className="block text-xs font-bold text-slate-700 mb-1">Your {selectedProvider} Email</label>
                            <input 
                                type="email"
                                placeholder={`name@${selectedProvider.toLowerCase()}.com`}
                                className="w-full p-2 bg-white border border-slate-300 rounded text-sm outline-none focus:border-indigo-500"
                                value={manualEmailInput}
                                onChange={(e) => setManualEmailInput(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                <div className="pt-4">
                        <label className="block text-sm text-slate-800 font-bold mb-2 flex items-center">
                        <Key className="w-4 h-4 mr-2 text-indigo-600"/>
                        {(selectedProvider === 'Yahoo' || selectedProvider === 'Apple') ? 'Paste App Password' : 'Paste Access Token'}
                        </label>
                        <textarea 
                            placeholder={(selectedProvider === 'Yahoo' || selectedProvider === 'Apple') ? "abcd efgh ijkl mnop" : "Paste token starting with ya29... (Gmail) or eyJ... (Outlook)"}
                            className="w-full p-3 bg-white border border-slate-300 rounded-lg text-xs font-mono h-24 resize-none focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm transition-shadow"
                            value={accessToken}
                            onChange={(e) => setAccessToken(e.target.value)}
                        />
                        <p className="text-[10px] text-slate-400 mt-1">
                            We sanitize input automatically (removing 'Bearer', quotes, etc).
                        </p>
                </div>

                <div className="flex space-x-3 mt-6 pt-4 border-t border-slate-100">
                    <button 
                        onClick={() => setSelectedProvider(null)}
                        className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium text-sm hover:bg-slate-50 transition-colors"
                    >
                        Back
                    </button>
                    <button 
                        onClick={handleFinalizeConnection}
                        disabled={!accessToken || (selectedProvider !== 'Gmail' && !manualEmailInput) || !!isConnecting}
                        className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 flex justify-center items-center shadow-sm transition-all"
                    >
                        {isConnecting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Start Session'}
                    </button>
                </div>
            </div>
          )}
        </div>
        
        {!selectedProvider && (
            <div className="bg-slate-50 p-3 border-t border-slate-100 text-center shrink-0">
            <p className="text-[10px] text-slate-400 flex items-center justify-center">
                <ShieldCheck className="w-3 h-3 mr-1" /> Secure OAuth 2.0 Standard
            </p>
            </div>
        )}
      </div>
    </div>
  );
};