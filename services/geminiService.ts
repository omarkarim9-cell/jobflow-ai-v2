import { GoogleGenAI, Type } from "@google/genai";
import { Job } from "../types";
import { localGenerateCoverLetter, localCustomizeResume, localExtractJobs } from "./localAiService";

// --- CONFIGURATION ---
const TIMEOUT_MS = 8000; 

// --- HELPER FUNCTIONS ---
const soupify = (html: string): string => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');
    const junkTags = ['script', 'style', 'meta', 'link', 'noscript', 'svg', 'img', 'iframe'];
    junkTags.forEach(tag => {
        const elements = doc.querySelectorAll(tag);
        elements.forEach(el => el.remove());
    });
    return doc.body.textContent || "";
};

export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    if (!url) return `https://www.google.com/search?q=${encodeURIComponent(`${title} ${company} careers`)}`;
    try {
        if (url.includes('awstrack.me') || url.includes('click') || url.includes('redirect')) {
            const protocolMatch = /https?:\/\//g;
            const matches = [...url.matchAll(protocolMatch)];
            if (matches.length > 1) {
                const lastMatch = matches[matches.length - 1];
                if (lastMatch.index !== undefined) return decodeURIComponent(url.substring(lastMatch.index));
            }
        }
    } catch (e) { }
    return url;
};

// --- API WRAPPER WITH FORCE FALLBACK ---

async function safeGenerate(model: string, contents: any, config?: any): Promise<any> {
    // @ts-ignore
    const apiKey = process.env.API_KEY;
    
    // 1. If no key, throw immediately to trigger local fallback
    if (!apiKey || apiKey.includes('YOUR_KEY')) {
        throw new Error("NO_API_KEY");
    }

    // @ts-ignore
    const ai = new GoogleGenAI({ apiKey });
    
    const apiPromise = ai.models.generateContent({ model, contents, config });
    const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("TIMEOUT")), TIMEOUT_MS)
    );

    return Promise.race([apiPromise, timeoutPromise]);
}

// --- EXPORTED FUNCTIONS ---

export const extractJobsFromEmailHtml = async (html: string, userKeywords: string[]): Promise<Partial<Job>[]> => {
    // Try Gemini First (if key exists)
    try {
        const structuredText = soupify(html).substring(0, 15000);
        const prompt = `
        Extract job opportunities. Keywords: ${userKeywords.join(', ')}
        Return JSON array: [{ title, company, location, description, applicationUrl }].
        Text: ${structuredText}
        `;

        // @ts-ignore
        const response: any = await safeGenerate('gemini-2.5-flash', prompt, {
            responseMimeType: 'application/json',
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        company: { type: Type.STRING },
                        location: { type: Type.STRING },
                        description: { type: Type.STRING },
                        applicationUrl: { type: Type.STRING }
                    }
                }
            }
        });

        const result = JSON.parse(response.text || "[]");
        if (result.length === 0) throw new Error("No jobs found by AI");
        return result;

    } catch (e) {
        // --- ROBUST LOCAL FALLBACK (THE FREE TOOL) ---
        console.log("Using Free Local Extraction Tool");
        return localExtractJobs(html);
    }
};

export const extractJobFromUrl = async (url: string): Promise<any> => {
    try {
        // Only try AI if we really think we have a key
        // @ts-ignore
        if (!process.env.API_KEY || process.env.API_KEY.includes('YOUR_KEY')) {
            throw new Error("No Key");
        }

        const prompt = `Extract job details from: ${url}. Return JSON: {title, company, location, description}.`;
        // @ts-ignore
        const response: any = await safeGenerate('gemini-2.5-flash', prompt, { tools: [{googleSearch: {}}] });
        const jsonMatch = response.text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : {};
    } catch (e) {
        return { title: 'Unknown Role', company: 'Unknown Company', description: 'Manual entry required.' };
    }
};

/**
 * GENERATE COVER LETTER - ENFORCED FREE MODE
 * Directly calls the local logic to guarantee no API errors and zero cost.
 */
export const generateCoverLetter = async (
    title: string, 
    company: string, 
    description: string, 
    resume: string, 
    name: string, 
    email: string
): Promise<string> => {
    // FORCE LOCAL FREE GENERATION
    console.log("Using Free Local Writer for Cover Letter");
    return localGenerateCoverLetter(title, company, description, resume, name, email);
};

/**
 * CUSTOMIZE RESUME - ENFORCED FREE MODE
 * Directly calls the local logic to guarantee no API errors and zero cost.
 */
export const customizeResume = async (
    title: string, 
    company: string, 
    description: string, 
    resume: string
): Promise<string> => {
    // FORCE LOCAL FREE GENERATION
    console.log("Using Free Local Writer for Resume");
    return localCustomizeResume(title, company, description, resume);
};