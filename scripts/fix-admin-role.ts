import { db } from '../src/db';
import { users } from '../src/db/schema';
import { eq } from 'drizzle-orm';

async function fixAdminRole() {
  try {
    console.log('Checking admin users...');

    const adminEmails = ['admin@digis.cc', 'nathan@digis.cc'];

    for (const email of adminEmails) {
      // Check if user exists
      const user = await db.query.users.findFirst({
        where: eq(users.email, email),
      });

      if (user) {
        console.log(`\nFound user: ${email}`);
        console.log(`Current role: ${user.role}`);

        if (user.role !== 'admin') {
          console.log(`Updating ${email} to admin role...`);
          await db
            .update(users)
            .set({ role: 'admin' })
            .where(eq(users.email, email));
          console.log(`✅ Updated ${email} to admin!`);
        } else {
          console.log(`✅ ${email} is already admin`);
        }
      } else {
        console.log(`\n❌ User not found: ${email}`);
        console.log(`Please sign up with ${email} first, then run this script again.`);
      }
    }

    console.log('\n✅ Admin role check complete!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

fixAdminRole();
