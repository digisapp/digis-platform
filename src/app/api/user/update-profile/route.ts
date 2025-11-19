import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, profiles } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { displayName, bio, avatarUrl, bannerUrl, creatorCardImageUrl, city, state, phoneNumber } = await request.json();

    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Build update object with only provided fields
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (displayName !== undefined) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (bannerUrl !== undefined) updateData.bannerUrl = bannerUrl;
    if (creatorCardImageUrl !== undefined) updateData.creatorCardImageUrl = creatorCardImageUrl;

    // Update user in database using Drizzle ORM with retry logic
    let updatedUser;
    let retries = 3;
    let lastError;

    while (retries > 0) {
      try {
        [updatedUser] = await db
          .update(users)
          .set(updateData)
          .where(eq(users.id, authUser.id))
          .returning();
        break; // Success, exit retry loop
      } catch (err: any) {
        lastError = err;
        console.error(`Database update error (${retries} retries left):`, err);
        retries--;
        if (retries > 0) {
          // Wait 500ms before retry
          await new Promise(resolve => setTimeout(resolve, 500));
        }
      }
    }

    if (!updatedUser) {
      console.error('Failed to update user after retries:', authUser.id, lastError);
      return NextResponse.json(
        { error: lastError?.message || 'Failed to update profile after multiple attempts' },
        { status: 500 }
      );
    }

    // Update or create profile with city, state, and phone number using Drizzle
    if (city !== undefined || state !== undefined || phoneNumber !== undefined) {
      const existingProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, authUser.id),
      });

      const profileData: any = {
        updatedAt: new Date(),
      };
      if (city !== undefined) profileData.city = city;
      if (state !== undefined) profileData.state = state;
      if (phoneNumber !== undefined) profileData.phoneNumber = phoneNumber;

      if (existingProfile) {
        // Update existing profile
        await db
          .update(profiles)
          .set(profileData)
          .where(eq(profiles.userId, authUser.id));
      } else {
        // Create new profile
        await db
          .insert(profiles)
          .values({
            userId: authUser.id,
            city: city || null,
            state: state || null,
            phoneNumber: phoneNumber || null,
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
