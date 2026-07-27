import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { resolveSignupRole } from '@/lib/auth/resolve-signup-role';
import { buildUserSignupPayload } from '@/lib/auth/build-user-signup-payload';
import { servicePrisma } from '@/lib/prisma-service';

// Force Node runtime
export const runtime = 'nodejs';

// Best-effort: the Supabase auth account is the one guarantee that must
// not fail (see past password-saving incident). This is a safety net -
// claude-service.ts's lazy upsert remains a fallback if this errors too.
async function upsertPrismaUser(input: { id: string; email: string; name?: string | null; role: 'TEACHER' | 'STUDENT' | null }) {
  try {
    const payload = buildUserSignupPayload(input);
    await servicePrisma.user.upsert({
      where: { id: payload.id },
      update: { role: payload.role ?? undefined },
      create: payload,
    });
  } catch (dbError) {
    console.error('[create-user] ⚠️ Failed to upsert Prisma user row (non-fatal):', dbError);
  }
}

/**
 * POST /api/auth/create-user
 *
 * Creates user account with password using Supabase Admin API.
 * Ensures password is ALWAYS saved, even if email sending fails.
 * Then sends confirmation email via Resend.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role: requestedRole } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    const roleResolution = resolveSignupRole({ requestedRole, authMethod: 'password' });
    if (roleResolution.error) {
      return NextResponse.json({ error: roleResolution.error }, { status: 400 });
    }

    // Create Supabase admin client
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    console.log('[create-user] 📧 Step 1: Checking if user exists...');
    
    // Check if user already exists
    const { data: existingUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
    
    if (listError) {
      console.error('[create-user] ❌ Failed to list users:', listError);
      return NextResponse.json(
        { error: 'Failed to check existing users' },
        { status: 500 }
      );
    }

    const existingUser = existingUsers.users.find(u => u.email === email);

    if (existingUser) {
      console.log('[create-user] ⚠️ User already exists:', existingUser.id);

      // This is the common path: the client's own supabase.auth.signUp()
      // call already created the user before this resilience-backup call
      // ever runs. The Prisma row still needs to be created/updated here -
      // it must not only happen in the "new user" branch below, which
      // rarely executes in practice.
      await upsertPrismaUser({
        id: existingUser.id,
        email: existingUser.email!,
        name,
        role: roleResolution.role,
      });

      // Return error - user should not be able to sign up with existing email
      return NextResponse.json(
        {
          error: 'User already registered',
          message: 'An account with this email already exists. Please log in instead.',
        },
        { status: 400 }
      );
    }

    console.log('[create-user] 📧 Step 2: Creating new user with password...');
    
    // Create new user with password using Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // User needs to confirm via email
      user_metadata: {
        name: name || undefined,
        role: roleResolution.role || undefined,
      },
    });

    if (createError || !newUser.user) {
      console.error('[create-user] ❌ Failed to create user:', createError);
      return NextResponse.json(
        { error: 'Failed to create user', details: createError?.message },
        { status: 500 }
      );
    }

    console.log('[create-user] ✅ User created with password:', newUser.user.id);

    // Create the real Prisma User row now, with the real email - not the
    // lazy placeholder-email upsert that used to run on first AI usage.
    await upsertPrismaUser({
      id: newUser.user.id,
      email: newUser.user.email!,
      name,
      role: roleResolution.role,
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
      needsRolePrompt: roleResolution.needsRolePrompt,
      message: 'User created successfully with password',
    });

  } catch (error) {
    console.error('[create-user] ❌ Fatal error:', error);
    return NextResponse.json(
      {
        error: 'Failed to create user',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

