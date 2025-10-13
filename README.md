# 🥗 HonestBite

## What is This App?

HonestBite is an AI-powered nutrition transparency platform built for Indian consumers to make informed food choices. It debunks misleading food marketing by scanning product barcodes and labels using OCR technology, cross-referencing against FSSAI standards and nutritional databases. The app generates simple 1-10 truth scores, detects greenwashing buzzwords using NLP, and provides personalized health alerts based on user allergies and chronic conditions like diabetes or hypertension. It integrates with healthcare through doctor dashboards where physicians can monitor patient nutrition patterns, receive automated alerts for risky consumption, and export PDF reports. Focusing on India's food landscape with local FSSAI product data, this platform connects consumers, products, and healthcare providers in a unified nutrition ecosystem.

---

## 🏗️ Architecture & Structure

### System Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   React App     │    │   Node.js API   │    │  PostgreSQL DB  │
│   (Frontend)    │◄──►│   (Backend)     │◄──►│   (Supabase)    │
│   Vite + React  │    │   Express       │    │   4 Tables      │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                              │
                              ▼
                    ┌─────────────────────────┐
                    │   External APIs         │
                    │ • Hugging Face (NLP)    │
                    │ • Open Food Facts (DB)  │
                    └─────────────────────────┘
```

### Tech Stack

**Frontend:**
- React 18 with Vite (fast dev server)
- Tesseract.js (client-side OCR)
- ZXing-JS (barcode scanning)
- React Router v6 (navigation)
- Responsive design with CSS custom properties

**Backend:**
- Node.js + Express (REST API)
- PostgreSQL via Supabase (database)
- Winston (logging)
- Helmet + CORS (security)
- Rate limiting (100 req/15min)

**External Services:**
- Supabase (PostgreSQL hosting)
- Hugging Face (NLP for greenwashing detection)
- Open Food Facts (product database)

### Project Structure

```
honestbite/
├── frontend/              # React application
│   ├── src/
│   │   ├── pages/        # Page components (Home, Scanner, Profile, etc.)
│   │   ├── services/     # API communication layer
│   │   └── utils/        # OCR, barcode, helpers
│   ├── index.html
│   └── package.json
│
├── backend/              # Node.js API server
│   ├── routes/          # API endpoints (scan, user, doctor, product)
│   ├── services/        # Business logic (NLP, OpenFoodFacts)
│   ├── middleware/      # Error handling, rate limiting
│   ├── config/          # Database configuration
│   ├── utils/           # Truth score calculation, logging
│   └── server.js        # Entry point
│
├── database/            # SQL schemas and seed data
│   ├── schema.sql      # Table definitions (users, products, scans, etc.)
│   └── seeds/          # Test data (15 FSSAI products)
│
└── package.json        # Root workspace configuration
```

### Database Schema

**4 Main Tables:**
1. `users` - User profiles with health conditions & allergies
2. `products` - Product database (barcode, nutrition facts, FSSAI data)
3. `scans` - Scan history linking users to products with truth scores
4. `health_alerts` - Generated alerts for risky products

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Git
- Supabase account (free tier)
- Hugging Face account (optional, for NLP)

### 1. Clone & Install

```powershell
# Navigate to project
cd "honestbite"

# Install all dependencies
npm install
npm run install:all
```

### 2. Set Up Supabase Database

1. Create account at https://supabase.com (free tier)
2. Create new project
3. Go to SQL Editor and run:
   - `database/schema.sql` (creates 4 tables)
   - `database/seeds/fssai_products.sql` (adds 15 test products)
4. Get credentials from **Project Settings → API**:
   - SUPABASE_URL
   - SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - DATABASE_URL (from Database settings)

### 3. Configure Environment

**Frontend** (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:3001
VITE_ENVIRONMENT=development
```

**Backend** (`backend/.env`):
```env
PORT=3001
NODE_ENV=development

# Supabase (REQUIRED)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:[password]@db.xxxxx.supabase.co:5432/postgres

# Hugging Face (OPTIONAL - for greenwashing NLP)
HUGGING_FACE_API_KEY=hf_xxxxx
HF_TOKEN=hf_xxxxx

# APIs
OPEN_FOOD_FACTS_URL=https://world.openfoodfacts.org/api/v0
CORS_ORIGINS=http://localhost:5173
```

### 4. Run the Application

```powershell
# Start both frontend and backend together
npm run dev
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

### 5. Test with Sample Data

**Complete User Flow:**
1. Open http://localhost:5173
2. Complete onboarding (select health conditions/allergies)
3. Go to Scanner page
4. Enter test barcode: `8901030123456` (Britannia Bread)
5. View truth score and personalized alerts
6. Check Profile page for scan history
7. Copy doctor link and access dashboard: `/doctor/[your-user-id]`

---

## 🧪 Testing Barcodes

Use these barcodes from seed data for testing:

| Barcode | Product | Truth Score | Notes |
|---------|---------|-------------|-------|
| `8901030123456` | Britannia Whole Wheat Bread | 8/10 | Healthy |
| `8901063112148` | Good Day Butter Cookies | 4/10 | High sugar |
| `8901030741715` | Maggi Noodles | 3/10 | Very high sodium |
| `8901030896545` | Kellogg's Cornflakes | 7/10 | Low sugar variant |
| `8906010340193` | Amul Whole Milk | 6/10 | Good protein |
| `8906010340810` | Amul Paneer | 7/10 | High protein |
| `8906010340308` | Amul Ice Cream | 3/10 | High sugar/fat |
| `8901063001015` | Parle-G Biscuits | 5/10 | Moderate sugar |
| `8901063003743` | Monaco Biscuits | 4/10 | High sodium |
| `8906010340209` | Amul Butter | 4/10 | Very high fat |

**Test Health Profiles:**
- **Diabetes**: Test with high-sugar products (cookies, ice cream)
- **Hypertension**: Test with high-sodium products (Maggi, Monaco)
- **Lactose Intolerance**: Test with dairy products (milk, paneer)
- **Gluten Allergy**: Test with wheat-based products (bread)

**Doctor Dashboard Access:**
1. Complete user onboarding and note your User ID from Profile page
2. Access dashboard at: `http://localhost:5173/doctor/[your-user-id]`
3. View scan history, health alerts, and risk patterns
4. Export PDF report for patient

