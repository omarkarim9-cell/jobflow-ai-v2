import { GoogleGenAI, Type } from "@google/genai";
import { Job, JobStatus } from "../types";

/**
 * Generates a tailored cover letter using the Gemini model.
 */
export const generateCoverLetter = async (title: string, company: string, description: string, resume: string, name: string, email: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a high-impact cover letter for ${title} at ${company}. Name: ${name}, Email: ${email}, Resume: ${resume}`,
        config: {
            systemInstruction: "You are an expert career coach writing professional cover letters."
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
        contents: `Tailor this resume for ${title} at ${company}. Email: ${email}. Resume: ${resume}`,
        config: {
            systemInstruction: "You are a professional resume writer specializing in ATS optimization."
        }
    });
    return response.text || "";
};

/**
 * Extracts job details from a URL using Google Search grounding.
 */
export const extractJobFromUrl = async (url: string): Promise<{data: any, sources: any[]}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract full job details from this URL: ${url}. Return as JSON with keys: title, company, location, salaryRange, description, requirements.`,
        config: { tools: [{ googleSearch: {} }] }
    });
    
    const text = response.text || "";
    const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return {
            data: jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Extracted Role', company: 'Check Site', description: text },
            sources
        };
    } catch (e) {
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
 * Searches for nearby jobs using Google Maps grounding.
 * Available only in Gemini 2.5 series models.
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

export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    return url;
};

