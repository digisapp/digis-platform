-- Add message_charge and message_earnings to transaction_type enum

ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'message_charge';
ALTER TYPE transaction_type ADD VALUE IF NOT EXISTS 'message_earnings';

-- Add comments
COMMENT ON TYPE transaction_type IS 'Types of wallet transactions including message charges and earnings';
