import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { ContentService } from '@/lib/content/content-service';
import { NotificationService } from '@/lib/services/notification-service';
import { notifyContentPurchase } from '@/lib/email/creator-earnings';
import { db } from '@/lib/data/system';
import { users, contentItems } from '@/lib/data/system';
import { eq } from 'drizzle-orm';
import { rateLimitFinancial } from '@/lib/rate-limit';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ contentId: string }> }
) {
  try {
    const { contentId } = await params;
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Rate limit content purchases (10/min, 60/hour)
    const rateCheck = await rateLimitFinancial(user.id, 'unlock');
    if (!rateCheck.ok) {
      return NextResponse.json(
        { error: rateCheck.error },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfter) } }
      );
    }

    const result = await ContentService.purchaseContent(user.id, contentId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }

    // Send notification to creator about the purchase (non-blocking)
    if (result.purchase && result.purchase.coinsSpent > 0) {
      (async () => {
        try {
          // Get content, buyer, and creator details
          const [content, buyer] = await Promise.all([
            db.query.contentItems.findFirst({
              where: eq(contentItems.id, contentId),
              columns: { title: true, creatorId: true, unlockPrice: true },
            }),
            db.query.users.findFirst({
              where: eq(users.id, user.id),
              columns: { username: true, displayName: true, avatarUrl: true },
            }),
          ]);

          if (content && buyer) {
            const buyerName = buyer.displayName || buyer.username || 'Someone';

            // Send in-app notification
            await NotificationService.sendNotification(
              content.creatorId,
              'purchase',
              `${buyerName} unlocked your content! 🎉`,
              `"${content.title}" for ${content.unlockPrice} coins`,
              `/${buyer.username}`,
              buyer.avatarUrl || undefined,
              {
                contentId,
                buyerId: user.id,
                buyerUsername: buyer.username,
                coinsSpent: content.unlockPrice,
              }
            );

            // Send email notification to creator
            const creator = await db.query.users.findFirst({
              where: eq(users.id, content.creatorId),
              columns: { email: true, displayName: true, username: true },
            });

            if (creator?.email) {
              const creatorName = creator.displayName || creator.username || 'Creator';
              notifyContentPurchase(
                creator.email,
                creatorName,
                buyerName,
                buyer.username || 'user',
                content.unlockPrice || 0,
                content.title || undefined
              ).catch(err => console.error('Error sending purchase email:', err));
            }
          }
        } catch (err) {
          console.error('Error sending purchase notification:', err);
        }
      })();
    }

    return NextResponse.json({
      success: true,
      purchase: result.purchase,
      message: 'Content unlocked successfully!',
    });
  } catch (error: any) {
    console.error('Error purchasing content:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to purchase content' },
      { status: 500 }
    );
  }
}
