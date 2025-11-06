import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function makeAdmin() {
  const email = 'admin@digis.cc';

  try {
    console.log(`Looking for user with email: ${email}`);

    // Check if user exists
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      console.error(`❌ User not found with email: ${email}`);
      console.log('\nMake sure this user has signed up first!');
      process.exit(1);
    }

    console.log(`Found user: ${user.username || user.email}`);
    console.log(`Current role: ${user.role}`);

    if (user.role === 'admin') {
      console.log('✅ User is already an admin!');
      process.exit(0);
    }

    // Update to admin
    await db
      .update(users)
      .set({ role: 'admin' })
      .where(eq(users.email, email));

    console.log('✅ Successfully updated user to admin role!');
    console.log(`\nYou can now access the admin dashboard at: /admin`);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }

  process.exit(0);
}

makeAdmin();
