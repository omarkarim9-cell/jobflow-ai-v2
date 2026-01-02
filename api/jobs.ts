import { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

// Lazy initialization - only create when needed
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
    return null;
  }
  
  const token = authHeader.substring(7);
  
  try {
    const response = await fetch('https://api.clerk.com/v1/tokens/verify', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.CLERK_SECRET_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    });
    
    if (!response.ok) {
      console.error('[API/JOBS] Clerk verification failed:', response.status);
      return null;
    }
    
    const data = await response.json();
    return data.sub || data.user_id || data.userId || null;
  } catch (error) {
    console.error('[API/JOBS] Token verification error:', error);
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
    // Development bypass
    let userId: string;
    if (process.env.NODE_ENV === 'development') {
      userId = 'dev_user_123';
      console.log('[JOBS] Development mode - bypassing Clerk auth');
    } else {
      userId = await verifyClerkToken(req.headers.authorization as string);
      if (!userId) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
    }

    const sql = getSql();

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
      if (!body || !body.id) {
        return res.status(400).json({ error: 'Invalid Job Payload' });
      }

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
      
      return res.status(200).json({ success: true, job: result[0] });
    }

    if (req.method === 'DELETE') {
      const jobId = req.query.id;
      if (!jobId) {
        return res.status(400).json({ error: 'Missing Job ID' });
      }
      
      await sql`DELETE FROM jobs WHERE id = ${jobId} AND user_id = ${userId}`;
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('[API/JOBS] Error:', error.message);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
