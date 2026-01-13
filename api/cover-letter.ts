import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const userId = req.headers['x-clerk-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, company, description, resume, name, email } = req.body as any;
    if (!title || !description || !resume) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const ai = new GoogleGenerativeAI(apiKey);
    const isPlaceholder = !company ||
      company.toLowerCase().includes("review") ||
      company.toLowerCase().includes("unknown");

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `Write a professional, high-impact cover letter for the ${title} position at ${isPlaceholder ? 'your company' : company}.

CANDIDATE: ${name} (${email})
RESUME: ${resume}
JOB DESCRIPTION: ${description}

INSTRUCTIONS:
- Match skills to the specific requirements listed in the job description.
- Maintain a professional, confident, and persuasive tone.
- ABSOLUTELY NO placeholders like [Company Name] or [Job Title]. Use the data provided.

Return only the cover letter text.`;

    const result = await model.generateContent(prompt);
    const coverLetter = result.response.text().replace(/```|^\s*[\r\n]/gm, '').trim();

    return res.status(200).json({
      success: true,
      text: coverLetter
    });

  } catch (error: any) {
    console.error('[API/COVER-LETTER] Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
