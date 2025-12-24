const fs = require('fs');

// Read the cleaned data
const content = fs.readFileSync('/Users/examodels/Desktop/digis-app/creator-data/creators_cleaned.csv', 'utf8');
const lines = content.split('\n');
const rows = lines.slice(1).filter(l => l.trim());

// Reformat for onboarding (instagram_handle, email, display_name)
const newHeader = 'instagram_handle,email,display_name';
const newRows = rows.map(row => {
  // Parse CSV (handle quoted fields)
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (const char of row) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current);

  const [firstName, instagram, email] = parts;

  // Only include rows that have instagram (required for onboarding)
  if (!instagram) return null;

  // Format as CSV row
  const escapeCSV = (val) => '"' + (val || '').replace(/"/g, '""') + '"';

  return [escapeCSV(instagram), escapeCSV(email), escapeCSV(firstName)].join(',');
}).filter(Boolean);

const output = newHeader + '\n' + newRows.join('\n');
fs.writeFileSync('/Users/examodels/Desktop/digis-app/creator-data/creators_for_onboarding.csv', output);

console.log('Created: creators_for_onboarding.csv');
console.log('Total rows with instagram:', newRows.length);
