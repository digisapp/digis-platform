const fs = require('fs');

const INPUT = '/Users/examodels/Desktop/digis-app/creator-data/creators_for_onboarding.csv';
const OUTPUT = '/Users/examodels/Desktop/digis-app/creator-data/creators_for_onboarding_deduped.csv';

const content = fs.readFileSync(INPUT, 'utf8');
const lines = content.split('\n');
const header = lines[0];
const rows = lines.slice(1).filter(l => l.trim());

// Parse CSV row
function parseRow(row) {
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
  return parts;
}

// Score a record (higher = better)
function scoreRecord(rec) {
  let score = 0;
  if (rec.instagram) score += 1;
  if (rec.email) score += 2;
  if (rec.displayName) score += 1;
  return score;
}

// Group by instagram handle
const byInstagram = {};
rows.forEach((row, idx) => {
  const [instagram, email, displayName] = parseRow(row);
  if (!instagram) return;

  const key = instagram.toLowerCase().trim();
  if (!byInstagram[key]) {
    byInstagram[key] = [];
  }
  byInstagram[key].push({ instagram, email, displayName, originalRow: row });
});

// Find duplicates
const duplicates = Object.entries(byInstagram).filter(([k, v]) => v.length > 1);

console.log('=== ANALYSIS ===');
console.log('Total rows:', rows.length);
console.log('Unique instagram handles:', Object.keys(byInstagram).length);
console.log('Handles with duplicates:', duplicates.length);
console.log('Total duplicate rows:', duplicates.reduce((sum, [k, v]) => sum + v.length - 1, 0));
console.log('');

if (duplicates.length > 0) {
  console.log('Sample duplicates (first 5):');
  duplicates.slice(0, 5).forEach(([handle, entries]) => {
    console.log(`\n  @${handle} (${entries.length} entries):`);
    entries.forEach(e => {
      const score = scoreRecord(e);
      console.log(`    [score=${score}] email: ${e.email || '(none)'} | name: ${e.displayName || '(none)'}`);
    });
  });
}

// Deduplicate - keep the one with best score (most fields filled)
const deduped = [];
Object.entries(byInstagram).forEach(([handle, entries]) => {
  // Sort by score descending, pick the best one
  entries.sort((a, b) => scoreRecord(b) - scoreRecord(a));
  deduped.push(entries[0]);
});

// Sort by display name
deduped.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

// Write output
const escapeCSV = (val) => '"' + (val || '').replace(/"/g, '""') + '"';
const outputRows = deduped.map(r =>
  [escapeCSV(r.instagram), escapeCSV(r.email), escapeCSV(r.displayName)].join(',')
);

fs.writeFileSync(OUTPUT, header + '\n' + outputRows.join('\n'));

// Stats
const withAll3 = deduped.filter(r => r.instagram && r.email && r.displayName).length;
const withEmailAndIG = deduped.filter(r => r.instagram && r.email && !r.displayName).length;
const withNameAndIG = deduped.filter(r => r.instagram && !r.email && r.displayName).length;
const withIGOnly = deduped.filter(r => r.instagram && !r.email && !r.displayName).length;

console.log('\n=== DEDUPED RESULTS ===');
console.log('Total unique records:', deduped.length);
console.log('');
console.log('Field coverage:');
console.log('  With all 3 (ig + email + name):', withAll3);
console.log('  With ig + email only:', withEmailAndIG);
console.log('  With ig + name only:', withNameAndIG);
console.log('  With ig only:', withIGOnly);
console.log('');
console.log('Output saved to:', OUTPUT);
