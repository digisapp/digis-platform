const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const FOLDER = '/Users/examodels/Desktop/digis-app/creator-data';
const OUTPUT = '/Users/examodels/Desktop/digis-app/creator-data/creators_3k_plus.csv';

// Parse CSV row handling quotes
function parseCSVRow(row) {
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

// Parse follower count string to number (handles "3,446" or "3446" or "3.5k")
function parseFollowerCount(val) {
  if (!val) return 0;
  val = String(val).toLowerCase().trim();
  if (!val || val === 'n/a' || val === 'na' || val === '-') return 0;

  // Remove commas
  val = val.replace(/,/g, '');

  // Handle k/m suffix
  if (val.endsWith('k')) {
    return Math.floor(parseFloat(val) * 1000);
  }
  if (val.endsWith('m')) {
    return Math.floor(parseFloat(val) * 1000000);
  }

  const num = parseInt(val, 10);
  return isNaN(num) ? 0 : num;
}

// Find column index by possible names
function findColumn(headers, possibleNames) {
  const lowerHeaders = headers.map(h => (h || '').toLowerCase().trim());
  for (const name of possibleNames) {
    const idx = lowerHeaders.findIndex(h => h.includes(name.toLowerCase()));
    if (idx !== -1) return idx;
  }
  return -1;
}

// Process a single file
function processFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const results = [];

  try {
    let rows = [];

    if (ext === '.csv') {
      const content = fs.readFileSync(filePath, 'utf8');
      const lines = content.split('\n').filter(l => l.trim());
      rows = lines.map(line => parseCSVRow(line));
    } else if (ext === '.xlsx') {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      rows = data;
    } else {
      return results;
    }

    if (rows.length < 2) return results;

    const headers = rows[0].map(h => String(h || ''));

    // Find relevant columns
    const followerCol = findColumn(headers, ['instagram followers', 'instagram # followers', 'ig followers', 'followers']);
    const firstNameCol = findColumn(headers, ['first name', 'first_name', 'firstname', 'name']);
    const lastNameCol = findColumn(headers, ['last name', 'last_name', 'lastname']);
    const emailCol = findColumn(headers, ['email']);
    const phoneCol = findColumn(headers, ['phone', 'phone number', 'phone_number', 'cell', 'mobile']);

    if (followerCol === -1) {
      console.log(`  Skipping ${path.basename(filePath)} - no follower column found`);
      return results;
    }

    console.log(`  Processing ${path.basename(filePath)} - ${rows.length - 1} rows`);

    // Process data rows
    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const followers = parseFollowerCount(row[followerCol]);

      if (followers >= 3000) {
        const firstName = firstNameCol !== -1 ? String(row[firstNameCol] || '').trim() : '';
        const lastName = lastNameCol !== -1 ? String(row[lastNameCol] || '').trim() : '';
        const name = lastName ? `${firstName} ${lastName}`.trim() : firstName;
        const email = emailCol !== -1 ? String(row[emailCol] || '').toLowerCase().trim() : '';
        const phone = phoneCol !== -1 ? String(row[phoneCol] || '').trim() : '';

        if (name || email) {
          results.push({ name, email, phone, followers });
        }
      }
    }

    console.log(`    Found ${results.length} creators with 3000+ followers`);

  } catch (error) {
    console.error(`  Error processing ${path.basename(filePath)}:`, error.message);
  }

  return results;
}

// Main
console.log('=== Extracting creators with 3000+ Instagram followers ===\n');

const files = fs.readdirSync(FOLDER).filter(f =>
  f.endsWith('.csv') || f.endsWith('.xlsx')
);

console.log(`Found ${files.length} files to process\n`);

const allCreators = [];
const seenEmails = new Set();

for (const file of files) {
  // Skip output files we created
  if (file.includes('creators_3k') || file.includes('creators_cleaned') ||
      file.includes('creators_for_onboarding') || file.includes('creators_onboarding')) {
    continue;
  }

  const results = processFile(path.join(FOLDER, file));

  for (const creator of results) {
    // Dedupe by email
    const key = creator.email || `${creator.name}_${creator.phone}`;
    if (!seenEmails.has(key)) {
      seenEmails.add(key);
      allCreators.push(creator);
    }
  }
}

// Sort by follower count descending
allCreators.sort((a, b) => b.followers - a.followers);

console.log(`\n=== RESULTS ===`);
console.log(`Total unique creators with 3000+ followers: ${allCreators.length}`);

// Write output CSV
const escapeCSV = (val) => {
  val = String(val || '');
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return '"' + val.replace(/"/g, '""') + '"';
  }
  return val;
};

const csvLines = ['name,email,phone'];
for (const c of allCreators) {
  csvLines.push([escapeCSV(c.name), escapeCSV(c.email), escapeCSV(c.phone)].join(','));
}

fs.writeFileSync(OUTPUT, csvLines.join('\n'));
console.log(`\nSaved to: ${OUTPUT}`);

// Show sample
console.log('\nTop 10 by follower count:');
allCreators.slice(0, 10).forEach((c, i) => {
  console.log(`  ${i + 1}. ${c.name} - ${c.followers.toLocaleString()} followers`);
});
