
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as ClerkServer from '@clerk/nextjs/server';
import { GoogleGenAI } from "@google/genai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    const Clerk = (ClerkServer as any).default || ClerkServer;
    const auth = Clerk.getAuth(req);
    const userId = auth?.userId;

    if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    const { title, company, description, resume, name, email } = req.body;
    if (!title || !description || !resume) return res.status(400).json({ error: 'Missing required fields' });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const isPlaceholder = !company || 
        company.toLowerCase().includes("review") || 
        company.toLowerCase().includes("unknown");

    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Write a professional, high-impact cover letter for the ${title} position at ${isPlaceholder ? 'your company' : company}.
        
        CANDIDATE: ${name} (${email})
        RESUME: ${resume}
        JOB DESCRIPTION: ${description}
        
        INSTRUCTIONS:
        - Match skills to the specific requirements listed in the job description.
        - Maintain a professional, confident, and persuasive tone.
        - ABSOLUTELY NO placeholders like [Company Name] or [Job Title]. Use the data provided.`,
      config: {
        systemInstruction: "You are an expert career coach writing professional, ATS-optimized cover letters that stand out."
      }
    });

    return res.status(200).json({ text: response.text || "" });
  } catch (error: any) {
    console.error('[API/COVER-LETTER] Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
