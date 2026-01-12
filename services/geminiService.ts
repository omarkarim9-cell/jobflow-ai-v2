// services/geminiService.ts

/**
 * JobFlow AI Gemini Service
 */

// TOP OF FILE - PROPER WAY
const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

export async function analyzeSyncIssue(context: string) {
 
  try {
    // Import Google Generative AI
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);

    // Get the model
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-pro',
      generationConfig: {
        temperature: 0.7,
        topK: 1,
        topP: 1,
        maxOutputTokens: 2048,
      }
    });

    const prompt = `You are a senior systems architect. Solve this Clerk-to-Neon sync issue for JobFlow AI.
    
USER PROBLEM:
- User is created in Clerk but not in Neon database.
- User sees old session data even after deleting Neon rows.

TECHNICAL CAUSE:
1. The Clerk 'user.created' webhook is likely missing or failing.
2. Stale data persists because Clerk JWTs (sessions) in the browser are independent of the Neon Postgres state.

OUTPUT JSON FORMAT:
{
  "explanation": "Brief clear text explaining the disconnect.",
  "routeHandler": "Full API route code for api/webhooks/clerk.ts using svix and neon",
  "steps": ["Step 1...", "Step 2..."]
}

Context: ${context}

Return ONLY valid JSON, no markdown or code blocks.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean up response (remove markdown if present)
    const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw new Error(`Failed to analyze sync issue: ${error}`);
  }
}

// Add other helper functions if needed
export async function generateCoverLetter(jobData: any, resumeData: string) {
  if (!apiKey) {
    throw new Error("VITE_GEMINI_API_KEY is missing");
  }

  try {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Generate a professional cover letter for this job:\n${JSON.stringify(jobData)}\n\nResume: ${resumeData}`;
    
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Gemini API Error:', error);
    throw error;
  }
};
// ADD THIS TO THE BOTTOM OF YOUR EXISTING geminiService.ts (before final export if any)

// Smart application URL generator - handles all job formats
export interface SmartUrlJob {
  applicationUrl?: string;
  applyUrl?: string;
  companyUrl?: string;
  companyDomain?: string;
  companySlug?: string;
  jobBoardUrl?: string;
  ats?: string;
  jobId?: string;
}

export const getSmartApplicationUrl = (job: SmartUrlJob): string => {
  // 1. Direct application links (highest priority)
  if (job.applicationUrl) return job.applicationUrl;
  if (job.applyUrl) return job.applyUrl;

  // 2. Job board links
  if (job.jobBoardUrl) return job.jobBoardUrl;

  // 3. ATS platform patterns (Workable, Greenhouse, Lever)
  if (job.ats === 'workable' && job.companySlug) {
    return `https://apply.workable.com/${job.companySlug}${job.jobId ? `/j/${job.jobId}` : ''}`;
  }
  if (job.ats === 'greenhouse' && job.companyDomain) {
    return `https://${job.companyDomain}/greenhouse${job.jobId ? `/${job.jobId}` : ''}`;
  }
  if (job.ats === 'lever' && job.companyDomain) {
    return `https://${job.companyDomain}/lever${job.jobId ? `/jobs/${job.jobId}` : ''}`;
  }

  // 4. Company career pages
  if (job.companyUrl) {
    try {
      const domain = new URL(job.companyUrl).hostname;
      return `https://${domain}/careers` ||
        `https://${domain}/jobs` ||
        `https://${domain}/careers/open-positions` ||
        job.companyUrl;
    } catch {
      return job.companyUrl || '#';
    }
  }

  // 5. Final fallback
  return '#';
};

// ADD THIS - extractJobFromUrl for AddJobModal
export const extractJobFromUrl = async (url: string): Promise<any> => {
  try {
    const prompt = `Extract job details from this URL: ${url}. Return JSON only with these fields: {
      "title": "Job title",
      "company": "Company name", 
      "location": "Location",
      "url": "${url}",
      "description": "Short description"
    }`;

    const apiKey = 'demo-gemini-key-for-dev';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ parts: [{ text: prompt }] }])
      }
    );

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;

    // Extract JSON from response
    const jsonMatch = text.match(/\{.*\}/s);
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]);
    }
    return null;
  } catch (error) {
    console.error('Job extraction failed:', error);
    return null;
  }
};
// ===== MISSING EXPORTS FOR JobDetail.tsx =====

// 1. customizeResume - AI resume tailoring
export const customizeResume = async (jobDescription: string, resumeText: string): Promise<string> => {
  try {
    const prompt = `Tailor this resume for job: "${jobDescription.substring(0, 500)}...".
    Original resume: ${resumeText.substring(0, 2000)}
    Return ONLY improved resume text.`;
    
    const apiKey = 'demo-gemini-key-for-dev';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ parts: [{ text: prompt }] }])
      }
    );
    
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch {
    return resumeText; // Return original if fails
  }
};

// 2. fetchAudioBriefing - Text-to-speech job brief
export const fetchAudioBriefing = async (job: any): Promise<string> => {
  // Mock audio URL - replace with real TTS service later
  return 'https://example.com/audio-briefing.mp3';
};

// 3. fetchInterviewQuestions - AI interview prep
export const fetchInterviewQuestions = async (jobTitle: string, company: string): Promise<string[]> => {
  try {
    const prompt = `Generate 5 behavioral interview questions for ${jobTitle} role at ${company}.
    Return JSON array only: ["question1", "question2", ...]`;
    
    const apiKey = 'demo-gemini-key-for-dev';

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify([{ parts: [{ text: prompt }] }])
      }
    );
    
    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    const jsonMatch = text.match(/\[.*\]/s);
    return jsonMatch ? JSON.parse(jsonMatch[0]) : [];
  } catch {
    return ["Tell me about yourself", "Why this company?", "Strengths & weaknesses"];
  }
};

// ===== END MISSING EXPORTS =====
