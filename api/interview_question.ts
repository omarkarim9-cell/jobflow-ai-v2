// api/interview-questions.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { generateInterviewQuestions } from '../services/geminiService.ts';
import type { Job, UserProfile } from '../types.ts';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  console.log('[INTERVIEW] HANDLER START, NODE_ENV =', process.env.NODE_ENV, 'method:', req.method);

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { job, profile } = req.body as { job: Job; profile: UserProfile };

    if (!job || !profile) {
      return res.status(400).json({ error: 'Missing job or profile payload' });
    }

    const questions = await generateInterviewQuestions(job, profile);
    console.log('[INTERVIEW] Questions count:', Array.isArray(questions) ? questions.length : 0);
    return res.status(200).json({ questions });
  } catch (error: any) {
    console.error('[INTERVIEW] Error:', error);
    return res
      .status(500)
      .json({ error: error.message || 'Failed to generate interview questions' });
  }
}
