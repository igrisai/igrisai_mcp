-- Dead Hand Switch Database Schema
-- PostgreSQL Database Setup

-- Create database (run this as superuser)
-- CREATE DATABASE deadhand_db;

-- Connect to the database and run the following:

-- Create delegations table (NEW)
CREATE TABLE IF NOT EXISTS public.delegations (
    id BIGSERIAL NOT NULL,
    user_address TEXT NOT NULL,
    beneficiary_address TEXT NOT NULL,
    kernel_client TEXT NOT NULL,
    timeout INTEGER NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    ens_name TEXT NULL,
    created_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NULL DEFAULT now(),
    igris_address TEXT NULL,
    CONSTRAINT delegations_pkey PRIMARY KEY (id)
) TABLESPACE pg_default;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_delegations_user_address ON public.delegations USING btree (user_address) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_delegations_beneficiary_address ON public.delegations USING btree (beneficiary_address) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_delegations_is_active ON public.delegations USING btree (is_active) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_delegations_user_active ON public.delegations USING btree (user_address, is_active) TABLESPACE pg_default;
CREATE INDEX IF NOT EXISTS idx_delegations_igris_address ON public.delegations USING btree (igris_address) TABLESPACE pg_default;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_delegations_updated_at 
    BEFORE UPDATE ON delegations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Insert sample data (optional)
INSERT INTO delegations (user_address, beneficiary_address, kernel_client, timeout, is_active, ens_name, igris_address) 
VALUES 
    ('0xb6a9f22642c126d2700cbd17940b334e866234ae', '0x1234567890123456789012345678901234567890', 'kernel-client-v1', 20, true, null, '0xigris123'),
    ('0xd8da6bf26964af9d7eed9e03e53415d37aa96045', '0x0987654321098765432109876543210987654321', 'kernel-client-v1', 10, true, 'test.eth', null)
ON CONFLICT DO NOTHING;

-- Legacy dead_hand_configs table (deprecated but kept for backward compatibility)
CREATE TABLE IF NOT EXISTS dead_hand_configs (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL UNIQUE,
    smart_account VARCHAR(42) NOT NULL,
    timeout_seconds INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON TABLE delegations TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE delegations_id_seq TO your_app_user;
