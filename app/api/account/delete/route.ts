import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function DELETE(request: NextRequest) {
  try {
    const supabase = await createClient();

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const userId = user.id;

    // Start a transaction-like deletion process
    // Note: Supabase doesn't have true transactions, so we do sequential deletes

    try {
      // 1. Delete user subscription data (if any)
      const { error: subscriptionError } = await supabase
        .from('user_subscriptions')
        .delete()
        .eq('user_id', userId);

      if (subscriptionError) {
        console.error('Error deleting subscription data:', subscriptionError);
        // Continue anyway - don't fail the entire deletion
      }

      // 2. Delete user reading progress/analytics
      const { error: progressError } = await supabase
        .from('user_reading_progress')
        .delete()
        .eq('user_id', userId);

      if (progressError) {
        console.error('Error deleting reading progress:', progressError);
        // Continue anyway
      }

      // 3. Delete user preferences/settings
      const { error: preferencesError } = await supabase
        .from('user_preferences')
        .delete()
        .eq('user_id', userId);

      if (preferencesError) {
        console.error('Error deleting user preferences:', preferencesError);
        // Continue anyway
      }

      // 4. Delete any user-generated content (notes, bookmarks, etc.)
      const { error: notesError } = await supabase
        .from('user_notes')
        .delete()
        .eq('user_id', userId);

      if (notesError) {
        console.error('Error deleting user notes:', notesError);
        // Continue anyway
      }

      // 5. Delete user profile data
      const { error: profileError } = await supabase
        .from('user_profiles')
        .delete()
        .eq('user_id', userId);

      if (profileError) {
        console.error('Error deleting user profile:', profileError);
        // Continue anyway
      }

      // 6. Finally, delete the auth user account
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId);

      if (deleteError) {
        console.error('Error deleting auth user:', deleteError);
        return NextResponse.json(
          { error: 'Failed to delete account. Please contact support.' },
          { status: 500 }
        );
      }

      // 7. Sign out the user (cleanup)
      await supabase.auth.signOut();

      return NextResponse.json(
        { message: 'Account successfully deleted' },
        { status: 200 }
      );

    } catch (deletionError) {
      console.error('Error during account deletion:', deletionError);
      return NextResponse.json(
        { error: 'Failed to delete account data. Please contact support.' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}