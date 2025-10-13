-- HonestBite Database Schema
-- PostgreSQL database for Supabase

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) UNIQUE NOT NULL,
  health_conditions TEXT[] DEFAULT '{}',
  allergies TEXT[] DEFAULT '{}',
  doctor_link VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Scans table
CREATE TABLE IF NOT EXISTS scans (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
  product_name VARCHAR(500),
  barcode VARCHAR(50),
  truth_score INTEGER CHECK (truth_score >= 1 AND truth_score <= 10),
  risk_factors TEXT[] DEFAULT '{}',
  scan_type VARCHAR(50) DEFAULT 'barcode',
  scanned_at TIMESTAMP DEFAULT NOW()
);

-- Products table (cache for Open Food Facts data)
CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  barcode VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(500),
  brand VARCHAR(255),
  category VARCHAR(255),
  ingredients TEXT,
  nutrition_facts JSONB,
  truth_score INTEGER,
  risk_flags TEXT[] DEFAULT '{}',
  data_source VARCHAR(100) DEFAULT 'Open Food Facts',
  last_updated TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

-- FSSAI Products table (manual Indian products database)
CREATE TABLE IF NOT EXISTS fssai_products (
  id SERIAL PRIMARY KEY,
  barcode VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(500) NOT NULL,
  brand VARCHAR(255),
  category VARCHAR(255),
  fssai_license VARCHAR(100),
  fssai_approved BOOLEAN DEFAULT TRUE,
  nutrition_info JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_scanned_at ON scans(scanned_at DESC);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_fssai_products_barcode ON fssai_products(barcode);

-- Create updated_at trigger for users table
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_fssai_products_updated_at BEFORE UPDATE ON fssai_products
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE users IS 'User profiles with health conditions and allergies';
COMMENT ON TABLE scans IS 'Product scan history for all users';
COMMENT ON TABLE products IS 'Cached product data from Open Food Facts API';
COMMENT ON TABLE fssai_products IS 'Manual database of FSSAI-approved Indian products';
