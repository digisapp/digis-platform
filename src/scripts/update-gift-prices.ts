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
    'Peach': 30,
    'Pizza': 50,
    'Rocket': 50,
    'Rose': 80,
    'Martini': 100,

    // Rare gifts ($15-$50)
    'Cake': 150,
    'Sushi': 200,
    'Steak': 200,
    'Champagne': 300,
    'Gold Bar': 350,
    'Crown': 500,

    // Epic gifts ($50-$100)
    'Designer Bag': 500,
    'Diamond': 750,
    'Engagement Ring': 1000,
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
