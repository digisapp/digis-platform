import { db } from '../db';
import { virtualGifts } from '../db/schema';
import { eq } from 'drizzle-orm';

async function updateGiftPrices() {
  // First, let's see what we have
  const gifts = await db.select().from(virtualGifts);
  console.log('Current gifts:');
  console.table(gifts.map(g => ({ name: g.name, emoji: g.emoji, cost: g.coinCost, rarity: g.rarity })));

  // Update prices (1 coin = $0.10)
  // Common: 1-5 coins ($0.10-$0.50)
  // Rare: 10-25 coins ($1-$2.50)
  // Epic: 50-100 coins ($5-$10)
  // Legendary: 200-500 coins ($20-$50)

  const priceUpdates: Record<string, number> = {
    // Common gifts (1-5 coins)
    'Heart': 1,
    'Rose': 2,
    'Coffee': 2,
    'Ice Cream': 2,
    'Pizza': 3,
    'Thumbs Up': 1,
    'Star': 2,
    'Smile': 1,
    'Clap': 2,
    'Fire': 2,

    // Rare gifts (10-25 coins)
    'Diamond': 15,
    'Crown': 20,
    'Rocket': 18,
    'Rainbow': 12,
    'Unicorn': 25,
    'Trophy': 20,
    'Gift Box': 10,
    'Champagne': 18,
    'Cake': 12,
    'Balloon': 10,

    // Epic gifts (50-100 coins)
    'Sports Car': 75,
    'Yacht': 100,
    'Private Jet': 99,
    'Mansion': 88,
    'Helicopter': 77,
    'Castle': 95,
    'Treasure': 66,
    'Lightning': 50,
    'Tornado': 60,
    'Comet': 70,

    // Legendary gifts (200-500 coins)
    'Planet': 250,
    'Galaxy': 500,
    'Universe': 999,
    'Dragon': 300,
    'Phoenix': 350,
    'Lion': 200,
    'Whale': 400,
    'Supernova': 750,
    'Black Hole': 888,
    'Infinity': 1000,
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
