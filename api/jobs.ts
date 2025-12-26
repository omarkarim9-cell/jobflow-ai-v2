
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as ClerkServer from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      return res.status(500).json({ error: 'DATABASE_URL is missing.' });
    }

    let userId: string | null = null;
    
    // Prioritize manual header for Lab Tester reliability
    userId = req.headers['x-clerk-user-id'] as string || null;

    if (!userId) {
      try {
        const Clerk = (ClerkServer as any).default || ClerkServer;
        const auth = Clerk.getAuth(req);
        userId = auth?.userId;
      } catch (e) {}
    }

    if (!userId) {
      return res.status(401).json({ 
        error: 'Unauthorized', 
        details: 'Identity verification failed. Ensure headers are sent correctly.' 
      });
    }

    const sql = neon(dbUrl);

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM jobs WHERE user_id = ${userId} ORDER BY created_at DESC`;
      const jobs = result.map((job: any) => ({
        id: job.id,
        title: job.title || '',
        company: job.company || '',
        location: job.data?.location || '',
        salaryRange: job.data?.salaryRange || '',
        description: job.description || '',
        source: job.source || 'Manual',
        detectedAt: job.created_at,
        status: job.status || 'Detected',
        matchScore: job.match_score || 0,
        requirements: job.data?.requirements || [],
        coverLetter: job.cover_letter,
        customizedResume: job.custom_resume,
        notes: job.data?.notes || '',
        logoUrl: job.data?.logoUrl || '',
        applicationUrl: job.application_url
      }));
      return res.status(200).json({ jobs });
    }

    if (req.method === 'POST') {
      const body = req.body;
      if (!body || !body.id) return res.status(400).json({ error: 'Invalid Job Payload' });

      const jobData = JSON.stringify({
        location: body.location || '',
        salaryRange: body.salaryRange || '',
        requirements: body.requirements || [],
        notes: body.notes || '',
        logoUrl: body.logoUrl || ''
      });

      const result = await sql`
        INSERT INTO jobs (id, user_id, title, company, description, status, source, application_url, custom_resume, cover_letter, match_score, data, created_at, updated_at)
        VALUES (
          ${body.id}, 
          ${userId}, 
          ${body.title}, 
          ${body.company}, 
          ${body.description || ''}, 
          ${body.status || 'Detected'}, 
          ${body.source || 'Manual'}, 
          ${body.applicationUrl || null}, 
          ${body.customizedResume || null}, 
          ${body.coverLetter || null}, 
          ${body.matchScore || 0}, 
          ${jobData}, 
          NOW(), 
          NOW()
        )
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          company = EXCLUDED.company,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          data = EXCLUDED.data,
          updated_at = NOW()
        RETURNING *
      `;
      return res.status(200).json({ success: true, job: result[0] });
    }

    if (req.method === 'DELETE') {
      const jobId = req.query.id;
      if (!jobId) return res.status(400).json({ error: 'Missing Job ID' });
      await sql`DELETE FROM jobs WHERE id = ${jobId} AND user_id = ${userId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('[API/JOBS] Fatal Crash:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
