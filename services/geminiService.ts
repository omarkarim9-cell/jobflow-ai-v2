import { GoogleGenAI, Type } from "@google/genai";
import { Job } from "../types";

/**
 * Gemini Service
 * Uses Gemini 3 models for high-quality extraction and document generation.
 */

const getAi = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        throw new Error("API_KEY is not defined in the environment.");
    }
    return new GoogleGenAI({ apiKey });
};

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
 * Processes a URL to ensure it is the most direct application link.
 */
export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    if (!url) return "";
    return url;
};

export const extractJobsFromEmailHtml = async (html: string, userKeywords: string[]): Promise<Partial<Job>[]> => {
    const ai = getAi();
    const structuredText = soupify(html).substring(0, 20000);
    const prompt = `
    You are an expert recruitment AI. Extract job opportunities from the following text. 
    Target Keywords: ${userKeywords.join(', ')}
    
    Rules:
    - Only extract real job opportunities.
    - Ignore newsletters, advertisements, or "how-to" articles.
    - Return a JSON array of objects.
    
    Text: ${structuredText}
    `;

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
                        title: { type: Type.STRING, description: 'The job title.' },
                        company: { type: Type.STRING, description: 'The company name.' },
                        location: { type: Type.STRING, description: 'The location (e.g., Remote, City, State).' },
                        description: { type: Type.STRING, description: 'A brief 2-sentence summary of the role.' },
                        applicationUrl: { type: Type.STRING, description: 'The direct link to apply.' },
                        salaryRange: { type: Type.STRING, description: 'Salary if mentioned, otherwise leave empty.' }
                    },
                    required: ['title', 'company', 'applicationUrl']
                }
            }
        }
    });

    try {
        const result = JSON.parse(response.text || "[]");
        return result;
    } catch (e) {
        console.error("Failed to parse Gemini response", e);
        return [];
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
    Applicant Resume Context: ${resume}
    
    The letter should be persuasive, tailored to the specific job requirements, and professional in tone.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 2000 }
        }
    });

    return response.text || "";
};

export const customizeResume = async (
    title: string, 
    company: string, 
    description: string, 
    resume: string
): Promise<string> => {
    const ai = getAi();
    const prompt = `
    Tailor the following resume for a specific job application.
    Target Role: ${title} at ${company}
    Job Description: ${description}
    
    Original Resume:
    ${resume}
    
    Task:
    - Update the professional summary to highlight relevant skills.
    - Rephrase bullet points to align with the job's key requirements.
    - Maintain the original structure but optimize for ATS keywords.
    - Return the full updated resume text.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            thinkingConfig: { thinkingBudget: 4000 }
        }
    });

    return response.text || "";
};

export const extractJobFromUrl = async (url: string): Promise<any> => {
    const ai = getAi();
    const prompt = `Extract full job details from this URL: ${url}. Return title, company, location, and a detailed description.`;
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: prompt,
        config: {
            tools: [{ googleSearch: {} }]
        }
    });

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Extracted Role', company: 'Check Site', description: text };
};