import { GoogleGenAI, Type } from "@google/genai";
import { Job, JobStatus } from "../types";

/**
 * Helper to get Gemini AI instance.
 * Always created within the call scope to ensure latest environment variables.
 */
const getAi = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY is not defined. Ensure it is configured in environment variables.");
    return new GoogleGenAI({ apiKey });
};

export const generateCoverLetter = async (title: string, company: string, description: string, resume: string, name: string, email: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a high-impact cover letter for ${title} at ${company}. Name: ${name}, Email: ${email}, Resume: ${resume}`,
        config: {
            systemInstruction: "You are an expert career coach writing professional cover letters."
        }
    });
    return response.text || "";
};

export const customizeResume = async (title: string, company: string, description: string, resume: string, email: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tailor this resume for ${title} at ${company}. Email: ${email}. Resume: ${resume}`,
        config: {
            systemInstruction: "You are a professional resume writer specializing in ATS optimization."
        }
    });
    return response.text || "";
};

export const extractJobFromUrl = async (url: string): Promise<any> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract full job details from this URL: ${url}. Return as JSON with keys: title, company, location, salaryRange, description, requirements.`,
        config: { tools: [{ googleSearch: {} }] }
    });
    
    const text = response.text || "";
    try {
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Extracted Role', company: 'Check Site', description: text };
    } catch (e) {
        return { title: 'Extracted Role', company: 'Check Site', description: text };
    }
};

export const extractJobsFromEmailHtml = async (html: string): Promise<Partial<Job>[]> => {
    const ai = getAi();
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
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find 5 active ${role} job openings near these coordinates: latitude ${lat}, longitude ${lng}. List the results clearly.`,
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
                description: `Discovered via Google Maps search for ${role} near your current location.`,
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