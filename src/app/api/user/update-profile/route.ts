import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { displayName, bio, avatarUrl, bannerUrl, creatorCardImageUrl, city, state } = await request.json();

    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Use admin client for database operations
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Update user in database
    const { data: updatedUser, error: updateError } = await adminClient
      .from('users')
      .update({
        display_name: displayName || null,
        bio: bio || null,
        avatar_url: avatarUrl || null,
        banner_url: bannerUrl || null,
        creator_card_image_url: creatorCardImageUrl || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', authUser.id)
      .select()
      .single();

    if (updateError || !updatedUser) {
      console.error('Update user error:', updateError);
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Update or create profile with city and state
    if (city !== undefined || state !== undefined) {
      const { data: existingProfile } = await adminClient
        .from('profiles')
        .select('id')
        .eq('user_id', authUser.id)
        .single();

      if (existingProfile) {
        // Update existing profile
        await adminClient
          .from('profiles')
          .update({
            city: city || null,
            state: state || null,
            updated_at: new Date().toISOString(),
          })
          .eq('user_id', authUser.id);
      } else {
        // Create new profile
        await adminClient
          .from('profiles')
          .insert({
            user_id: authUser.id,
            city: city || null,
            state: state || null,
          });
      }
    }

    // Update Supabase Auth metadata
    await supabase.auth.updateUser({
      data: {
        display_name: displayName || null,
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json(
      { error: 'An error occurred while updating profile' },
      { status: 500 }
    );
  }
}
