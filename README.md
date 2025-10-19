imple# 🥗 HonestBite

An AI-powered nutrition transparency app that scans product barcodes, fetches trusted data, and explains it in plain language for Indian consumers. You get an instant rating, safety flags (e.g., sugar/sodium), and a chatty nutrition assistant.

## 🧭 System design (high-level)

```
┌───────────────┐        ┌───────────────────────┐        ┌───────────────────┐
│  React (Vite) │  HTTP  │  Node.js Express API  │  SDK   │  External Services │
│  Frontend     │◄──────►│  /api/*               │◄──────►│  • HF YOLOv8 (det) │
│  Scanner, UX  │        │  • /barcode/extract   │        │  • ZXing (decode)  │
└─────▲───┬─────┘        │  • /scan (product)    │        │  • OpenFoodFacts   │
      │   │               │  • /agent/* (AI)      │        │  • Supabase (DB)   │
      │   │               └───────────▲───────────┘        └─────────▲─────────┘
      │   │                           │                                 │
      │   └───────────── Product/Chat ┴─────────────► Insights + Storage │
      └────────────────────────────── UI ◄────────────────────────────────┘
```

Core pipeline for scanning images:
- Frontend uploads a photo to `POST /api/barcode/extract`.
- Backend calls Hugging Face Piero2411/YOLOV8s-Barcode-Detection to detect boxes, crops with Sharp, and decodes with ZXing.
- The best barcode is used to look up a product (/api/scan), combine with Open Food Facts and DB data, and show rating immediately.
- The Nutrition Assistant (Gemini-backed) answers “when/how much” and other questions on demand.

## ✨ Features

- Fast barcode extraction: YOLOv8 detector (Hugging Face) + Sharp crop + ZXing decode
- Product truth score: instant 1–10 rating and key warnings
- Nutrition Assistant: contextual Q&A (Gemini), not blocking the rating
- Open Food Facts integration and local DB storage via Supabase
- Doctor dashboard and exportable report (patient scans, risks)
- Modern React UI with friendly flows and error handling

## 🚀 Quick start

Prereqs:
- Node.js 18+
- (Recommended) Supabase project for persistence
- Hugging Face API key for server-side barcode detection

1) Install
```powershell
cd "d:\Coding\Projects\hackathon type shit\mumbai hacks"
npm install
npm run install:all
```

2) Configure env files

Frontend (`frontend/.env`):
```env
VITE_API_BASE_URL=http://localhost:3001
```

Backend (`backend/.env`):
```env
PORT=3001
NODE_ENV=development
CORS_ORIGINS=http://localhost:5173

# Server-side barcode extraction (required)
HF_API_KEY=hf_XXXXXXXXXXXXXXXXXXXXXXXX

# Optional: Product storage & history
SUPABASE_URL=https://xxxxxx.supabase.co
SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...
DATABASE_URL=postgresql://postgres:password@host:5432/postgres

# Optional: AI chat (Gemini)
GEMINI_API_KEY=AIzaSy...
```

3) Seed sample products (optional)
Run SQL in Supabase:
- `database/schema.sql`
- `database/seeds/fssai_products.sql`

4) Run
```powershell
npm run dev
```

Open:
- Frontend: http://localhost:5173
- API:      http://localhost:3001
- Health:   http://localhost:3001/health

## 🔌 Important endpoints

- `POST /api/barcode/extract` — multipart/form-data (field: `image`), returns `{ boxes, barcodes }`
- `POST /api/scan` — looks up a product by barcode, computes rating and insights
- `POST /api/agent/chat` — Nutrition Assistant chat

## 🧪 Try a quick scan

In the app, go to “Scan Product”, upload a photo with a clear barcode. If detection fails, it will fall back to on-device decoding. You can also type a barcode manually.

## 🧰 Tech

- Frontend: React 18 + Vite, Axios, ZXing (client fallback)
- Backend: Node.js + Express, Sharp, @zxing/library, Multer, Helmet, CORS
- AI: Google Gemini (assistant, optional)
- Data: Open Food Facts + Supabase (optional persistence)

## � Notes

- Manual label OCR was removed from the flow for speed and reliability.
- Server barcode extraction generally outperforms client-only decoding for real-world photos.


