
import { GoogleGenAI, Type } from "@google/genai";
import { Job, JobStatus } from "../types";

// Note: Always use new GoogleGenAI({ apiKey: process.env.API_KEY }) within the scope of each service call as per SDK guidelines.

/**
 * Generates a tailored cover letter using the Gemini model.
 */
export const generateCoverLetter = async (title: string, company: string, description: string, resume: string, name: string, email: string) => {
    // Initialize AI client with the mandatory named parameter for API key.
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a high-impact cover letter for ${title} at ${company}. Name: ${name}, Email: ${email}, Resume: ${resume}`,
        config: {
            systemInstruction: "You are a world-class career coach and professional writer."
        }
    });
    // Access .text property directly, it is not a method.
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
            systemInstruction: "You are an expert resume writer focusing on keyword optimization and ATS compatibility."
        }
    });
    return response.text || "";
};

/**
 * Extracts job details from a URL using Google Search grounding.
 */
export const extractJobFromUrl = async (url: string): Promise<any> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Extract full job details from this URL: ${url}. Return the details in JSON format including title, company, location, salaryRange, description, and requirements.`,
        config: { tools: [{ googleSearch: {} }] }
    });
    
    // As per guidelines, grounding metadata should be checked for source URLs.
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        console.log("Grounding sources:", response.candidates[0].groundingMetadata.groundingChunks);
    }

    const text = response.text || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : { title: 'Extracted Role', company: 'Check Site', description: text };
};

/**
 * Extracts multiple job listings from email HTML.
 */
export const extractJobsFromEmailHtml = async (html: string): Promise<Partial<Job>[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
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
 * Search for nearby jobs using Google Maps grounding.
 * Maps grounding is supported in Gemini 2.5 series models.
 */
export const searchNearbyJobs = async (lat: number, lng: number, role: string): Promise<Job[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find open ${role} job opportunities near my current location. Please return a JSON list of objects with title, company, location, applicationUrl, and a brief description.`,
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
            // Note: responseMimeType and responseSchema are NOT supported with googleMaps tool.
        },
    });

    const text = response.text || "";
    
    // Log grounding chunks to extract URLs for the UI as per guidelines.
    if (response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
        console.log("Maps Grounding Data:", response.candidates[0].groundingMetadata.groundingChunks);
    }

    try {
        const jsonMatch = text.match(/\[[\s\S]*\]/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return parsed.map((item: any, idx: number) => ({
                id: `maps-${Date.now()}-${idx}`,
                title: item.title || "Job Listing",
                company: item.company || "Unknown Company",
                location: item.location || "Nearby",
                description: item.description || "",
                source: "Imported Link", // Valid source from Job type definition
                detectedAt: new Date().toISOString(),
                status: JobStatus.DETECTED,
                matchScore: 85,
                requirements: [],
                applicationUrl: item.applicationUrl || "https://maps.google.com"
            }));
        }
    } catch (e) {
        console.error("Failed to parse jobs from maps response", e);
    }

    return [];
};

/**
 * Returns the application URL for a job.
 */
export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    return url;
};
