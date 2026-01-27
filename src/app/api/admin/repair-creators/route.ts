import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, creatorInvites, creatorSettings, aiTwinSettings } from '@/db/schema';
import { eq, and, isNotNull } from 'drizzle-orm';
import { isAdminUser } from '@/lib/admin/check-admin';
import { supabaseAdmin } from '@/lib/supabase/admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface RepairResult {
  userId: string;
  username: string;
  email: string;
  issues: string[];
  fixed: string[];
  errors: string[];
}

/**
 * POST /api/admin/repair-creators
 *
 * Repairs creators who have issues with their role, auth metadata, or settings.
 * This fixes:
 * 1. Users who claimed invites but have role='fan'
 * 2. Users with role='creator' but missing auth metadata
 * 3. Creators missing creator_settings
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const results: RepairResult[] = [];
    let totalFixed = 0;
    let totalErrors = 0;

    // 1. Find all claimed invites and ensure those users are creators
    console.log('[RepairCreators] Finding claimed invites...');
    const claimedInvites = await db.query.creatorInvites.findMany({
      where: and(
        eq(creatorInvites.status, 'claimed'),
        isNotNull(creatorInvites.claimedBy)
      ),
    });

    console.log(`[RepairCreators] Found ${claimedInvites.length} claimed invites`);

    for (const invite of claimedInvites) {
      if (!invite.claimedBy) continue;

      const result: RepairResult = {
        userId: invite.claimedBy,
        username: invite.instagramHandle,
        email: invite.email || '',
        issues: [],
        fixed: [],
        errors: [],
      };

      // Get the user
      const userRecord = await db.query.users.findFirst({
        where: eq(users.id, invite.claimedBy),
      });

      if (!userRecord) {
        result.issues.push('User record not found in database');
        result.errors.push('Cannot fix - user does not exist');
        results.push(result);
        totalErrors++;
        continue;
      }

      result.username = userRecord.username || invite.instagramHandle;
      result.email = userRecord.email || invite.email || '';

      // Check 1: Role should be 'creator'
      if (userRecord.role !== 'creator') {
        result.issues.push(`Role is '${userRecord.role}' instead of 'creator'`);

        try {
          await db.update(users)
            .set({
              role: 'creator',
              isCreatorVerified: true,
              updatedAt: new Date()
            })
            .where(eq(users.id, invite.claimedBy));

          result.fixed.push('Updated role to creator in database');
          totalFixed++;
        } catch (err: any) {
          result.errors.push(`Failed to update role: ${err.message}`);
          totalErrors++;
        }
      }

      // Check 2: Auth metadata should have role='creator'
      try {
        const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(invite.claimedBy);

        if (authUserError) {
          result.issues.push('Could not fetch auth user');
          result.errors.push(authUserError.message);
        } else if (authUser?.user) {
          const appMetadata = authUser.user.app_metadata || {};

          if (appMetadata.role !== 'creator') {
            result.issues.push(`Auth metadata role is '${appMetadata.role || 'undefined'}' instead of 'creator'`);

            try {
              await supabaseAdmin.auth.admin.updateUserById(invite.claimedBy, {
                app_metadata: { role: 'creator' },
                user_metadata: { is_creator_verified: true },
              });
              result.fixed.push('Updated auth metadata with role=creator');
              totalFixed++;
            } catch (authErr: any) {
              result.errors.push(`Failed to update auth metadata: ${authErr.message}`);
              totalErrors++;
            }
          }
        }
      } catch (authCheckErr: any) {
        result.issues.push('Error checking auth metadata');
        result.errors.push(authCheckErr.message);
        totalErrors++;
      }

      // Check 3: Creator settings should exist
      const existingSettings = await db.query.creatorSettings.findFirst({
        where: eq(creatorSettings.userId, invite.claimedBy),
      });

      if (!existingSettings) {
        result.issues.push('Missing creator_settings record');

        try {
          await db.insert(creatorSettings).values({
            userId: invite.claimedBy,
            messageRate: 3,
            callRatePerMinute: 25,
            minimumCallDuration: 5,
            isAvailableForCalls: false,
            voiceCallRatePerMinute: 15,
            minimumVoiceCallDuration: 5,
            isAvailableForVoiceCalls: false,
          }).onConflictDoNothing();

          result.fixed.push('Created creator_settings record');
          totalFixed++;
        } catch (settingsErr: any) {
          result.errors.push(`Failed to create creator_settings: ${settingsErr.message}`);
          totalErrors++;
        }
      }

      // Check 4: AI Twin settings should exist
      const existingAiSettings = await db.query.aiTwinSettings.findFirst({
        where: eq(aiTwinSettings.creatorId, invite.claimedBy),
      });

      if (!existingAiSettings) {
        result.issues.push('Missing ai_twin_settings record');

        try {
          await db.insert(aiTwinSettings).values({
            creatorId: invite.claimedBy,
            enabled: false,
            textChatEnabled: false,
            voice: 'ara',
            pricePerMinute: 20,
            minimumMinutes: 5,
            maxSessionMinutes: 60,
            textPricePerMessage: 5,
          }).onConflictDoNothing();

          result.fixed.push('Created ai_twin_settings record');
          totalFixed++;
        } catch (aiSettingsErr: any) {
          result.errors.push(`Failed to create ai_twin_settings: ${aiSettingsErr.message}`);
          totalErrors++;
        }
      }

      // Only add to results if there were issues
      if (result.issues.length > 0) {
        results.push(result);
      }
    }

    // 2. Also check for creators with role='creator' but missing auth metadata
    console.log('[RepairCreators] Checking existing creators for auth metadata issues...');
    const allCreators = await db.query.users.findMany({
      where: eq(users.role, 'creator'),
    });

    for (const creator of allCreators) {
      // Skip if already processed via invite
      if (results.some(r => r.userId === creator.id)) continue;

      const result: RepairResult = {
        userId: creator.id,
        username: creator.username || '',
        email: creator.email || '',
        issues: [],
        fixed: [],
        errors: [],
      };

      // Check auth metadata
      try {
        const { data: authUser, error: authUserError } = await supabaseAdmin.auth.admin.getUserById(creator.id);

        if (authUserError) {
          result.issues.push('Could not fetch auth user');
          result.errors.push(authUserError.message);
        } else if (authUser?.user) {
          const appMetadata = authUser.user.app_metadata || {};

          if (appMetadata.role !== 'creator') {
            result.issues.push(`Auth metadata role is '${appMetadata.role || 'undefined'}' instead of 'creator'`);

            try {
              await supabaseAdmin.auth.admin.updateUserById(creator.id, {
                app_metadata: { role: 'creator' },
                user_metadata: { is_creator_verified: true },
              });
              result.fixed.push('Updated auth metadata with role=creator');
              totalFixed++;
            } catch (authErr: any) {
              result.errors.push(`Failed to update auth metadata: ${authErr.message}`);
              totalErrors++;
            }
          }
        }
      } catch (authCheckErr: any) {
        result.issues.push('Error checking auth metadata');
        result.errors.push(authCheckErr.message);
        totalErrors++;
      }

      // Check creator settings
      const existingSettings = await db.query.creatorSettings.findFirst({
        where: eq(creatorSettings.userId, creator.id),
      });

      if (!existingSettings) {
        result.issues.push('Missing creator_settings record');

        try {
          await db.insert(creatorSettings).values({
            userId: creator.id,
            messageRate: 3,
            callRatePerMinute: 25,
            minimumCallDuration: 5,
            isAvailableForCalls: false,
            voiceCallRatePerMinute: 15,
            minimumVoiceCallDuration: 5,
            isAvailableForVoiceCalls: false,
          }).onConflictDoNothing();

          result.fixed.push('Created creator_settings record');
          totalFixed++;
        } catch (settingsErr: any) {
          result.errors.push(`Failed to create creator_settings: ${settingsErr.message}`);
          totalErrors++;
        }
      }

      // Check AI Twin settings
      const existingAiSettings = await db.query.aiTwinSettings.findFirst({
        where: eq(aiTwinSettings.creatorId, creator.id),
      });

      if (!existingAiSettings) {
        result.issues.push('Missing ai_twin_settings record');

        try {
          await db.insert(aiTwinSettings).values({
            creatorId: creator.id,
            enabled: false,
            textChatEnabled: false,
            voice: 'ara',
            pricePerMinute: 20,
            minimumMinutes: 5,
            maxSessionMinutes: 60,
            textPricePerMessage: 5,
          }).onConflictDoNothing();

          result.fixed.push('Created ai_twin_settings record');
          totalFixed++;
        } catch (aiSettingsErr: any) {
          result.errors.push(`Failed to create ai_twin_settings: ${aiSettingsErr.message}`);
          totalErrors++;
        }
      }

      // Only add to results if there were issues
      if (result.issues.length > 0) {
        results.push(result);
      }
    }

    console.log(`[RepairCreators] Complete. Fixed: ${totalFixed}, Errors: ${totalErrors}`);

    return NextResponse.json({
      success: true,
      summary: {
        totalCreatorsChecked: claimedInvites.length + allCreators.length,
        creatorsWithIssues: results.length,
        totalFixed,
        totalErrors,
      },
      results,
    });

  } catch (error: any) {
    console.error('[RepairCreators] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to repair creators' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/repair-creators
 *
 * Preview mode - shows what would be fixed without making changes
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!await isAdminUser(user)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const issues: { userId: string; username: string; email: string; problems: string[] }[] = [];

    // Find all claimed invites and check for issues
    const claimedInvites = await db.query.creatorInvites.findMany({
      where: and(
        eq(creatorInvites.status, 'claimed'),
        isNotNull(creatorInvites.claimedBy)
      ),
    });

    for (const invite of claimedInvites) {
      if (!invite.claimedBy) continue;

      const problems: string[] = [];

      const userRecord = await db.query.users.findFirst({
        where: eq(users.id, invite.claimedBy),
      });

      if (!userRecord) {
        issues.push({
          userId: invite.claimedBy,
          username: invite.instagramHandle,
          email: invite.email || '',
          problems: ['User record not found'],
        });
        continue;
      }

      if (userRecord.role !== 'creator') {
        problems.push(`Role is '${userRecord.role}' instead of 'creator'`);
      }

      const existingSettings = await db.query.creatorSettings.findFirst({
        where: eq(creatorSettings.userId, invite.claimedBy),
      });

      if (!existingSettings) {
        problems.push('Missing creator_settings');
      }

      if (problems.length > 0) {
        issues.push({
          userId: invite.claimedBy,
          username: userRecord.username || invite.instagramHandle,
          email: userRecord.email || invite.email || '',
          problems,
        });
      }
    }

    return NextResponse.json({
      preview: true,
      message: 'This is a preview. Use POST to actually fix these issues.',
      totalClaimedInvites: claimedInvites.length,
      creatorsWithIssues: issues.length,
      issues,
    });

  } catch (error: any) {
    console.error('[RepairCreators] Preview error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to check creators' },
      { status: 500 }
    );
  }
}
