const { neon } = require('@neondatabase/serverless');

async function run() {
  const sql = neon('postgresql://neondb_owner:npg_HRLp6F7oICcn@ep-rough-glade-ailx0054-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require');
  const familyId = '781b14ee-d451-417e-9246-c6c811695ae2';

  // Check current state
  const children = await sql`SELECT id, name, avatar FROM cq_children WHERE family_id = ${familyId}`;
  console.log('Children before:', children);

  const quests = await sql`SELECT id, title, icon FROM cq_quests WHERE family_id = ${familyId}`;
  console.log('Quests before:', quests);

  // Fix Ethan's avatar
  await sql`UPDATE cq_children SET avatar = ${'🦁'} WHERE family_id = ${familyId} AND name = 'Ethan'`;
  // Fix Mia's avatar
  await sql`UPDATE cq_children SET avatar = ${'🦊'} WHERE family_id = ${familyId} AND name = 'Mia'`;

  // Fix quest icons
  const iconMap = {
    'Make Your Bed': '🛏️',
    'Brush Teeth': '🪥',
    'Tidy Bedroom': '🧹',
    'Help With Dishes': '🍽️',
    'Read for 20 Minutes': '📚',
    'Hoover the Lounge': '🧹',
    'Walk the Dog': '🐕',
    'Homework Done': '✏️',
  };

  for (const [title, icon] of Object.entries(iconMap)) {
    await sql`UPDATE cq_quests SET icon = ${icon} WHERE family_id = ${familyId} AND title = ${title}`;
    console.log(`Fixed icon for: ${title}`);
  }

  // Verify
  const after = await sql`SELECT id, name, avatar FROM cq_children WHERE family_id = ${familyId}`;
  console.log('Children after:', after);
}

run().catch(console.error);
