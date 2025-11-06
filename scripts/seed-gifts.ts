import { db } from '../src/db';
import { virtualGifts } from '../src/db/schema';

const gifts = [
  {
    name: 'Rose',
    emoji: '🌹',
    coinCost: 1,
    animationType: 'float',
    rarity: 'common' as const,
  },
  {
    name: 'Heart',
    emoji: '❤️',
    coinCost: 2,
    animationType: 'float',
    rarity: 'common' as const,
  },
  {
    name: 'Star',
    emoji: '⭐',
    coinCost: 5,
    animationType: 'burst',
    rarity: 'rare' as const,
  },
  {
    name: 'Fire',
    emoji: '🔥',
    coinCost: 10,
    animationType: 'burst',
    rarity: 'rare' as const,
  },
  {
    name: 'Diamond',
    emoji: '💎',
    coinCost: 20,
    animationType: 'burst',
    rarity: 'epic' as const,
  },
  {
    name: 'Rocket',
    emoji: '🚀',
    coinCost: 50,
    animationType: 'fireworks',
    rarity: 'epic' as const,
  },
  {
    name: 'Crown',
    emoji: '👑',
    coinCost: 100,
    animationType: 'fireworks',
    rarity: 'legendary' as const,
  },
  {
    name: 'Mansion',
    emoji: '🏰',
    coinCost: 500,
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
