import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

let sql: any = null;
const getSql = () => {
  if (!sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL is not set');
    }
    sql = neon(process.env.DATABASE_URL);
  }
  return sql;
};

async function verifyClerkToken(authHeader: string | undefined): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[JOBS] No auth header or invalid format');
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('[JOBS] Invalid JWT format');
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    const userId = payload.sub || payload.user_id || payload.userId;
    
    if (!userId) {
      console.error('[JOBS] No userId in JWT payload');
      return null;
    }
    
    console.log('[JOBS] Extracted userId:', userId);
    return userId;
  } catch (error: any) {
    console.error('[JOBS] Token decode error:', error.message);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const userId = await verifyClerkToken(req.headers.authorization as string);
    
    if (!userId) {
      console.error('[JOBS] Authentication failed');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('[JOBS] Request from user:', userId, 'Method:', req.method);

    const sql = getSql();

    if (req.method === 'GET') {
      const result = await sql`SELECT * FROM jobs WHERE user_id = ${userId} ORDER BY created_at DESC`;
      
      console.log('[JOBS] Fetched', result.length, 'jobs');
      
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
      if (!body || !body.id) {
        return res.status(400).json({ error: 'Invalid Job Payload' });
      }

      console.log('[JOBS] Saving job:', body.id, body.title);

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
          custom_resume = EXCLUDED.custom_resume,
          cover_letter = EXCLUDED.cover_letter,
          data = EXCLUDED.data,
          updated_at = NOW()
        RETURNING *
      `;
      
      console.log('[JOBS] Job saved successfully');
      return res.status(200).json({ success: true, job: result[0] });
    }

    if (req.method === 'DELETE') {
      const jobId = req.query.id;
      if (!jobId) {
        return res.status(400).json({ error: 'Missing Job ID' });
      }
      
      console.log('[JOBS] Deleting job:', jobId);
      await sql`DELETE FROM jobs WHERE id = ${jobId} AND user_id = ${userId}`;
      console.log('[JOBS] Job deleted successfully');
      
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('[JOBS] Error:', error.message, error.stack);
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}