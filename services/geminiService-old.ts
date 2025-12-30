import { GoogleGenAI, Type } from "@google/genai";
import { Job, JobStatus } from "../types";

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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const isPlaceholder =
    !company ||
    company.toLowerCase().includes("review") ||
    company.toLowerCase().includes("unknown") ||
    company.toLowerCase().includes("site") ||
    company.toLowerCase().includes("description");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Write a professional, high-impact cover letter for the ${title} position.

CONTEXT:
- Target Company: ${
      isPlaceholder
        ? 'Carefully scan the job description below to identify the actual company name. If not found, use "Hiring Manager".'
        : company
    }
- Candidate: ${name} (${email})
- Job Description: ${description}
- Source Resume: ${resume}

STRICT INSTRUCTIONS:
- NEVER use the phrase "Review Required", "Unknown Company", "Check Site", or "Check Description" in the letter.
- Address the recipient formally.
- Match candidate skills to the requirements in the job description.`,
    config: {
      systemInstruction:
        "You are an expert career coach writing professional, ATS-optimized cover letters.",
    },
  });

  return response.text || "";
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const isPlaceholder =
    !company || company.toLowerCase().includes("review") || company.toLowerCase().includes("unknown");

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Tailor this resume for a ${title} role at ${
      isPlaceholder ? "the target company" : company
    }.

Email: ${email}.

Original Resume: ${resume}

Job Description: ${description}`,
    config: {
      systemInstruction:
        "You are a professional resume writer specializing in ATS optimization. Rewrite bullet points to emphasize relevant experience for the specific role.",
    },
  });

  return response.text || "";
};

/**
 * Extracts job details from a URL by fetching the page content via CORS proxy
 * and using Gemini to parse the HTML.
 */
export const extractJobFromUrl = async (
  url: string
): Promise<{ data: any; sources: any[] }> => {
  try {
    // Step 1: Fetch the actual page content using a CORS proxy
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;

    let pageContent = "";

    try {
      const response = await fetch(proxyUrl);
      if (response.ok) {
        pageContent = await response.text();
      }
    } catch (fetchError) {
      console.error("Failed to fetch page content:", fetchError);
      // If fetching fails, Gemini prompt will fall back to URL-only mode
    }

    // Step 2: Use Gemini to extract job details (domain-agnostic)
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

    const prompt = pageContent
      ? `Extract job details from this HTML content. Return ONLY valid JSON with these exact keys: title, company, location, salaryRange, description, requirements (as array).

HTML Content (from any job site: LinkedIn, Indeed, Seek, Naukrigulf, GulfTalent, company pages, etc.):

${pageContent.substring(0, 15000)}

Return format:
{
  "title": "Job Title",
  "company": "Company Name",
  "location": "Location",
  "salaryRange": "Salary or empty string",
  "description": "Job description",
  "requirements": ["req1", "req2"]
}`
      : `Extract job details from this URL: ${url}. If you cannot access it, return a template with:
{
  "title": "Manual Entry Required",
  "company": "Unknown",
  "location": "Remote",
  "salaryRange": "",
  "description": "Please manually enter job details",
  "requirements": []
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        temperature: 0.1,
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";

    try {
      // Try to parse as JSON (in case model adds extra text)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      const jsonText = jsonMatch ? jsonMatch[0] : text;
      const data = JSON.parse(jsonText);

      const normalized = {
        title: data.title || "Job Title",
        company: data.company || "Company",
        location: data.location || "Remote",
        salaryRange: data.salaryRange || data.salary || "",
        description: data.description || "No description available",
        requirements: Array.isArray(data.requirements)
          ? data.requirements
          : [],
      };

      // If critical fields are missing, fall back to manual template
      if (!data.title || !data.company) {
        return {
          data: {
            title: "Manual Entry Required",
            company: "Unknown Company",
            location: "Remote",
            salaryRange: "",
            description:
              text ||
              "Unable to extract full details. Please edit manually.",
            requirements: [],
          },
          sources: [],
        };
      }

      return { data: normalized, sources: [] };
    } catch (parseError) {
      console.error("Failed to parse Gemini response:", parseError);
      return {
        data: {
          title: "Manual Entry Required",
          company: "Unknown Company",
          location: "Remote",
          salaryRange: "",
          description:
            text ||
            "Could not extract job details. Please edit manually.",
          requirements: [],
        },
        sources: [],
      };
    }
  } catch (error: any) {
    console.error("Job extraction error:", error);
    return {
      data: {
        title: "Extraction Failed",
        company: "Unknown",
        location: "Remote",
        salaryRange: "",
        description: `Error: ${error.message}. Please add details manually.`,
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
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract job postings from this email HTML. Return a JSON array of objects.

Each object must have:
- title (string)
- company (string)
- location (string)
- salaryRange (string)
- description (string)
- applicationUrl (string)

HTML:
${html}`,
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
          required: ["title", "company"],
        },
      },
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch {
    return [];
  }
};

/**
 * URL cleaning helper
 */
export const getSmartApplicationUrl = (
  url: string,
  title: string,
  company: string
): string => {
  try {
    const u = new URL(url);
    const paramsToRemove = [
      "utm_source",
      "utm_medium",
      "utm_campaign",
      "utm_term",
      "utm_content",
      "ref",
      "source",
      "click_id",
    ];
    paramsToRemove.forEach((p) => u.searchParams.delete(p));
    return u.toString();
  } catch {
    return url;
  }
};

/**
 * Maps grounding search (nearby jobs via Gemini + Google Maps tool).
 */
export const searchNearbyJobs = async (
  lat: number,
  lng: number,
  role: string
): Promise<Job[]> => {
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
            longitude: lng,
          },
        },
      },
    },
  });

  const groundingChunks =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];

  const jobs: Job[] = [];

  groundingChunks.forEach((chunk: any, index: number) => {
    if (chunk.maps) {
      jobs.push({
        id: `maps-${Date.now()}-${index}`,
        title: role,
        company: chunk.maps.title || "Nearby Company",
        location: "Local Area",
        description: "Found via Google Maps grounding.",
        source: "Imported Link",
        detectedAt: new Date().toISOString(),
        status: JobStatus.DETECTED,
        matchScore: 85,
        requirements: [],
        applicationUrl: chunk.maps.uri || "",
        logoUrl: "",
        notes: "",
        salaryRange: "",
      });
    }
  });

  return jobs;
};
