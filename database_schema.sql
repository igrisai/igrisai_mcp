-- Dead Hand Switch Database Schema
-- PostgreSQL Database Setup

-- Create database (run this as superuser)
-- CREATE DATABASE deadhand_db;

-- Connect to the database and run the following:

-- Create dead_hand_configs table
CREATE TABLE IF NOT EXISTS dead_hand_configs (
    id SERIAL PRIMARY KEY,
    user_address VARCHAR(42) NOT NULL UNIQUE,
    smart_account VARCHAR(42) NOT NULL,
    timeout_seconds INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_dead_hand_configs_user_address ON dead_hand_configs(user_address);
CREATE INDEX IF NOT EXISTS idx_dead_hand_configs_is_active ON dead_hand_configs(is_active);
CREATE INDEX IF NOT EXISTS idx_dead_hand_configs_created_at ON dead_hand_configs(created_at);

-- Insert sample data (optional)
INSERT INTO dead_hand_configs (user_address, smart_account, timeout_seconds, is_active) 
VALUES 
    ('0xb6a9f22642c126d2700cbd17940b334e866234ae', '0x1234567890123456789012345678901234567890', 20, true),
    ('0xd8da6bf26964af9d7eed9e03e53415d37aa96045', '0x0987654321098765432109876543210987654321', 10, true)
ON CONFLICT (user_address) DO NOTHING;

-- Create a function to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_dead_hand_configs_updated_at 
    BEFORE UPDATE ON dead_hand_configs 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed)
-- GRANT ALL PRIVILEGES ON TABLE dead_hand_configs TO your_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE dead_hand_configs_id_seq TO your_app_user;
