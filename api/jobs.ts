import { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const authHeader = (req as any).headers?.authorization;
    const clerkUserId = authHeader?.replace('Bearer ', '') || '';

    if (!clerkUserId) {
      (res as any).statusCode = 401;
      (res as any).setHeader('Content-Type', 'application/json');
      (res as any).end(JSON.stringify({ error: 'Missing auth' }));
      return;
    }

    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);

    const userResult = await sql`SELECT id FROM profiles WHERE clerk_user_id = ${clerkUserId}`;

    if (userResult.length === 0) {
      (res as any).statusCode = 404;
      (res as any).setHeader('Content-Type', 'application/json');
      (res as any).end(JSON.stringify({ error: 'User not found' }));
      return;
    }

    const userId = userResult[0].id;
    const jobs = await sql`
      SELECT id, title, company, status, application_url, created_at
      FROM jobs WHERE user_id = ${userId}
      ORDER BY created_at DESC
    `;

    (res as any).statusCode = 200;
    (res as any).setHeader('Content-Type', 'application/json');
    (res as any).end(JSON.stringify({ jobs }));
  } catch (error) {
    console.error('Neon jobs error:', error);
    (res as any).statusCode = 500;
    (res as any).setHeader('Content-Type', 'application/json');
    (res as any).end(JSON.stringify({ error: 'Database error' }));
  }
}
