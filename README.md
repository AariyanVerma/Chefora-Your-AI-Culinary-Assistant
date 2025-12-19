# Chefora - Your Personal AI Culinary Assistant

Chefora is a full-stack web application that serves as your personal AI-powered culinary assistant. It helps you discover recipes, manage your pantry, create shopping lists, and connect with a community of food enthusiasts.

## Features

### Core Features
- Recipe Discovery: Browse recipes by category, cuisine, area, or search by ingredients
- AI Recipe Generation: Generate personalized recipes using AI
- Pantry Management: Track ingredients, expiration dates, and quantities
- Shopping Lists: Create and manage multiple shopping lists with smart features
- Community: Share recipes, follow chefs, comment, like, and interact with the community
- User Profiles: Customizable profiles with dietary preferences, allergies, and cooking skills
- Messaging: Direct messaging between users
- Notifications: Real-time notifications for interactions
- 2FA Security: Two-factor authentication for enhanced security
- Password Recovery: Secure password reset via email

### Technical Features
- Next.js 16: Modern React framework with App Router
- TypeScript: Type-safe development
- PostgreSQL: Robust database using Vercel Postgres
- Three.js Animations: Beautiful 3D particle animations
- GSAP: Smooth animations and transitions
- Tailwind CSS: Utility-first CSS framework
- React Query: Efficient data fetching and caching

## Prerequisites

Before you begin, ensure you have the following installed on your system:

1. Node.js (v18.0.0 or higher)
   - Download from nodejs.org
   - Verify installation: node --version

2. npm (comes with Node.js) or yarn
   - Verify installation: npm --version

3. PostgreSQL Database
   - Option 1: Vercel Postgres (Recommended for easy setup)
     - Sign up at vercel.com
     - Create a Postgres database in your Vercel project
   - Option 2: Local PostgreSQL
     - Download from postgresql.org
     - Or use Docker: docker run --name postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres

4. Git (for cloning the repository)
   - Download from git-scm.com

## Installation Guide

### Step 1: Clone the Repository

```bash
# Clone the repository
git clone <repository-url>
cd Chefora
```

### Step 2: Install Frontend Dependencies

```bash
# Install all npm packages for the Next.js frontend
npm install
```

This will install all dependencies listed in package.json, including:
- Next.js, React, TypeScript
- Three.js, GSAP (for animations)
- Tailwind CSS and related utilities
- Database and authentication libraries
- UI components (Radix UI)
- And many more...

Expected time: 2-5 minutes depending on your internet connection.

### Step 3: Install Backend Dependencies

```bash
# Navigate to the backend directory
cd chefora-backend

# Install backend dependencies
npm install

# Return to root directory
cd ..
```

This installs:
- Express.js (web server)
- Groq SDK (AI integration)
- Axios (HTTP client)
- CORS (Cross-Origin Resource Sharing)
- And other backend utilities

### Step 4: Set Up Environment Variables

Create a .env.local file in the root directory of the project:

```bash
# In the root directory (Chefora/)
touch .env.local
```

Open .env.local and add the following environment variables:

```env
REQUIRED - Core Configuration

JWT Secret for session tokens (generate a random string)
You can generate one using: openssl rand -base64 32
JWT_SECRET=your-super-secret-jwt-key-here-minimum-32-characters

Database Connection (Vercel Postgres)
Get this from your Vercel dashboard -> Storage -> Postgres -> Connection String
POSTGRES_URL=postgres://username:password@host:port/database
POSTGRES_PRISMA_URL=postgres://username:password@host:port/database
POSTGRES_URL_NON_POOLING=postgres://username:password@host:port/database

OPTIONAL - Email Service (Choose ONE)

Option 1: Resend (Recommended - Easy setup)
RESEND_API_KEY=re_your_resend_api_key_here
RESEND_FROM_EMAIL=Chefora <noreply@yourdomain.com>

Option 2: SendGrid
SENDGRID_API_KEY=SG.your_sendgrid_api_key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com

Option 3: SMTP (Generic email server)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com

OPTIONAL - Backend API Keys

Groq API Key (for AI recipe generation)
Get from: https://console.groq.com/
GROQ_API_KEY=your_groq_api_key_here

Spoonacular API Key (for recipe data)
Get from: https://spoonacular.com/food-api
SPOONACULAR_API_KEY=your_spoonacular_api_key

Edamam API Keys (for nutrition data)
Get from: https://developer.edamam.com/
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key

Google Custom Search (for recipe images)
Get from: https://developers.google.com/custom-search
GOOGLE_SEARCH_KEY=your_google_search_api_key
GOOGLE_SEARCH_CX=your_google_search_cx

Unsplash (for high-quality food images)
Get from: https://unsplash.com/developers
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

Environment
NODE_ENV=development
```

Important Notes:
- Replace all placeholder values with your actual API keys and credentials
- The JWT_SECRET must be at least 32 characters long
- For development, email will log to console if no email service is configured
- You can skip optional API keys if you don't need those features

### Step 5: Set Up Backend Environment Variables

Create a .env file in the chefora-backend directory:

```bash
# Navigate to backend directory
cd chefora-backend

# Create .env file
touch .env
```

Add the same environment variables to chefora-backend/.env (especially the API keys):

```env
Backend API Keys
GROQ_API_KEY=your_groq_api_key_here
SPOONACULAR_API_KEY=your_spoonacular_api_key
EDAMAM_APP_ID=your_edamam_app_id
EDAMAM_APP_KEY=your_edamam_app_key
GOOGLE_SEARCH_KEY=your_google_search_api_key
GOOGLE_SEARCH_CX=your_google_search_cx
UNSPLASH_ACCESS_KEY=your_unsplash_access_key

Port (optional, defaults to 4000)
PORT=4000
```

### Step 6: Set Up the Database

#### Option A: Using Vercel Postgres (Recommended)

1. Go to vercel.com and sign up/login
2. Create a new project or use an existing one
3. Go to Storage → Create Database → Postgres
4. Copy the connection strings and add them to your .env.local file

#### Option B: Using Local PostgreSQL

1. Start your PostgreSQL server
2. Create a new database:
   ```sql
   CREATE DATABASE chefora;
   ```
3. Update your .env.local with:
   ```env
   POSTGRES_URL=postgresql://username:password@localhost:5432/chefora
   ```

### Step 7: Run Database Migrations

The application uses several SQL migration files. Run them in this order:

1. Core User Tables (if not already created):
   - Visit: http://localhost:3000/api/dev/seed
   - Or run the SQL manually from the seed endpoint code

2. Community Module:
   - Run the SQL from: src/app/community/migration.sql
   - You can use psql, pgAdmin, or any PostgreSQL client

3. Pantry Module:
   - Run: src/app/pantry/migration.sql

4. Shopping List Module:
   - Run: src/app/shopping-list/migration.sql

5. Dashboard Module:
   - Run: src/app/dashboard/migration.sql

6. 2FA Module:
   - Run: src/app/api/auth/2fa/migration.sql

7. Forgot Password Module:
   - Run: src/app/auth/forgot-password/migration.sql

Using psql command line:
```bash
psql -U username -d chefora -f src/app/community/migration.sql
psql -U username -d chefora -f src/app/pantry/migration.sql
psql -U username -d chefora -f src/app/shopping-list/migration.sql
psql -U username -d chefora -f src/app/dashboard/migration.sql
psql -U username -d chefora -f src/app/api/auth/2fa/migration.sql
psql -U username -d chefora -f src/app/auth/forgot-password/migration.sql
```

Or using a GUI tool:
- Open pgAdmin, DBeaver, or TablePlus
- Connect to your database
- Open each .sql file and execute it

### Step 8: Start the Development Servers

You need to run two servers simultaneously:

#### Terminal 1: Frontend (Next.js)

```bash
# Make sure you're in the root directory
npm run dev
```

The frontend will start on: http://localhost:3000

#### Terminal 2: Backend (Express.js)

```bash
# Navigate to backend directory
cd chefora-backend

# Start the backend server
npm run dev
```

The backend will start on: http://localhost:4000 (or the PORT you specified)

Note: Keep both terminals running while developing.

## Usage

### First Time Setup

1. Open your browser and navigate to: http://localhost:3000
2. You'll be redirected to the login page
3. Click Sign Up to create a new account
4. Fill in your details and complete the onboarding process
5. Start exploring Chefora

### Key Pages

- Home (/): Recipe browsing and discovery
- Dashboard (/dashboard): AI recipe generation and tracking
- Pantry (/pantry): Manage your ingredients
- Shopping List (/shopping-list): Create and manage shopping lists
- Community (/community): Social feed and interactions
- Messages (/messages): Direct messaging
- Settings (/settings): Account settings and preferences

## Development

### Project Structure

```
Chefora/
├── src/
│   ├── app/                    # Next.js App Router pages
│   │   ├── api/               # API routes
│   │   ├── auth/              # Authentication pages
│   │   ├── community/         # Community module
│   │   ├── dashboard/         # Dashboard features
│   │   ├── pantry/            # Pantry management
│   │   ├── shopping-list/    # Shopping list features
│   │   └── ...
│   ├── components/            # React components
│   ├── lib/                   # Utility functions
│   └── middleware.ts          # Next.js middleware
├── chefora-backend/           # Express.js backend server
├── public/                    # Static assets
├── package.json               # Frontend dependencies
└── .env.local                 # Environment variables
```

### Available Scripts

Frontend (root directory):
```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

Backend (chefora-backend/ directory):
```bash
npm run dev      # Start with nodemon (auto-reload)
npm start        # Start production server
```

### Database Schema

See DATABASE_SCHEMA_DIAGRAM.md for a complete database schema diagram.

## Troubleshooting

### Common Issues

#### 1. Missing JWT_SECRET Error
Solution: Make sure JWT_SECRET is set in your .env.local file and is at least 32 characters long.

#### 2. Database Connection Errors
Solution: 
- Verify your POSTGRES_URL is correct
- Check if your database server is running
- Ensure your IP is whitelisted (for cloud databases)

#### 3. Module Not Found Errors
Solution: 
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

#### 4. Port Already in Use
Solution: 
- Change the port in package.json scripts: next dev -p 3001
- Or kill the process using the port:
  ```bash
  # Windows
  netstat -ano | findstr :3000
  taskkill /PID <PID> /F
  
  # Mac/Linux
  lsof -ti:3000 | xargs kill
  ```

#### 5. Email Not Sending
Solution: 
- In development, emails log to console by default
- For production, configure one of the email services (Resend, SendGrid, or SMTP)
- Check your email service API keys are correct

#### 6. Migration Errors
Solution: 
- Make sure you're running migrations in the correct order
- Check that the database exists and you have proper permissions
- Some migrations depend on others (e.g., community tables need users table)

### Getting Help

1. Check the browser console for errors (F12 → Console)
2. Check the terminal output for server errors
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed
5. Make sure both frontend and backend servers are running

## Production Deployment

### Building for Production

```bash
# Build the Next.js application
npm run build

# Start production server
npm start
```

### Environment Variables for Production

Make sure to set all environment variables in your hosting platform:
- Vercel: Add variables in Project Settings → Environment Variables
- Other platforms: Follow their documentation for setting environment variables

### Recommended Hosting

- Frontend: Vercel (seamless Next.js integration)
- Backend: Railway, Render, or any Node.js hosting
- Database: Vercel Postgres or Supabase

## Security Notes

- Never commit .env.local or .env files to version control
- Use strong, unique JWT_SECRET values
- Keep your API keys secure and rotate them regularly
- Use HTTPS in production
- Enable 2FA for user accounts (feature is built-in)

## License

[Add your license here]

## Contributors

[Add contributor information here]

## Acknowledgments

- Next.js team for the amazing framework
- Vercel for hosting and database solutions
- All open-source contributors whose packages made this possible

---

Happy Cooking with Chefora

