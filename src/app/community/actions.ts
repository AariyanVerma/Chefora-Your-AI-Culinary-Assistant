'use server';

import { sql } from '@/lib/db';
import { getCurrentUser, type SessionUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const createPostSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  caption: z.string().max(2000).optional(),
  visibility: z.enum(['public', 'friends', 'private']).default('public'),
  media_urls: z.array(z.string()).min(1, 'At least one image is required'),
  ingredients: z.array(z.string()).optional(),
  instructions: z.array(z.string()).optional(),
  servings: z.number().int().positive().optional(),
  prep_time_minutes: z.number().int().nonnegative().optional(),
  cook_time_minutes: z.number().int().nonnegative().optional(),
  total_time_minutes: z.number().int().nonnegative().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard']).optional(),
  cuisine: z.string().max(100).optional(),
  diet_tags: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

const createCommentSchema = z.object({
  post_id: z.string().uuid(),
  content: z.string().min(1, 'Comment cannot be empty').max(1000),
  parent_comment_id: z.string().uuid().optional(),
});

const updateProfileSchema = z.object({
  username: z.string().min(3, 'Username must be at least 3 characters').max(30),
  display_name: z.string().min(1, 'Display name is required').max(100),
  bio: z.string().max(500).optional(),
  avatar_url: z.string().refine(
    (val) => !val || val.startsWith('http://') || val.startsWith('https://') || val.startsWith('data:image/'),
    { message: 'Avatar must be a valid URL or data URL' }
  ).optional().or(z.literal('')),
  cover_image_url: z.string().url().optional().or(z.literal('')),
  location: z.string().max(100).optional(),
  website: z.string().url().max(200).optional().or(z.literal('')),
});

export type CommunityPost = {
  id: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  title: string;
  caption: string | null;
  visibility: string;
  like_count: number;
  comment_count: number;
  repost_count: number;
  save_count: number;
  share_count: number;
  created_at: string;
  updated_at: string;
  media_urls: string[];
  recipe: {
    ingredients: string[];
    instructions: string[];
    servings: number | null;
    prep_time_minutes: number | null;
    cook_time_minutes: number | null;
    total_time_minutes: number | null;
    difficulty: string | null;
    cuisine: string | null;
    diet_tags: string[];
    tags: string[];
    categories?: string[];
  } | null;
  is_liked: boolean;
  is_saved: boolean;
  is_reposted: boolean;
  is_following_author: boolean;
};

export type CommunityComment = {
  id: string;
  post_id: string;
  author_id: string;
  author_username: string;
  author_display_name: string;
  author_avatar_url: string | null;
  content: string;
  parent_comment_id: string | null;
  like_count: number;
  created_at: string;
  updated_at: string;
  is_liked: boolean;
  replies: CommunityComment[];
};

export type CommunityProfile = {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  bio: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  location: string | null;
  website: string | null;
  verified: boolean;
  follower_count: number;
  following_count: number;
  post_count: number;
  created_at: string;
  is_following: boolean;
  is_friend: boolean;
  friend_request_status: 'none' | 'pending' | 'accepted' | 'sent';
  is_blocked: boolean;
};

async function getOrCreateProfile(userId: string) {
  const existing = await sql<{ id: string }>`
    SELECT id FROM community_profiles WHERE user_id = ${userId}
  `;

  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }

  const user = await sql<{ name: string; email: string }>`
    SELECT name, email FROM users WHERE id = ${userId}
  `;

  if (user.rows.length === 0) {
    throw new Error('User not found');
  }

  const username = user.rows[0].email.split('@')[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  const displayName = user.rows[0].name;

  let finalUsername = username;
  let counter = 1;
  while (true) {
    const check = await sql<{ id: string }>`
      SELECT id FROM community_profiles WHERE username = ${finalUsername}
    `;
    if (check.rows.length === 0) break;
    finalUsername = `${username}${counter}`;
    counter++;
  }

  const newProfile = await sql<{ id: string }>`
    INSERT INTO community_profiles (user_id, username, display_name)
    VALUES (${userId}, ${finalUsername}, ${displayName})
    RETURNING id
  `;

  return newProfile.rows[0].id;
}

export async function testServerAction() {
  try {
    console.log('[testServerAction] Called successfully');
    return { success: true, message: 'Server action is working' };
  } catch (error: any) {
    console.error('[testServerAction] Error:', error);
    throw new Error('Test server action failed');
  }
}

export async function createPost(data: any) {
  
  console.log('[createPost] ===== FUNCTION CALLED =====');
  
  try {
    
    if (!data) {
      console.error('[createPost] No data provided');
      throw new Error('No data provided');
    }
    
    console.log('[createPost] Data received - title:', data?.title);
    console.log('[createPost] Data received - media_urls length:', data?.media_urls?.length);
    
    try {
      const dataSize = JSON.stringify(data).length;
      console.log('[createPost] Data size:', dataSize, 'bytes');
      if (dataSize > 10 * 1024 * 1024) { 
        throw new Error('Data too large. Please reduce image size.');
      }
    } catch (sizeError: any) {
      console.error('[createPost] Error checking data size:', sizeError);
      
    }

    let user: SessionUser | null = null;
    try {
      console.log('[createPost] Attempting to get current user...');
      user = await getCurrentUser();
      console.log('[createPost] User authenticated:', user?.id || 'null');
    } catch (authError: unknown) {
      const errorMsg = authError instanceof Error ? authError.message : String(authError);
      console.error('[createPost] Auth error:', errorMsg);
      
    }
    
    if (!user) {
      console.error('[createPost] No user found - throwing error');
      throw new Error('You must be logged in to create a post');
    }

    let validated;
    try {
      console.log('[createPost] Validating input data...');
      validated = createPostSchema.parse(data);
      console.log('[createPost] Validation passed');
    } catch (validationError: any) {
      console.error('[createPost] Validation error:', validationError);
      if (validationError instanceof z.ZodError) {
        const firstError = validationError.issues[0];
        const errorMsg = firstError?.message || 'Validation failed';
        console.error('[createPost] Validation error message:', errorMsg);
        throw new Error(errorMsg);
      }
      throw new Error('Invalid input data');
    }

    let profileId;
    try {
      profileId = await getOrCreateProfile(user.id);
    } catch (profileError: any) {
      console.error('Profile error:', profileError);
      if (profileError?.message?.includes('does not exist') || profileError?.message?.includes('relation')) {
        throw new Error('Database tables not found. Please run the migration SQL from src/app/community/migration.sql');
      }
      throw new Error('Failed to get user profile. Please try again.');
    }

    let post;
    try {
      post = await sql<{ id: string }>`
        INSERT INTO community_posts (author_id, title, caption, visibility)
        VALUES (${user.id}, ${validated.title}, ${validated.caption || null}, ${validated.visibility})
        RETURNING id
      `;
    } catch (dbError: any) {
      console.error('Database error creating post:', dbError);
      if (dbError?.message?.includes('does not exist') || dbError?.message?.includes('relation')) {
        throw new Error('Database tables not found. Please run the migration SQL from src/app/community/migration.sql');
      }
      if (dbError?.message?.includes('connection') || dbError?.message?.includes('timeout')) {
        throw new Error('Database connection failed. Please check your database configuration.');
      }
      throw new Error('Failed to create post in database. Please try again.');
    }

    if (!post.rows || post.rows.length === 0) {
      throw new Error('Failed to create post: No ID returned');
    }

    const postId = post.rows[0].id;

    try {
      for (let i = 0; i < validated.media_urls.length; i++) {
        await sql`
          INSERT INTO community_post_media (post_id, media_url, order_index)
          VALUES (${postId}, ${validated.media_urls[i]}, ${i})
        `;
      }
    } catch (mediaError: any) {
      console.error('Error adding media:', mediaError);
      
    }

    if (validated.ingredients || validated.instructions) {
      try {
        await sql`
          INSERT INTO community_recipes (
            post_id, ingredients, instructions, servings,
            prep_time_minutes, cook_time_minutes, total_time_minutes,
            difficulty, cuisine, diet_tags, tags
          )
          VALUES (
            ${postId},
            ${JSON.stringify(validated.ingredients || [])}::jsonb,
            ${JSON.stringify(validated.instructions || [])}::jsonb,
            ${validated.servings || null},
            ${validated.prep_time_minutes || null},
            ${validated.cook_time_minutes || null},
            ${validated.total_time_minutes || null},
            ${validated.difficulty || null},
            ${validated.cuisine || null},
            ${validated.diet_tags || []},
            ${validated.tags || []}
          )
        `;
      } catch (recipeError: any) {
        console.error('Error adding recipe:', recipeError);
        
      }
    }

    try {
      await sql`
        UPDATE community_profiles SET post_count = post_count + 1 WHERE user_id = ${user.id}
      `;
    } catch (countError: any) {
      console.error('Error updating post count:', countError);
      
    }

    revalidatePath('/community');
    
    console.log('[createPost] Post created successfully:', postId);
    
    return { success: true, post_id: postId };
  } catch (error: unknown) {
    
    console.error('[createPost] ===== ERROR CAUGHT =====');
    console.error('[createPost] Error type:', typeof error);
    console.error('[createPost] Error:', error);
    
    let errorMessage = 'Failed to create post. Please try again.';
    
    try {
      if (error instanceof Error) {
        errorMessage = error.message || 'An error occurred';
      } else if (error && typeof error === 'object') {
        if ('message' in error) {
          errorMessage = String(error.message);
        } else if ('error' in error) {
          errorMessage = String(error.error);
        }
      } else if (typeof error === 'string') {
        errorMessage = error;
      }
    } catch (extractError) {
      
      console.error('[createPost] Could not extract error message:', extractError);
      errorMessage = 'An unexpected error occurred. Please try again.';
    }
    
    if (errorMessage.length > 200) {
      errorMessage = errorMessage.substring(0, 200) + '...';
    }
    
    console.error('[createPost] Final error message:', errorMessage);
    console.error('[createPost] ===== END ERROR =====');
    
    const serializableError = new Error(errorMessage);
    
    if (serializableError.stack) {
      serializableError.stack = undefined;
    }
    
    throw serializableError;
  }
}

export async function getPosts(params: {
  sort?: 'new' | 'trending' | 'following';
  filter_cuisine?: string;
  filter_diet?: string[];
  filter_difficulty?: string;
  filter_time?: string;
  filter_servings?: string;
  filter_tags?: string[];
  search?: string;
  page?: number;
  limit?: number;
}): Promise<CommunityPost[]> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const {
    sort = 'new',
    filter_cuisine,
    filter_diet,
    filter_difficulty,
    filter_time,
    filter_servings,
    filter_tags,
    search,
    page = 1,
    limit = 20,
  } = params;

  const offset = (page - 1) * limit;

  const searchPattern = search ? `%${search}%` : null;

  const userFriends = await sql<{ user_id: string }>`
    SELECT 
      CASE 
        WHEN user1_id = ${user.id} THEN user2_id
        ELSE user1_id
      END as user_id
    FROM community_friendships
    WHERE user1_id = ${user.id} OR user2_id = ${user.id}
  `;
  const friendIds = userFriends.rows.map(r => r.user_id);
  friendIds.push(user.id); 

  const allPosts = await sql`
    SELECT 
      p.*,
      prof.username as author_username,
      prof.display_name as author_display_name,
      prof.avatar_url as author_avatar_url,
      COALESCE(
        json_agg(pm.media_url ORDER BY pm.order_index) FILTER (WHERE pm.media_url IS NOT NULL),
        '[]'::json
      ) as media_urls,
      CASE WHEN EXISTS (SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = ${user.id}) THEN true ELSE false END as is_liked,
      CASE WHEN EXISTS (SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = ${user.id}) THEN true ELSE false END as is_saved,
      CASE WHEN EXISTS (SELECT 1 FROM community_reposts r WHERE r.original_post_id = p.id AND r.user_id = ${user.id}) THEN true ELSE false END as is_reposted,
      CASE WHEN EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id = ${user.id} AND f.following_id = p.author_id) THEN true ELSE false END as is_following_author,
      (SELECT COUNT(*)::integer FROM community_likes WHERE post_id = p.id) as actual_like_count,
      (SELECT COUNT(*)::integer FROM community_reposts WHERE original_post_id = p.id) as actual_repost_count,
      (SELECT COUNT(*)::integer FROM community_comments WHERE post_id = p.id) as actual_comment_count,
      (SELECT COUNT(*)::integer FROM community_bookmarks WHERE post_id = p.id) as actual_save_count,
      r.ingredients, r.instructions, r.servings, r.prep_time_minutes, r.cook_time_minutes,
      r.total_time_minutes, r.difficulty, r.cuisine, r.diet_tags, r.tags
    FROM community_posts p
    INNER JOIN community_profiles prof ON prof.user_id = p.author_id
    LEFT JOIN community_post_media pm ON pm.post_id = p.id
    LEFT JOIN community_recipes r ON r.post_id = p.id
    WHERE NOT EXISTS (SELECT 1 FROM community_blocks b WHERE (b.blocker_id = ${user.id} AND b.blocked_id = p.author_id) OR (b.blocked_id = ${user.id} AND b.blocker_id = p.author_id))
      AND (
        p.visibility = 'public'
        OR (p.visibility = 'friends' AND p.author_id = ANY(${friendIds}::uuid[]))
        OR (p.visibility = 'private' AND p.author_id = ${user.id})
      )
    GROUP BY p.id, prof.username, prof.display_name, prof.avatar_url, r.ingredients, r.instructions,
      r.servings, r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes, r.difficulty, r.cuisine, r.diet_tags, r.tags
    ORDER BY p.created_at DESC
    LIMIT ${limit * 3} OFFSET 0
  `;

  let filtered = allPosts.rows;

  if (sort === 'following') {
    const followingIds = await sql<{ following_id: string }>`
      SELECT following_id FROM community_follows WHERE follower_id = ${user.id}
    `;
    const followingSet = new Set(followingIds.rows.map(r => r.following_id));
    filtered = filtered.filter(p => followingSet.has(p.author_id));
  }

  if (filter_cuisine) {
    filtered = filtered.filter(p => p.cuisine === filter_cuisine);
  }

  if (filter_difficulty) {
    filtered = filtered.filter(p => p.difficulty === filter_difficulty);
  }

  if (filter_time) {
    filtered = filtered.filter(p => {
      const totalTime = p.total_time_minutes;
      if (!totalTime) return false;
      
      switch (filter_time) {
        case 'quick':
          return totalTime <= 15;
        case 'fast':
          return totalTime > 15 && totalTime <= 30;
        case 'moderate':
          return totalTime > 30 && totalTime <= 60;
        case 'long':
          return totalTime > 60;
        default:
          return true;
      }
    });
  }

  if (filter_servings) {
    filtered = filtered.filter(p => {
      const servings = p.servings;
      if (!servings) return false;
      
      switch (filter_servings) {
        case '1-2':
          return servings >= 1 && servings <= 2;
        case '3-4':
          return servings >= 3 && servings <= 4;
        case '5-6':
          return servings >= 5 && servings <= 6;
        case '7+':
          return servings >= 7;
        default:
          return true;
      }
    });
  }

  if (filter_diet && filter_diet.length > 0) {
    filtered = filtered.filter(p => {
      const dietTags = p.diet_tags || [];
      return filter_diet.some(d => dietTags.includes(d));
    });
  }

  if (filter_tags && filter_tags.length > 0) {
    filtered = filtered.filter(p => {
      const tags = p.tags || [];
      return filter_tags.some(t => tags.includes(t));
    });
  }

  if (searchPattern) {
    const searchLower = searchPattern.replace(/%/g, '').toLowerCase();
    filtered = filtered.filter(p => 
      p.title?.toLowerCase().includes(searchLower) || 
      p.caption?.toLowerCase().includes(searchLower)
    );
  }

  if (sort === 'trending') {
    filtered.sort((a, b) => {
      const likeA = a.actual_like_count ?? a.like_count ?? 0;
      const commentA = a.actual_comment_count ?? a.comment_count ?? 0;
      const repostA = a.actual_repost_count ?? a.repost_count ?? 0;
      const likeB = b.actual_like_count ?? b.like_count ?? 0;
      const commentB = b.actual_comment_count ?? b.comment_count ?? 0;
      const repostB = b.actual_repost_count ?? b.repost_count ?? 0;
      const scoreA = likeA * 2 + commentA + repostA;
      const scoreB = likeB * 2 + commentB + repostB;
      return scoreB - scoreA;
    });
  } else {
    filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  const paginated = filtered.slice(offset, offset + limit);

  const result = { rows: paginated };
  
  return result.rows.map((row: any) => ({
    id: row.id,
    author_id: row.author_id,
    author_username: row.author_username,
    author_display_name: row.author_display_name,
    author_avatar_url: row.author_avatar_url,
    title: row.title,
    caption: row.caption,
    visibility: row.visibility,
    like_count: row.actual_like_count ?? row.like_count ?? 0,
    comment_count: row.actual_comment_count ?? row.comment_count ?? 0,
    repost_count: row.actual_repost_count ?? row.repost_count ?? 0,
    save_count: row.actual_save_count ?? row.save_count ?? 0,
    share_count: row.actual_share_count ?? row.share_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    recipe: row.ingredients ? {
      ingredients: row.ingredients || [],
      instructions: row.instructions || [],
      servings: row.servings,
      prep_time_minutes: row.prep_time_minutes,
      cook_time_minutes: row.cook_time_minutes,
      total_time_minutes: row.total_time_minutes,
      difficulty: row.difficulty,
      cuisine: row.cuisine,
      diet_tags: row.diet_tags || [],
      tags: row.tags || [],
    } : null,
    is_liked: row.is_liked,
    is_saved: row.is_saved,
    is_reposted: row.is_reposted || false,
    is_following_author: row.is_following_author,
  }));
}

export async function getPostLikeCount(postId: string): Promise<{ like_count: number; is_liked: boolean } | null> {
  const user = await getCurrentUser();
  if (!user) return null;

  const result = await sql<{ like_count: number; is_liked: boolean }>`
    SELECT 
      COALESCE(like_count, 0) as like_count,
      EXISTS (SELECT 1 FROM community_likes WHERE user_id = ${user.id} AND post_id = ${postId}) as is_liked
    FROM community_posts 
    WHERE id = ${postId}
  `;

  if (result.rows.length === 0) return null;
  return {
    like_count: result.rows[0].like_count || 0,
    is_liked: result.rows[0].is_liked || false
  };
}

export async function getPost(postId: string): Promise<CommunityPost | null> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await sql`
    SELECT 
      p.*,
      prof.username as author_username,
      prof.display_name as author_display_name,
      prof.avatar_url as author_avatar_url,
      COALESCE(
        json_agg(pm.media_url ORDER BY pm.order_index) FILTER (WHERE pm.media_url IS NOT NULL),
        '[]'::json
      ) as media_urls,
      CASE WHEN EXISTS (SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = ${user.id}) THEN true ELSE false END as is_liked,
      CASE WHEN EXISTS (SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = ${user.id}) THEN true ELSE false END as is_saved,
      CASE WHEN EXISTS (SELECT 1 FROM community_reposts r WHERE r.original_post_id = p.id AND r.user_id = ${user.id}) THEN true ELSE false END as is_reposted,
      CASE WHEN EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id = ${user.id} AND f.following_id = p.author_id) THEN true ELSE false END as is_following_author,
      (SELECT COUNT(*)::integer FROM community_likes WHERE post_id = p.id) as actual_like_count,
      (SELECT COUNT(*)::integer FROM community_reposts WHERE original_post_id = p.id) as actual_repost_count,
      (SELECT COUNT(*)::integer FROM community_comments WHERE post_id = p.id) as actual_comment_count,
      (SELECT COUNT(*)::integer FROM community_bookmarks WHERE post_id = p.id) as actual_save_count,
      (SELECT COUNT(*)::integer FROM community_shares WHERE post_id = p.id) as actual_share_count,
      r.ingredients, r.instructions, r.servings, r.prep_time_minutes, r.cook_time_minutes,
      r.total_time_minutes, r.difficulty, r.cuisine, r.diet_tags, r.tags
    FROM community_posts p
    INNER JOIN community_profiles prof ON prof.user_id = p.author_id
    LEFT JOIN community_post_media pm ON pm.post_id = p.id
    LEFT JOIN community_recipes r ON r.post_id = p.id
    WHERE p.id = ${postId}
      AND NOT EXISTS (SELECT 1 FROM community_blocks b WHERE (b.blocker_id = ${user.id} AND b.blocked_id = p.author_id) OR (b.blocked_id = ${user.id} AND b.blocker_id = p.author_id))
    GROUP BY p.id, prof.username, prof.display_name, prof.avatar_url, r.ingredients, r.instructions,
      r.servings, r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes, r.difficulty, r.cuisine, r.diet_tags, r.tags
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  const likeCount = row.actual_like_count ?? row.like_count ?? 0;
  const repostCount = row.actual_repost_count ?? row.repost_count ?? 0;
  const commentCount = row.actual_comment_count ?? row.comment_count ?? 0;
  const saveCount = row.actual_save_count ?? row.save_count ?? 0;
  const shareCount = row.actual_share_count ?? row.share_count ?? 0;
  
  if (row.actual_like_count !== row.like_count || row.actual_repost_count !== row.repost_count || row.actual_share_count !== row.share_count) {
    sql`
      UPDATE community_posts 
      SET 
        like_count = ${row.actual_like_count ?? 0},
        repost_count = ${row.actual_repost_count ?? 0},
        comment_count = ${row.actual_comment_count ?? 0},
        save_count = ${row.actual_save_count ?? 0},
        share_count = ${row.actual_share_count ?? 0}
      WHERE id = ${postId}
    `.catch(err => console.error('Failed to sync counts:', err));
  }
  
  return {
    id: row.id,
    author_id: row.author_id,
    author_username: row.author_username,
    author_display_name: row.author_display_name,
    author_avatar_url: row.author_avatar_url,
    title: row.title,
    caption: row.caption,
    visibility: row.visibility,
    like_count: likeCount,
    comment_count: commentCount,
    repost_count: repostCount,
    save_count: saveCount,
    share_count: shareCount,
    created_at: row.created_at,
    updated_at: row.updated_at,
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    recipe: row.ingredients ? {
      ingredients: row.ingredients || [],
      instructions: row.instructions || [],
      servings: row.servings,
      prep_time_minutes: row.prep_time_minutes,
      cook_time_minutes: row.cook_time_minutes,
      total_time_minutes: row.total_time_minutes,
      difficulty: row.difficulty,
      cuisine: row.cuisine,
      diet_tags: row.diet_tags || [],
      tags: row.tags || [],
    } : null,
    is_liked: row.is_liked,
    is_saved: row.is_saved,
    is_reposted: row.is_reposted || false,
    is_following_author: row.is_following_author,
  };
}

export async function updatePost(
  postId: string,
  data: {
    title?: string;
    caption?: string;
    visibility?: 'public' | 'friends' | 'private';
    media_urls?: string[];
    ingredients?: string[];
    instructions?: string[];
    servings?: number;
    prep_time_minutes?: number;
    cook_time_minutes?: number;
    total_time_minutes?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    cuisine?: string;
    diet_tags?: string[];
    tags?: string[];
    categories?: string[];
  }
) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const post = await sql<{ author_id: string }>`
    SELECT author_id FROM community_posts WHERE id = ${postId}
  `;

  if (post.rows.length === 0) {
    throw new Error('Post not found');
  }

  if (post.rows[0].author_id !== user.id) {
    throw new Error('Unauthorized');
  }

  if (data.title || data.caption !== undefined || data.visibility) {
    await sql`
      UPDATE community_posts
      SET 
        title = COALESCE(${data.title || null}, title),
        caption = COALESCE(${data.caption !== undefined ? data.caption : null}, caption),
        visibility = COALESCE(${data.visibility || null}, visibility),
        updated_at = NOW()
      WHERE id = ${postId}
    `;
  }

  if (data.media_urls && data.media_urls.length > 0) {
    
    await sql`DELETE FROM community_post_media WHERE post_id = ${postId}`;
    
    for (let i = 0; i < data.media_urls.length; i++) {
      await sql`
        INSERT INTO community_post_media (post_id, media_url, order_index)
        VALUES (${postId}, ${data.media_urls[i]}, ${i})
      `;
    }
  }

  if (data.ingredients || data.instructions) {
    const existing = await sql<{ id: string }>`
      SELECT id FROM community_recipes WHERE post_id = ${postId}
    `;

    if (existing.rows.length > 0) {
      
      await sql`
        UPDATE community_recipes
        SET 
          ingredients = COALESCE(${data.ingredients ? JSON.stringify(data.ingredients) : null}::jsonb, ingredients),
          instructions = COALESCE(${data.instructions ? JSON.stringify(data.instructions) : null}::jsonb, instructions),
          servings = COALESCE(${data.servings || null}, servings),
          prep_time_minutes = COALESCE(${data.prep_time_minutes || null}, prep_time_minutes),
          cook_time_minutes = COALESCE(${data.cook_time_minutes || null}, cook_time_minutes),
          total_time_minutes = COALESCE(${data.total_time_minutes || null}, total_time_minutes),
          difficulty = COALESCE(${data.difficulty || null}, difficulty),
          cuisine = COALESCE(${data.cuisine || null}, cuisine),
          diet_tags = COALESCE(${data.diet_tags || null}, diet_tags),
          tags = COALESCE(${data.tags || null}, tags),
          updated_at = NOW()
        WHERE post_id = ${postId}
      `;
    } else {
      
      await sql`
        INSERT INTO community_recipes (
          post_id, ingredients, instructions, servings,
          prep_time_minutes, cook_time_minutes, total_time_minutes,
          difficulty, cuisine, diet_tags, tags
        )
        VALUES (
          ${postId},
          ${JSON.stringify(data.ingredients || [])}::jsonb,
          ${JSON.stringify(data.instructions || [])}::jsonb,
          ${data.servings || null},
          ${data.prep_time_minutes || null},
          ${data.cook_time_minutes || null},
          ${data.total_time_minutes || null},
          ${data.difficulty || null},
          ${data.cuisine || null},
          ${data.diet_tags || []},
          ${data.tags || []}
        )
      `;
    }
  }

  revalidatePath('/community');
  revalidatePath(`/community/p/${postId}`);
  return { success: true };
}

export async function deletePost(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const post = await sql<{ author_id: string }>`
    SELECT author_id FROM community_posts WHERE id = ${postId}
  `;

  if (post.rows.length === 0) {
    throw new Error('Post not found');
  }

  if (post.rows[0].author_id !== user.id) {
    throw new Error('Unauthorized');
  }

  await sql`DELETE FROM community_notifications WHERE post_id = ${postId}`;
  
  await sql`DELETE FROM community_likes WHERE post_id = ${postId}`;
  await sql`DELETE FROM community_likes WHERE comment_id IN (SELECT id FROM community_comments WHERE post_id = ${postId})`;
  await sql`DELETE FROM community_comments WHERE post_id = ${postId}`;
  await sql`DELETE FROM community_bookmarks WHERE post_id = ${postId}`;
  await sql`DELETE FROM community_reposts WHERE original_post_id = ${postId}`;
  await sql`DELETE FROM community_shares WHERE post_id = ${postId}`;
  await sql`DELETE FROM community_post_media WHERE post_id = ${postId}`;
  await sql`DELETE FROM community_recipes WHERE post_id = ${postId}`;
  
  await sql`DELETE FROM community_posts WHERE id = ${postId}`;

  revalidatePath('/community');
  revalidatePath(`/community/p/${postId}`);
  return { success: true };
}

export async function toggleLikePost(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const existing = await sql<{ id: string }>`
    SELECT id FROM community_likes WHERE user_id = ${user.id} AND post_id = ${postId}
  `;

  if (existing.rows.length > 0) {
    
    await sql`
      DELETE FROM community_likes WHERE user_id = ${user.id} AND post_id = ${postId}
    `;
  } else {
    
    await sql`
      INSERT INTO community_likes (user_id, post_id)
      VALUES (${user.id}, ${postId})
    `;

    const post = await sql<{ author_id: string }>`
      SELECT author_id FROM community_posts WHERE id = ${postId}
    `;
    if (post.rows.length > 0 && post.rows[0].author_id !== user.id) {
      await sql`
        INSERT INTO community_notifications (user_id, type, actor_id, post_id)
        VALUES (${post.rows[0].author_id}, 'like', ${user.id}, ${postId})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  const countResult = await sql<{ like_count: number; is_liked: boolean }>`
    SELECT 
      (SELECT COUNT(*)::integer FROM community_likes WHERE post_id = ${postId}) as like_count,
      EXISTS (SELECT 1 FROM community_likes WHERE user_id = ${user.id} AND post_id = ${postId}) as is_liked
    FROM community_posts 
    WHERE id = ${postId}
  `;

  const likeCount = countResult.rows[0]?.like_count ?? 0;
  const isLiked = countResult.rows[0]?.is_liked ?? false;
  
  await sql`
    UPDATE community_posts 
    SET like_count = ${likeCount}
    WHERE id = ${postId}
  `;

  revalidatePath('/community');
  revalidatePath(`/community/p/${postId}`);
  
  return { 
    success: true,
    like_count: Math.max(0, likeCount), 
    is_liked: isLiked
  };
}

export async function toggleLikeComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const comment = await sql<{ post_id: string }>`
    SELECT post_id FROM community_comments WHERE id = ${commentId}
  `;

  if (comment.rows.length === 0) {
    throw new Error('Comment not found');
  }

  const postId = comment.rows[0].post_id;

  const existing = await sql<{ id: string }>`
    SELECT id FROM community_likes WHERE user_id = ${user.id} AND comment_id = ${commentId}
  `;

  if (existing.rows.length > 0) {
    
    await sql`
      DELETE FROM community_likes WHERE user_id = ${user.id} AND comment_id = ${commentId}
    `;
  } else {
    
    await sql`
      INSERT INTO community_likes (user_id, comment_id)
      VALUES (${user.id}, ${commentId})
    `;

    const commentAuthor = await sql<{ author_id: string }>`
      SELECT author_id FROM community_comments WHERE id = ${commentId}
    `;
    if (commentAuthor.rows.length > 0 && commentAuthor.rows[0].author_id !== user.id) {
      await sql`
        INSERT INTO community_notifications (user_id, type, actor_id, post_id, comment_id)
        VALUES (${commentAuthor.rows[0].author_id}, 'like', ${user.id}, ${postId}, ${commentId})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  const countResult = await sql<{ like_count: number; is_liked: boolean }>`
    SELECT 
      (SELECT COUNT(*)::integer FROM community_likes WHERE comment_id = ${commentId}) as like_count,
      EXISTS (SELECT 1 FROM community_likes WHERE user_id = ${user.id} AND comment_id = ${commentId}) as is_liked
  `;

  const likeCount = countResult.rows[0]?.like_count ?? 0;
  const isLiked = countResult.rows[0]?.is_liked ?? false;
  
  await sql`
    UPDATE community_comments 
    SET like_count = ${likeCount}
    WHERE id = ${commentId}
  `;

  revalidatePath(`/community/p/${postId}`);
  
  return { 
    success: true,
    like_count: Math.max(0, likeCount), 
    is_liked: isLiked
  };
}

export async function toggleSavePost(postId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const existing = await sql<{ id: string }>`
    SELECT id FROM community_bookmarks WHERE user_id = ${user.id} AND post_id = ${postId}
  `;

  if (existing.rows.length > 0) {
    await sql`
      DELETE FROM community_bookmarks WHERE user_id = ${user.id} AND post_id = ${postId}
    `;
  } else {
    await sql`
      INSERT INTO community_bookmarks (user_id, post_id)
      VALUES (${user.id}, ${postId})
    `;
  }

  revalidatePath('/community');
  revalidatePath(`/community/p/${postId}`);
  return { success: true };
}

export async function createComment(data: z.infer<typeof createCommentSchema>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const validated = createCommentSchema.parse(data);

  const comment = await sql<{ id: string }>`
    INSERT INTO community_comments (post_id, author_id, content, parent_comment_id)
    VALUES (${validated.post_id}, ${user.id}, ${validated.content}, ${validated.parent_comment_id || null})
    RETURNING id
  `;

  const post = await sql<{ author_id: string }>`
    SELECT author_id FROM community_posts WHERE id = ${validated.post_id}
  `;
  if (post.rows.length > 0 && post.rows[0].author_id !== user.id) {
    await sql`
      INSERT INTO community_notifications (user_id, type, actor_id, post_id, comment_id)
      VALUES (${post.rows[0].author_id}, 'comment', ${user.id}, ${validated.post_id}, ${comment.rows[0].id})
      ON CONFLICT DO NOTHING
    `;
  }

  const countResult = await sql<{ comment_count: number }>`
    SELECT COUNT(*)::integer as comment_count
    FROM community_comments 
    WHERE post_id = ${validated.post_id}
  `;

  const commentCount = countResult.rows[0]?.comment_count ?? 0;

  await sql`
    UPDATE community_posts 
    SET comment_count = ${commentCount}
    WHERE id = ${validated.post_id}
  `;

  revalidatePath(`/community/p/${validated.post_id}`);
  return { 
    success: true, 
    comment_id: comment.rows[0].id,
    comment_count: commentCount
  };
}

export async function getComments(postId: string): Promise<CommunityComment[]> {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const result = await sql`
    SELECT
      c.*,
      prof.username as author_username,
      prof.display_name as author_display_name,
      prof.avatar_url as author_avatar_url,
      CASE WHEN EXISTS (SELECT 1 FROM community_likes l WHERE l.comment_id = c.id AND l.user_id = ${user.id}) THEN true ELSE false END as is_liked
    FROM community_comments c
    INNER JOIN community_profiles prof ON prof.user_id = c.author_id
    WHERE c.post_id = ${postId}
      AND NOT EXISTS (SELECT 1 FROM community_blocks b WHERE (b.blocker_id = ${user.id} AND b.blocked_id = c.author_id) OR (b.blocked_id = ${user.id} AND b.blocker_id = c.author_id))
    ORDER BY c.created_at ASC
  `;

  const comments = result.rows.map((row: any) => ({
    id: row.id,
    post_id: row.post_id,
    author_id: row.author_id,
    author_username: row.author_username,
    author_display_name: row.author_display_name,
    author_avatar_url: row.author_avatar_url,
    content: row.content,
    parent_comment_id: row.parent_comment_id,
    like_count: row.like_count,
    created_at: row.created_at,
    updated_at: row.updated_at,
    is_liked: row.is_liked,
    replies: [] as CommunityComment[],
  }));

  const commentMap = new Map<string, CommunityComment>();
  const rootComments: CommunityComment[] = [];

  comments.forEach(comment => {
    commentMap.set(comment.id, comment);
  });

  comments.forEach(comment => {
    if (comment.parent_comment_id) {
      const parent = commentMap.get(comment.parent_comment_id);
      if (parent) {
        parent.replies.push(comment);
      }
    } else {
      rootComments.push(comment);
    }
  });

  return rootComments;
}

export async function deleteComment(commentId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const comment = await sql<{ author_id: string; post_id: string }>`
    SELECT author_id, post_id FROM community_comments WHERE id = ${commentId}
  `;

  if (comment.rows.length === 0) {
    throw new Error('Comment not found');
  }

  if (comment.rows[0].author_id !== user.id) {
    throw new Error('Unauthorized');
  }

  const postId = comment.rows[0].post_id;

  await sql`DELETE FROM community_notifications WHERE comment_id = ${commentId}`;
  await sql`DELETE FROM community_likes WHERE comment_id = ${commentId}`;
  
  await sql`DELETE FROM community_comments WHERE parent_comment_id = ${commentId}`;
  
  await sql`DELETE FROM community_comments WHERE id = ${commentId}`;

  const countResult = await sql<{ comment_count: number }>`
    SELECT COUNT(*)::integer as comment_count
    FROM community_comments 
    WHERE post_id = ${postId}
  `;

  const commentCount = countResult.rows[0]?.comment_count ?? 0;

  await sql`
    UPDATE community_posts 
    SET comment_count = ${commentCount}
    WHERE id = ${postId}
  `;

  revalidatePath(`/community/p/${postId}`);
  return { 
    success: true,
    comment_count: commentCount
  };
}

export async function toggleFollow(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  if (currentUser.id === userId) {
    throw new Error('Cannot follow yourself');
  }

  const existing = await sql<{ id: string }>`
    SELECT id FROM community_follows WHERE follower_id = ${currentUser.id} AND following_id = ${userId}
  `;

  if (existing.rows.length > 0) {
    await sql`
      DELETE FROM community_follows WHERE follower_id = ${currentUser.id} AND following_id = ${userId}
    `;
  } else {
    await sql`
      INSERT INTO community_follows (follower_id, following_id)
      VALUES (${currentUser.id}, ${userId})
    `;

    await sql`
      INSERT INTO community_notifications (user_id, type, actor_id)
      VALUES (${userId}, 'follow', ${currentUser.id})
    `;
  }

  revalidatePath(`/u/${userId}`);
  return { success: true };
}

export async function getProfileByUsername(username: string, currentUserId: string): Promise<CommunityProfile | null> {
  const result = await sql`
    SELECT 
      p.*,
      (SELECT COUNT(*)::integer FROM community_posts WHERE author_id = p.user_id AND deleted_at IS NULL) as actual_post_count,
      CASE WHEN EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id = ${currentUserId} AND f.following_id = p.user_id) THEN true ELSE false END as is_following,
      CASE WHEN EXISTS (
        SELECT 1 FROM community_friendships fr 
        WHERE (fr.user1_id = ${currentUserId} AND fr.user2_id = p.user_id) 
           OR (fr.user1_id = p.user_id AND fr.user2_id = ${currentUserId})
      ) THEN true ELSE false END as is_friend,
      CASE 
        WHEN EXISTS (SELECT 1 FROM community_friend_requests fr WHERE fr.requester_id = ${currentUserId} AND fr.receiver_id = p.user_id AND fr.status = 'pending') THEN 'sent'
        WHEN EXISTS (SELECT 1 FROM community_friend_requests fr WHERE fr.requester_id = p.user_id AND fr.receiver_id = ${currentUserId} AND fr.status = 'pending') THEN 'pending'
        WHEN EXISTS (SELECT 1 FROM community_friendships fr WHERE (fr.user1_id = ${currentUserId} AND fr.user2_id = p.user_id) OR (fr.user1_id = p.user_id AND fr.user2_id = ${currentUserId})) THEN 'accepted'
        ELSE 'none'
      END as friend_request_status,
      CASE WHEN EXISTS (SELECT 1 FROM community_blocks b WHERE b.blocker_id = ${currentUserId} AND b.blocked_id = p.user_id) THEN true ELSE false END as is_blocked
    FROM community_profiles p
    WHERE LOWER(p.username) = LOWER(${username})
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    avatar_url: row.avatar_url,
    cover_image_url: row.cover_image_url,
    location: row.location,
    website: row.website,
    verified: row.verified,
    follower_count: row.follower_count,
    following_count: row.following_count,
    post_count: row.actual_post_count ?? row.post_count ?? 0,
    created_at: row.created_at,
    is_following: row.is_following,
    is_friend: row.is_friend,
    friend_request_status: row.friend_request_status,
    is_blocked: row.is_blocked,
  };
}

export async function getProfile(username: string): Promise<CommunityProfile | null> {
  const currentUser = await getCurrentUser();
  if (!currentUser) redirect('/login');

  const result = await sql`
    SELECT 
      p.*,
      CASE WHEN EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id = ${currentUser.id} AND f.following_id = p.user_id) THEN true ELSE false END as is_following,
      CASE WHEN EXISTS (
        SELECT 1 FROM community_friendships fr 
        WHERE (fr.user1_id = ${currentUser.id} AND fr.user2_id = p.user_id) 
           OR (fr.user1_id = p.user_id AND fr.user2_id = ${currentUser.id})
      ) THEN true ELSE false END as is_friend,
      CASE 
        WHEN EXISTS (SELECT 1 FROM community_friend_requests fr WHERE fr.requester_id = ${currentUser.id} AND fr.receiver_id = p.user_id AND fr.status = 'pending') THEN 'sent'
        WHEN EXISTS (SELECT 1 FROM community_friend_requests fr WHERE fr.requester_id = p.user_id AND fr.receiver_id = ${currentUser.id} AND fr.status = 'pending') THEN 'pending'
        WHEN EXISTS (SELECT 1 FROM community_friendships fr WHERE (fr.user1_id = ${currentUser.id} AND fr.user2_id = p.user_id) OR (fr.user1_id = p.user_id AND fr.user2_id = ${currentUser.id})) THEN 'accepted'
        ELSE 'none'
      END as friend_request_status,
      CASE WHEN EXISTS (SELECT 1 FROM community_blocks b WHERE b.blocker_id = ${currentUser.id} AND b.blocked_id = p.user_id) THEN true ELSE false END as is_blocked
    FROM community_profiles p
    WHERE LOWER(p.username) = LOWER(${username})
  `;

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  return {
    id: row.id,
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    bio: row.bio,
    avatar_url: row.avatar_url,
    cover_image_url: row.cover_image_url,
    location: row.location,
    website: row.website,
    verified: row.verified,
    follower_count: row.follower_count,
    following_count: row.following_count,
    post_count: row.post_count,
    created_at: row.created_at,
    is_following: row.is_following,
    is_friend: row.is_friend,
    friend_request_status: row.friend_request_status,
    is_blocked: row.is_blocked,
  };
}

export async function updateProfile(data: z.infer<typeof updateProfileSchema>) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const validated = updateProfileSchema.parse(data);

  const existing = await sql<{ user_id: string }>`
    SELECT user_id FROM community_profiles WHERE username = ${validated.username} AND user_id != ${user.id}
  `;

  if (existing.rows.length > 0) {
    throw new Error('Username already taken');
  }

  await getOrCreateProfile(user.id);

  await sql`
    UPDATE community_profiles
    SET 
      username = ${validated.username},
      display_name = ${validated.display_name},
      bio = ${validated.bio || null},
      avatar_url = ${validated.avatar_url || null},
      cover_image_url = ${validated.cover_image_url || null},
      location = ${validated.location || null},
      website = ${validated.website || null},
      updated_at = NOW()
    WHERE user_id = ${user.id}
  `;

  revalidatePath(`/u/${validated.username}`);
  return { success: true };
}

export async function repostPost(postId: string, quoteText?: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const existing = await sql<{ id: string }>`
    SELECT id FROM community_reposts WHERE user_id = ${user.id} AND original_post_id = ${postId}
  `;

  if (existing.rows.length > 0) {
    
    await sql`
      DELETE FROM community_reposts WHERE user_id = ${user.id} AND original_post_id = ${postId}
    `;
    
  } else {
    
    await sql`
      INSERT INTO community_reposts (user_id, original_post_id, quote_text)
      VALUES (${user.id}, ${postId}, ${quoteText || null})
    `;

    const post = await sql<{ author_id: string }>`
      SELECT author_id FROM community_posts WHERE id = ${postId}
    `;
    if (post.rows.length > 0 && post.rows[0].author_id !== user.id) {
      await sql`
        INSERT INTO community_notifications (user_id, type, actor_id, post_id)
        VALUES (${post.rows[0].author_id}, 'repost', ${user.id}, ${postId})
        ON CONFLICT DO NOTHING
      `;
    }
  }

  revalidatePath('/community');
  revalidatePath(`/community/p/${postId}`);
  return { success: true };
}

export async function sharePost(postId: string, friendId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (!friendId) {
    throw new Error('Friend ID is required');
  }

  const friendship = await sql<{ id: string }>`
    SELECT id FROM community_friendships
    WHERE (user1_id = ${user.id} AND user2_id = ${friendId})
       OR (user1_id = ${friendId} AND user2_id = ${user.id})
  `;

  if (friendship.rows.length === 0) {
    throw new Error('Friendship not found');
  }

  const existing = await sql<{ id: string }>`
    SELECT id FROM community_shares 
    WHERE user_id = ${user.id} AND post_id = ${postId} AND shared_to_user_id = ${friendId}
  `;

  if (existing.rows.length > 0) {
    throw new Error('Post already shared to this friend');
  }

  await sql`
    INSERT INTO community_shares (user_id, post_id, shared_to_user_id)
    VALUES (${user.id}, ${postId}, ${friendId})
  `;

  await sql`
    INSERT INTO community_notifications (user_id, type, actor_id, post_id)
    VALUES (${friendId}, 'share', ${user.id}, ${postId})
    ON CONFLICT DO NOTHING
  `;

  const countResult = await sql<{ share_count: number }>`
    SELECT COUNT(*)::integer as share_count
    FROM community_shares 
    WHERE post_id = ${postId}
  `;

  const shareCount = countResult.rows[0]?.share_count ?? 0;
  
  await sql`
    UPDATE community_posts 
    SET share_count = ${shareCount}
    WHERE id = ${postId}
  `;

  revalidatePath('/community');
  revalidatePath(`/community/p/${postId}`);
  
  return { 
    success: true,
    share_count: Math.max(0, shareCount)
  };
}

export async function sendFriendRequest(userId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (user.id === userId) {
    throw new Error('Cannot send friend request to yourself');
  }

  const friendship = await sql<{ id: string }>`
    SELECT id FROM community_friendships
    WHERE (user1_id = ${user.id} AND user2_id = ${userId})
       OR (user1_id = ${userId} AND user2_id = ${user.id})
  `;

  if (friendship.rows.length > 0) {
    throw new Error('Already friends');
  }

  const existing = await sql<{ id: string; status: string }>`
    SELECT id, status FROM community_friend_requests
    WHERE (requester_id = ${user.id} AND receiver_id = ${userId})
       OR (requester_id = ${userId} AND receiver_id = ${user.id})
  `;

  if (existing.rows.length > 0) {
    const request = existing.rows[0];
    if (request.status === 'pending') {
      throw new Error('Friend request already pending');
    }
    if (request.status === 'accepted') {
      throw new Error('Already friends');
    }
  }

  await sql`
    INSERT INTO community_friend_requests (requester_id, receiver_id, status)
    VALUES (${user.id}, ${userId}, 'pending')
    ON CONFLICT (requester_id, receiver_id) DO UPDATE
    SET status = 'pending', updated_at = NOW()
  `;

  await sql`
    INSERT INTO community_notifications (user_id, type, actor_id)
    VALUES (${userId}, 'friend_request', ${user.id})
    ON CONFLICT DO NOTHING
  `;

  revalidatePath(`/community/u/${userId}`);
  revalidatePath('/community/friends');
  return { success: true };
}

export async function acceptFriendRequest(requestId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const request = await sql<{ requester_id: string; receiver_id: string }>`
    SELECT requester_id, receiver_id FROM community_friend_requests
    WHERE id = ${requestId} AND receiver_id = ${user.id} AND status = 'pending'
  `;

  if (request.rows.length === 0) {
    throw new Error('Friend request not found or already processed');
  }

  const requesterId = request.rows[0].requester_id;
  const receiverId = request.rows[0].receiver_id;

  await sql`
    UPDATE community_friend_requests
    SET status = 'accepted', updated_at = NOW()
    WHERE id = ${requestId}
  `;

  const user1Id = requesterId < receiverId ? requesterId : receiverId;
  const user2Id = requesterId < receiverId ? receiverId : requesterId;

  await sql`
    INSERT INTO community_friendships (user1_id, user2_id)
    VALUES (${user1Id}, ${user2Id})
    ON CONFLICT (user1_id, user2_id) DO NOTHING
  `;

  await sql`
    INSERT INTO community_notifications (user_id, type, actor_id)
    VALUES (${requesterId}, 'friend_accepted', ${user.id})
    ON CONFLICT DO NOTHING
  `;

  revalidatePath('/community/friends');
  revalidatePath(`/community/u/${requesterId}`);
  return { success: true };
}

export async function rejectFriendRequest(requestId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await sql`
    UPDATE community_friend_requests
    SET status = 'rejected', updated_at = NOW()
    WHERE id = ${requestId} AND receiver_id = ${user.id} AND status = 'pending'
  `;

  revalidatePath('/community/friends');
  return { success: true };
}

export async function removeFriend(userId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await sql`
    DELETE FROM community_friendships
    WHERE (user1_id = ${user.id} AND user2_id = ${userId})
       OR (user1_id = ${userId} AND user2_id = ${user.id})
  `;

  await sql`
    DELETE FROM community_friend_requests
    WHERE (requester_id = ${user.id} AND receiver_id = ${userId})
       OR (requester_id = ${userId} AND receiver_id = ${user.id})
  `;

  revalidatePath(`/community/u/${userId}`);
  revalidatePath('/community/friends');
  return { success: true };
}

export async function cancelFriendRequest(userId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await sql`
    DELETE FROM community_friend_requests
    WHERE requester_id = ${user.id} AND receiver_id = ${userId} AND status = 'pending'
  `;

  revalidatePath(`/community/u/${userId}`);
  revalidatePath('/community/friends');
  return { success: true };
}

export async function getFriendRequests() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const incoming = await sql<{
    id: string;
    requester_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
  }>`
    SELECT 
      fr.id,
      fr.requester_id,
      prof.username,
      prof.display_name,
      prof.avatar_url,
      fr.created_at
    FROM community_friend_requests fr
    INNER JOIN community_profiles prof ON prof.user_id = fr.requester_id
    WHERE fr.receiver_id = ${user.id} AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `;

  const outgoing = await sql<{
    id: string;
    receiver_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
  }>`
    SELECT 
      fr.id,
      fr.receiver_id,
      prof.username,
      prof.display_name,
      prof.avatar_url,
      fr.created_at
    FROM community_friend_requests fr
    INNER JOIN community_profiles prof ON prof.user_id = fr.receiver_id
    WHERE fr.requester_id = ${user.id} AND fr.status = 'pending'
    ORDER BY fr.created_at DESC
  `;

  return {
    incoming: incoming.rows,
    outgoing: outgoing.rows,
  };
}

export async function getFriends(userId?: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const targetUserId = userId || user.id;

  const friends = await sql<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    created_at: string;
  }>`
    SELECT 
      CASE 
        WHEN f.user1_id = ${targetUserId} THEN f.user2_id
        ELSE f.user1_id
      END as user_id,
      prof.username,
      prof.display_name,
      prof.avatar_url,
      f.created_at
    FROM community_friendships f
    INNER JOIN community_profiles prof ON prof.user_id = CASE 
      WHEN f.user1_id = ${targetUserId} THEN f.user2_id
      ELSE f.user1_id
    END
    WHERE f.user1_id = ${targetUserId} OR f.user2_id = ${targetUserId}
    ORDER BY f.created_at DESC
  `;

  return friends.rows;
}

export async function getPostsByUser(userId: string, currentUserId: string): Promise<CommunityPost[]> {
  
  const userFriends = await sql<{ user_id: string }>`
    SELECT 
      CASE 
        WHEN user1_id = ${currentUserId} THEN user2_id
        ELSE user1_id
      END as user_id
    FROM community_friendships
    WHERE user1_id = ${currentUserId} OR user2_id = ${currentUserId}
  `;
  const friendIds = userFriends.rows.map(r => r.user_id);
  friendIds.push(currentUserId); 

  const result = await sql`
    SELECT 
      p.*,
      prof.username as author_username,
      prof.display_name as author_display_name,
      prof.avatar_url as author_avatar_url,
      COALESCE(
        json_agg(pm.media_url ORDER BY pm.order_index) FILTER (WHERE pm.media_url IS NOT NULL),
        '[]'::json
      ) as media_urls,
      CASE WHEN EXISTS (SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = ${currentUserId}) THEN true ELSE false END as is_liked,
      CASE WHEN EXISTS (SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = ${currentUserId}) THEN true ELSE false END as is_saved,
      CASE WHEN EXISTS (SELECT 1 FROM community_reposts r WHERE r.original_post_id = p.id AND r.user_id = ${currentUserId}) THEN true ELSE false END as is_reposted,
      CASE WHEN EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id = ${currentUserId} AND f.following_id = p.author_id) THEN true ELSE false END as is_following_author,
      (SELECT COUNT(*)::integer FROM community_likes WHERE post_id = p.id) as actual_like_count,
      (SELECT COUNT(*)::integer FROM community_reposts WHERE original_post_id = p.id) as actual_repost_count,
      (SELECT COUNT(*)::integer FROM community_comments WHERE post_id = p.id) as actual_comment_count,
      (SELECT COUNT(*)::integer FROM community_bookmarks WHERE post_id = p.id) as actual_save_count,
      r.ingredients, r.instructions, r.servings, r.prep_time_minutes, r.cook_time_minutes,
      r.total_time_minutes, r.difficulty, r.cuisine, r.diet_tags, r.tags
    FROM community_posts p
    INNER JOIN community_profiles prof ON prof.user_id = p.author_id
    LEFT JOIN community_post_media pm ON pm.post_id = p.id
    LEFT JOIN community_recipes r ON r.post_id = p.id
    WHERE p.author_id = ${userId}
      AND NOT EXISTS (SELECT 1 FROM community_blocks b WHERE (b.blocker_id = ${currentUserId} AND b.blocked_id = p.author_id) OR (b.blocked_id = ${currentUserId} AND b.blocker_id = p.author_id))
      AND (
        p.visibility = 'public'
        OR (p.visibility = 'friends' AND p.author_id = ANY(${friendIds}::uuid[]))
        OR (p.visibility = 'private' AND p.author_id = ${currentUserId})
      )
    GROUP BY p.id, prof.username, prof.display_name, prof.avatar_url, r.ingredients, r.instructions,
      r.servings, r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes, r.difficulty, r.cuisine, r.diet_tags, r.tags
    ORDER BY p.created_at DESC
  `;

  return result.rows.map((row: any) => ({
    id: row.id,
    author_id: row.author_id,
    author_username: row.author_username,
    author_display_name: row.author_display_name,
    author_avatar_url: row.author_avatar_url,
    title: row.title,
    caption: row.caption,
    visibility: row.visibility,
    like_count: row.actual_like_count ?? row.like_count ?? 0,
    comment_count: row.actual_comment_count ?? row.comment_count ?? 0,
    repost_count: row.actual_repost_count ?? row.repost_count ?? 0,
    save_count: row.actual_save_count ?? row.save_count ?? 0,
    share_count: row.share_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    recipe: row.ingredients ? {
      ingredients: row.ingredients || [],
      instructions: row.instructions || [],
      servings: row.servings,
      prep_time_minutes: row.prep_time_minutes,
      cook_time_minutes: row.cook_time_minutes,
      total_time_minutes: row.total_time_minutes,
      difficulty: row.difficulty,
      cuisine: row.cuisine,
      diet_tags: row.diet_tags || [],
      tags: row.tags || [],
    } : null,
    is_liked: row.is_liked,
    is_saved: row.is_saved,
    is_reposted: row.is_reposted || false,
    is_following_author: row.is_following_author,
  }));
}

export async function getSavedPosts(userId: string, currentUserId: string): Promise<CommunityPost[]> {
  
  if (userId !== currentUserId) {
    return [];
  }

  const userFriends = await sql<{ user_id: string }>`
    SELECT 
      CASE 
        WHEN user1_id = ${currentUserId} THEN user2_id
        ELSE user1_id
      END as user_id
    FROM community_friendships
    WHERE user1_id = ${currentUserId} OR user2_id = ${currentUserId}
  `;
  const friendIds = userFriends.rows.map(r => r.user_id);
  friendIds.push(currentUserId); 

  const result = await sql`
    SELECT 
      p.*,
      prof.username as author_username,
      prof.display_name as author_display_name,
      prof.avatar_url as author_avatar_url,
      COALESCE(
        json_agg(pm.media_url ORDER BY pm.order_index) FILTER (WHERE pm.media_url IS NOT NULL),
        '[]'::json
      ) as media_urls,
      CASE WHEN EXISTS (SELECT 1 FROM community_likes l WHERE l.post_id = p.id AND l.user_id = ${currentUserId}) THEN true ELSE false END as is_liked,
      CASE WHEN EXISTS (SELECT 1 FROM community_bookmarks b WHERE b.post_id = p.id AND b.user_id = ${currentUserId}) THEN true ELSE false END as is_saved,
      CASE WHEN EXISTS (SELECT 1 FROM community_reposts r WHERE r.original_post_id = p.id AND r.user_id = ${currentUserId}) THEN true ELSE false END as is_reposted,
      CASE WHEN EXISTS (SELECT 1 FROM community_follows f WHERE f.follower_id = ${currentUserId} AND f.following_id = p.author_id) THEN true ELSE false END as is_following_author,
      (SELECT COUNT(*)::integer FROM community_likes WHERE post_id = p.id) as actual_like_count,
      (SELECT COUNT(*)::integer FROM community_reposts WHERE original_post_id = p.id) as actual_repost_count,
      (SELECT COUNT(*)::integer FROM community_comments WHERE post_id = p.id) as actual_comment_count,
      (SELECT COUNT(*)::integer FROM community_bookmarks WHERE post_id = p.id) as actual_save_count,
      r.ingredients, r.instructions, r.servings, r.prep_time_minutes, r.cook_time_minutes,
      r.total_time_minutes, r.difficulty, r.cuisine, r.diet_tags, r.tags
    FROM community_bookmarks b
    INNER JOIN community_posts p ON p.id = b.post_id
    INNER JOIN community_profiles prof ON prof.user_id = p.author_id
    LEFT JOIN community_post_media pm ON pm.post_id = p.id
    LEFT JOIN community_recipes r ON r.post_id = p.id
    WHERE b.user_id = ${currentUserId}
      AND NOT EXISTS (SELECT 1 FROM community_blocks bl WHERE (bl.blocker_id = ${currentUserId} AND bl.blocked_id = p.author_id) OR (bl.blocked_id = ${currentUserId} AND bl.blocker_id = p.author_id))
      AND (
        p.visibility = 'public'
        OR (p.visibility = 'friends' AND p.author_id = ANY(${friendIds}::uuid[]))
        OR (p.visibility = 'private' AND p.author_id = ${currentUserId})
      )
    GROUP BY p.id, prof.username, prof.display_name, prof.avatar_url, r.ingredients, r.instructions,
      r.servings, r.prep_time_minutes, r.cook_time_minutes, r.total_time_minutes, r.difficulty, r.cuisine, r.diet_tags, r.tags, b.created_at
    ORDER BY b.created_at DESC
  `;

  return result.rows.map((row: any) => ({
    id: row.id,
    author_id: row.author_id,
    author_username: row.author_username,
    author_display_name: row.author_display_name,
    author_avatar_url: row.author_avatar_url,
    title: row.title,
    caption: row.caption,
    visibility: row.visibility,
    like_count: row.actual_like_count ?? row.like_count ?? 0,
    comment_count: row.actual_comment_count ?? row.comment_count ?? 0,
    repost_count: row.actual_repost_count ?? row.repost_count ?? 0,
    save_count: row.actual_save_count ?? row.save_count ?? 0,
    share_count: row.share_count ?? 0,
    created_at: row.created_at,
    updated_at: row.updated_at,
    media_urls: Array.isArray(row.media_urls) ? row.media_urls : [],
    recipe: row.ingredients ? {
      ingredients: row.ingredients || [],
      instructions: row.instructions || [],
      servings: row.servings,
      prep_time_minutes: row.prep_time_minutes,
      cook_time_minutes: row.cook_time_minutes,
      total_time_minutes: row.total_time_minutes,
      difficulty: row.difficulty,
      cuisine: row.cuisine,
      diet_tags: row.diet_tags || [],
      tags: row.tags || [],
    } : null,
    is_liked: row.is_liked,
    is_saved: row.is_saved,
    is_reposted: row.is_reposted || false,
    is_following_author: row.is_following_author,
  }));
}

export async function getFriendSuggestions() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const suggestions = await sql<{
    user_id: string;
    username: string;
    display_name: string;
    avatar_url: string | null;
    mutual_friends: number;
  }>`
    SELECT 
      prof.user_id,
      prof.username,
      prof.display_name,
      prof.avatar_url,
      COUNT(DISTINCT mutual.user_id) as mutual_friends
    FROM community_profiles prof
    LEFT JOIN community_friendships f1 ON (f1.user1_id = prof.user_id OR f1.user2_id = prof.user_id)
    LEFT JOIN community_friendships f2 ON (
      (f2.user1_id = ${user.id} OR f2.user2_id = ${user.id})
      AND (
        (f1.user1_id = f2.user1_id AND f1.user2_id != prof.user_id AND f1.user1_id != ${user.id})
        OR (f1.user1_id = f2.user2_id AND f1.user2_id != prof.user_id AND f1.user1_id != ${user.id})
        OR (f1.user2_id = f2.user1_id AND f1.user1_id != prof.user_id AND f1.user2_id != ${user.id})
        OR (f1.user2_id = f2.user2_id AND f1.user1_id != prof.user_id AND f1.user2_id != ${user.id})
      )
    )
    LEFT JOIN community_profiles mutual ON (
      (mutual.user_id = CASE WHEN f1.user1_id = prof.user_id THEN f1.user2_id ELSE f1.user1_id END)
      AND (mutual.user_id IN (
        SELECT CASE WHEN f2.user1_id = ${user.id} THEN f2.user2_id ELSE f2.user1_id END
        FROM community_friendships f2
        WHERE f2.user1_id = ${user.id} OR f2.user2_id = ${user.id}
      ))
    )
    WHERE prof.user_id != ${user.id}
      AND NOT EXISTS (
        SELECT 1 FROM community_friendships f
        WHERE (f.user1_id = ${user.id} AND f.user2_id = prof.user_id)
           OR (f.user1_id = prof.user_id AND f.user2_id = ${user.id})
      )
      AND NOT EXISTS (
        SELECT 1 FROM community_blocks b
        WHERE (b.blocker_id = ${user.id} AND b.blocked_id = prof.user_id)
           OR (b.blocked_id = ${user.id} AND b.blocker_id = prof.user_id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM community_friend_requests fr
        WHERE (fr.requester_id = ${user.id} AND fr.receiver_id = prof.user_id)
           OR (fr.requester_id = prof.user_id AND fr.receiver_id = ${user.id})
      )
    GROUP BY prof.user_id, prof.username, prof.display_name, prof.avatar_url, prof.created_at
    ORDER BY mutual_friends DESC, prof.created_at DESC
    LIMIT 10
  `;

  return suggestions.rows;
}

export async function blockUser(userId: string) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (user.id === userId) {
    throw new Error('Cannot block yourself');
  }

  await sql`
    INSERT INTO community_blocks (blocker_id, blocked_id)
    VALUES (${user.id}, ${userId})
    ON CONFLICT (blocker_id, blocked_id) DO NOTHING
  `;

  await sql`
    DELETE FROM community_follows WHERE (follower_id = ${user.id} AND following_id = ${userId}) OR (follower_id = ${userId} AND following_id = ${user.id})
  `;

  revalidatePath(`/u/${userId}`);
  return { success: true };
}

export async function reportContent(
  targetType: 'post' | 'comment' | 'user',
  targetId: string,
  reason: string,
  details?: string
) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  await sql`
    INSERT INTO community_reports (reporter_id, target_type, target_id, reason, details)
    VALUES (${user.id}, ${targetType}, ${targetId}, ${reason}, ${details || null})
  `;

  return { success: true };
}
