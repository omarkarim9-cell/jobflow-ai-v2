// api/profile.ts
import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { UserProfile } from '../types';
import { neon } from '@neondatabase/serverless';
import { verifyToken } from '@clerk/backend';

const CLERK_JWT_KEY = process.env.CLERK_JWT_KEY;
const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;

// Lazy Neon client
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
  // Dev bypass: single fake user only for local development
  if (process.env.NODE_ENV === 'development') {
    console.log('[PROFILE] Development mode – using dev_user_123');
    return 'dev_user_123';
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[PROFILE] Missing or invalid Authorization header');
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
      console.error('[PROFILE] No userId in verified token payload');
      return null;
    }

    return userId;
  } catch (err) {
    console.error('[PROFILE] Clerk verifyToken failed', err);
    return null;
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization,Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  console.log('[PROFILE] HANDLER START, NODE_ENV =', process.env.NODE_ENV, 'method:', req.method);

  try {
    const userId = await getUserIdFromRequest(req);
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const sql = getSql();

    if (req.method === 'GET') {
      const rows = await sql<any[]>`
        SELECT
          id,
          full_name,
          email,
          phone,
          resume_content,
          resume_file_name,
          preferences,
          connected_accounts,
          plan,
          daily_ai_credits,
          total_ai_used,
          updated_at
        FROM profiles
        WHERE id = ${userId}
        LIMIT 1
      `;

      const row = rows[0] || null;
      if (!row) {
        // No profile yet for this user
        return res.status(200).json(null);
      }

      const profile: UserProfile = {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        // match field name your UI expects (e.g. resumeContent)
        resumeContent: row.resume_content,
        resumeFileName: row.resume_file_name,
        preferences: row.preferences,
        connectedAccounts: row.connected_accounts,
        plan: row.plan,
        dailyAiCredits: row.daily_ai_credits,
        totalAiUsed: row.total_ai_used,
        updatedAt: row.updated_at,
      };

      return res.status(200).json(profile);
    }

    if (req.method === 'POST') {
      const body = req.body as UserProfile;

      const rows = await sql<any[]>`
        INSERT INTO profiles (
          id,
          full_name,
          email,
          phone,
          resume_content,
          resume_file_name,
          preferences,
          connected_accounts,
          plan,
          daily_ai_credits,
          total_ai_used,
          updated_at
        )
        VALUES (
          ${userId},
          ${body.fullName},
          ${body.email},
          ${body.phone},
          ${body.resumeContent},
          ${body.resumeFileName},
          ${body.preferences as any},
          ${body.connectedAccounts as any},
          ${body.plan || 'free'},
          ${body.dailyAiCredits ?? 0},
          ${body.totalAiUsed ?? 0},
          NOW()
        )
        ON CONFLICT (id) DO UPDATE
        SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          phone = EXCLUDED.phone,
          resume_content = EXCLUDED.resume_content,
          resume_file_name = EXCLUDED.resume_file_name,
          preferences = EXCLUDED.preferences,
          connected_accounts = EXCLUDED.connected_accounts,
          plan = EXCLUDED.plan,
          daily_ai_credits = EXCLUDED.daily_ai_credits,
          total_ai_used = EXCLUDED.total_ai_used,
          updated_at = NOW()
        RETURNING
          id,
          full_name,
          email,
          phone,
          resume_content,
          resume_file_name,
          preferences,
          connected_accounts,
          plan,
          daily_ai_credits,
          total_ai_used,
          updated_at
      `;

      const row = rows[0];

      const saved: UserProfile = {
        id: row.id,
        fullName: row.full_name,
        email: row.email,
        phone: row.phone,
        resumeContent: row.resume_content,
        resumeFileName: row.resume_file_name,
        preferences: row.preferences,
        connectedAccounts: row.connected_accounts,
        plan: row.plan,
        dailyAiCredits: row.daily_ai_credits,
        totalAiUsed: row.total_ai_used,
        updatedAt: row.updated_at,
      };

      return res.status(200).json(saved);
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[PROFILE] Error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
