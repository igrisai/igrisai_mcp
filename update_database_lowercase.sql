-- Update existing records to lowercase
UPDATE dead_hand_configs 
SET user_address = LOWER(user_address), 
    smart_account = LOWER(smart_account);

-- Create a function to automatically convert addresses to lowercase
CREATE OR REPLACE FUNCTION convert_addresses_to_lowercase()
RETURNS TRIGGER AS $$
BEGIN
    NEW.user_address = LOWER(NEW.user_address);
    NEW.smart_account = LOWER(NEW.smart_account);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically convert addresses to lowercase on insert/update
DROP TRIGGER IF EXISTS trigger_convert_addresses_to_lowercase ON dead_hand_configs;
CREATE TRIGGER trigger_convert_addresses_to_lowercase
    BEFORE INSERT OR UPDATE ON dead_hand_configs
    FOR EACH ROW
    EXECUTE FUNCTION convert_addresses_to_lowercase();

-- Verify the update worked
SELECT user_address, smart_account FROM dead_hand_configs;
