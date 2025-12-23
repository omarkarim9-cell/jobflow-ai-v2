
import { GoogleGenAI, Type } from "@google/genai";
import { Job } from "../types";

// Helper function to initialize the Google GenAI client
const getAi = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is not defined in the environment.");
    }
    return new GoogleGenAI({ apiKey });
};

// Helper function to extract plain text from HTML
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

/**
 * Robustly processes job application URLs to remove common tracking parameters.
 * Fixes the missing export error in automationService.ts
 */
// Added export getSmartApplicationUrl
export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    try {
        const u = new URL(url);
        // Remove common tracking parameters to improve reliability and privacy
        const trackingParams = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'ref', 'tracking_id', 'gclid', 'fbclid'];
        trackingParams.forEach(p => u.searchParams.delete(p));
        return u.toString();
    } catch (e) {
        // Return original URL if it's not a valid URL string
        return url;
    }
};

export const generateCoverLetter = async (
    title: string, 
    company: string, 
    description: string, 
    resume: string, 
    name: string, 
    email: string
): Promise<string> => {
    const ai = getAi();
    const prompt = `
    Write a high-impact, professional cover letter for the following position:
    Role: ${title}
    Company: ${company}
    Job Description: ${description}
    
    Applicant Name: ${name}
    Applicant Email: ${email}
    Applicant Resume Context: ${resume}
    
    Ensure the contact email used in the letter is EXACTLY: ${email}.
    The letter should be persuasive and professional.
    `;

    // Using gemini-3-flash-preview for general text generation
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });

    return response.text || "";
};

export const customizeResume = async (
    title: string, 
    company: string, 
    description: string, 
    resume: string,
    email: string
): Promise<string> => {
    const ai = getAi();
    const prompt = `
    Tailor the following resume for a specific job application.
    Target Role: ${title} at ${company}
    Verified Contact Email: ${email}
    Job Description: ${description}
    
    Original Resume:
    ${resume}
    
    Task:
    - OVERWRITE any email address in the original resume with: ${email}.
    - Update the professional summary to highlight relevant skills.
    - Rephrase bullet points to align with the job's key requirements.
    - Maintain the original structure but optimize for ATS keywords.
    - Return the full updated resume text.
    `;

    // Using gemini-3-flash-preview for resume tailoring
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt
    });

    return response.text || "";
};

export const extractJobsFromEmailHtml = async (html: string, userKeywords: string[]): Promise<Partial<Job>[]> => {
    const ai = getAi();
    const structuredText = soupify(html).substring(0, 20000);
    const prompt = `Extract job leads from this text: ${structuredText}. Targets: ${userKeywords.join(', ')}`;
    
    // Using gemini-3-flash-preview with JSON response schema
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
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
                    },
                    required: ['title', 'company', 'applicationUrl']
                }
            }
        }
    });
    try { return JSON.parse(response.text || "[]"); } catch (e) { return []; }
};

export const extractJobFromUrl = async (url: string): Promise<any> => {
    const ai = getAi();
    // Using gemini-3-flash-preview with Google Search grounding
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract full job details from this URL: ${url}`,
        config: { tools: [{ googleSearch: {} }] }
    });
    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Extracted Role', company: 'Check Site', description: text };
};
