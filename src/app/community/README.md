# Chefora Community Module

A complete social community module for sharing recipes, following chefs, messaging, and more.

## Features Implemented

### ✅ Core Features (Day-1 MVP)

1. **Community Feed** (`/community`)
   - Infinite scroll feed with posts
   - Sort by: New, Trending, Following
   - Filters: Cuisine, Difficulty, Search
   - Right sidebar with trending tags, suggested creators, weekly challenge

2. **Create Post** (`/community/new`)
   - Image upload (base64 for MVP, upgradeable to blob storage)
   - Title, caption, visibility settings
   - Full recipe form: ingredients, instructions, servings, time, difficulty, cuisine, diet tags
   - Real-time validation

3. **Post Detail** (`/community/p/[postId]`)
   - Full post view with recipe details
   - Threaded comments (one-level nesting)
   - Like, save, repost, share actions
   - Comment composer with @mentions support (stored as text)

4. **User Profiles** (`/u/[username]`)
   - Profile header with avatar, bio, stats
   - Follow/Unfollow, Add Friend, Message buttons
   - Tabs: Posts, Saved (private), About
   - Friend request system (pending/accepted)

5. **Messaging** (`/messages`)
   - Inbox view with conversation list
   - 1:1 and group chat support (structure ready)
   - Message composer
   - Read receipts (structure ready)

6. **Notifications** (`/notifications`)
   - Notification feed
   - Types: follow, comment, like, repost, friend_request, message
   - Unread indicators
   - Click-through to relevant content

7. **Moderation & Safety**
   - Report content (posts, comments, users)
   - Block users (hides content, prevents messaging)
   - Basic content validation (image type/size limits)
   - Profanity filter placeholder

## Database Schema

All tables are defined in `migration.sql`:

- `community_profiles` - User public profiles
- `community_posts` - Recipe posts
- `community_post_media` - Post images
- `community_recipes` - Structured recipe data
- `community_comments` - Post comments (threaded)
- `community_likes` - Post/comment likes
- `community_bookmarks` - Saved posts
- `community_follows` - Follow relationships
- `community_friend_requests` - Friend requests
- `community_friendships` - Accepted friendships
- `community_blocks` - Blocked users
- `community_conversations` - DM/group chats
- `community_conversation_members` - Chat participants
- `community_messages` - Chat messages
- `community_notifications` - User notifications
- `community_reports` - Content reports
- `community_reposts` - Reposted content

All tables include proper indexes, foreign keys, and triggers for counter updates.

## Setup Instructions

### 1. Run Database Migration

```sql
-- Run the SQL in src/app/community/migration.sql
-- This creates all necessary tables, indexes, and triggers
```

### 2. Seed Demo Data (Optional)

```bash
# In development, call the seed endpoint:
POST /api/community/seed

# Or import and run seedCommunityData() directly
```

### 3. Environment Variables

No additional env vars required for MVP. Image upload uses base64 storage.

For production, consider:
- `BLOB_STORAGE_URL` - For image storage (Vercel Blob, Supabase Storage, etc.)
- `REALTIME_URL` - For real-time messaging (Supabase Realtime)

## File Structure

```
src/app/community/
├── migration.sql              # Database schema
├── seed.ts                    # Demo data seeder
├── actions.ts                  # Server actions (posts, comments, likes, etc.)
├── README.md                   # This file
├── page.tsx                    # Main feed page
├── new/
│   └── page.tsx               # Create post page
├── p/
│   └── [postId]/
│       └── page.tsx           # Post detail page
└── components/
    ├── PostCard.tsx           # Feed post card
    ├── PostDetail.tsx         # Full post view
    ├── CommentCard.tsx         # Comment component
    ├── CommunityFeed.tsx      # Feed container
    ├── CommunityFilters.tsx   # Filter sidebar
    ├── CommunitySidebar.tsx   # Right rail widgets
    └── ProfilePage.tsx        # User profile view

src/app/u/
└── [username]/
    └── page.tsx               # User profile route

src/app/messages/
└── page.tsx                   # Messages inbox

src/app/notifications/
└── page.tsx                   # Notifications page

src/app/api/community/
├── upload-image/
│   └── route.ts               # Image upload endpoint
└── seed/
    └── route.ts               # Seed data endpoint
```

## API Endpoints & Server Actions

### Server Actions (in `actions.ts`)

- `createPost(data)` - Create a new post
- `getPosts(params)` - Fetch posts with filters
- `getPost(postId)` - Get single post
- `deletePost(postId)` - Soft delete post
- `toggleLikePost(postId)` - Like/unlike
- `toggleSavePost(postId)` - Save/unsave
- `repostPost(postId, quoteText?)` - Repost
- `createComment(data)` - Add comment
- `getComments(postId)` - Get post comments
- `deleteComment(commentId)` - Delete comment
- `toggleFollow(userId)` - Follow/unfollow
- `getProfile(username)` - Get user profile
- `updateProfile(data)` - Update own profile
- `blockUser(userId)` - Block user
- `reportContent(type, id, reason, details?)` - Report content

### API Routes

- `POST /api/community/upload-image` - Upload image (returns base64 data URL)
- `POST /api/community/seed` - Seed demo data (dev only)

## Styling

All components use the existing Chefora design system:
- Dark gradient background
- Cyan glow borders (`var(--accent)`)
- Glass morphism cards
- Pill chips for tags
- Consistent with dashboard styling

Styles are in `globals.css` under the "COMMUNITY MODULE STYLES" section.

## Security

- All mutations check authentication via `getCurrentUser()`
- Ownership verification for delete operations
- Blocked users' content is filtered from queries
- Visibility controls (public/friends/private) enforced
- SQL injection protection via parameterized queries

## Performance

- Paginated queries (20 items per page)
- Indexed database columns
- Optimistic UI updates for likes/saves
- Lazy loading for images
- Infinite scroll for feed

## Future Enhancements

- Real-time messaging (Supabase Realtime or WebSockets)
- Image carousel for multiple photos
- Advanced search with filters
- Hashtag pages (`/tags/[tag]`)
- Collections (save posts into named collections)
- "Cooked it" badge with photo reply
- Recipe remix with attribution
- Story-like "Daily dish"
- Community polls
- "Kitchen Rooms" live group chats

## Notes

- **Image Storage**: Currently uses base64 data URLs. For production, integrate with Vercel Blob, Supabase Storage, or AWS S3.
- **Real-time**: Structure is ready for real-time updates. Add Supabase Realtime or WebSocket support.
- **Friend Requests**: UI is ready, but friend request actions need to be wired up in ProfilePage.
- **Messaging**: Inbox structure is ready. Add conversation detail page and message sending.
- **Notifications**: Bell icon in header needs to be added to DashboardLayout.

## Testing

1. Run migration SQL
2. Seed demo data: `POST /api/community/seed`
3. Navigate to `/community`
4. Create a post: `/community/new`
5. View profile: `/u/[username]`
6. Test interactions: like, comment, follow

## Support

For issues or questions, check:
- Database schema: `migration.sql`
- Server actions: `actions.ts`
- Component code: `components/*.tsx`

