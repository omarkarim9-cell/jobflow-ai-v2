import { GoogleGenAI, Type } from "@google/genai";
import { Job, JobStatus } from "../types";

/**
 * Generates a tailored cover letter using the Gemini model.
 */
export const generateCoverLetter = async (title: string, company: string, description: string, resume: string, name: string, email: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    // Check if we have a valid company name
    const isPlaceholder = !company || 
        company.toLowerCase().includes("review") || 
        company.toLowerCase().includes("unknown") || 
        company.toLowerCase().includes("site") || 
        company.toLowerCase().includes("description");
    
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Write a professional, high-impact cover letter for the ${title} position.
        
        CONTEXT:
        - Target Company: ${isPlaceholder ? 'Carefully scan the job description below to identify the actual company name. If not found, use "Hiring Manager".' : company}
        - Candidate: ${name} (${email})
        - Job Description: ${description}
        - Source Resume: ${resume}
        
        STRICT INSTRUCTIONS:
        - NEVER use the phrase "Review Required", "Unknown Company", "Check Site", or "Check Description" in the letter.
        - Address the recipient formally.
        - Match candidate skills to the requirements in the job description.`,
        config: {
            systemInstruction: "You are an expert career coach writing professional, ATS-optimized cover letters."
        }
    });
    return response.text || "";
};

/**
 * Customizes a resume based on the job description.
 */
export const customizeResume = async (title: string, company: string, description: string, resume: string, email: string) => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    const isPlaceholder = !company || 
        company.toLowerCase().includes("review") || 
        company.toLowerCase().includes("unknown");

    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Tailor this resume for a ${title} role at ${isPlaceholder ? 'the target company' : company}. 
        Email: ${email}. 
        Original Resume: ${resume}
        Job Description: ${description}`,
        config: {
            systemInstruction: "You are a professional resume writer specializing in ATS optimization. Rewrite bullet points to emphasize relevant experience for the specific role."
        }
    });
    return response.text || "";
};

/**
 * Extracts job details from a URL using Gemini 3 Pro with Thinking and Google Search for maximum accuracy.
 */
export const extractJobFromUrl = async (url: string): Promise<{data: any, sources: any[]}> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Analyze the job posting at this URL: ${url}. 
            
            TASK:
            Extract job details as a clean JSON object.
            
            CRITICAL REQUIREMENT: 
            You MUST identify the actual hiring company name. Do not return "Review Required" or "Unknown". 
            Use your search tools to verify the company if the URL is from a job board like LinkedIn, Indeed, or Wuzzuf.

            Fields to extract:
            - title
            - company (MANDATORY: REAL NAME ONLY)
            - location
            - description (Full summary)
            - requirements (Comma-separated)

            Return ONLY the JSON object.`,
            config: { 
                thinkingConfig: { thinkingBudget: 4000 },
                tools: [{ googleSearch: {} }],
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        title: { type: Type.STRING },
                        company: { type: Type.STRING },
                        location: { type: Type.STRING },
                        description: { type: Type.STRING },
                        requirements: { type: Type.STRING }
                    },
                    required: ["title", "company", "description"]
                }
            }
        });
        
        const text = response.text || "";
        const data = JSON.parse(text);
        
        // Post-processing to remove any residual placeholders
        if (!data.company || data.company.toLowerCase().includes("review") || data.company.toLowerCase().includes("unknown")) {
            // Attempt a regex fallback on the description if AI failed to identify company
            const companyMatch = data.description?.match(/(?:About|At|Joining)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
            data.company = companyMatch ? companyMatch[1] : "Hiring Team";
        }

        return { data, sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
    } catch (e) {
        console.error("Gemini extraction failed", e);
        // Fallback object to ensure the modal doesn't crash
        return {
            data: { 
                title: 'New Opportunity', 
                company: 'Identifying...', 
                description: 'AI extraction timed out. Please enter details manually.' 
            },
            sources: []
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
        contents: `Extract job postings from this email HTML. Return a JSON array of objects. HTML: ${html}`,
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
        return [];
    }
};

/**
 * URL cleaning helper
 */
export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    try {
        const u = new URL(url);
        const paramsToRemove = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ref', 'source', 'click_id'];
        paramsToRemove.forEach(p => u.searchParams.delete(p));
        return u.toString();
    } catch (e) {
        return url;
    }
};

/**
 * Maps grounding search
 */
export const searchNearbyJobs = async (lat: number, lng: number, role: string): Promise<Job[]> => {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find 5 active ${role} job openings near latitude ${lat}, longitude ${lng}.`,
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
                description: `Found via Google Maps grounding.`,
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