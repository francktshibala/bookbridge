import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { normalizeRole } from '@/lib/auth/resolve-signup-role';
import { buildUserSignupPayload } from '@/lib/auth/build-user-signup-payload';
import { servicePrisma } from '@/lib/prisma-service';

export const runtime = 'nodejs';

/**
 * POST /api/auth/set-role
 *
 * Sets the role for the CURRENTLY AUTHENTICATED user (identified via
 * session cookie, never trusted from the request body). Used by
 * /auth/select-role for OAuth signups that couldn't collect a role
 * up front. Updates both Supabase user_metadata (so future logins
 * don't get re-prompted) and the Prisma User row.
 */
export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();
    const normalizedRole = normalizeRole(role);

    if (!normalizedRole) {
      return NextResponse.json(
        { error: 'A valid role is required (TEACHER or STUDENT)' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { error: updateError } = await supabase.auth.updateUser({
      data: { role: normalizedRole },
    });

    if (updateError) {
      console.error('[set-role] ❌ Failed to update Supabase user_metadata:', updateError);
      return NextResponse.json({ error: 'Failed to save role' }, { status: 500 });
    }

    const payload = buildUserSignupPayload({
      id: user.id,
      email: user.email!,
      name: (user.user_metadata as { name?: string } | null)?.name,
      role: normalizedRole,
    });
    await servicePrisma.user.upsert({
      where: { id: payload.id },
      update: { role: normalizedRole },
      create: payload,
    });

    return NextResponse.json({ success: true, role: normalizedRole });
  } catch (error) {
    console.error('[set-role] ❌ Fatal error:', error);
    return NextResponse.json(
      { error: 'Failed to save role', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
