const fs = require('fs');

const EXISTING = '/Users/examodels/Desktop/digis-app/creator-data/creators_for_onboarding_deduped.csv';
const NEW_FILE = '/Users/examodels/Desktop/digis-app/creator-data/models_export.csv';
const OUTPUT = '/Users/examodels/Desktop/digis-app/creator-data/creators_for_onboarding_deduped.csv';

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

// Normalize instagram handle
function normalizeIG(handle) {
  if (!handle) return '';
  return handle.toLowerCase().replace('@', '').replace(/^https?:\/\/(www\.)?instagram\.com\//i, '').replace(/\/$/, '').trim();
}

// Read existing deduped file
const existingContent = fs.readFileSync(EXISTING, 'utf8');
const existingLines = existingContent.split('\n');
const existingRows = existingLines.slice(1).filter(l => l.trim());

// Build set of existing instagram handles
const existingHandles = new Set();
const existingRecords = [];

existingRows.forEach(row => {
  const [instagram, email, displayName] = parseRow(row);
  const normalizedIG = normalizeIG(instagram);
  if (normalizedIG) {
    existingHandles.add(normalizedIG);
  }
  existingRecords.push({ instagram, email, displayName });
});

console.log('=== EXISTING FILE ===');
console.log('Existing records:', existingRecords.length);
console.log('Existing unique handles:', existingHandles.size);

// Read new models file
const newContent = fs.readFileSync(NEW_FILE, 'utf8');
const newLines = newContent.split('\n');
const newHeader = newLines[0].toLowerCase();
const newRows = newLines.slice(1).filter(l => l.trim());

console.log('\n=== NEW FILE (models_export) ===');
console.log('Header:', newHeader);
console.log('Total rows:', newRows.length);

// Parse header to find column indices
const headerParts = parseRow(newHeader);
const igIdx = headerParts.findIndex(h => h.includes('instagram') || h === 'ig');
const emailIdx = headerParts.findIndex(h => h.includes('email'));
const nameIdx = headerParts.findIndex(h => h.includes('name') || h.includes('first'));

console.log('Column indices - instagram:', igIdx, ', email:', emailIdx, ', name:', nameIdx);

// Process new rows
let skippedNoIG = 0;
let skippedNoEmail = 0;
let skippedNoName = 0;
let skippedDuplicate = 0;
let added = 0;

const newRecords = [];

newRows.forEach(row => {
  const parts = parseRow(row);
  const instagram = normalizeIG(parts[igIdx] || '');
  const email = (parts[emailIdx] || '').trim().toLowerCase();
  const name = (parts[nameIdx] || '').trim();

  // Must have all 3 fields
  if (!instagram) {
    skippedNoIG++;
    return;
  }
  if (!email || !email.includes('@')) {
    skippedNoEmail++;
    return;
  }
  if (!name) {
    skippedNoName++;
    return;
  }

  // Must not already exist
  if (existingHandles.has(instagram)) {
    skippedDuplicate++;
    return;
  }

  // Add to records and mark as seen
  existingHandles.add(instagram);
  newRecords.push({
    instagram,
    email,
    displayName: name.split(' ')[0].replace(/[^a-zA-Z'-]/g, '').replace(/^./, c => c.toUpperCase())
  });
  added++;
});

console.log('\n=== PROCESSING RESULTS ===');
console.log('Skipped - no instagram:', skippedNoIG);
console.log('Skipped - no email:', skippedNoEmail);
console.log('Skipped - no name:', skippedNoName);
console.log('Skipped - already exists:', skippedDuplicate);
console.log('New records to add:', added);

// Merge and sort
const allRecords = [...existingRecords, ...newRecords];
allRecords.sort((a, b) => (a.displayName || '').localeCompare(b.displayName || ''));

// Write output
const escapeCSV = (val) => '"' + (val || '').replace(/"/g, '""') + '"';
const outputRows = allRecords.map(r =>
  [escapeCSV(r.instagram), escapeCSV(r.email), escapeCSV(r.displayName)].join(',')
);

fs.writeFileSync(OUTPUT, 'instagram_handle,email,display_name\n' + outputRows.join('\n'));

console.log('\n=== FINAL OUTPUT ===');
console.log('Total records:', allRecords.length);
console.log('Saved to:', OUTPUT);
