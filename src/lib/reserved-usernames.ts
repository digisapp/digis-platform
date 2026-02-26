/**
 * Reserved Usernames for Verified Creators Only
 *
 * This list prevents username squatting on high-value names.
 * Only verified creators can claim these usernames.
 *
 * Categories:
 * - All 4-letter or shorter usernames (premium)
 * - Common first names (high demand)
 * - Major brands and companies
 * - Popular creators and celebrities
 * - Common platform terms
 * - Geographic locations
 * - Model/influencer terms
 */

export const RESERVED_USERNAMES = new Set([
  // Platform reserved
  'admin', 'administrator', 'digis', 'support', 'help', 'api', 'www', 'mail',
  'staff', 'moderator', 'mod', 'team', 'official', 'verified', 'system',
  'root', 'superuser', 'webmaster', 'postmaster', 'hostmaster',

  // Common routes/features (avoid conflicts with app routes)
  'dashboard', 'settings', 'profile', 'messages', 'wallet', 'explore',
  'live', 'shows', 'creator', 'fan', 'browse', 'search', 'trending',
  'popular', 'new', 'featured', 'discover', 'feed', 'notifications',
  'account', 'login', 'signup', 'logout', 'register', 'auth',
  'watch', 'admin', 'stream', 'streams', 'calls', 'chats', 'claim',
  'clip', 'vod', 'bookings', 'connections', 'content', 'subscriptions',
  'join', 'welcome', 'privacy', 'terms', 'group-rooms', 'grouprooms',
  'become-creator', 'becomecreator', 'for-creators', 'forcreators',
  'ai-chat', 'aichat', 'reset-password', 'resetpassword',

  // Common first names (high value - VIP only)
  'hannah', 'emma', 'olivia', 'sarah', 'james', 'david', 'emily', 'grace',
  'bella', 'sofia', 'lucas', 'ethan', 'mason', 'logan', 'alex', 'ryan',
  'kate', 'anna', 'lily', 'rose', 'jack', 'mike', 'john', 'jane', 'mary',
  'lisa', 'amy', 'kim', 'sam', 'max', 'leo', 'mia', 'ava', 'zoe', 'eva',
  'chloe', 'sophie', 'julia', 'laura', 'rachel', 'nicole', 'ashley', 'amber',
  'jessica', 'jennifer', 'stephanie', 'natalie', 'victoria', 'vanessa',
  'madison', 'morgan', 'taylor', 'jordan', 'alexis', 'destiny', 'jasmine',
  'diamond', 'crystal', 'tiffany', 'brittany', 'courtney', 'lindsey', 'haley',
  'kayla', 'kendra', 'cassie', 'cassidy', 'carmen', 'carmen', 'veronica',
  'valentina', 'camila', 'daniela', 'gabriela', 'alejandra', 'adriana',
  'natasha', 'sasha', 'megan', 'paige', 'brooke', 'claire', 'faith', 'hope',
  'summer', 'autumn', 'winter', 'spring', 'sky', 'skye', 'jade', 'ruby',
  'scarlett', 'violet', 'ivy', 'luna', 'stella', 'aurora', 'willow', 'hazel',
  'savannah', 'brooklyn', 'london', 'paris', 'milan', 'vienna', 'sienna',
  'sierra', 'savanna', 'brianna', 'briana', 'ariana', 'diana', 'elena',
  'maria', 'maya', 'layla', 'leah', 'nora', 'ella', 'aria', 'isla', 'ellie',
  'lucy', 'lola', 'daisy', 'poppy', 'molly', 'evie', 'millie', 'freya',
  'phoebe', 'alice', 'lilly', 'florence', 'matilda', 'rosie', 'lacey',
  'imogen', 'sienna', 'elsie', 'harper', 'isla', 'quinn', 'riley', 'reese',

  // Model/Influencer terms (VIP only)
  'goddess', 'queen', 'princess', 'prince', 'king', 'angel', 'babe', 'baby',
  'hottie', 'beauty', 'model', 'supermodel', 'diva', 'barbie', 'dolly',
  'fitness', 'fitspo', 'fitgirl', 'fitbabe', 'yoga', 'yogagirl', 'yogababe',
  'coach', 'trainer', 'lifestyle', 'luxury', 'glamour', 'glam', 'gorgeous',
  'stunning', 'flawless', 'perfect', 'iconic', 'baddie', 'badgirl', 'hotgirl',
  'dreamgirl', 'covergirl', 'centerfold', 'playmate', 'vixen', 'temptress',
  'seductive', 'sultry', 'exotic', 'bombshell', 'knockout', 'showstopper',
  'heartbreaker', 'sweetheart', 'darling', 'honey', 'sugar', 'candy', 'sweet',
  'peach', 'cherry', 'strawberry', 'berry', 'cookie', 'cupcake', 'muffin',
  'bunny', 'kitten', 'kitty', 'cat', 'fox', 'foxy', 'vibe', 'vibes', 'mood',
  'slay', 'slayer', 'boss', 'bossbabe', 'ceo', 'hustle', 'grind', 'goals',
  'blessed', 'flawless', 'snatched', 'fierce', 'savage', 'extra', 'iconic',

  // Tech companies
  'apple', 'google', 'microsoft', 'amazon', 'meta', 'facebook', 'instagram',
  'twitter', 'x', 'tiktok', 'youtube', 'netflix', 'spotify', 'tesla',
  'nvidia', 'intel', 'amd', 'samsung', 'sony', 'lg', 'dell', 'hp',
  'oracle', 'adobe', 'salesforce', 'ibm', 'cisco', 'airbnb', 'uber',
  'lyft', 'paypal', 'stripe', 'shopify', 'square', 'snap', 'snapchat',
  'reddit', 'discord', 'twitch', 'linkedin', 'pinterest', 'tumblr',

  // Major brands
  'nike', 'adidas', 'puma', 'reebok', 'underarmour', 'vans', 'converse',
  'supreme', 'gucci', 'prada', 'chanel', 'dior', 'versace', 'burberry',
  'louisvuitton', 'hermes', 'rolex', 'omega', 'cartier', 'tiffany',
  'cocacola', 'pepsi', 'starbucks', 'mcdonalds', 'burgerking', 'subway',
  'kfc', 'tacobell', 'wendys', 'chipotle', 'dunkin', 'dominos', 'pizzahut',
  'walmart', 'target', 'costco', 'amazon', 'ebay', 'alibaba', 'bestbuy',
  'ikea', 'homedepot', 'lowes', 'walgreens', 'cvs', 'kroger', 'safeway',

  // Entertainment & Media
  'disney', 'marvel', 'starwars', 'pixar', 'dreamworks', 'warnerbros',
  'universal', 'paramount', 'hbo', 'espn', 'cnn', 'bbc', 'nbc', 'abc',
  'cbs', 'fox', 'mtv', 'vh1', 'bet', 'comedy', 'cartoon', 'nickelodeon',
  'hulu', 'primevideo', 'appletv', 'disneyplus', 'hbomax', 'peacock',

  // Music & Artists (Top 100)
  'beyonce', 'rihanna', 'drake', 'taylorswift', 'arianagrande', 'justinbieber',
  'selenagomez', 'billieeilish', 'edsheeran', 'adele', 'kanye', 'kanyewest',
  'jayz', 'eminem', 'snoopdogg', 'drdre', 'kendricklamar', 'jcole',
  'postmalone', 'theweeknd', 'brunomars', 'badbunny', 'shakira', 'jlo',
  'ladygaga', 'katyperry', 'miley', 'mileycyrus', 'dualipa', 'lizzo',
  'cardib', 'nickiminaj', 'megantheestallion', 'dojacat', 'sza', 'oliviarodrigo',
  'coldplay', 'imaginedragons', 'maroon5', 'onerepublic', 'chainsmokers',
  'davidguetta', 'calvinharris', 'marshmello', 'skrillex', 'deadmau5',
  'tiesto', 'avicii', 'zedd', 'diplo', 'majorlazer', 'flumestool',

  // Influencers & Creators (Top 100)
  'mrbeast', 'pewdiepie', 'markiplier', 'jacksepticeye', 'logan', 'loganpaul',
  'jakepaul', 'emmachamberlain', 'jamescharles', 'jeffreestar', 'daviddobrik',
  'lisaandlena', 'charlidamelio', 'dixiedamelio', 'addisonrae', 'zachking',
  'lilhuddy', 'brentrivera', 'lexi', 'lexihensler', 'sofiawylie', 'babyariel',
  'lorengray', 'jacobsartorius', 'camerondallas', 'nashgrier', 'hayesgrier',
  'shawnmendes', 'madisonbeer', 'sabrinacarpenter', 'annieleblanc', 'jaydencroes',
  'gilmhercroes', 'thesaurus', 'faze', 'optic', 'tsm', 'cloud9', 'g2',
  'navi', 'liquid', 'complexity', 'evil', 'evilgeniuses', 'envyus',

  // Sports & Athletes
  'nfl', 'nba', 'mlb', 'nhl', 'mls', 'fifa', 'uefa', 'ioc', 'olympics',
  'lebron', 'lebronjames', 'stephcurry', 'kevindurant', 'giannis', 'luka',
  'tombrady', 'mahomes', 'patmahomes', 'aaronrodgers', 'lamarjackson',
  'messi', 'ronaldo', 'cristianoronaldo', 'neymar', 'mbappe', 'haaland',
  'lewandowski', 'salah', 'debruyne', 'benzema', 'modric', 'kane',
  'serena', 'serenawilliams', 'rogerfederer', 'nadal', 'djokovic', 'osaka',
  'usain', 'usainbolt', 'simone', 'simonebiles', 'michaelphelps', 'tigerwoods',

  // Actors & Celebrities
  'therock', 'dwaynejohnson', 'vindiesel', 'tomcruise', 'willsmith', 'chrispratt',
  'chrishemsworth', 'chrisevanscaptainamerica', 'robertdowneyjr', 'scarlettjohansson',
  'zendaya', 'tomholland', 'timothee', 'timotheechalamet', 'florence', 'florencepugh',
  'margotrobbie', 'emmawatson', 'emmastone', 'jenniferlawrence', 'angelinajolie',
  'leonardodicaprio', 'bradpitt', 'georgeclooney', 'denzelwashington', 'morganfreeman',
  'samuelljackson', 'kevinhart', 'therock', 'johnnydepp', 'keanu', 'keanureeves',

  // Politicians & Public Figures (avoid impersonation)
  'biden', 'trump', 'obama', 'clinton', 'bush', 'elon', 'elonmusk', 'jeffbezos',
  'billgates', 'warrenbuffett', 'markzuckerberg', 'timcook', 'satyanadella',
  'sundarpichai', 'jackdorsey', 'jackma', 'kimkardashian', 'kyliejenner',
  'oprah', 'oprahwinfrey', 'ellendegeneres', 'jimmyfallon', 'stephenc colbert',
  'jimmykimmel', 'trevornoah', 'johnoliver', 'sethmeyers', 'conanobrein',

  // Common first names that should be available (remove from reserved)
  // 'john', 'james', 'michael', 'william', 'david', 'richard', 'joseph', 'thomas',
  // 'mary', 'patricia', 'jennifer', 'linda', 'elizabeth', 'barbara', 'susan', 'jessica',

  // Geographic (major cities/countries that brands might want)
  'newyork', 'losangeles', 'chicago', 'houston', 'miami', 'seattle', 'boston',
  'atlanta', 'sanfrancisco', 'lasvegas', 'orlando', 'austin', 'dallas',
  'london', 'paris', 'tokyo', 'berlin', 'madrid', 'rome', 'amsterdam',
  'dubai', 'singapore', 'hongkong', 'sydney', 'toronto', 'vancouver',
  'usa', 'uk', 'canada', 'australia', 'germany', 'france', 'japan', 'china',

  // Gaming & Esports
  'playstation', 'xbox', 'nintendo', 'steam', 'epicgames', 'riotgames',
  'blizzard', 'activision', 'ea', 'ubisoft', 'rockstar', 'valve', 'bethesda',
  'minecraft', 'fortnite', 'roblox', 'callofduty', 'warzone', 'apex', 'valorant',
  'leagueoflegends', 'dota', 'csgo', 'overwatch', 'gta', 'fifa', 'madden',
  'nba2k', 'destiny', 'halo', 'pokemon', 'zelda', 'mario', 'sonic',
  'ninja', 'tfue', 'shroud', 'pokimane', 'valkyrae', 'sykkuno', 'corpse',
  'dreamwastaken', 'georgenotfound', 'sapnap', 'technoblade', 'wilbursoot',

  // Automotive
  'tesla', 'ford', 'chevy', 'chevrolet', 'dodge', 'toyota', 'honda', 'nissan',
  'bmw', 'mercedes', 'audi', 'porsche', 'ferrari', 'lamborghini', 'mclaren',
  'bugatti', 'rollsroyce', 'bentley', 'astonmartin', 'maserati', 'lexus',

  // Fashion & Beauty
  'sephora', 'ulta', 'maccosmetics', 'maybelline', 'loreal', 'revlon', 'estee',
  'clinique', 'lancome', 'benefit', 'urbandecay', 'nyx', 'fenty', 'fentybeauty',
  'rarebeauty', 'kylie', 'kyliecosmetics', 'kkw', 'kkwbeauty', 'huda', 'hudabeauty',

  // Vulgar/Offensive (prevent abuse)
  'fuck', 'shit', 'ass', 'bitch', 'damn', 'hell', 'crap', 'dick', 'pussy', 'cock',
  'nazi', 'hitler', 'racist', 'terrorism', 'suicide', 'rape', 'murder', 'kill',

  // Variations of platform name
  'digis', 'digiscc', 'digisapp', 'digisofficial', 'thedigis', 'mydigis',
]);

/**
 * Check if a username is reserved (premium/VIP only)
 * - All 4-letter or shorter usernames are reserved
 * - Specific brand/celebrity names are reserved
 */
export function isReservedUsername(username: string): boolean {
  const lower = username.toLowerCase();

  // All 4-letter or shorter usernames are reserved for VIP creators
  if (lower.length <= 4) {
    return true;
  }

  // Check specific reserved names
  return RESERVED_USERNAMES.has(lower);
}

/**
 * Check if username is reserved (for admin display purposes)
 * Returns the reason why it's reserved
 */
export function getReservedReason(username: string): string | null {
  const lower = username.toLowerCase();

  if (lower.length <= 4) {
    return `Premium ${lower.length}-letter username (VIP only)`;
  }

  if (RESERVED_USERNAMES.has(lower)) {
    return 'Reserved username (VIP only)';
  }

  return null;
}

/**
 * Validate username format
 * - 3-20 characters
 * - Alphanumeric + underscore only
 * - Must start with letter
 * - No consecutive underscores
 */
export function validateUsernameFormat(username: string): { valid: boolean; error?: string } {
  if (!username || username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }

  if (!/^[a-zA-Z]/.test(username)) {
    return { valid: false, error: 'Username must start with a letter' };
  }

  if (!/^[a-zA-Z0-9_]+$/.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  if (/__/.test(username)) {
    return { valid: false, error: 'Username cannot have consecutive underscores' };
  }

  if (username.endsWith('_')) {
    return { valid: false, error: 'Username cannot end with an underscore' };
  }

  return { valid: true };
}
