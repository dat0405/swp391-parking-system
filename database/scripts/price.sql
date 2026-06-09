ALTER TABLE pricing_policies
ADD base_price DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE pricing_policies
ADD weekend_multiplier DECIMAL(10,2) DEFAULT 1;

ALTER TABLE pricing_policies
ADD holiday_multiplier DECIMAL(10,2) DEFAULT 1;

UPDATE pricing_policies
SET weekend_multiplier = 1.5,
    holiday_multiplier = 2.0;

