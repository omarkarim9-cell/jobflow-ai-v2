
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

    const { title, company, description, resume, email } = req.body;
    if (!title || !description || !resume) return res.status(400).json({ error: 'Missing required fields' });

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Tailor this resume for a ${title} role at ${company || 'your company'}. 
        Email: ${email}. 
        Resume: ${resume}
        Job Description: ${description}
        
        TASK:
        Rewrite bullet points to emphasize relevant experience for the specific role. Ensure the contact information is updated correctly. Keep the layout professional and text-based. Do not include placeholders.`,
      config: {
        systemInstruction: "You are a professional resume writer specializing in ATS optimization and role-specific tailoring."
      }
    });

    return res.status(200).json({ text: response.text || "" });
  } catch (error: any) {
    console.error('[API/TAILOR-RESUME] Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
