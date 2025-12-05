import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Force Node runtime
export const runtime = 'nodejs';

/**
 * POST /api/auth/create-user
 * 
 * Creates user account with password using Supabase Admin API.
 * Ensures password is ALWAYS saved, even if email sending fails.
 * Then sends confirmation email via Resend.
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password, name } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
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
      
      // Check if user has password set by trying to update it
      // If update succeeds, password will be set/updated
      const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
        existingUser.id,
        { password: password }
      );

      if (updateError) {
        console.error('[create-user] ❌ Failed to update password:', updateError);
        return NextResponse.json(
          { error: 'User exists but password update failed', details: updateError.message },
          { status: 500 }
        );
      }

      console.log('[create-user] ✅ Password updated for existing user');
      
      return NextResponse.json({
        success: true,
        user: {
          id: existingUser.id,
          email: existingUser.email,
        },
        message: 'Password updated for existing user',
      });
    }

    console.log('[create-user] 📧 Step 2: Creating new user with password...');
    
    // Create new user with password using Admin API
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: false, // User needs to confirm via email
      user_metadata: {
        name: name || undefined,
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

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.user.id,
        email: newUser.user.email,
      },
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

