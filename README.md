# 🥗 HonestBite

## What is This App?

HonestBite is an **AI-powered nutrition transparency platform** built for Indian consumers to make informed food choices. It debunks misleading food marketing by scanning product barcodes and labels using OCR technology, cross-referencing against FSSAI standards and nutritional databases. 

### 🤖 **NEW: AI-Enhanced Features**
- **Intelligent Nutrition Agent** powered by GPT-4 with Indian dietary knowledge
- **Enhanced OCR** with multi-language support (Hindi, Tamil, Bengali, etc.)
- **Conversational interface** for personalized nutrition advice
- **Smart product research** for unknown items using ingredient analysis
- **Cultural context** with comparisons to traditional Indian foods

The app generates simple 1-10 truth scores, detects greenwashing buzzwords using NLP, and provides personalized health alerts based on user allergies and chronic conditions like diabetes or hypertension. It integrates with healthcare through doctor dashboards where physicians can monitor patient nutrition patterns, receive automated alerts for risky consumption, and export PDF reports. Focusing on India's food landscape with local FSSAI product data, this platform connects consumers, products, and healthcare providers in a unified nutrition ecosystem.

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
                    │   AI & External APIs    │
                    │ • GPT-4 Agent (NEW)     │
                    │ • Enhanced OCR (NEW)    │
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
- **GPT-4 AI Agent** (nutrition analysis & chat)
- **Enhanced OCR** (multi-language support)
- Winston (logging)
- Helmet + CORS (security)
- Rate limiting (100 req/15min)

**External Services:**
- Supabase (PostgreSQL hosting)
- **OpenAI GPT-4** (intelligent nutrition agent)
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

# AI Configuration (REQUIRED for AI features)
OPENAI_API_KEY=sk-xxxxx

# Hugging Face (OPTIONAL - for enhanced NLP)
HUGGING_FACE_API_KEY=hf_xxxxx
HF_TOKEN=hf_xxxxx

# APIs
OPEN_FOOD_FACTS_URL=https://world.openfoodfacts.org/api/v0
CORS_ORIGINS=http://localhost:5173
```

### 4. Quick Setup (Automated)

**Windows (PowerShell):**
```powershell
.\setup-ai.ps1
```

**Linux/Mac:**
```bash
chmod +x setup-ai.sh
./setup-ai.sh
```

### 5. Run the Application

```powershell
# Start both frontend and backend together
npm run dev
```

**Access the app:**
- Frontend: http://localhost:5173
- Backend API: http://localhost:3001
- Health Check: http://localhost:3001/health

### 6. Test with Sample Data

**Complete User Flow:**
1. Open http://localhost:5173
2. Complete onboarding (select health conditions/allergies)
3. Go to Scanner page
4. Enter test barcode: `8901030123456` (Britannia Bread)
5. View truth score and personalized alerts
6. **Try the AI chat**: Ask questions about the product
7. Check Profile page for scan history
8. Copy doctor link and access dashboard: `/doctor/[your-user-id]`

### 7. AI Features Demo

**Try these AI interactions:**
- **Product Analysis**: "Is this safe for my diabetes?"
- **Alternatives**: "What are healthier alternatives?"
- **Nutrition Education**: "Explain why high sodium is bad"
- **Cultural Context**: "How does this compare to traditional Indian snacks?"
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

---

## 🤖 AI Features

HonestBite now includes powerful AI capabilities that transform the user experience:

### **Intelligent Nutrition Agent**
- **GPT-4 powered** analysis with Indian dietary knowledge
- **Personalized recommendations** based on health conditions
- **Cultural context** with traditional food comparisons
- **Real-time chat** interface for nutrition queries

### **Enhanced OCR System**
- **Multi-language support** (Hindi, Tamil, Bengali, Gujarati, Marathi)
- **AI-powered error correction** for better accuracy
- **Intelligent data extraction** from product labels
- **Automatic validation** of nutrition values

### **Smart Features**
- **Product research** for unknown items using ingredient analysis
- **Alternative suggestions** from database with reasoning
- **Conversation memory** for context-aware responses
- **Confidence scoring** for all AI recommendations

**📖 Detailed Documentation:** See [AI_FEATURES.md](AI_FEATURES.md) for complete API reference and implementation details.

---

## 🚀 API Endpoints

### Core APIs
- `GET /health` - Health check
- `POST /api/scan` - Product scanning (now with AI insights)
- `GET /api/user/:id` - User profile
- `GET /api/doctor/:id` - Doctor dashboard

### AI APIs (NEW)
- `POST /api/agent/chat` - Interactive chat with nutrition agent
- `POST /api/agent/analyze-product` - AI product analysis
- `POST /api/agent/research-unknown` - Research unknown products
- `POST /api/ocr/process` - Enhanced OCR with AI
- `POST /api/ocr/extract-nutrition` - Extract nutrition facts
- `POST /api/ocr/translate` - Multi-language OCR translation

**🔗 Full API documentation:** Available in [AI_FEATURES.md](AI_FEATURES.md)

---

## 🛠 Technology Stack

### **Backend Technologies**
- **Node.js + Express** - REST API server
- **PostgreSQL + Supabase** - Database and hosting
- **OpenAI GPT-4** - Intelligent nutrition agent
- **LangChain** - AI workflow orchestration
- **Winston** - Logging and monitoring

### **Frontend Technologies**
- **React 18 + Vite** - Modern frontend framework
- **Tesseract.js** - Client-side OCR
- **ZXing-JS** - Barcode scanning
- **Axios** - API communication

### **AI & ML Stack**
- **OpenAI GPT-4** - Primary language model
- **Custom Knowledge Base** - Indian nutrition data
- **Multi-language OCR** - Enhanced text extraction
- **Tool Calling** - Structured AI interactions

