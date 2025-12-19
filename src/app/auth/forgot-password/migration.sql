-- Migration for password reset codes table
-- Run this migration to create the password_reset_codes table

CREATE TABLE IF NOT EXISTS password_reset_codes (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  code TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, code)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_user_id ON password_reset_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_email ON password_reset_codes(email);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_code ON password_reset_codes(code);
CREATE INDEX IF NOT EXISTS idx_password_reset_codes_expires_at ON password_reset_codes(expires_at);

-- Clean up expired codes periodically (you can run this manually or set up a cron job)
-- DELETE FROM password_reset_codes WHERE expires_at < NOW();




