// pages/api/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import postgres from 'postgres';
import { UserProfile } from '../../types'; // adjust relative path

const sql = postgres(process.env.DATABASE_URL as string, {
  ssl: 'require',
});

// Row type returned from Neon
interface ProfileRow {
  id: number;
  clerk_user_id: string;
  full_name: string;
  email: string;
  phone: string;
  resume_content: string;
  resume_file_name: string;
  preferences: any;
  connected_accounts: any;
  plan: string;
  daily_ai_credits: number;
  total_ai_used: number;
  updated_at: Date;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const userId = req.headers['x-clerk-user-id'] as string | undefined;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: missing user id' });
    }

    if (req.method === 'GET') {
      const rows = await sql<ProfileRow[]>`
        SELECT
          id,
          clerk_user_id,
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
        WHERE clerk_user_id = ${userId}
        LIMIT 1
      `;

      if (!rows.length) {
        return res.status(200).json(null);
      }

      const row = rows[0];

      const profile: UserProfile = {
        id: row.clerk_user_id,
        fullName: row.full_name || '',
        email: row.email || '',
        phone: row.phone || '',
        resumeContent: row.resume_content || '',
        resumeFileName: row.resume_file_name || '',
        preferences: row.preferences || {
          targetRoles: [],
          targetLocations: [],
          minSalary: '',
          remoteOnly: false,
          language: 'en',
        },
        connectedAccounts: row.connected_accounts || [],
        plan: row.plan || 'free',
        dailyAiCredits: row.daily_ai_credits ?? 0,
        totalAiUsed: row.total_ai_used ?? 0,
        updatedAt: row.updated_at,
      };

      return res.status(200).json(profile);
    }

    if (req.method === 'POST') {
      const body = req.body as UserProfile;

      // Normalize JSON fields to plain objects/arrays
      const prefs =
        body.preferences && typeof body.preferences === 'object'
          ? body.preferences
          : body.preferences ?? {
            targetRoles: [],
            targetLocations: [],
            minSalary: '',
            remoteOnly: false,
            language: 'en',
          };

      const connected =
        body.connectedAccounts && Array.isArray(body.connectedAccounts)
          ? body.connectedAccounts
          : body.connectedAccounts ?? [];

      const rows = await sql<ProfileRow[]>`
        INSERT INTO profiles (
          clerk_user_id,
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
          ${body.fullName || ''},
          ${body.email || ''},
          ${body.phone || ''},
          ${body.resumeContent || ''},
          ${body.resumeFileName || ''},
          ${JSON.stringify(prefs)}::jsonb,
          ${JSON.stringify(connected)}::jsonb,
          ${body.plan || 'free'},
          ${body.dailyAiCredits ?? 0},
          ${body.totalAiUsed ?? 0},
          NOW()
        )
        ON CONFLICT (clerk_user_id) DO UPDATE
        SET
          full_name          = EXCLUDED.full_name,
          email              = EXCLUDED.email,
          phone              = EXCLUDED.phone,
          resume_content     = EXCLUDED.resume_content,
          resume_file_name   = EXCLUDED.resume_file_name,
          preferences        = EXCLUDED.preferences,
          connected_accounts = EXCLUDED.connected_accounts,
          plan               = EXCLUDED.plan,
          daily_ai_credits   = EXCLUDED.daily_ai_credits,
          total_ai_used      = EXCLUDED.total_ai_used,
          updated_at         = NOW()
        RETURNING
          id,
          clerk_user_id,
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
        id: row.clerk_user_id,
        fullName: row.full_name || '',
        email: row.email || '',
        phone: row.phone || '',
        resumeContent: row.resume_content || '',
        resumeFileName: row.resume_file_name || '',
        preferences: row.preferences || prefs,
        connectedAccounts: row.connected_accounts || connected,
        plan: row.plan || body.plan || 'free',
        dailyAiCredits: row.daily_ai_credits ?? body.dailyAiCredits ?? 0,
        totalAiUsed: row.total_ai_used ?? body.totalAiUsed ?? 0,
        updatedAt: row.updated_at,
      };

      return res.status(200).json(saved);
    }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[PROFILE] Error:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
