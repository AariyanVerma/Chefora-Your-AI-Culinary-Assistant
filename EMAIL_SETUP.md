# Email Setup for Password Reset

To enable email sending for password reset codes, configure one of the following email services:

## Option 1: Resend (Recommended - Easy & Free)

1. Sign up at [resend.com](https://resend.com)
2. Get your API key from the dashboard
3. Add to `.env.local`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxxx
   ```
   
   **For Development/Testing (No domain verification needed):**
   ```
   RESEND_FROM_EMAIL=Chefora <onboarding@resend.dev>
   ```
   
   **For Production (Requires domain verification):**
   ```
   RESEND_FROM_EMAIL=Chefora <noreply@yourdomain.com>
   ```
   
   **Note:** If `RESEND_FROM_EMAIL` is not set, the system will automatically use `onboarding@resend.dev` in development mode. For production, you must verify your domain in Resend dashboard.

## Option 2: SendGrid

1. Sign up at [sendgrid.com](https://sendgrid.com)
2. Create an API key with "Mail Send" permissions
3. Add to `.env.local`:
   ```
   SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
   SENDGRID_FROM_EMAIL=noreply@yourdomain.com
   ```

## Option 3: SMTP (Gmail, Outlook, etc.)

Add to `.env.local`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=Chefora <your-email@gmail.com>
```

**Note for Gmail:** You'll need to use an [App Password](https://support.google.com/accounts/answer/185833) instead of your regular password.

## Development Mode

If no email service is configured, the code will be logged to your **server console** (terminal) for testing purposes. This is NOT secure for production.

## Testing

1. Start your development server: `npm run dev`
2. Request a password reset
3. Check:
   - **With email configured**: Check the user's email inbox
   - **Without email configured**: Check your server console (terminal where `npm run dev` is running)
