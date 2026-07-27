import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { servicePrisma } from '@/lib/prisma-service';

export type RequireRoleResult =
  | { userId: string }
  | { error: NextResponse };

/**
 * Identifies the caller from the session cookie (never a client-supplied
 * id) and checks their Prisma `role` - the same dual-write source of truth
 * set up in app/api/auth/set-role/route.ts. Untested by design, same as
 * that route: it's a thin I/O wrapper, not business logic.
 */
export async function requireRole(role: 'TEACHER' | 'STUDENT'): Promise<RequireRoleResult> {
  const supabase = await createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    return { error: NextResponse.json({ error: 'Not authenticated' }, { status: 401 }) };
  }

  const dbUser = await servicePrisma.user.findUnique({
    where: { id: user.id },
    select: { role: true },
  });

  if (dbUser?.role !== role) {
    return {
      error: NextResponse.json(
        { error: `${role === 'TEACHER' ? 'Teacher' : 'Student'} role required` },
        { status: 403 }
      ),
    };
  }

  return { userId: user.id };
}
