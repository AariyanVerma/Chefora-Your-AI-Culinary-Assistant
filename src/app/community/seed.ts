
import { sql } from '@/lib/db';

export async function seedCommunityData() {
  try {
    console.log('Starting community seed...');

    const users = await sql<{ id: string; name: string; email: string }>`
      SELECT id, name, email FROM users LIMIT 5
    `;

    if (users.rows.length === 0) {
      console.log('No users found. Please create users first.');
      return;
    }

    const userIds = users.rows.map(u => u.id);

    for (const user of users.rows) {
      const username = user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
      
      const existing = await sql<{ id: string }>`
        SELECT id FROM community_profiles WHERE user_id = ${user.id}
      `;

      if (existing.rows.length === 0) {
        await sql`
          INSERT INTO community_profiles (user_id, username, display_name, bio)
          VALUES (
            ${user.id},
            ${username},
            ${user.name},
            ${`Food enthusiast and home chef. Love sharing recipes!`}
          )
          ON CONFLICT (user_id) DO NOTHING
        `;
        console.log(`Created profile for ${user.name}`);
      }
    }

    const profiles = await sql<{ id: string; user_id: string; username: string }>`
      SELECT id, user_id, username FROM community_profiles
    `;

    if (profiles.rows.length === 0) {
      console.log('No profiles found. Cannot create posts.');
      return;
    }

    const sampleRecipes = [
      {
        title: 'Creamy Garlic Pasta',
        caption: 'A simple yet delicious pasta dish perfect for weeknight dinners!',
        ingredients: ['400g pasta', '4 cloves garlic', '200ml cream', 'Parmesan cheese', 'Fresh parsley'],
        instructions: [
          'Cook pasta according to package directions',
          'Heat olive oil in a pan and sauté minced garlic',
          'Add cream and bring to a simmer',
          'Toss with cooked pasta and grated parmesan',
          'Garnish with fresh parsley and serve'
        ],
        servings: 4,
        prep_time: 10,
        cook_time: 15,
        difficulty: 'easy',
        cuisine: 'Italian',
        diet_tags: ['vegetarian'],
        tags: ['pasta', 'quick', 'dinner']
      },
      {
        title: 'Chocolate Chip Cookies',
        caption: 'The perfect chewy chocolate chip cookies!',
        ingredients: ['2 cups flour', '1 cup butter', '3/4 cup brown sugar', '2 eggs', '2 cups chocolate chips'],
        instructions: [
          'Preheat oven to 375°F',
          'Cream butter and sugars together',
          'Add eggs and vanilla, mix well',
          'Gradually add flour and mix',
          'Fold in chocolate chips',
          'Bake for 9-11 minutes'
        ],
        servings: 24,
        prep_time: 15,
        cook_time: 11,
        difficulty: 'easy',
        cuisine: 'American',
        diet_tags: [],
        tags: ['dessert', 'baking', 'cookies']
      },
      {
        title: 'Beef Stir Fry',
        caption: 'Quick and flavorful Asian-inspired stir fry',
        ingredients: ['500g beef strips', '2 bell peppers', '1 onion', 'Soy sauce', 'Ginger', 'Garlic'],
        instructions: [
          'Marinate beef in soy sauce and ginger',
          'Heat wok with oil',
          'Stir fry beef until browned',
          'Add vegetables and cook until tender',
          'Serve over rice'
        ],
        servings: 4,
        prep_time: 15,
        cook_time: 10,
        difficulty: 'medium',
        cuisine: 'Asian',
        diet_tags: [],
        tags: ['beef', 'stir-fry', 'quick']
      }
    ];

    for (let i = 0; i < sampleRecipes.length; i++) {
      const recipe = sampleRecipes[i];
      const authorProfile = profiles.rows[i % profiles.rows.length];

      const post = await sql<{ id: string }>`
        INSERT INTO community_posts (author_id, title, caption, visibility)
        VALUES (${authorProfile.user_id}, ${recipe.title}, ${recipe.caption}, 'public')
        RETURNING id
      `;

      const postId = post.rows[0].id;

      const placeholderImage = `data:image/svg+xml;base64,${Buffer.from(
        `<svg width="600" height="400" xmlns="http://www.w3.org/2000/svg">
          <rect width="600" height="400" fill="#1e293b"/>
          <text x="300" y="200" font-family="Arial" font-size="24" fill="#67e8f9" text-anchor="middle">${recipe.title}</text>
        </svg>`
      ).toString('base64')}`;

      await sql`
        INSERT INTO community_post_media (post_id, media_url, order_index)
        VALUES (${postId}, ${placeholderImage}, 0)
      `;

      await sql`
        INSERT INTO community_recipes (
          post_id, ingredients, instructions, servings,
          prep_time_minutes, cook_time_minutes, total_time_minutes,
          difficulty, cuisine, diet_tags, tags
        )
        VALUES (
          ${postId},
          ${JSON.stringify(recipe.ingredients)}::jsonb,
          ${JSON.stringify(recipe.instructions)}::jsonb,
          ${recipe.servings},
          ${recipe.prep_time},
          ${recipe.cook_time},
          ${recipe.prep_time + recipe.cook_time},
          ${recipe.difficulty},
          ${recipe.cuisine},
          ${recipe.diet_tags},
          ${recipe.tags}
        )
      `;

      console.log(`Created post: ${recipe.title}`);
    }

    if (profiles.rows.length > 1) {
      for (let i = 0; i < Math.min(3, profiles.rows.length - 1); i++) {
        await sql`
          INSERT INTO community_follows (follower_id, following_id)
          VALUES (${profiles.rows[i].user_id}, ${profiles.rows[i + 1].user_id})
          ON CONFLICT (follower_id, following_id) DO NOTHING
        `;
      }
      console.log('Created follow relationships');
    }

    console.log('Community seed completed!');
  } catch (error) {
    console.error('Error seeding community data:', error);
    throw error;
  }
}

if (require.main === module) {
  seedCommunityData()
    .then(() => {
      console.log('Seed completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seed failed:', error);
      process.exit(1);
    });
}
