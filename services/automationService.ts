import { Job, UserProfile } from '../types';
import { getSmartApplicationUrl } from './geminiService';

/**
 * Simulates the backend Playwright automation service defined in URD Section 4.8.
 * In a production environment, this would be a WebSocket or polling connection to a backend task runner.
 */

export interface AutomationResult {
    success: boolean;
    error?: string;
    requiresManual?: boolean;
}

export const simulateBrowserAutomation = async (
  job: Job,
  profile: UserProfile,
  onStep: (step: string) => void
): Promise<AutomationResult> => {
  
  const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  try {
    // 1. Asset Verification
    onStep('AI Agent: Verifying generated assets...');
    await delay(800);

    if (!job.applicationUrl) {
      return { success: false, error: 'No application URL found.' };
    }

    // --- CHECK FOR TRACKING / COMPLEX LINKS ---
    // awstrack.me, wuzzuf.net, and other tracking domains often block direct automation or behave unpredictably (400 errors).
    // We immediately direct these to manual mode for better UX.
    const complexDomains = ['awstrack.me', 'wuzzuf.net', 'click', 'track', 'redirect'];
    if (complexDomains.some(d => job.applicationUrl?.includes(d))) {
        onStep('AI Agent: Complex redirect detected. Switching to manual mode for reliability...');
        await delay(1000);
        return { success: false, requiresManual: true };
    }

    // 2. Connectivity Check
    onStep(`AI Agent: Establishing connection to ${new URL(job.applicationUrl).hostname}...`);
    await delay(1000);

    // 3. Security Check Simulation
    // Since this is a client-side demo, we simulate a security block for external sites (LinkedIn, Indeed, etc.)
    // to force the "Manual Fallback" flow requested by the user.
    onStep('AI Agent: Checking site security protocols...');
    await delay(1000);

    // Return specific flag to trigger the Manual Fallback Modal
    return { success: false, requiresManual: true };

  } catch (error: any) {
    console.error("Automation Error:", error);
    return { success: false, error: error.message || "Unknown automation error" };
  }
};

/**
 * Internal helper to generate the HTML for the intermediate redirection page.
 */
const getIntermediatePageHtml = (targetUrl: string, titleText: string, bodyText: string, showFallbackButton: boolean, searchUrl: string) => {
    return `
        <!DOCTYPE html>
        <html>
        <head>
            <title>${titleText}</title>
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
                body { font-family: -apple-system, system-ui, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100vh; margin: 0; background-color: #f8fafc; color: #334155; }
                .loader { border: 3px solid #e2e8f0; border-top: 3px solid #6366f1; border-radius: 50%; width: 32px; height: 32px; animation: spin 1s linear infinite; margin-bottom: 1.5rem; }
                @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                h3 { margin: 0 0 0.5rem 0; font-size: 1.25rem; color: #0f172a; }
                p { margin: 0; font-size: 0.95rem; color: #64748b; text-align: center; padding: 0 20px; }
                .btn { margin-top: 1rem; padding: 0.75rem 1.5rem; background-color: #fff; border: 1px solid #cbd5e1; border-radius: 0.5rem; color: #475569; text-decoration: none; font-size: 0.875rem; font-weight: 500; transition: all 0.2s; cursor: pointer; display: inline-block; }
                .btn:hover { background-color: #f1f5f9; border-color: #94a3b8; }
                .footer { margin-top: 2rem; font-size: 0.75rem; color: #94a3b8; }
                .warning-box { margin-top: 1.5rem; padding: 1rem; background: #fff7ed; border: 1px solid #fdba74; border-radius: 0.5rem; font-size: 0.85rem; color: #9a3412; max-width: 80%; text-align: center; }
            </style>
        </head>
        <body>
            <div class="loader"></div>
            <h3>${titleText}</h3>
            <p>${bodyText}</p>
            
            <div class="warning-box">
                <strong>Note:</strong> Job sites may block direct links or require sign-in.<br/>
                If the page shows an error, use the button below to find the job via Google.
            </div>

            ${showFallbackButton ? `<a href="${searchUrl}" class="btn">Search Job on Google</a>` : ''}
            
            <div class="footer">Secure Redirection by JobFlow AI</div>
            <script>
                // The delay gives the user a chance to see the message before navigation starts.
                setTimeout(function() {
                    window.location.href = "${targetUrl}";
                }, 2000);
            </script>
        </body>
        </html>
    `;
};

/**
 * Robustly opens a job application URL.
 * 1. Opens a new tab immediately (to avoid popup blockers).
 * 2. Uses an intermediate page to handle redirect/loading UX.
 * 3. Provides a fallback to Google Search button on the intermediate page.
 * 
 * @param job The job object to open
 * @param explicitUrl Optional: Force open this URL instead of job.applicationUrl (e.g. for search overrides)
 */
export const openSafeApplicationUrl = async (job: Job, explicitUrl?: string) => {
    const title = job.title;
    const company = job.company;
    
    // Construct a high-intent search query for fallback
    const searchQuery = `${title} ${company} careers apply`;
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(searchQuery)}`;

    // Determine the target URL
    let url = explicitUrl;
    
    if (!url) {
        // If no explicit URL, try to process the job's URL
        if (job.applicationUrl) {
             url = getSmartApplicationUrl(job.applicationUrl, title, company);
        }
    }
    
    let isSearchFallback = false;
    
    // If still no URL, fallback to search
    if (!url) {
        url = searchUrl;
        isSearchFallback = true;
    }

    // 2. Open intermediate window immediately to handle popup blocking context
    const newWindow = window.open('', '_blank');
    if (!newWindow) {
        alert('Popups blocked. Please allow popups for this site to open job links.');
        return;
    }

    // 3. Set content
    const pageTitle = isSearchFallback ? 'Searching Job...' : 'Connecting...';
    const pageBody = isSearchFallback 
        ? `Redirecting you to Google Search results for <strong>${company}</strong>...`
        : `Redirecting you to the official application page for <strong>${company}</strong>...`;

    // Only show fallback button if we aren't ALREADY searching
    const showFallback = !isSearchFallback;

    newWindow.document.write(getIntermediatePageHtml(url, pageTitle, pageBody, showFallback, searchUrl));
};