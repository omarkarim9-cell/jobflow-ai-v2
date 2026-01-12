import { IncomingMessage, ServerResponse } from 'http';

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    // Get Clerk user ID from auth header (sent by your frontend)
    const authHeader = (req as any).headers?.authorization;
    const clerkUserId = authHeader?.replace('Bearer ', '') || '';

    if (!clerkUserId) {
      (res as any).statusCode = 401;
      (res as any).setHeader('Content-Type', 'application/json');
      (res as any).end(JSON.stringify({ error: 'Missing Clerk auth' }));
      return;
    }

    // Connect to YOUR Neon DB
    const { neon } = await import('@neondatabase/serverless');
    const sql = neon(process.env.DATABASE_URL!);

    // UPSERT into YOUR profiles table (matches your exact schema)
    const result = await sql`
      INSERT INTO profiles (id, clerk_user_id, email, full_name, plan, daily_ai_credits, total_ai_used, updated_at)
      VALUES (
        gen_random_uuid(),
        ${clerkUserId},
        'user-${clerkUserId}@jobflow.ai',
        'JobFlow User',
        'free',
        5,
        0,
        now()
      )
      ON CONFLICT (clerk_user_id)
      DO UPDATE SET 
        updated_at = now()
      RETURNING id, clerk_user_id, email, full_name, plan, daily_ai_credits
    `;

    (res as any).statusCode = 200;
    (res as any).setHeader('Content-Type', 'application/json');
    (res as any).end(JSON.stringify(result[0]));
  } catch (error) {
    console.error('Neon profile error:', error);
    (res as any).statusCode = 500;
    (res as any).setHeader('Content-Type', 'application/json');
    (res as any).end(JSON.stringify({ error: 'Database error' }));
  }
}
