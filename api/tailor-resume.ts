import { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenerativeAI } from '@google/generative-ai';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  try {
    // Get user ID from authorization header if needed
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { title, company, description, resume, email } = req.body;
    if (!title || !description || !resume) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
    if (!GEMINI_API_KEY) {
      throw new Error('VITE_GEMINI_API_KEY is not configured');
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    const prompt = `Tailor this resume for a ${title} role at ${company || 'your company'}. 
      Email: ${email}. 
      Resume: ${resume}
      Job Description: ${description}
      
      TASK:
      Rewrite bullet points to emphasize relevant experience for the specific role. Ensure the contact information is updated correctly. Keep the layout professional and text-based. Do not include placeholders.
      
      You are a professional resume writer specializing in ATS optimization and role-specific tailoring.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    return res.status(200).json({ text: text || "" });
  } catch (error: any) {
    console.error('[API/TAILOR-RESUME] Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
