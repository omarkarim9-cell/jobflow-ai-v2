import { GoogleGenerativeAI } from '@google/generative-ai';
import { Job, JobStatus } from '../types';

/**
 * Generates a tailored cover letter using the Gemini model.
 */
export const generateCoverLetter = async (
  title: string,
  company: string,
  description: string,
  resume: string,
  name: string,
  email: string
) => {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
    }

    const ai = new GoogleGenerativeAI({ apiKey });

    const isPlaceholder =
      !company ||
      company.toLowerCase().includes('review') ||
      company.toLowerCase().includes('unknown') ||
      company.toLowerCase().includes('site') ||
      company.toLowerCase().includes('description');

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Write a professional, high-impact cover letter for the ${title} position.

CONTEXT:
- Target Company: ${
        isPlaceholder
          ? 'Carefully scan the job description below to identify the actual company name. If not found, use "Hiring Manager".'
          : company
      }
- Candidate: ${name} (${email})
- Job Title: ${title}
- Job Description: ${description}
- Candidate Resume: ${resume}

REQUIREMENTS:
1. Keep cover letter under 400 words
2. Match candidate skills to job requirements
3. NEVER use placeholder text like "Review Required", "Unknown Company", "Check Site", or "Check Description"
4. Use professional tone and ATS-friendly formatting
5. Include specific accomplishments from resume that align with job requirements`,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    return response.response.text() || '';
  } catch (error: any) {
    console.error('[generateCoverLetter] Error:', error.message);
    return `Cover letter generation failed: ${error.message}`;
  }
};

/**
 * Customizes a resume based on the job description.
 */
export const customizeResume = async (
  title: string,
  company: string,
  description: string,
  resume: string,
  email: string
) => {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
    }

    const ai = new GoogleGenerativeAI({ apiKey });

    const isPlaceholder =
      !company ||
      company.toLowerCase().includes('review') ||
      company.toLowerCase().includes('unknown');

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Tailor this resume for a ${title} role at ${
        isPlaceholder ? 'the target company' : company
      }.

Email: ${email}

Original Resume:
${resume}

Job Description:
${description}

INSTRUCTIONS:
1. Reorder experience to highlight relevant skills first
2. Adapt bullet points to match job description keywords
3. Emphasize achievements with metrics (e.g., increased by X%, saved Y hours)
4. Keep the same length and structure
5. Focus on ATS optimization with proper formatting`,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    });

    return response.response.text() || '';
  } catch (error: any) {
    console.error('[customizeResume] Error:', error.message);
    return `Resume customization failed: ${error.message}`;
  }
};

/**
 * Extracts job details from URL via server-side API
 */
export const extractJobFromUrl = async (
  url: string
): Promise<{ data: any; sources: any[] }> => {
  try {
    console.log('[extractJobFromUrl] Extracting from URL:', url);

    const res = await fetch('/api/extract-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });

    if (!res.ok) {
      console.error('[extractJobFromUrl] API failed:', res.status);
      return {
        data: {
          title: 'Extraction Failed',
          company: 'Unknown',
          location: 'Remote',
          salaryRange: '',
          description: 'Job extraction API error. Please enter details manually.',
          requirements: [],
        },
        sources: [],
      };
    }

    const result = await res.json();
    console.log('[extractJobFromUrl] Success:', result.data.title);
    return result;
  } catch (error: any) {
    console.error('[extractJobFromUrl] Error:', error);
    return {
      data: {
        title: 'Extraction Failed',
        company: 'Unknown',
        location: 'Remote',
        salaryRange: '',
        description: `Error: ${error.message}. Please enter details manually.`,
        requirements: [],
      },
      sources: [],
    };
  }
};

/**
 * Extracts multiple job listings from email HTML.
 */
export const extractJobsFromEmailHtml = async (
  html: string
): Promise<
  {
    title: string;
    company: string;
    location: string;
    salaryRange: string;
    description: string;
    applicationUrl: string;
  }[]
> => {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
    }

    const ai = new GoogleGenerativeAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Extract ALL job postings from this email HTML. Return ONLY a valid JSON array of objects.

Each object must have these EXACT keys:
- title (string): Job title
- company (string): Company name
- location (string): Job location or "Remote"
- salaryRange (string): Salary range or empty string
- description (string): Job description (max 500 chars)
- applicationUrl (string): Application link or empty string

HTML Content:
${html}

IMPORTANT: Return ONLY valid JSON array, no other text.`,
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 4096,
        responseMimeType: 'application/json',
      },
    });

    try {
      const text = response.response.text();
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch : text);
      
      return Array.isArray(parsed) ? parsed : [];
    } catch (parseError) {
      console.error('[extractJobsFromEmailHtml] Parse error:', parseError);
      return [];
    }
  } catch (error: any) {
    console.error('[extractJobsFromEmailHtml] Error:', error.message);
    return [];
  }
};

/**
 * URL cleaning helper - removes tracking parameters
 */
export const getSmartApplicationUrl = (
  url: string,
  title?: string,
  company?: string
): string => {
  try {
    const u = new URL(url);
    const paramsToRemove = [
      'utm_source',
      'utm_medium',
      'utm_campaign',
      'utm_term',
      'utm_content',
      'ref',
      'source',
      'click_id',
      'fbclid',
      'gclid',
    ];
    paramsToRemove.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch (error) {
    console.error('[getSmartApplicationUrl] Invalid URL:', url);
    return url;
  }
};

/**
 * Searches for nearby jobs using Gemini (note: requires proper tool setup)
 */
export const searchNearbyJobs = async (
  lat: number,
  lng: number,
  role: string
): Promise<Job[]> => {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
    }

    const ai = new GoogleGenerativeAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Find 5 active ${role} job openings near latitude ${lat}, longitude ${lng}. 
      
      Return as JSON array with: title, company, location, description, applicationUrl`,
      generationConfig: {
        temperature: 0.5,
        maxOutputTokens: 2048,
        responseMimeType: 'application/json',
      },
    });

    try {
      const text = response.response.text();
      const parsed = JSON.parse(text);
      
      const jobs: Job[] = Array.isArray(parsed)
        ? parsed.map((job: any, index: number) => ({
            id: `nearby-${Date.now()}-${index}`,
            title: job.title || role,
            company: job.company || 'Unknown Company',
            location: job.location || 'Local Area',
            description: job.description || 'Found via location search',
            source: 'Location Search',
            detectedAt: new Date().toISOString(),
            status: JobStatus.DETECTED,
            matchScore: 75,
            requirements: job.requirements || [],
            applicationUrl: job.applicationUrl || '',
            logoUrl: '',
            notes: 'Found via nearby job search',
            salaryRange: job.salaryRange || '',
          }))
        : [];

      return jobs;
    } catch {
      return [];
    }
  } catch (error: any) {
    console.error('[searchNearbyJobs] Error:', error.message);
    return [];
  }
};

/**
 * Generates match score between job and user profile
 */
export const calculateJobMatchScore = async (
  jobDescription: string,
  userResume: string,
  userPreferences: { targetRoles?: string[]; targetLocations?: string[] }
): Promise<number> => {
  try {
    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      throw new Error('GOOGLE_GENERATIVE_AI_API_KEY not set');
    }

    const ai = new GoogleGenerativeAI({ apiKey });

    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: `Rate the match between this job and the candidate on a scale of 0-100.

Job Description:
${jobDescription}

Candidate Resume:
${userResume}

Target Roles: ${userPreferences.targetRoles?.join(', ') || 'Any'}
Target Locations: ${userPreferences.targetLocations?.join(', ') || 'Any'}

Return ONLY a single number between 0-100.`,
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 10,
      },
    });

    const scoreText = response.response.text().trim();
    const score = parseInt(scoreText, 10);
    
    return isNaN(score) ? 50 : Math.min(100, Math.max(0, score));
  } catch (error: any) {
    console.error('[calculateJobMatchScore] Error:', error.message);
    return 50; // Default middle score on error
  }
};
