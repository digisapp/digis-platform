import { db } from '../db';
import { virtualGifts } from '../db/schema';
import { eq } from 'drizzle-orm';

async function updateGiftPrices() {
  // First, let's see what we have
  const gifts = await db.select().from(virtualGifts);
  console.log('Current gifts:');
  console.table(gifts.map(g => ({ name: g.name, emoji: g.emoji, cost: g.coinCost, rarity: g.rarity })));

  // Gift tiers (1 coin = $0.10)
  const priceUpdates: Record<string, number> = {
    // Common gifts ($1-$10)
    'Fire': 10,
    'Heart': 10,
    'Rocket': 50,
    'Peach': 100,
    'Martini': 100,
    'Pizza': 100,
    'Rose': 100,

    // Rare gifts ($15-$30)
    'Gold Bar': 150,
    'Cake': 200,
    'Sushi': 200,
    'Steak': 200,
    'Crown': 250,
    'Champagne': 300,

    // Epic gifts ($50-$100)
    'Designer Bag': 500,
    'Diamond': 500,
    'Engagement Ring': 750,
    'Sports Car': 1000,

    // Legendary gifts ($200-$500)
    'Yacht': 2000,
    'Jet': 3500,
    'Mansion': 5000,
  };

  // Update each gift
  for (const gift of gifts) {
    const newPrice = priceUpdates[gift.name];
    if (newPrice && newPrice !== gift.coinCost) {
      await db.update(virtualGifts)
        .set({ coinCost: newPrice })
        .where(eq(virtualGifts.id, gift.id));
      console.log(`Updated ${gift.name}: ${gift.coinCost} -> ${newPrice}`);
    }
  }

  // Show updated prices
  const updatedGifts = await db.select().from(virtualGifts);
  console.log('\nUpdated gifts:');
  console.table(updatedGifts.map(g => ({ name: g.name, emoji: g.emoji, cost: g.coinCost, rarity: g.rarity })));

  process.exit(0);
}

updateGiftPrices().catch(console.error);
