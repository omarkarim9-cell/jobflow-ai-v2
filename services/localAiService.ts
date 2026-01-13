
/**
 * Local AI Service
 * Provides robust fallback generation for Resumes and Cover Letters.
 */

const extractKeywords = (text: string): string[] => {
    const stopwords = new Set(['the', 'and', 'or', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by']);
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/);
    const freq: Record<string, number> = {};
    words.forEach(w => {
        if (!stopwords.has(w) && w.length > 3) {
            freq[w] = (freq[w] || 0) + 1;
        }
    });
    return Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([word]) => word.charAt(0).toUpperCase() + word.slice(1));
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
    const targetName = (company === "Review Required" || !company) ? "Hiring Manager" : company;
    
    return `${userName}\n${userEmail}\n${today}\n\n${targetName}\n\nRE: Application for ${title}\n\nDear ${targetName},\n\nI am writing to express my strong interest in the ${title} position at ${targetName}. Having reviewed the job description, I am excited about the opportunity to contribute my skills in ${keywords.slice(0, 3).join(', ')} to your team. My experience aligns closely with your requirements, and I am eager to discuss how my background can benefit your organization.\n\nThank you for your time and consideration.\n\nSincerely,\n\n${userName}`;
};

export const localCustomizeResume = async (
    title: string,
    company: string,
    description: string,
    originalResume: string,
    email: string
): Promise<string> => {
    const keywords = extractKeywords(description);
    const targetCompany = (company === "Review Required" || !company) ? "Your Organization" : company;
    
    const targetedSummary = `\nCONTACT: ${email}\n\nPROFESSIONAL SUMMARY FOR ${targetCompany.toUpperCase()}\n--------------------------------------------------\nDedicated professional targeting the ${title} role. Relevant expertise: ${keywords.join(', ')}.\n`;
    
    // Simple replacement logic for email in text
    let newResume = originalResume.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, email);
    
    if (newResume.match(/SUMMARY|OBJECTIVE/i)) {
        newResume = newResume.replace(/(SUMMARY|OBJECTIVE)[\s\S]*?(?=\n[A-Z_]+)/i, targetedSummary);
    } else {
        newResume = targetedSummary + "\n" + newResume;
    }
    return newResume;
};

const JOB_TITLES_REGEX = /(?:software|systems|data|site|reliability|qa|test|frontend|backend|full.?stack|devops|cloud|network|security|product|project|program|account|sales|marketing|business|customer|support|human|hr|legal|finance|operations)\s+(?:engineer|developer|architect|admin|manager|director|lead|specialist|analyst|associate|representative|executive|consultant)|programmer|coder|technician|designer/i;
const BLACKLIST_REGEX = /(unsubscribe|privacy|policy|view in browser|profile|settings|preferences|help|support|login|sign in|forgot password|terms|conditions|read more|apply now|click here|browser|email me|alert)/i;

export const localExtractJobs = (html: string, userKeywords: string[] = []): any[] => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const jobs: any[] = [];
    const links = doc.querySelectorAll('a');
    links.forEach(a => {
        const href = a.getAttribute('href');
        let text = a.textContent?.trim() || "";
        if (!href || text.length < 4 || text.length > 100) return;
        if (BLACKLIST_REGEX.test(text)) return;
        let isMatch = userKeywords.length > 0 ? userKeywords.some(kw => text.toLowerCase().includes(kw.toLowerCase())) : JOB_TITLES_REGEX.test(text);
        if (isMatch) {
            jobs.push({ title: text, company: "Review Required", location: "Remote/Hybrid", applicationUrl: href, matchScore: 80 });
        }
    });
    return Array.from(new Map(jobs.map(item => [item.applicationUrl, item])).values()).slice(0, 10); 
};
