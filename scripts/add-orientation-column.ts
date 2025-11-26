import postgres from 'postgres';

const DATABASE_URL = process.env.DATABASE_URL || '';

async function addOrientationColumn() {
  const sql = postgres(DATABASE_URL);

  try {
    console.log('Adding orientation column to streams table...');

    await sql`
      ALTER TABLE streams
      ADD COLUMN IF NOT EXISTS orientation TEXT DEFAULT 'landscape' NOT NULL
    `;

    console.log('Successfully added orientation column!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await sql.end();
  }
}

addOrientationColumn();
