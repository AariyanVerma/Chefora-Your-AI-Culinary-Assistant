# How to Run Database Migrations

## Option 1: Using the API Endpoint (Easiest)

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Open your browser and navigate to:
   ```
   http://localhost:3000/api/community/run-share-migration
   ```

3. Or use curl/Postman to make a POST request:
   ```bash
   curl -X POST http://localhost:3000/api/community/run-share-migration
   ```

**Note:** This only works in development mode. Make sure you're logged in.

---

## Option 2: Using Vercel Dashboard (If using Vercel Postgres)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Storage** → **Postgres**
4. Click on your database
5. Go to the **Data** or **SQL Editor** tab
6. Copy and paste the contents of `src/app/community/add-share-count.sql`
7. Click **Run** or **Execute**

---

## Option 3: Using Neon Dashboard (If using Neon)

1. Go to [Neon Console](https://console.neon.tech)
2. Select your project
3. Click on **SQL Editor**
4. Copy and paste the contents of `src/app/community/add-share-count.sql`
5. Click **Run**

---

## Option 4: Using psql Command Line

1. Get your database connection string from your environment variables:
   - Look for `POSTGRES_URL` or `DATABASE_URL` in your `.env` file or Vercel dashboard

2. Run the migration:
   ```bash
   psql "your-connection-string" -f src/app/community/add-share-count.sql
   ```

   Or copy-paste the SQL directly:
   ```bash
   psql "your-connection-string"
   ```
   Then paste the SQL content and press Enter.

---

## Option 5: Using a Database Client Tool

### Using DBeaver, pgAdmin, or TablePlus:

1. Connect to your database using your connection string
2. Open a new SQL query window
3. Copy the contents of `src/app/community/add-share-count.sql`
4. Paste and execute

---

## What the Migration Does

1. ✅ Adds `share_count` column to `community_posts` table
2. ✅ Creates `community_shares` table to track shares
3. ✅ Updates the trigger function to handle share count updates
4. ✅ Creates trigger to automatically update share_count

---

## Verify It Worked

After running the migration, you can verify by:

1. Checking if the column exists:
   ```sql
   SELECT column_name FROM information_schema.columns 
   WHERE table_name = 'community_posts' AND column_name = 'share_count';
   ```

2. Checking if the table exists:
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_name = 'community_shares';
   ```

---

## Troubleshooting

- **"column already exists"**: The migration has already been run. This is safe to ignore.
- **"table already exists"**: The table was already created. This is safe to ignore.
- **"permission denied"**: Make sure you're using the correct database credentials with proper permissions.
