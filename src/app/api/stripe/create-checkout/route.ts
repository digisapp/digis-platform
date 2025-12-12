import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { stripe, getCoinPackage } from '@/lib/stripe/config';
import { db } from '@/lib/data/system';
import { users } from '@/lib/data/system';
import { eq } from 'drizzle-orm';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { packageId } = await request.json();

    if (!packageId) {
      return NextResponse.json(
        { error: 'Package ID is required' },
        { status: 400 }
      );
    }

    const coinPackage = getCoinPackage(packageId);

    if (!coinPackage) {
      return NextResponse.json(
        { error: 'Invalid package' },
        { status: 400 }
      );
    }

    // Get or create Stripe customer for saved payment methods
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, user.id),
      columns: { stripeCustomerId: true, email: true, username: true, displayName: true },
    });

    let stripeCustomerId = dbUser?.stripeCustomerId;

    if (!stripeCustomerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email || dbUser?.email,
        name: dbUser?.displayName || dbUser?.username || undefined,
        metadata: {
          userId: user.id,
        },
      });
      stripeCustomerId = customer.id;

      // Save the Stripe customer ID to the database
      await db.update(users)
        .set({ stripeCustomerId: customer.id })
        .where(eq(users.id, user.id));
    }

    // Create Stripe checkout session with modern payment options
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      // Don't specify payment_method_types - let Stripe automatically show
      // the best options (Apple Pay, Google Pay, Link, cards) based on device
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: coinPackage.name,
              description: `${coinPackage.coins.toLocaleString()} Digis Coins`,
            },
            unit_amount: coinPackage.price,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      // Enable saved payment methods for returning customers
      payment_method_options: {
        card: {
          setup_future_usage: 'on_session', // Save card for future purchases
        },
      },
      success_url: `${process.env.NEXT_PUBLIC_URL}/wallet/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.NEXT_PUBLIC_URL}/wallet/cancelled`,
      metadata: {
        userId: user.id,
        packageId: coinPackage.id,
        coins: coinPackage.coins.toString(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error: any) {
    console.error('Stripe checkout error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create checkout session' },
      { status: 500 }
    );
  }
}
