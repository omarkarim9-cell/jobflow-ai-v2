
/**
 * Local AI Service
 * Provides robust fallback generation for Resumes and Cover Letters using
 * template logic and keyword extraction. 100% Free, Unlimited, Client-Side.
 */

// Simple keyword extractor
const extractKeywords = (text: string): string[] => {
    const stopwords = new Set(['the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    
    // Count frequency
    const freq: Record<string, number> = {};
    words.forEach(w => {
        if (!stopwords.has(w) && w.length > 3) {
            freq[w] = (freq[w] || 0) + 1;
        }
    });

    // Return top 10 unique keywords
    return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
};

export const localGenerateCoverLetter = async (
    title: string,
    company: string,
    description: string,
    resume: string,
    userName: string,
    userEmail: string
): Promise<string> => {
    const today = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const keywords = extractKeywords(description);
    
    const managerMatch = description.match(/(?:report to|contact)\s+([A-Z][a-z]+ [A-Z][a-z]+)/);
    const recipient = managerMatch ? managerMatch[1] : "Hiring Manager";

    return `${userName}
${userEmail}
${today}

${recipient}
${company}

RE: Application for ${title}

Dear ${recipient},

I am writing to express my strong interest in the ${title} position at ${company}. Having reviewed the job description, I am excited about the opportunity to contribute my skills in ${keywords.slice(0, 3).join(', ')} to your team.

Based on my professional background, I have developed strong competencies that align well with your requirements:
*   Proven experience in ${keywords[0] || 'software development'} and ${keywords[1] || 'problem solving'}.
*   A track record of delivering results in fast-paced environments.
*   Strong alignment with ${company}'s mission.

In my previous roles, I have consistently demonstrated the ability to adapt and drive value. I am particularly drawn to this role because of ${company}'s reputation for excellence and innovation.

Thank you for considering my application. I have attached my resume for your review and would welcome the chance to discuss how my background fits the needs of your team.

Sincerely,

${userName}`;
};

export const localCustomizeResume = async (
    title: string,
    company: string,
    description: string,
    originalResume: string
): Promise<string> => {
    const keywords = extractKeywords(description);
    
    const targetedSummary = `
PROFESSIONAL SUMMARY FOR ${company.toUpperCase()}
--------------------------------------------------
Dedicated professional targeting the ${title} role. Brings relevant expertise in ${keywords.join(', ')}. Committed to delivering high-quality results and driving success for ${company}.
`;

    let newResume = originalResume;
    if (newResume.match(/SUMMARY|OBJECTIVE/i)) {
        newResume = newResume.replace(/(SUMMARY|OBJECTIVE)[\s\S]*?(?=\n[A-Z_]+)/i, targetedSummary);
    } else {
        newResume = targetedSummary + "\n" + newResume;
    }

    return newResume;
};

// --- IMPROVED: Strict Local Extraction Logic ---

const JOB_TITLES_REGEX = /(?:software|systems|data|site|reliability|qa|test|frontend|backend|full.?stack|devops|cloud|network|security|product|project|program|account|sales|marketing|business|customer|support|human|hr|legal|finance|operations)\s+(?:engineer|developer|architect|admin|manager|director|lead|specialist|analyst|associate|representative|executive|consultant)|programmer|coder|technician|designer/i;

const BLACKLIST_REGEX = /(unsubscribe|privacy|policy|view in browser|profile|settings|preferences|help|support|login|sign in|forgot password|terms|conditions|read more|apply now|click here|browser|email me|alert)/i;

/**
 * Parses HTML to find jobs. 
 * Uses strict Regex to reduce noise (from 65+ garbage links to high-quality ones).
 * Attempts to find Company Name via proximity search in DOM.
 */
export const localExtractJobs = (html: string, userKeywords: string[] = []): any[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const jobs: any[] = [];
    const links = doc.querySelectorAll('a');

    links.forEach(a => {
        const href = a.getAttribute('href');
        let text = a.textContent?.trim() || "";
        
        // 1. Basic Validity Checks
        if (!href || text.length < 4 || text.length > 100) return;
        if (href.startsWith('mailto:') || href.startsWith('tel:')) return;

        // 2. Strict Blacklist (Removes "Privacy Policy", "Unsubscribe", etc.)
        if (BLACKLIST_REGEX.test(text)) return;

        // 3. Strict Whitelist (Must sound like a job)
        // If user provided keywords, we prioritize those. Otherwise use general job regex.
        let isMatch = false;
        if (userKeywords.length > 0) {
            // Check if ANY user keyword exists in text
            isMatch = userKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase()));
        } else {
            // Fallback to generic job regex
            isMatch = JOB_TITLES_REGEX.test(text);
        }

        if (isMatch) {
            
            // 4. Company Name Extraction (Proximity Search)
            let company = "Pending Review"; // Default neutral
            
            // Strategy A: Look for "at [Company]" in the link text itself "Senior Dev at Google"
            const atMatch = text.match(/\s(at|for|with)\s+([A-Z][a-z0-9\s]+)/);
            if (atMatch && atMatch[2]) {
                company = atMatch[2].trim();
            } else {
                // Strategy B: Look at immediate surrounding text nodes in DOM
                const parentText = a.parentElement?.textContent || "";
                // Remove the link text itself to see what's left
                const surrounding = parentText.replace(text, '').trim();
                
                // If surrounding text is short (e.g. "Google - Senior Dev"), extract it
                if (surrounding.length > 2 && surrounding.length < 40) {
                     // Check for delimiters like "-" or "|"
                     const parts = surrounding.split(/[-|•]/);
                     // Find the longest part that looks like a name
                     const bestPart = parts.sort((a,b) => b.length - a.length)[0];
                     if (bestPart) company = bestPart.trim();
                }
            }
            
            // Cleanup Company Name
            company = company.replace(/^(at|for|with|-|–)\s+/i, '');

            jobs.push({
                title: text,
                company: company,
                location: "Remote/Hybrid", // Default safe assumption if not found
                description: "Extracted from email link. Click to view details.",
                applicationUrl: href,
                matchScore: 80 // Base score for finding a match
            });
        }
    });

    // Deduplicate by URL
    const uniqueJobs = Array.from(new Map(jobs.map(item => [item.applicationUrl, item])).values());
    
    // Limit to likely valid jobs (prevents flooding)
    return uniqueJobs.slice(0, 10); 
};

export const localExtractJobDetails = (htmlContent: string) => {
    const titleMatch = htmlContent.match(/<h1[^>]*>(.*?)<\/h1>/i) || htmlContent.match(/<title>(.*?)<\/title>/i);
    let title = titleMatch ? titleMatch[1].replace(/<[^>]+>/g, '').trim() : "Unknown Role";

    const companyMatch = htmlContent.match(/(?:at|company:|organization:)\s+([A-Z][a-z0-9\s,.]{2,20})/i);
    let company = companyMatch ? companyMatch[1].trim() : "Unknown Company";

    return { title, company };
};
