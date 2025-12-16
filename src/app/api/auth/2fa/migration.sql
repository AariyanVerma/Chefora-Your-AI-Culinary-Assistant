-- Migration for 2FA (Two-Factor Authentication) using Google Authenticator
-- Run this migration to add TOTP secret column to users table

-- Add totp_secret column to store the encrypted secret key
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS totp_secret TEXT;

-- Add index for faster lookups (if needed in future)
-- CREATE INDEX IF NOT EXISTS idx_users_totp_secret ON users(totp_secret) WHERE totp_secret IS NOT NULL;

-- Note: totp_secret will be NULL if 2FA is not enabled
-- When 2FA is enabled, this will store the base32 encoded secret key
