const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const INPUT_DIR = '/Users/examodels/Desktop/digis-app/creator-data';
const OUTPUT_FILE = '/Users/examodels/Desktop/digis-app/creator-data/creators_cleaned.csv';

// Column name mappings (lowercase for matching)
const FIRST_NAME_COLS = ['first name', 'first_name', 'firstname', 'name', 'overall'];
const INSTAGRAM_COLS = ['instagram name', 'instagram_name', 'instagram', 'instagram url', 'instagram link', 'instagram name url', 'url'];
const EMAIL_COLS = ['email', 'e-mail'];

function normalizeHeader(header) {
  return String(header || '').toLowerCase().trim().replace(/[\u200B-\u200D\uFEFF]/g, '');
}

function findColumn(headers, possibleNames) {
  const normalizedHeaders = headers.map(normalizeHeader);
  for (const name of possibleNames) {
    const idx = normalizedHeaders.indexOf(name);
    if (idx !== -1) return idx;
  }
  return -1;
}

function extractInstagramHandle(value) {
  if (!value) return '';
  let v = String(value).trim();

  // Extract from URL
  const urlMatch = v.match(/instagram\.com\/([a-zA-Z0-9._]+)/i);
  if (urlMatch) return urlMatch[1].toLowerCase();

  // Remove @ if present
  v = v.replace(/^@/, '');

  // If it looks like a handle, return it
  if (/^[a-zA-Z0-9._]+$/.test(v)) return v.toLowerCase();

  return v.toLowerCase();
}

function normalizeEmail(value) {
  if (!value) return '';
  return String(value).trim().toLowerCase();
}

function normalizeName(value) {
  if (!value) return '';
  return String(value).trim()
    .split(' ')[0] // Take first word only (first name)
    .replace(/[^a-zA-Z'-]/g, '') // Remove non-letter chars
    .replace(/^./, c => c.toUpperCase()); // Capitalize first letter
}

function processFile(filePath) {
  const results = [];
  const fileName = path.basename(filePath);

  try {
    let data;

    if (filePath.endsWith('.xlsx') || filePath.endsWith('.xls')) {
      const wb = XLSX.readFile(filePath);
      const sheet = wb.Sheets[wb.SheetNames[0]];
      data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
    } else {
      // CSV
      const content = fs.readFileSync(filePath, 'utf8');
      data = content.split('\n').map(line => {
        // Handle CSV parsing with quotes
        const result = [];
        let current = '';
        let inQuotes = false;
        for (const char of line) {
          if (char === '"') {
            inQuotes = !inQuotes;
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
          } else {
            current += char;
          }
        }
        result.push(current.trim());
        return result;
      });
    }

    if (data.length === 0) return results;

    // Check if first row is headers or data
    const firstRow = data[0];
    let headers, startRow;

    // Heuristic: if first row contains common header words, treat as headers
    const firstRowStr = firstRow.map(normalizeHeader).join(' ');
    const hasHeaders = FIRST_NAME_COLS.some(h => firstRowStr.includes(h)) ||
                       INSTAGRAM_COLS.some(h => firstRowStr.includes(h)) ||
                       EMAIL_COLS.some(h => firstRowStr.includes(h)) ||
                       firstRowStr.includes('submission') ||
                       firstRowStr.includes('timestamp');

    if (hasHeaders) {
      headers = firstRow;
      startRow = 1;
    } else {
      // No headers - assume Name, Email format (like "Casting Call" files)
      headers = ['Name', 'Email'];
      startRow = 0;
    }

    // Find column indices
    const firstNameIdx = findColumn(headers, FIRST_NAME_COLS);
    const instagramIdx = findColumn(headers, INSTAGRAM_COLS);
    const emailIdx = findColumn(headers, EMAIL_COLS);

    // Also check for phone number to get email if it's nearby
    const phoneIdx = findColumn(headers, ['phone', 'phone number']);

    // Process rows
    for (let i = startRow; i < data.length; i++) {
      const row = data[i];
      if (!row || row.every(c => !c)) continue; // Skip empty rows

      let firstName = firstNameIdx >= 0 ? normalizeName(row[firstNameIdx]) : '';
      let instagram = instagramIdx >= 0 ? extractInstagramHandle(row[instagramIdx]) : '';
      let email = emailIdx >= 0 ? normalizeEmail(row[emailIdx]) : '';

      // Skip if no useful data
      if (!firstName && !instagram && !email) continue;

      // Skip if email is invalid
      if (email && !email.includes('@')) email = '';

      results.push({
        firstName,
        instagram,
        email,
        source: fileName
      });
    }

    console.log(`✓ ${fileName}: ${results.length} records`);
  } catch (err) {
    console.error(`✗ ${fileName}: ${err.message}`);
  }

  return results;
}

// Main
console.log('\n📂 Processing creator data files...\n');

const files = fs.readdirSync(INPUT_DIR)
  .filter(f => f.endsWith('.csv') || f.endsWith('.xlsx') || f.endsWith('.xls'))
  .filter(f => f !== 'creators_cleaned.csv'); // Skip output file

let allRecords = [];

for (const file of files) {
  const records = processFile(path.join(INPUT_DIR, file));
  allRecords = allRecords.concat(records);
}

console.log(`\n📊 Total raw records: ${allRecords.length}`);

// Deduplicate by email first, then by instagram
const seen = new Set();
const deduped = [];

for (const record of allRecords) {
  // Create unique key - prefer email, fallback to instagram
  let key = '';
  if (record.email) {
    key = `email:${record.email}`;
  } else if (record.instagram) {
    key = `ig:${record.instagram}`;
  } else {
    continue; // Skip records with no email or instagram
  }

  if (!seen.has(key)) {
    seen.add(key);
    deduped.push(record);
  }
}

console.log(`📊 After deduplication: ${deduped.length} unique records`);

// Filter to only records with at least email OR instagram
const final = deduped.filter(r => r.email || r.instagram);

console.log(`📊 Final records (with email or instagram): ${final.length}`);

// Sort by first name
final.sort((a, b) => a.firstName.localeCompare(b.firstName));

// Write output CSV
const header = 'first_name,instagram,email';
const rows = final.map(r =>
  `"${r.firstName.replace(/"/g, '""')}","${r.instagram.replace(/"/g, '""')}","${r.email.replace(/"/g, '""')}"`
);

fs.writeFileSync(OUTPUT_FILE, header + '\n' + rows.join('\n'));

console.log(`\n✅ Output saved to: ${OUTPUT_FILE}`);

// Stats
const withEmail = final.filter(r => r.email).length;
const withInstagram = final.filter(r => r.instagram).length;
const withBoth = final.filter(r => r.email && r.instagram).length;

console.log(`\n📈 Stats:`);
console.log(`   - With email: ${withEmail}`);
console.log(`   - With instagram: ${withInstagram}`);
console.log(`   - With both: ${withBoth}`);
console.log(`   - Email only: ${withEmail - withBoth}`);
console.log(`   - Instagram only: ${withInstagram - withBoth}`);
