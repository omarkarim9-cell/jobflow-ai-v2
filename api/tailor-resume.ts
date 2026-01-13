import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export type TailoredResume = {
  tailoredContent: string;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  try {
    const userId = req.headers['x-clerk-user-id'] as string;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, company, description, resume, email } = req.body as any;
    if (!title || !description || !resume) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: 'Missing GEMINI_API_KEY' });
    }

    const ai = new GoogleGenerativeAI(apiKey);

    const model = ai.getGenerativeModel({
      model: "gemini-1.5-flash"
    });

    const prompt = `Tailor this resume for a ${title} role at ${company || 'your company'}. 
Email: ${email}. 
Resume: ${resume}
Job Description: ${description}

TASK:
Rewrite bullet points to emphasize relevant experience for the specific role. Ensure the contact information is updated correctly. Keep the layout professional and text-based. Do not include placeholders.

Return only the tailored resume text.`;

    const result = await model.generateContent(prompt);
    const tailoredResume = result.response.text().replace(/```|^\s*[\r\n]/gm, '').trim();

    return res.status(200).json({
      success: true,
      text: tailoredResume
    });

  } catch (error: any) {
    console.error('[API/TAILOR-RESUME] Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
