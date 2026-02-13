-- Credit Listings table for marketplace
-- Individuals can list their credits for sale

CREATE TABLE IF NOT EXISTS credit_listings (
    id SERIAL PRIMARY KEY,
    seller_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    amount DECIMAL(15, 2) NOT NULL,
    price_per_credit DECIMAL(15, 2) DEFAULT 1.00,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'sold', 'cancelled')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for credit_listings
CREATE INDEX IF NOT EXISTS idx_credit_listings_seller ON credit_listings(seller_id);
CREATE INDEX IF NOT EXISTS idx_credit_listings_status ON credit_listings(status);
CREATE INDEX IF NOT EXISTS idx_credit_listings_date ON credit_listings(created_at DESC);

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_credit_listings_updated_at ON credit_listings;
CREATE TRIGGER update_credit_listings_updated_at BEFORE UPDATE ON credit_listings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
