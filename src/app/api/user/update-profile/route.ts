import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/data/system';
import { users, profiles } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { extractInstagramHandle, extractTiktokHandle, extractTwitterHandle, extractSnapchatHandle, extractYoutubeHandle } from '@/lib/utils/social-handles';
import { invalidateCreatorProfile } from '@/lib/cache/hot-data-cache';

// Force Node.js runtime
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const {
      displayName, bio, avatarUrl, bannerUrl, city, state, phoneNumber, primaryCategory, secondaryCategory,
      // Social media fields
      twitterHandle, instagramHandle, tiktokHandle, snapchatHandle, youtubeHandle, twitchHandle, amazonHandle, contactEmail, showSocialLinks
    } = await request.json();

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
    if (primaryCategory !== undefined) updateData.primaryCategory = primaryCategory;
    if (secondaryCategory !== undefined) updateData.secondaryCategory = secondaryCategory;

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

    // Update or create profile with city, state, phone number, and social media handles using Drizzle
    const hasProfileFields = city !== undefined || state !== undefined || phoneNumber !== undefined ||
      twitterHandle !== undefined || instagramHandle !== undefined || tiktokHandle !== undefined ||
      snapchatHandle !== undefined || youtubeHandle !== undefined || twitchHandle !== undefined ||
      amazonHandle !== undefined || contactEmail !== undefined || showSocialLinks !== undefined;

    if (hasProfileFields) {
      const existingProfile = await db.query.profiles.findFirst({
        where: eq(profiles.userId, authUser.id),
      });

      const profileData: any = {
        updatedAt: new Date(),
      };
      if (city !== undefined) profileData.city = city;
      if (state !== undefined) profileData.state = state;
      if (phoneNumber !== undefined) profileData.phoneNumber = phoneNumber;
      // Social media handles - extract usernames from URLs if pasted
      if (twitterHandle !== undefined) profileData.twitterHandle = extractTwitterHandle(twitterHandle);
      if (instagramHandle !== undefined) profileData.instagramHandle = extractInstagramHandle(instagramHandle);
      if (tiktokHandle !== undefined) profileData.tiktokHandle = extractTiktokHandle(tiktokHandle);
      if (snapchatHandle !== undefined) profileData.snapchatHandle = extractSnapchatHandle(snapchatHandle);
      if (youtubeHandle !== undefined) profileData.youtubeHandle = extractYoutubeHandle(youtubeHandle);
      if (twitchHandle !== undefined) profileData.twitchHandle = twitchHandle;
      if (amazonHandle !== undefined) profileData.amazonHandle = amazonHandle;
      if (contactEmail !== undefined) profileData.contactEmail = contactEmail;
      if (showSocialLinks !== undefined) profileData.showSocialLinks = showSocialLinks;

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
            twitterHandle: twitterHandle ? extractTwitterHandle(twitterHandle) : null,
            instagramHandle: instagramHandle ? extractInstagramHandle(instagramHandle) : null,
            tiktokHandle: tiktokHandle ? extractTiktokHandle(tiktokHandle) : null,
            snapchatHandle: snapchatHandle ? extractSnapchatHandle(snapchatHandle) : null,
            youtubeHandle: youtubeHandle ? extractYoutubeHandle(youtubeHandle) : null,
            twitchHandle: twitchHandle || null,
            amazonHandle: amazonHandle || null,
            contactEmail: contactEmail || null,
            showSocialLinks: showSocialLinks ?? true,
          });
      }
    }

    // Update Supabase Auth metadata
    await supabase.auth.updateUser({
      data: {
        display_name: displayName || null,
      },
    });

    // Invalidate cached creator profile so changes are immediately visible
    await invalidateCreatorProfile(authUser.id);

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
