import { db } from '../db';
import { virtualGifts } from '../db/schema';
import { eq } from 'drizzle-orm';

async function updateGiftPrices() {
  // First, let's see what we have
  const gifts = await db.select().from(virtualGifts);
  console.log('Current gifts:');
  console.table(gifts.map(g => ({ name: g.name, emoji: g.emoji, cost: g.coinCost, rarity: g.rarity })));

  // Simplified gift tiers (1 coin = $0.10)
  // Common: 10-20 coins ($1-$2)
  // Rare: 50-100 coins ($5-$10)
  // Epic: 250-500 coins ($25-$50)
  // Legendary: 1000 coins ($100)

  const priceUpdates: Record<string, number> = {
    // Common gifts ($1-$2)
    'Fire': 10,
    'Heart': 10,
    'Cake': 20,

    // Rare gifts ($5-$15)
    'Rose': 50,
    'Diamond': 100,
    'Crown': 100,
    'Gold Bar': 150,

    // Epic gifts ($20-$50)
    'Rocket': 200,
    'Designer Bag': 250,
    'Sports Car': 350,
    'Yacht': 500,

    // Legendary gifts ($100)
    'Mansion': 1000,
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
