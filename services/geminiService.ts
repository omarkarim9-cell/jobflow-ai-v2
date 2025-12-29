
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Job, UserProfile, JobStatus } from "../types";

const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Deep Intelligence Scanner: Uses Pro model for high-accuracy ranking.
 */
export const analyzeJobsWithAi = async (html: string, resume: string, token: string) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Analyze this email for job listings. 
        User Resume: ${resume.substring(0, 2000)}
        Email HTML: ${html.substring(0, 15000)}
        
        TASK: Extract job listings. Rank each 0-100 by fit against the resume. 
        Provide a concise "fitReason".`,
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
 * Generates an audio briefing using Gemini TTS (PCM output).
 */
export const generateAudioBriefing = async (job: Job, profile: UserProfile): Promise<string> => {
    const ai = getAi();
    const prompt = `Say cheerfully: Hi ${profile.fullName}! I've analyzed the ${job.title} role at ${job.company}. 
    Based on your experience, this is a ${job.matchScore}% match. I've prepared your tailored resume. Good luck!`;

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
export const generateInterviewQuestions = async (job: Job, profile: UserProfile) => {
    const ai = getAi();
    const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `Generate 3 mock interview questions for this job:
        Role: ${job.title} at ${job.company}
        Description: ${job.description.substring(0, 500)}
        Candidate: ${profile.resumeContent.substring(0, 500)}`,
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
 * Restored working extraction function via API.
 */
export const extractJobFromUrl = async (url: string, token: string): Promise<{data: any, sources: any[]}> => {
    const response = await fetch('/api/extract-job', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ url })
    });
    const result = await response.json();
    return { data: result.data, sources: result.sources || [] };
};

// Added missing searchNearbyJobs function to fix the error in components/JobMap.tsx
export const searchNearbyJobs = async (lat: number, lng: number, role: string, token: string): Promise<Job[]> => {
    const response = await fetch('/api/search-nearby', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ lat, lng, role })
    });
    const result = await response.json();
    return result.jobs || [];
};

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

export const getSmartApplicationUrl = (url: string, title: string, company: string): string => {
    try {
        const u = new URL(url);
        ['utm_source', 'utm_medium', 'utm_campaign'].forEach(p => u.searchParams.delete(p));
        return u.toString();
    } catch (e) { return url; }
};
