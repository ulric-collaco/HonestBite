-- Migration from PostgreSQL to Cloudflare D1 (SQLite)

-- 1. Users table
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL UNIQUE,
    health_conditions TEXT DEFAULT '[]', -- Stored as JSON string
    allergies TEXT DEFAULT '[]',         -- Stored as JSON string
    doctor_link TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. Scans table
CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT,
    product_name TEXT,
    barcode TEXT,
    truth_score INTEGER,
    risk_factors TEXT DEFAULT '[]', -- Stored as JSON string
    scan_type TEXT DEFAULT 'barcode',
    scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 3. Products table (Open Food Facts Cache)
CREATE TABLE IF NOT EXISTS products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT NOT NULL UNIQUE,
    name TEXT,
    brand TEXT,
    category TEXT,
    ingredients TEXT,
    nutrition_facts TEXT, -- Stored as JSON string
    truth_score INTEGER,
    risk_flags TEXT DEFAULT '[]', -- Stored as JSON string
    data_source TEXT DEFAULT 'Open Food Facts',
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 4. FSSAI Products table
CREATE TABLE IF NOT EXISTS fssai_products (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    barcode TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    brand TEXT,
    category TEXT,
    fssai_license TEXT,
    fssai_approved INTEGER DEFAULT 1, -- 1=True, 0=False
    nutrition_info TEXT, -- Stored as JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 5. Dismissed Alerts table (Functional Fix)
CREATE TABLE IF NOT EXISTS dismissed_alerts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    alert_key TEXT NOT NULL,
    dismissed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, alert_key)
);

-- 6. Clinical Notes table (Functional Fix)
CREATE TABLE IF NOT EXISTS clinical_notes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    note_text TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_scans_user_id ON scans(user_id);
CREATE INDEX IF NOT EXISTS idx_products_barcode ON products(barcode);
CREATE INDEX IF NOT EXISTS idx_fssai_barcode ON fssai_products(barcode);
CREATE INDEX IF NOT EXISTS idx_notes_user ON clinical_notes(user_id);
CREATE INDEX IF NOT EXISTS idx_dismissed_user ON dismissed_alerts(user_id);
