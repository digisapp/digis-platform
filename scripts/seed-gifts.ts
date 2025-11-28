import { db } from '../src/db';
import { virtualGifts, streamGifts } from '../src/db/schema';

// Gift tiers (1 coin = $0.10)
const gifts = [
  // Common gifts ($1-$10)
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
    name: 'Peach',
    emoji: '🍑',
    coinCost: 30,
    animationType: 'float',
    rarity: 'common' as const,
  },
  {
    name: 'Pizza',
    emoji: '🍕',
    coinCost: 50,
    animationType: 'float',
    rarity: 'common' as const,
  },
  {
    name: 'Rocket',
    emoji: '🚀',
    coinCost: 50,
    animationType: 'fireworks',
    rarity: 'common' as const,
  },
  {
    name: 'Rose',
    emoji: '🌹',
    coinCost: 80,
    animationType: 'float',
    rarity: 'common' as const,
  },
  {
    name: 'Martini',
    emoji: '🍸',
    coinCost: 100,
    animationType: 'float',
    rarity: 'common' as const,
  },
  // Rare gifts ($15-$50)
  {
    name: 'Cake',
    emoji: '🎂',
    coinCost: 150,
    animationType: 'burst',
    rarity: 'rare' as const,
  },
  {
    name: 'Sushi',
    emoji: '🍣',
    coinCost: 200,
    animationType: 'float',
    rarity: 'rare' as const,
  },
  {
    name: 'Steak',
    emoji: '🥩',
    coinCost: 200,
    animationType: 'float',
    rarity: 'rare' as const,
  },
  {
    name: 'Champagne',
    emoji: '🍾',
    coinCost: 300,
    animationType: 'confetti',
    rarity: 'rare' as const,
  },
  {
    name: 'Gold Bar',
    emoji: '💰',
    coinCost: 350,
    animationType: 'fireworks',
    rarity: 'rare' as const,
  },
  {
    name: 'Crown',
    emoji: '👑',
    coinCost: 500,
    animationType: 'fireworks',
    rarity: 'rare' as const,
  },
  // Epic gifts ($50-$100)
  {
    name: 'Designer Bag',
    emoji: '👜',
    coinCost: 500,
    animationType: 'fireworks',
    rarity: 'epic' as const,
  },
  {
    name: 'Diamond',
    emoji: '💎',
    coinCost: 750,
    animationType: 'burst',
    rarity: 'epic' as const,
  },
  {
    name: 'Engagement Ring',
    emoji: '💍',
    coinCost: 1000,
    animationType: 'confetti',
    rarity: 'epic' as const,
  },
  {
    name: 'Sports Car',
    emoji: '🏎️',
    coinCost: 1000,
    animationType: 'fireworks',
    rarity: 'epic' as const,
  },
  // Legendary gifts ($200-$500)
  {
    name: 'Yacht',
    emoji: '🛥️',
    coinCost: 2000,
    animationType: 'confetti',
    rarity: 'legendary' as const,
  },
  {
    name: 'Jet',
    emoji: '✈️',
    coinCost: 3500,
    animationType: 'confetti',
    rarity: 'legendary' as const,
  },
  {
    name: 'Mansion',
    emoji: '🏰',
    coinCost: 5000,
    animationType: 'confetti',
    rarity: 'legendary' as const,
  },
];

async function seedGifts() {
  console.log('🎁 Seeding virtual gifts...');

  try {
    // First, delete stream_gifts records that reference old gifts
    console.log('🗑️ Clearing stream_gifts history...');
    await db.delete(streamGifts);
    console.log('✅ Stream gifts history cleared.');

    // Now delete old gifts
    console.log('🗑️ Deleting old gifts...');
    await db.delete(virtualGifts);
    console.log('✅ Old gifts deleted.');

    // Insert new gifts
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
