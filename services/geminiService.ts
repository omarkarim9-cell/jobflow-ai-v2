
import { GoogleGenAI, Type } from "@google/genai";
import { Job, JobStatus } from "../types";

const getAi = () => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) throw new Error("API_KEY is not defined.");
    return new GoogleGenAI({ apiKey });
};

// Use gemini-3-flash-preview for basic text tasks and access .text property directly
export const generateCoverLetter = async (title: string, company: string, description: string, resume: string, name: string, email: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a high-impact cover letter for ${title} at ${company}. Name: ${name}, Email: ${email}, Resume: ${resume}`
    });
    return response.text || "";
};

// Use gemini-3-flash-preview for basic text tasks and access .text property directly
export const customizeResume = async (title: string, company: string, description: string, resume: string, email: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tailor this resume for ${title} at ${company}. Email: ${email}. Resume: ${resume}`
    });
    return response.text || "";
};

// Use gemini-3-pro-preview for complex extraction tasks and googleSearch tool
export const extractJobFromUrl = async (url: string): Promise<any> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Extract full job details from this URL: ${url}. Return the details in JSON format including title, company, location, salaryRange, description, and requirements.`,
        config: { tools: [{ googleSearch: {} }] }
    });
    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Extracted Role', company: 'Check Site', description: text };
};

// Fixed: Added responseSchema for reliable JSON responses and updated model selection
export const extractJobsFromEmailHtml = async (html: string): Promise<Partial<Job>[]> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract job postings from this email HTML. For each job, provide title, company, location, salaryRange, description, and applicationUrl. Return as a JSON array of objects.\n\nHTML Content: ${html}`,
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
                        applicationUrl: { type: Type.STRING },
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
 * Restricted to Gemini 2.5 series models per technical guidelines.
 */
export const searchNearbyJobs = async (lat: number, lng: number, role: string): Promise<Job[]> => {
    const ai = getAi();
    // Maps grounding is only supported in Gemini 2.5 series models.
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite-latest',
        contents: `Find active ${role} job openings near latitude ${lat}, longitude ${lng}.`,
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
        }
    });

    const jobs: Job[] = [];
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    
    // Attempt to extract job sources from Google Maps grounding metadata
    groundingChunks.forEach((chunk, index) => {
        if (chunk.maps) {
            jobs.push({
                id: `maps-${index}-${Date.now()}`,
                title: role,
                company: chunk.maps.title || 'Local Opportunity',
                location: 'Nearby',
                description: `Verified via Google Maps grounding.`,
                source: 'Imported Link',
                detectedAt: new Date().toISOString(),
                status: JobStatus.DETECTED,
                matchScore: 85,
                requirements: [],
                applicationUrl: chunk.maps.uri || ''
            });
        }
    });

    // Fallback parsing for textual content if grounding metadata is incomplete
    if (jobs.length === 0 && response.text) {
        const textLines = response.text.split('\n');
        textLines.forEach((line, idx) => {
            const companyMatch = line.match(/^\d+\.\s+\*\*([^*]+)\*\*/);
            if (companyMatch) {
                jobs.push({
                    id: `maps-text-${idx}`,
                    title: role,
                    company: companyMatch[1].trim(),
                    location: 'Local Area',
                    description: line,
                    source: 'Imported Link',
                    detectedAt: new Date().toISOString(),
                    status: JobStatus.DETECTED,
                    matchScore: 75,
                    requirements: [],
                    applicationUrl: ''
                });
            }
        });
    }

    return jobs;
};

export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    return url;
};
