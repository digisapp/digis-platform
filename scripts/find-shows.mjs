import postgres from 'postgres';

const client = postgres(process.env.DATABASE_URL);

async function endStaleShow() {
  const showId = '47606e9f-3954-4323-9616-2fe10d8a414c';

  // Update the show status to ended
  const result = await client`
    UPDATE shows
    SET status = 'ended'
    WHERE id = ${showId}
    RETURNING id, title, status
  `;

  console.log('Updated show:', result);
  await client.end();
}

endStaleShow().catch(console.error);
