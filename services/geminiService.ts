import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Job, JobStatus } from "../types";

/**
 * Generates a tailored cover letter using the Gemini model.
 */
export const generateCoverLetter = async (title: string, company: string, description: string, resume: string, name: string, email: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const isPlaceholder = !company || company === "Review Required" || company === "Unknown";
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a high-impact cover letter for the ${title} position.
        
        Details:
        - Company: ${isPlaceholder ? 'Carefully analyze the job description below to identify the real company name. Use it if found, otherwise use "Hiring Manager".' : company}
        - Candidate Name: ${name}
        - Candidate Email: ${email}
        - Job Description: ${description}
        - Original Resume: ${resume}
        
        Instructions:
        - ADDRESS THE LETTER TO THE SPECIFIC COMPANY IF FOUND.
        - NEVER use the phrase "Review Required" or "Unknown" in the final text.
        - Highlight matching skills from the resume and description.`,
        config: {
            systemInstruction: "You are an expert career coach writing professional, high-conversion cover letters."
        }
    });
    return response.text || "";
};

/**
 * Customizes a resume based on the job description.
 */
export const customizeResume = async (title: string, company: string, description: string, resume: string, email: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tailor this resume for a ${title} role at ${company}. 
        Email: ${email}. 
        Original Resume: ${resume}
        Job Description: ${description}`,
        config: {
            systemInstruction: "You are a professional resume writer specializing in ATS optimization. Rewrite bullet points to emphasize relevant experience for the specific role. Ensure the company name is utilized if available."
        }
    });
    return response.text || "";
};

/**
 * Extracts job details from a URL using Google Search grounding.
 * Upgraded to Gemini 3 Pro for superior reasoning.
 */
export const extractJobFromUrl = async (url: string): Promise<{data: any, sources: any[]}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze the job posting at this URL: ${url}. 
        
        TASK:
        Extract the following details as a clean JSON object. 
        CRITICAL: Finding the company name is mandatory. Use Google Search grounding to identify exactly which company is hosting this job if it's not clear on the page.
        DO NOT return "Review Required" as a company name. Find the actual name.

        Fields:
        - title (The official job title)
        - company (The hiring company name)
        - location (City, State or Remote)
        - description (Full job description)
        - requirements (Comma-separated key skills)

        Return ONLY the JSON object.`,
        config: { 
            tools: [{ googleSearch: {} }] 
        }
    });
    
    const text = response.text || "";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    try {
        const cleanedText = text.replace(/```json/g, "").replace(/```/g, "").trim();
        const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
        const parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : null;
        
        if (!parsed || !parsed.title) {
             throw new Error("Invalid extraction result");
        }

        return { data: parsed, sources };
    } catch (e) {
        console.error("Gemini extraction parsing failed", e);
        return {
            data: { title: 'Extracted Role', company: 'Check Site', description: text },
            sources
        };
    }
};

/**
 * Extracts multiple job listings from email HTML.
 */
export const extractJobsFromEmailHtml = async (html: string): Promise<Partial<Job>[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract job postings from this email HTML. Return a JSON array of objects with title, company, location, salaryRange, description, and applicationUrl. HTML: ${html}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        company: { type: Type.STRING },
                        location: { type: Type.STRING },
                        salaryRange: { type: Type.STRING },
                        description: { type: Type.STRING },
                        applicationUrl: { type: Type.STRING }
                    },
                    required: ["title", "company"]
                }
            }
        }
    });
    
    try {
        return JSON.parse(response.text || "[]");
    } catch (e) {
        console.error("Failed to parse JSON from email extraction", e);
        return [];
    }
};

/**
 * Processes a job URL to ensure it's a direct application link by cleaning tracking parameters.
 */
export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    try {
        const u = new URL(url);
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source', 'click_id', 'gclid'];
        paramsToRemove.forEach(p => u.searchParams.delete(p));
        return u.toString();
    } catch (e) {
        return url;
    }
};

/**
 * Searches for nearby jobs using Google Maps grounding.
 */
export const searchNearbyJobs = async (lat: number, lng: number, role: string): Promise<Job[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find 5 active ${role} job openings near these coordinates: latitude ${lat}, longitude ${lng}.`,
        config: {
            tools: [{ googleMaps: {} }],
            toolConfig: {
                retrievalConfig: {
                    latLng: {
                        latitude: lat,
                        longitude: lng
                    }
                }
            }
        },
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const jobs: Job[] = [];

    groundingChunks.forEach((chunk, index) => {
        if (chunk.maps) {
            jobs.push({
                id: `maps-${Date.now()}-${index}`,
                title: role,
                company: chunk.maps.title || 'Nearby Company',
                location: 'Local Area',
                description: `Found via Google Maps grounding for ${role}.`,
                source: 'Imported Link',
                detectedAt: new Date().toISOString(),
                status: JobStatus.DETECTED,
                matchScore: 85,
                requirements: [],
                applicationUrl: chunk.maps.uri || ''
            });
        }
    });

    return jobs;
};
