
import { GoogleGenAI, Modality, Type } from "@google/genai";
// Import missing types from types.ts
import { Job, UserProfile, JobStatus } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: (window as any).process?.env?.API_KEY });

/**
 * Deep Intelligence Scanner: Ranks and analyzes jobs from email text.
 */
export const analyzeJobsWithAi = async (html: string, resume: string, token: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze this email for job listings. 
        User Resume: ${resume.substring(0, 2000)}
        Email HTML: ${html.substring(0, 15000)}
        
        TASK: Extract specific job listings. Score each from 0-100 based on how well it matches the user's resume and target role. 
        Provide a concise "fitReason" for each.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    jobs: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                title: { type: Type.STRING },
                                company: { type: Type.STRING },
                                location: { type: Type.STRING },
                                applicationUrl: { type: Type.STRING },
                                matchScore: { type: Type.NUMBER },
                                fitReason: { type: Type.STRING }
                            },
                            required: ["title", "company", "applicationUrl", "matchScore"]
                        }
                    }
                }
            }
        }
    });

    const parsed = JSON.parse(response.text || '{"jobs": []}');
    return parsed.jobs || [];
};

/**
 * Generates an audio briefing using Gemini TTS.
 */
// Fix: Profile was missing UserProfile type in scope
export const generateAudioBriefing = async (job: Job, profile: UserProfile): Promise<string> => {
    const ai = getAi();
    const prompt = `Say cheerfully: Hi ${profile.fullName}! I've analyzed the ${job.title} role at ${job.company}. 
    Based on your experience with ${profile.preferences.targetRoles[0] || 'software development'}, this is a ${job.matchScore}% match. 
    The core requirements include ${job.requirements.slice(0, 2).join(' and ') || 'the skills listed in your profile'}. 
    I've prepared your tailored resume and cover letter. Good luck!`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Kore' },
                },
            },
        },
    });

    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("Audio generation failed");
    return base64Audio;
};

/**
 * Generates mock interview questions.
 */
// Fix: Profile was missing UserProfile type in scope
export const generateInterviewQuestions = async (job: Job, profile: UserProfile) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Based on the following job and user profile, generate 3 challenging interview questions.
        Role: ${job.title} at ${job.company}
        Candidate Resume: ${profile.resumeContent.substring(0, 1000)}`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    questions: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING }
                    }
                }
            }
        }
    });

    const parsed = JSON.parse(response.text || '{"questions": []}');
    return parsed.questions || [];
};

/**
 * Generates tailored assets.
 */
export const generateCoverLetter = async (title: string, company: string, description: string, resume: string, name: string, email: string, token: string) => {
    const response = await fetch('/api/cover-letter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, company, description, resume, name, email })
    });
    const result = await response.json();
    return result.text || "";
};

export const customizeResume = async (title: string, company: string, description: string, resume: string, email: string, token: string) => {
    const response = await fetch('/api/tailor-resume', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ title, company, description, resume, email })
    });
    const result = await response.json();
    return result.text || "";
};

export const extractJobFromUrl = async (url: string, token: string): Promise<{data: any, sources: any[]}> => {
    const response = await fetch('/api/extract-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url })
    });
    const result = await response.json();
    return { data: result.data, sources: result.sources || [] };
};

export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    try {
        const u = new URL(url);
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach(p => u.searchParams.delete(p));
        return u.toString();
    } catch (e) { return url; }
};

// Fix: added missing searchNearbyJobs export for JobMap component
/**
 * Searches for nearby jobs using Google Maps grounding.
 */
export const searchNearbyJobs = async (lat: number, lng: number, role: string, token: string): Promise<Job[]> => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: `Find hiring companies and job openings for "${role}" near my location.`,
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

    // Process the grounding chunks into job objects
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const jobs: Job[] = chunks.filter(c => !!c.maps).map((c, i) => ({
        id: `map-${i}-${Date.now()}`,
        title: role,
        company: c.maps?.title || 'Local Company',
        location: 'Nearby',
        description: 'Found via Maps discovery.',
        source: 'Imported Link',
        detectedAt: new Date().toISOString(),
        status: JobStatus.DETECTED,
        matchScore: 85,
        requirements: [],
        applicationUrl: c.maps?.uri || '#'
    }));

    return jobs;
};
