import { db } from '../src/lib/data/system';
import { users } from '../src/lib/data/system';
import { eq } from 'drizzle-orm';

async function checkUser() {
  const username = 'miriam';

  const user = await db.query.users.findFirst({
    where: eq(users.username, username),
  });

  if (user) {
    console.log('User found:');
    console.log('ID:', user.id);
    console.log('Username:', user.username);
    console.log('Email:', user.email);
    console.log('Role:', user.role);
    console.log('Avatar URL:', user.avatarUrl);
    console.log('Banner URL:', user.bannerUrl);
    console.log('Creator Card URL:', user.creatorCardImageUrl);
  } else {
    console.log('User not found:', username);
  }
}

checkUser()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
