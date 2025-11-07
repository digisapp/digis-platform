// Username validation utilities

export const validateUsername = (username: string): { valid: boolean; error?: string } => {
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }

  if (username.length < 3) {
    return { valid: false, error: 'Username must be at least 3 characters' };
  }

  if (username.length > 20) {
    return { valid: false, error: 'Username must be 20 characters or less' };
  }

  const usernameRegex = /^[a-zA-Z0-9_]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: 'Username can only contain letters, numbers, and underscores' };
  }

  // Check for reserved usernames
  const reserved = ['admin', 'api', 'support', 'help', 'about', 'terms', 'privacy', 'settings', 'explore', 'discover', 'trending'];
  if (reserved.includes(username.toLowerCase())) {
    return { valid: false, error: 'This username is reserved' };
  }

  return { valid: true };
};

export const suggestUsername = (baseUsername: string): string => {
  // Clean the base username
  const clean = baseUsername
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '')
    .substring(0, 15);

  return clean || 'user';
};

export const generateUsernameSuggestions = (baseUsername: string): string[] => {
  const clean = suggestUsername(baseUsername);
  
  return [
    clean,
    `${clean}1`,
    `${clean}_official`,
    `${clean}.creator`,
    `${clean}${Math.floor(Math.random() * 999)}`,
  ].filter((u, i, arr) => arr.indexOf(u) === i); // Remove duplicates
};
