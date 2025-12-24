
import { VercelRequest, VercelResponse } from '@vercel/node';
import { getAuth } from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const { userId } = getAuth(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.method === 'GET') {
      const result = await sql`
        SELECT * FROM jobs WHERE user_id = ${userId} ORDER BY created_at DESC
      `;
      
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
      const existing = await sql`
        SELECT id FROM jobs WHERE id = ${body.id} AND user_id = ${userId}
      `;

      const jobData = {
        location: body.location || '',
        salaryRange: body.salaryRange || '',
        requirements: body.requirements || [],
        notes: body.notes || '',
        logoUrl: body.logoUrl || ''
      };

      if (existing.length === 0) {
        const result = await sql`
          INSERT INTO jobs (id, user_id, title, company, description, status, source, application_url, custom_resume, cover_letter, match_score, data, created_at, updated_at)
          VALUES (${body.id}, ${userId}, ${body.title}, ${body.company}, ${body.description || ''}, ${body.status || 'Detected'}, ${body.source || 'Manual'}, ${body.applicationUrl || null}, ${body.customizedResume || null}, ${body.coverLetter || null}, ${body.matchScore || 0}, ${JSON.stringify(jobData)}, NOW(), NOW())
          RETURNING *
        `;
        return res.status(200).json({ success: true, job: result[0] });
      } else {
        const result = await sql`
          UPDATE jobs SET
            title = ${body.title},
            company = ${body.company},
            description = ${body.description || ''},
            status = ${body.status || 'Detected'},
            source = ${body.source || 'Manual'},
            application_url = ${body.applicationUrl || null},
            custom_resume = ${body.customizedResume || null},
            cover_letter = ${body.coverLetter || null},
            match_score = ${body.matchScore || 0},
            data = ${JSON.stringify(jobData)},
            updated_at = NOW()
          WHERE id = ${body.id} AND user_id = ${userId}
          RETURNING *
        `;
        return res.status(200).json({ success: true, job: result[0] });
      }
    }

    if (req.method === 'DELETE') {
      const jobId = req.query.id;
      if (!jobId) return res.status(400).json({ error: 'Job ID is required' });
      await sql`DELETE FROM jobs WHERE id = ${jobId} AND user_id = ${userId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API Error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
