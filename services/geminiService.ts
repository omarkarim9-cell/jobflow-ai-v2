// services/geminiService.ts
import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Job, UserProfile, JobStatus } from "../types.ts";

/**
 * Helper to initialize the Gemini client using the globally available API key.
 * NOTE: In v2, this is used only from server-side /api handlers.
 */
const getAi = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Deep Intelligence Scanner: Uses Pro model for high-accuracy ranking from email content.
 * (kept for email scanner – used only server-side)
 */
export const analyzeJobsWithAi = async (html: string, resume: string) => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: "gemini-3-pro-preview",
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
                fitReason: { type: Type.STRING },
              },
              required: ["title", "company", "applicationUrl", "matchScore"],
            },
          },
        },
      },
    },
  });

  const parsed = JSON.parse(response.text || '{"jobs": []}');
  return parsed.jobs || [];
};

/**
 * Generates an audio briefing using Gemini TTS (PCM output).
 * Server-side helper: called from /api/audio-briefing.
 */
export const generateAudioBriefing = async (
  job: Job,
  profile: UserProfile
): Promise<string> => {
  const ai = getAi();
  const prompt = `Say cheerfully: Hi ${profile.fullName}! I've analyzed the ${job.title} role at ${job.company}. 
Based on your experience, this is a ${job.matchScore}% match. I've prepared your tailored resume and cover letter. Good luck!`;

  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: prompt }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: "Kore" },
        },
      },
    },
  });

  const base64Audio =
    response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  if (!base64Audio) throw new Error("Audio generation failed");
  return base64Audio;
};

/**
 * Generates mock interview questions.
 * Server-side helper: called from /api/interview-questions.
 */
export const generateInterviewQuestions = async (
  job: Job,
  profile: UserProfile
) => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 3 challenging mock interview questions for this specific job role.
Role: ${job.title} at ${job.company}
Description: ${job.description.substring(0, 1000)}
Candidate Background: ${profile.resumeContent.substring(0, 1000)}`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          questions: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
        },
        required: ["questions"],
      },
    },
  });

  const parsed = JSON.parse(response.text || '{"questions": []}');
  return parsed.questions || [];
};
/**
 * Job Extraction via backend API (v2 behavior).
 * Calls /api/extract-job which handles HTML fetch + Gemini.
 */
export const extractJobFromUrl = async (
  url: string
): Promise<{ data: any; sources: any[] }> => {
  const res = await fetch('/api/extract-job', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
  });

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({}));
    console.error('[extractJobFromUrl] API error', res.status, errorBody);
    throw new Error(errorBody.error || 'Failed to extract job');
  }

  const json = await res.json();
  // Expecting shape { data, sources }
  return {
    data: json.data || {},
    sources: json.sources || [],
  };
};

/**
 * Search nearby jobs using Maps grounding. Not used right now, but kept for future.
 
export const searchNearbyJobs = async (
  lat: number,
  lng: number,
  role: string
): Promise<Job[]> => {
  const ai = getAi();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash",
    contents: `Find hiring companies and job openings for "${role}" near my coordinates.`,
    config: {
      tools: [{ googleMaps: {} }],
      toolConfig: {
        retrievalConfig: {
          latLng: {
            latitude: lat,
            longitude: lng,
          },
        },
      },
    },
  });

  const chunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const jobs = chunks
    .filter((c: any) => c.maps)
    .map((c: any, i: number) => ({
      id: `map-${i}-${Date.now()}`,
      title: role,
      company: c.maps?.title || "Local Company",
      location: "Nearby",
      description: "Found via Maps discovery.",
      source: "Google Maps" as const,
      detectedAt: new Date().toISOString(),
      status: JobStatus.DETECTED,
      matchScore: 85,
      applicationUrl: c.maps?.uri || "#",
      requirements: [],
    }));

  return jobs;
};*/

/**
 * Cover letter + resume: client-side wrappers that hit /api endpoints.
 * These are the ones JobDetail uses.
 */
export const generateCoverLetter = async (
  title: string,
  company: string,
  description: string,
  resume: string,
  name: string,
  email: string,
  token: string
) => {
  const response = await fetch("/api/cover-letter", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, company, description, resume, name, email }),
  });
  const result = await response.json();
  return result.text || "";
};

export const customizeResume = async (
  title: string,
  company: string,
  description: string,
  resume: string,
  email: string,
  token: string
) => {
  const response = await fetch("/api/tailor-resume", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title, company, description, resume, email }),
  });
  const result = await response.json();
  return result.text || "";
};

/**
 * Thin client wrappers for new v2 APIs.
 */
export const fetchInterviewQuestions = async (
  job: Job,
  profile: UserProfile
) => {
  const res = await fetch("/api/interview-questions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job, profile }),
  });
  if (!res.ok) throw new Error("Interview API failed");
  const data = await res.json();
  return (data.questions as string[]) || [];
};

export const fetchAudioBriefing = async (
  job: Job,
  profile: UserProfile
) => {
  const res = await fetch("/api/audio-briefing", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ job, profile }),
  });
  if (!res.ok) throw new Error("Audio API failed");
  const data = await res.json();
  return data.audioBase64 as string;
};

export const getSmartApplicationUrl = (
  url: string,
  title: string,
  company: string
): string => {
  try {
    const u = new URL(url);
    ["utm_source", "utm_medium", "utm_campaign"].forEach((p) =>
      u.searchParams.delete(p)
    );
    return u.toString();
  } catch (e) {
    return url;
  }
};
