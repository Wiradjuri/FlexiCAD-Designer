-- Run this in your Supabase SQL editor to set up the promo codes system

-- Create the promo_codes table
CREATE TABLE IF NOT EXISTS promo_codes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    discount_percent INTEGER NOT NULL CHECK (discount_percent BETWEEN 1 AND 100),
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE promo_codes ENABLE ROW LEVEL SECURITY;

-- Admin can view/manage all promo codes
CREATE POLICY "Admin can manage promo codes" ON promo_codes
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE profiles.id = auth.uid() 
            AND profiles.email = 'bmuzza1992@gmail.com'
        )
    );

-- Create some example promo codes
INSERT INTO promo_codes (code, description, discount_percent, expires_at) VALUES
('WELCOME20', '20% off for new customers', 20, '2025-12-31 23:59:59+00'),
('EARLYBIRD', '30% off early bird special', 30, '2025-11-30 23:59:59+00'),
('STUDENT15', '15% student discount', 15, NULL),
('BLACKFRIDAY', '50% Black Friday special', 50, '2025-11-30 23:59:59+00')
ON CONFLICT (code) DO NOTHING;

-- Success message
SELECT 'Promo codes system created successfully!' as status;
SELECT 'Admin user: bmuzza1992@gmail.com' as admin_info;
SELECT 'Created ' || count(*) || ' example promo codes' as promo_count FROM promo_codes;