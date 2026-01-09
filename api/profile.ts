// /pages/api/profile.ts
import { VercelRequest, VercelResponse } from '@vercel/node';
import * as ClerkServer from '@clerk/nextjs/server';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
      console.error('[API/PROFILE] DATABASE_URL is missing from environment variables.');
      return res.status(500).json({ error: 'Database configuration error.' });
    }

    let userId: string | null = null;
    try {
      const Clerk = (ClerkServer as any).default || ClerkServer;
      const auth = Clerk.getAuth(req);
      userId = auth?.userId;
    } catch (e) {
      console.error('[API/PROFILE] Clerk Auth extraction failed. Check CLERK_SECRET_KEY.');
    }

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized: No valid session found' });
    }

    const sql = neon(dbUrl);

    // Helper to format DB row to camelCase for the frontend UserProfile type
    const formatProfile = (p: any) => ({
      id: p.clerk_user_id, // use Clerk user id as app-level id
      fullName: p.full_name || '',
      email: p.email || '',
      phone: p.phone || '',
      resumeContent: p.resume_content || '',
      resumeFileName: p.resume_file_name || '',
      preferences:
        typeof p.preferences === 'string'
          ? JSON.parse(p.preferences)
          : (p.preferences || {
              targetRoles: [],
              targetLocations: [],
              minSalary: '',
              remoteOnly: false,
              language: 'en',
            }),
      connectedAccounts:
        typeof p.connected_accounts === 'string'
          ? JSON.parse(p.connected_accounts)
          : (p.connected_accounts || []),
      plan: p.plan || 'free',
      dailyAiCredits: p.daily_ai_credits ?? 0,
      totalAiUsed: p.total_ai_used ?? 0,
      onboardedAt: p.created_at,
    });

    if (req.method === 'GET') {
      const result = await sql`
        SELECT *
        FROM profiles
        WHERE clerk_user_id = ${userId}
        LIMIT 1
      `;
      if (result.length === 0) {
        // No profile yet; let frontend treat as "needs onboarding"
        return res.status(200).json(null);
      }
      return res.status(200).json(formatProfile(result[0]));
    }

    if (req.method === 'POST') {
      const body = req.body;

      // Critical: Ensure JSON fields are valid JSON strings for the jsonb columns
      const prefs = JSON.stringify(
        body.preferences || {
          targetRoles: [],
          targetLocations: [],
          minSalary: '',
          remoteOnly: false,
          language: 'en',
        },
      );
      const accounts = JSON.stringify(body.connectedAccounts || []);

      // We use clerk_user_id as a key field. Neon throws 500 if any value in ${} is undefined.
      // We ensure string/number fallbacks for all fields.
      const result = await sql`
        INSERT INTO profiles (
          id,
          clerk_user_id,
          email,
          full_name,
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
          ${userId},
          ${body.email || ''},
          ${body.fullName || ''},
          ${body.phone || ''},
          ${body.resumeContent || ''},
          ${body.resumeFileName || ''},
          ${prefs},
          ${accounts},
          ${body.plan || 'free'},
          ${body.dailyAiCredits ?? 0},
          ${body.totalAiUsed ?? 0},
          NOW()
        )
        ON CONFLICT (clerk_user_id) DO UPDATE SET
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
        RETURNING *
      `;

      if (!result || result.length === 0) {
        throw new Error('Database failed to upsert profile record.');
      }
      return res.status(200).json(formatProfile(result[0]));
    }

    return res.status(405).json({ error: 'Method Not Allowed' });
  } catch (error: any) {
    console.error('[API/PROFILE] Fatal Server Error:', error.message, error.stack);
    return res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
