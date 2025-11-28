import { db } from '../src/db';
import { virtualGifts } from '../src/db/schema';

// Simplified gift tiers (1 coin = $0.10)
const gifts = [
  // Common gifts ($1-$2)
  {
    name: 'Fire',
    emoji: '🔥',
    coinCost: 10,
    animationType: 'burst',
    rarity: 'common' as const,
  },
  {
    name: 'Heart',
    emoji: '❤️',
    coinCost: 10,
    animationType: 'float',
    rarity: 'common' as const,
  },
  {
    name: 'Cake',
    emoji: '🎂',
    coinCost: 20,
    animationType: 'burst',
    rarity: 'common' as const,
  },
  // Rare gifts ($5-$15)
  {
    name: 'Rose',
    emoji: '🌹',
    coinCost: 50,
    animationType: 'float',
    rarity: 'rare' as const,
  },
  {
    name: 'Diamond',
    emoji: '💎',
    coinCost: 100,
    animationType: 'burst',
    rarity: 'rare' as const,
  },
  {
    name: 'Crown',
    emoji: '👑',
    coinCost: 100,
    animationType: 'fireworks',
    rarity: 'rare' as const,
  },
  {
    name: 'Gold Bar',
    emoji: '🥇',
    coinCost: 150,
    animationType: 'fireworks',
    rarity: 'rare' as const,
  },
  {
    name: 'Rocket',
    emoji: '🚀',
    coinCost: 200,
    animationType: 'fireworks',
    rarity: 'epic' as const,
  },
  // Epic gifts ($25-$50)
  {
    name: 'Designer Bag',
    emoji: '👜',
    coinCost: 250,
    animationType: 'fireworks',
    rarity: 'epic' as const,
  },
  {
    name: 'Sports Car',
    emoji: '🏎️',
    coinCost: 350,
    animationType: 'fireworks',
    rarity: 'epic' as const,
  },
  {
    name: 'Yacht',
    emoji: '🛥️',
    coinCost: 500,
    animationType: 'confetti',
    rarity: 'epic' as const,
  },
  // Legendary gifts ($100)
  {
    name: 'Mansion',
    emoji: '🏰',
    coinCost: 1000,
    animationType: 'confetti',
    rarity: 'legendary' as const,
  },
];

async function seedGifts() {
  console.log('🎁 Seeding virtual gifts...');

  try {
    // Check if gifts already exist
    const existingGifts = await db.select().from(virtualGifts);

    if (existingGifts.length > 0) {
      console.log('✅ Gifts already seeded. Skipping.');
      return;
    }

    // Insert gifts
    await db.insert(virtualGifts).values(gifts);

    console.log('✅ Successfully seeded', gifts.length, 'virtual gifts!');
    console.log('\nGifts:');
    gifts.forEach((gift) => {
      console.log(`  ${gift.emoji} ${gift.name} - ${gift.coinCost} coins (${gift.rarity})`);
    });
  } catch (error) {
    console.error('❌ Error seeding gifts:', error);
    throw error;
  }
}

seedGifts()
  .then(() => {
    console.log('\n🎉 Seed complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n💥 Seed failed:', error);
    process.exit(1);
  });
