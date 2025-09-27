-- Migration to add payment tracking fields to profiles table
-- Run this in your Supabase SQL Editor

-- Add payment-related columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'none' CHECK (subscription_plan IN ('none', 'monthly', 'yearly'));

-- Create index for payment status queries
CREATE INDEX IF NOT EXISTS profiles_is_paid_idx ON public.profiles(is_paid);
CREATE INDEX IF NOT EXISTS profiles_stripe_customer_idx ON public.profiles(stripe_customer_id);

-- Create function to mark user as paid
CREATE OR REPLACE FUNCTION public.mark_user_as_paid(
    user_email TEXT,
    customer_id TEXT,
    subscription_id TEXT,
    plan TEXT
)
RETURNS void AS $$
BEGIN
    UPDATE public.profiles 
    SET 
        is_paid = true,
        stripe_customer_id = customer_id,
        stripe_subscription_id = subscription_id,
        payment_date = NOW(),
        subscription_plan = plan,
        updated_at = NOW()
    WHERE email = user_email;
    
    -- If no rows were updated, it means the profile doesn't exist yet
    -- This could happen if the webhook fires before the profile trigger
    IF NOT FOUND THEN
        RAISE NOTICE 'Profile not found for email: %', user_email;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check if user has paid
CREATE OR REPLACE FUNCTION public.get_user_payment_status(user_uuid UUID)
RETURNS TABLE(is_paid BOOLEAN, subscription_plan TEXT, payment_date TIMESTAMP WITH TIME ZONE) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.is_paid,
        p.subscription_plan,
        p.payment_date
    FROM public.profiles p
    WHERE p.id = user_uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT EXECUTE ON FUNCTION public.mark_user_as_paid TO service_role;
GRANT EXECUTE ON FUNCTION public.get_user_payment_status TO authenticated;