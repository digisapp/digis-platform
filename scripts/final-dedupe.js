const fs = require('fs');

const INPUT = '/Users/examodels/Desktop/digis-app/creator-data/creators_for_onboarding_deduped.csv';
const OUTPUT = '/Users/examodels/Desktop/digis-app/creator-data/creators_for_onboarding_final.csv';

// Parse CSV row
function parseRow(row) {
  const parts = [];
  let current = '';
  let inQuotes = false;
  for (const char of row) {
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      parts.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  parts.push(current.trim());
  return parts;
}

// Read file
const content = fs.readFileSync(INPUT, 'utf8');
const lines = content.split('\n');
const rows = lines.slice(1).filter(l => l.trim());

console.log('=== INITIAL ANALYSIS ===');
console.log('Total rows:', rows.length);

// Parse all records
const records = rows.map((row, idx) => {
  const [instagram, email, displayName] = parseRow(row);
  return {
    instagram: (instagram || '').toLowerCase().trim(),
    email: (email || '').toLowerCase().trim(),
    displayName: (displayName || '').trim(),
    row: idx + 2
  };
});

// Check for duplicates
const byInstagram = {};
const byEmail = {};

records.forEach(r => {
  if (r.instagram) {
    if (!byInstagram[r.instagram]) byInstagram[r.instagram] = [];
    byInstagram[r.instagram].push(r);
  }
  if (r.email) {
    if (!byEmail[r.email]) byEmail[r.email] = [];
    byEmail[r.email].push(r);
  }
});

const dupeInstagrams = Object.entries(byInstagram).filter(([k, v]) => v.length > 1);
const dupeEmails = Object.entries(byEmail).filter(([k, v]) => v.length > 1);

console.log('\nDuplicate instagrams:', dupeInstagrams.length);
console.log('Duplicate emails:', dupeEmails.length);

if (dupeInstagrams.length > 0) {
  console.log('\nSample duplicate instagrams (first 5):');
  dupeInstagrams.slice(0, 5).forEach(([ig, entries]) => {
    console.log(`  @${ig}: ${entries.length} entries`);
    entries.forEach(e => console.log(`    - ${e.email} | ${e.displayName}`));
  });
}

if (dupeEmails.length > 0) {
  console.log('\nSample duplicate emails (first 5):');
  dupeEmails.slice(0, 5).forEach(([email, entries]) => {
    console.log(`  ${email}: ${entries.length} entries`);
    entries.forEach(e => console.log(`    - @${e.instagram} | ${e.displayName}`));
  });
}

// Deduplicate: priority is instagram (must be unique for onboarding)
// For same instagram, keep the one with most data
// For same email with different instagram, keep both (different people can share email rarely, but instagram must be unique)

const seenInstagrams = new Set();
const seenEmails = new Set();
const deduped = [];

// Score record
function score(r) {
  let s = 0;
  if (r.instagram) s += 10;
  if (r.email) s += 5;
  if (r.displayName) s += 2;
  return s;
}

// Sort by score descending so best records come first
records.sort((a, b) => score(b) - score(a));

records.forEach(r => {
  // Skip if no instagram (required)
  if (!r.instagram) return;

  // Skip if instagram already seen
  if (seenInstagrams.has(r.instagram)) return;

  // Skip if email already seen (same person, different IG - likely error)
  if (r.email && seenEmails.has(r.email)) return;

  seenInstagrams.add(r.instagram);
  if (r.email) seenEmails.add(r.email);
  deduped.push(r);
});

// Sort alphabetically by name
deduped.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

console.log('\n=== DEDUPLICATION RESULTS ===');
console.log('Records removed:', records.length - deduped.length);
console.log('Final unique records:', deduped.length);

// Verify no duplicates
const finalIG = new Set();
const finalEmail = new Set();
let igDupes = 0, emailDupes = 0;

deduped.forEach(r => {
  if (finalIG.has(r.instagram)) igDupes++;
  finalIG.add(r.instagram);
  if (r.email && finalEmail.has(r.email)) emailDupes++;
  if (r.email) finalEmail.add(r.email);
});

console.log('\nVerification:');
console.log('  Remaining instagram dupes:', igDupes);
console.log('  Remaining email dupes:', emailDupes);

// Stats
const withAll3 = deduped.filter(r => r.instagram && r.email && r.displayName).length;
const withIGEmail = deduped.filter(r => r.instagram && r.email && !r.displayName).length;
const withIGName = deduped.filter(r => r.instagram && !r.email && r.displayName).length;
const withIGOnly = deduped.filter(r => r.instagram && !r.email && !r.displayName).length;

console.log('\nField coverage:');
console.log('  All 3 fields:', withAll3);
console.log('  IG + email only:', withIGEmail);
console.log('  IG + name only:', withIGName);
console.log('  IG only:', withIGOnly);

// Write output
const escapeCSV = (val) => '"' + (val || '').replace(/"/g, '""') + '"';
const outputRows = deduped.map(r =>
  [escapeCSV(r.instagram), escapeCSV(r.email), escapeCSV(r.displayName)].join(',')
);

fs.writeFileSync(OUTPUT, 'instagram_handle,email,display_name\n' + outputRows.join('\n'));
console.log('\nSaved to:', OUTPUT);
