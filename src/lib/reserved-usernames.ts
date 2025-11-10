/**
 * Reserved Usernames for Verified Creators Only
 *
 * This list prevents username squatting on high-value names.
 * Only verified creators can claim these usernames.
 *
 * Categories:
 * - Major brands and companies
 * - Popular creators and celebrities
 * - Common platform terms
 * - Geographic locations
 */

export const RESERVED_USERNAMES = new Set([
  // Platform reserved
  'admin', 'administrator', 'digis', 'support', 'help', 'api', 'www', 'mail',
  'staff', 'moderator', 'mod', 'team', 'official', 'verified', 'system',
  'root', 'superuser', 'webmaster', 'postmaster', 'hostmaster',

  // Common routes/features (avoid conflicts)
  'dashboard', 'settings', 'profile', 'messages', 'wallet', 'explore',
  'live', 'shows', 'creator', 'fan', 'browse', 'search', 'trending',
  'popular', 'new', 'featured', 'discover', 'feed', 'notifications',
  'account', 'login', 'signup', 'logout', 'register', 'auth',

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
 * Check if a username is reserved
 */
export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username.toLowerCase());
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
