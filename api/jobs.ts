import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { Job } from '../types';
import { JobStatus } from '../types';
import { neon } from '@neondatabase/serverless';
import { verifyToken } from '@clerk/backend';

const CLERK_JWT_KEY = process.env.CLERK_JWT_KEY;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

let sqlSingleton: ReturnType<typeof neon> | null = null;
function getSql() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL is not set');
  }
  if (!sqlSingleton) {
    sqlSingleton = neon(process.env.DATABASE_URL);
  }
  return sqlSingleton;
}

async function getUserIdFromRequest(req: VercelRequest): Promise<string | null> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[JOBS] Missing or invalid Authorization header');
    return null;
  }

  const token = authHeader.substring(7);

  try {
    const verified = await verifyToken(token, {
      jwtKey: CLERK_JWT_KEY,
      secretKey: CLERK_SECRET_KEY,
    });

    const userId =
      (verified as any).sub ||
      (verified as any).userId ||
      (verified as any).userid ||
      null;

    if (!userId) {
      console.error('[JOBS] No userId in verified token payload');
      return null;
    }

    return userId;
  } catch (err) {
    console.error('[JOBS] Clerk verifyToken failed', err);
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

  console.log('[JOBS] HANDLER START, NODE_ENV =', process.env.NODE_ENV, 'method:', req.method);

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sql = getSql();

    if (req.method === 'GET') {
      const result = await sql<any[]>`
        SELECT
          id,
          userid,
          title,
          company,
          description,
          status,
          source,
          applicationurl,
          customresume,
          coverletter,
          matchscore,
          data,
          createdat,
          updatedat
        FROM jobs
        WHERE userid = ${userId}
        ORDER BY createdat DESC
      `;

      const jobs: Job[] = result.map((job: any) => {
        const data = job.data || {};
        return {
          id: job.id,
          title: job.title,
          company: job.company,
          location: data.location || '',
          salaryRange: data.salaryRange,
          description: job.description,
          source: job.source || 'Manual',
          detectedAt: job.createdat,
          status: job.status || JobStatus.DETECTED,
          matchScore: job.matchscore ?? 0,
          requirements: data.requirements,
          notes: data.notes,
          logoUrl: data.logoUrl,
          applicationUrl: job.applicationurl,
          customizedResume: job.customresume || null,
          coverLetter: job.coverletter || null,
        };
      });

      return res.status(200).json({ jobs });
    }

    if (req.method === 'POST') {
      const body = req.body as Job;
      if (!body || !body.id) {
        return res.status(400).json({ error: 'Invalid Job payload' });
      }

      const jobData = JSON.stringify({
        location: body.location,
        salaryRange: body.salaryRange,
        requirements: body.requirements,
        notes: body.notes,
        logoUrl: body.logoUrl,
      });

      const result = await sql<any[]>`
        INSERT INTO jobs (
          id,
          userid,
          title,
          company,
          description,
          status,
          source,
          applicationurl,
          customresume,
          coverletter,
          matchscore,
          data,
          createdat,
          updatedat
        )
        VALUES (
          ${body.id},
          ${userId},
          ${body.title},
          ${body.company},
          ${body.description},
          ${body.status || JobStatus.DETECTED},
          ${body.source || 'Manual'},
          ${body.applicationUrl || null},
          ${body.customizedResume || null},
          ${body.coverLetter || null},
          ${body.matchScore ?? 0},
          ${jobData},
          NOW(),
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET
          title = EXCLUDED.title,
          company = EXCLUDED.company,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          customresume = EXCLUDED.customresume,
          coverletter = EXCLUDED.coverletter,
          data = EXCLUDED.data,
          updatedat = NOW()
        RETURNING
          id,
          userid,
          title,
          company,
          description,
          status,
          source,
          applicationurl,
          customresume,
          coverletter,
          matchscore,
          data,
          createdat,
          updatedat
      `;

      const job = result[0];
      const data = job.data || {};

      const savedJob: Job = {
        id: job.id,
        title: job.title,
        company: job.company,
        location: data.location || '',
        salaryRange: data.salaryRange,
        description: job.description,
        source: job.source || 'Manual',
        detectedAt: job.createdat,
        status: job.status || JobStatus.DETECTED,
        matchScore: job.matchscore ?? 0,
        requirements: data.requirements,
        notes: data.notes,
        logoUrl: data.logoUrl,
        applicationUrl: job.applicationurl,
        customizedResume: job.customresume || null,
        coverLetter: job.coverletter || null,
      };

      return res.status(200).json({ success: true, job: savedJob });
    }

    if (req.method === 'DELETE') {
      const jobId = req.query.id;
      if (!jobId || typeof jobId !== 'string') {
        return res.status(400).json({ error: 'Missing Job ID' });
      }

      await sql`
        DELETE FROM jobs
        WHERE id = ${jobId} AND userid = ${userId}
      `;

      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[JOBS] Error:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
