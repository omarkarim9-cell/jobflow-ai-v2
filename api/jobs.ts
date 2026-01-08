// /api/jobs.ts
import { NextRequest, NextResponse } from 'next/server';
import postgres from 'postgres';
import { Job, JobStatus } from '../types';

const sql = postgres(process.env.DATABASE_URL as string, {
  ssl: 'require',
});

interface JobRow {
  id: string;
  clerk_user_id: string;
  title: string;
  company: string;
  location: string;
  url: string;
  description: string;
  source: string;
  status: JobStatus;
  applied_at: string | null;
  created_at: string | null;
  updated_at: string | null;
}

// Helper to get user id
function getUserId(req: NextRequest): string | null {
  const headerId = req.headers.get('x-clerk-user-id');
  if (headerId) return headerId;
  return null;
}

// GET /api/jobs
export async function GET(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: missing user id' },
        { status: 401 },
      );
    }

    const rows = await sql<JobRow[]>`
      SELECT
        id,
        clerk_user_id,
        title,
        company,
        location,
        url,
        description,
        source,
        status,
        applied_at,
        created_at,
        updated_at
      FROM jobs
      WHERE clerk_user_id = ${userId}
      ORDER BY created_at DESC
    `;

    const jobs: Job[] = rows.map((row) => ({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      url: row.url,
      description: row.description,
      source: row.source,
      status: row.status,
      appliedAt: row.applied_at ?? undefined,
      createdAt: row.created_at ?? undefined,
      updatedAt: row.updated_at ?? undefined,
    }));

    return NextResponse.json(jobs, { status: 200 });
  } catch (err: any) {
    console.error('[JOBS] GET Error:', err?.message || err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}

// POST /api/jobs (create job)
export async function POST(req: NextRequest) {
  try {
    const userId = getUserId(req);
    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized: missing user id' },
        { status: 401 },
      );
    }

    const body = (await req.json()) as Job;

    await sql`
      INSERT INTO jobs (
        id,
        clerk_user_id,
        title,
        company,
        location,
        url,
        description,
        source,
        status,
        applied_at,
        created_at,
        updated_at
      )
      VALUES (
        ${body.id},
        ${userId},
        ${body.title},
        ${body.company},
        ${body.location},
        ${body.url},
        ${body.description},
        ${body.source},
        ${body.status},
        ${body.appliedAt || null},
        NOW(),
        NOW()
      )
    `;

    return NextResponse.json({ ok: true }, { status: 201 });
  } catch (err: any) {
    console.error('[JOBS] POST Error:', err?.message || err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
