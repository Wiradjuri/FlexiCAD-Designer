-- Webhook Events Table for Admin Test Harness
-- Optional table for tracking webhook events in admin tests
-- This table is for the admin system only and not required for normal operation

CREATE TABLE IF NOT EXISTS webhook_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    event_id VARCHAR(255) UNIQUE NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    customer_email VARCHAR(255),
    customer_id VARCHAR(255),
    subscription_id VARCHAR(255),
    session_id VARCHAR(255),
    amount_total INTEGER,
    currency VARCHAR(10),
    status VARCHAR(50),
    metadata JSONB DEFAULT '{}',
    raw_data JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_webhook_events_customer_email ON webhook_events(customer_email);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_type ON webhook_events(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created_at ON webhook_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_event_id ON webhook_events(event_id);

-- RLS Policies
ALTER TABLE webhook_events ENABLE ROW LEVEL SECURITY;

-- Admin can see all webhook events
CREATE POLICY "Admin can view all webhook events" ON webhook_events
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM profiles WHERE email = 'bmuzza1992@gmail.com'
        )
    );

-- System can insert webhook events
CREATE POLICY "System can insert webhook events" ON webhook_events
    FOR INSERT WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
    );

-- Add trigger to update processed_at
CREATE OR REPLACE FUNCTION update_webhook_processed_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.processed_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER webhook_events_processed_trigger
    BEFORE UPDATE ON webhook_events
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_processed_at();