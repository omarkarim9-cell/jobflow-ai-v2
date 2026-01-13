// pages/api/profile.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import postgres from 'postgres';
import { UserProfile } from '../../types'; // adjust relative path

// just added
export async function POST(request: NextRequest) {
  const body = await request.json();
  console.log('🔍 PROFILE BODY:', JSON.stringify(body, null, 2));  // ADD THIS
  const userId = body.data?.id || body.id;
  console.log('🔍 USER ID:', userId);  // ADD THIS

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

      // 🔧 CLERK WEBHOOK DATA MAPPING
      const clerkUserId = req.headers['x-clerk-user-id'] as string || body.data?.id || body.id;
      const email = body.data?.email_addresses?.[0]?.email_address || body.email || '';
      const fullName = body.data?.full_name || body.fullName || '';

      console.log('🔍 WEBHOOK DATA:', { clerkUserId, email, fullName });

      // Normalize JSON fields
      const prefs = body.preferences && typeof body.preferences === 'object'
        ? body.preferences
        : { targetRoles: [], targetLocations: [], minSalary: '', remoteOnly: false, language: 'en' };

      const connected = Array.isArray(body.connectedAccounts) ? body.connectedAccounts : [];

      // 🔧 NEON PARAMS FIX - explicit positional params
      const query = `
        INSERT INTO profiles (
          clerk_user_id, full_name, email, phone, resume_content, resume_file_name,
          preferences, connected_accounts, plan, daily_ai_credits, total_ai_used, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11, NOW())
        ON CONFLICT (clerk_user_id) DO UPDATE SET
          full_name = EXCLUDED.full_name, email = EXCLUDED.email, phone = EXCLUDED.phone,
          resume_content = EXCLUDED.resume_content, resume_file_name = EXCLUDED.resume_file_name,
          preferences = EXCLUDED.preferences, connected_accounts = EXCLUDED.connected_accounts,
          plan = EXCLUDED.plan, daily_ai_credits = EXCLUDED.daily_ai_credits,
          total_ai_used = EXCLUDED.total_ai_used, updated_at = NOW()
        RETURNING *
      `;

      const rows = await sql < ProfileRow[] > [query,
        clerkUserId,
        fullName,
        email,
        '', '', '',  // phone, resume fields empty
        prefs,
        connected,
        'free',
        0,
        0
      ];

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
        plan: row.plan || 'free',
        dailyAiCredits: row.daily_ai_credits ?? 0,
        totalAiUsed: row.total_ai_used ?? 0,
        updatedAt: row.updated_at,
      };

      return res.status(200).json(saved);
    }
        }

    res.setHeader('Allow', ['GET', 'POST']);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err: any) {
    console.error('[PROFILE] Error:', err?.message || err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
