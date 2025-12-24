const fs = require('fs');
const INPUT = '/Users/examodels/Desktop/digis-app/creator-data/creators_3k_plus.csv';
const OUTPUT = '/Users/examodels/Desktop/digis-app/creator-data/creators_3k_plus.csv';

// Parse CSV row
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

// Validate US phone number
function isValidUSPhone(phone) {
  if (!phone || phone === '#ERROR!' || phone === '') return false;

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');

  // Valid: 10 digits OR 11 digits starting with 1
  if (digits.length === 10) return true;
  if (digits.length === 11 && digits.startsWith('1')) return true;

  return false;
}

// Read file
const content = fs.readFileSync(INPUT, 'utf8');
const lines = content.split('\n').filter(l => l.trim());
const header = lines[0];
const dataRows = lines.slice(1);

console.log('Original rows:', dataRows.length);

// Filter valid phone numbers
const validRows = dataRows.filter(row => {
  const [name, email, phone] = parseCSVRow(row);
  return isValidUSPhone(phone);
});

console.log('Valid US phone rows:', validRows.length);
console.log('Removed:', dataRows.length - validRows.length);

// Write output
const output = [header, ...validRows].join('\n');
fs.writeFileSync(OUTPUT, output);
console.log('Saved to:', OUTPUT);

// Show sample
console.log('\nSample of kept rows:');
validRows.slice(0, 5).forEach(row => {
  const [name, email, phone] = parseCSVRow(row);
  console.log(`  ${name} - ${phone}`);
});
