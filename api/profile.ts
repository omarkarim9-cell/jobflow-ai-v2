// /api/profile.ts or app/api/profile/route.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { getAuth } from '@clerk/nextjs/server';
import { UserProfile } from '../types';

const sql = postgres(process.env.DATABASE_URL as string, {
  ssl: 'require',
});

// Row type matching the profiles table
interface ProfileRow {
  id: string;                 // matches TEXT primary key in schema
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

// Helper to get user id from Clerk (Bearer token coming from dbService)
function getUserId(req: NextRequest): string | null {
  const { userId } = getAuth(req);
  return userId ?? null;
}

// GET /api/profile
export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: missing user id' },
        { status: 401 },
      );
    }

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
      // No profile yet for this user; let frontend treat as "needs onboarding"
      return NextResponse.json(null, { status: 200 });
    }

    const row = rows[0];

    const profile: UserProfile = {
      id: row.clerk_user_id, // use Clerk user id as app-level id
      fullName: row.full_name || '',
      email: row.email || '',
      phone: row.phone || '',
      resumeContent: row.resume_content || '',
      resumeFileName: row.resume_file_name || '',
      preferences:
        row.preferences || {
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
      onboardedAt: undefined,
      updatedAt: row.updated_at,
    };

    return NextResponse.json(profile, { status: 200 });
  } catch (err: any) {
    console.error('[PROFILE] GET Error:', err?.message || err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/profile
export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: missing user id' },
        { status: 401 },
      );
    }

    const body = (await req.json()) as UserProfile;

    // Normalize preferences / connectedAccounts
    const prefs =
      body.preferences && typeof body.preferences === 'object'
        ? body.preferences
        : {
            targetRoles: [],
            targetLocations: [],
            minSalary: '',
            remoteOnly: false,
            language: 'en',
          };

    const connected =
      body.connectedAccounts && Array.isArray(body.connectedAccounts)
        ? body.connectedAccounts
        : [];

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
      onboardedAt: body.onboardedAt,
      updatedAt: row.updated_at,
    };

    return NextResponse.json(saved, { status: 200 });
  } catch (err: any) {
    console.error('[PROFILE] POST Error:', err?.message || err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
