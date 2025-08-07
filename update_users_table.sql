-- Add missing fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone TEXT,
ADD COLUMN IF NOT EXISTS subscription_type TEXT DEFAULT 'free',
ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'active',
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing users to have the default subscription values
UPDATE users 
SET subscription_type = 'free', 
    subscription_status = 'active' 
WHERE subscription_type IS NULL OR subscription_status IS NULL;
