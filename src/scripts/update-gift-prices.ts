import { db } from '../db';
import { virtualGifts } from '../db/schema';
import { eq } from 'drizzle-orm';

async function updateGiftPrices() {
  // First, let's see what we have
  const gifts = await db.select().from(virtualGifts);
  console.log('Current gifts:');
  console.table(gifts.map(g => ({ name: g.name, emoji: g.emoji, cost: g.coinCost, rarity: g.rarity })));

  // Update prices to be more substantial
  // Common: 10-50 coins
  // Rare: 100-250 coins
  // Epic: 500-1000 coins
  // Legendary: 2000-5000 coins

  const priceUpdates: Record<string, number> = {
    // Common gifts (10-50)
    'Heart': 10,
    'Rose': 25,
    'Coffee': 15,
    'Ice Cream': 20,
    'Pizza': 30,
    'Thumbs Up': 10,
    'Star': 25,
    'Smile': 10,
    'Clap': 15,
    'Fire': 20,

    // Rare gifts (100-250)
    'Diamond': 150,
    'Crown': 200,
    'Rocket': 175,
    'Rainbow': 125,
    'Unicorn': 250,
    'Trophy': 200,
    'Gift Box': 100,
    'Champagne': 175,
    'Cake': 125,
    'Balloon': 100,

    // Epic gifts (500-1000)
    'Sports Car': 750,
    'Yacht': 1000,
    'Private Jet': 999,
    'Mansion': 888,
    'Helicopter': 777,
    'Castle': 950,
    'Treasure': 666,
    'Lightning': 500,
    'Tornado': 600,
    'Comet': 700,

    // Legendary gifts (2000-5000)
    'Planet': 2500,
    'Galaxy': 5000,
    'Universe': 9999,
    'Dragon': 3000,
    'Phoenix': 3500,
    'Lion': 2000,
    'Whale': 4000,
    'Supernova': 7500,
    'Black Hole': 8888,
    'Infinity': 10000,
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
