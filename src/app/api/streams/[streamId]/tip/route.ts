import { NextRequest, NextResponse } from 'next/server';
import { StreamService } from '@/lib/streams/stream-service';
import { AblyRealtimeService } from '@/lib/streams/ably-realtime-service';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/lib/data/system';
import { users, tipMenuItems, menuPurchases } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { rateLimitFinancial } from '@/lib/rate-limit';
import { AiStreamChatService } from '@/lib/services/ai-stream-chat-service';

// Force Node.js runtime for Drizzle ORM
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ streamId: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit financial operations
    const rateCheck = await rateLimitFinancial(user.id, 'tip');
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: rateCheck.error },
        {
          status: 429,
          headers: { 'Retry-After': String(rateCheck.retryAfter) }
        }
      );
    }

    const { streamId } = await params;
    const { amount, recipientCreatorId, recipientUsername, tipMenuItemId, tipMenuItemLabel, message } = await req.json();

    if (!amount || amount < 1) {
      return NextResponse.json({ error: 'Tip amount is required (minimum 1 coin)' }, { status: 400 });
    }

    if (amount > 100000) {
      return NextResponse.json(
        { error: 'Maximum tip amount is 100,000 coins' },
        { status: 400 }
      );
    }

    // Get user details for username
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const username = dbUser.username || dbUser.displayName || 'Anonymous';
    const avatarUrl = dbUser.avatarUrl || null;

    // Look up menu item if provided to get fulfillment details
    let menuItem = null;
    let digitalContentUrl = null;
    let fulfillmentType = 'instant';
    let itemCategory = 'interaction';

    if (tipMenuItemId) {
      menuItem = await db.query.tipMenuItems.findFirst({
        where: eq(tipMenuItems.id, tipMenuItemId),
      });
      if (menuItem) {
        fulfillmentType = menuItem.fulfillmentType;
        itemCategory = menuItem.itemCategory;
        digitalContentUrl = menuItem.digitalContentUrl;
      }
    }

    const result = await StreamService.sendTip(
      streamId,
      user.id,
      username,
      amount,
      recipientCreatorId,
      recipientUsername,
      tipMenuItemId,
      tipMenuItemLabel
    );

    // For manual fulfillment items, create a purchase record
    if (menuItem && fulfillmentType === 'manual') {
      await db.insert(menuPurchases).values({
        buyerId: user.id,
        creatorId: recipientCreatorId || result.recipientCreatorId,
        menuItemId: tipMenuItemId,
        streamId: streamId,
        itemLabel: tipMenuItemLabel || menuItem.label,
        itemCategory: itemCategory,
        fulfillmentType: fulfillmentType,
        coinsPaid: amount,
        status: 'pending',
      });
    }

    // Broadcast tip to all viewers using Ably (scales to 50k+)
    await AblyRealtimeService.broadcastTip(streamId, {
      senderId: user.id,
      senderUsername: username,
      senderAvatarUrl: avatarUrl,
      amount,
      recipientCreatorId: result.recipientCreatorId,
      recipientUsername: result.recipientUsername,
      // Include item type info for chat announcements
      menuItemLabel: tipMenuItemLabel,
      itemCategory: menuItem ? itemCategory : null,
      fulfillmentType: menuItem ? fulfillmentType : null,
      // Include custom message if provided
      message: message?.trim() || null,
    });

    // If tip has a message, also broadcast as a "super tip" chat message
    if (message?.trim()) {
      await AblyRealtimeService.broadcastChatMessage(streamId, {
        id: `super-tip-${Date.now()}-${user.id}`,
        streamId,
        userId: user.id,
        username,
        message: '', // Required field but we use tipMessage for display
        messageType: 'super_tip',
        createdAt: new Date(),
        // Additional fields for super tip display
        tipMessage: message.trim(), // Custom message from the tipper
        giftAmount: amount,
        avatarUrl,
      } as any);
    }

    // AI Chat Mod: Thank the tipper (async, don't block)
    if (result.recipientCreatorId) {
      AiStreamChatService.processTip(
        streamId,
        result.recipientCreatorId,
        username,
        amount,
        tipMenuItemLabel
      ).catch(err => {
        console.error('[AI Stream Chat] Error thanking tipper:', err);
      });
    }

    // Return response with digital content URL if applicable
    return NextResponse.json({
      success: true,
      amount,
      newBalance: result.newBalance,
      // Include digital content URL for digital items
      digitalContentUrl: fulfillmentType === 'digital' ? digitalContentUrl : null,
      fulfillmentType: menuItem ? fulfillmentType : null,
      itemLabel: tipMenuItemLabel,
    });
  } catch (error: any) {
    console.error('Error sending tip:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to send tip' },
      { status: 500 }
    );
  }
}
