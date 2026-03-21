# 🏥 InsurePro AI — Health Insurance Underwriting System

A full-stack health insurance underwriting system that uses **Tesseract OCR** to extract data from medical reports and generate realistic insurance quotes based on risk assessment.

> Built with FastAPI · React · Tesseract OCR · TailwindCSS · PostgreSQL

**🌐 Frontend:** https://insure-final.vercel.app  
**⚙️ Backend:** https://insure-final-fm9r.onrender.com  
**🗄️ Database:** Render PostgreSQL

---

## 📦 Repository

**Clone and get started:**

```bash
git clone https://github.com/teamgraphiks024-jpg/insure-final.git
cd insure-final
```

🔗 https://github.com/teamgraphiks024-jpg/insure-final

---

## 📁 Project Structure

```
insurepro/
├── backend/
│   ├── main.py              # FastAPI application + OCR + risk engine + DB
│   ├── requirements.txt     # Python dependencies
│   ├── start.sh             # Render startup script
│   └── .env.example         # Environment variable template
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── PolicyHolderProfile.jsx    # Step 1 — profile form
    │   │   ├── ClinicalRiskAssessment.jsx # Step 2 — report upload & OCR
    │   │   └── ResultCard.jsx             # Step 3 — quote display & save
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── postcss.config.js
    ├── vercel.json
    └── .env.example
```

---

## ✨ Features

- **3-step form** — Profile → Medical Report → Insurance Quote
- **Tesseract OCR** — extracts text from uploaded medical report images (offline, no API key)
- **Date validation** — report must be within 7 days
- **Medical value extraction** — glucose, BP, cholesterol, HbA1c, triglycerides, and more via regex
- **Risk scoring engine** — based on ADA/AHA medical guidelines
- **5 premium tiers** — Platinum to Declined, with age multipliers
- **Sample data profiles** — 3 preset profiles (Acceptable / Needs Review / Declined)
- **Input validation** — letters-only for name/city, digits-only for age/height/weight/phone
- **PostgreSQL storage** — all policy applications saved silently to database on submission
- **Responsive dark UI** — glass morphism design with TailwindCSS

---

## 🚀 Local Development

### Prerequisites

- Python 3.9+
- Node.js 18+
- **Tesseract OCR** installed on your machine
- PostgreSQL database (optional for local — app works without it)

#### Install Tesseract (Windows)
1. Download installer from: https://github.com/UB-Mannheim/tesseract/wiki
2. Install to default path: `C:\Program Files\Tesseract-OCR\`
3. The path is already set in `main.py` — no extra config needed

#### Install Tesseract (Mac)
```bash
brew install tesseract
```

#### Install Tesseract (Linux)
```bash
sudo apt install tesseract-ocr
```

---

### Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create .env file
cp .env.example .env
# Add DATABASE_URL if using PostgreSQL locally (optional)

# Run server
uvicorn main:app --reload --port 8000
```

Backend runs at: http://localhost:8000  
API docs (Swagger): http://localhost:8000/docs

Verify everything is working:
```
GET http://localhost:8000/api/health
```
Should return `{ "status": "ok", "ocr": "tesseract", "db": true }`

---

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Frontend runs at: http://localhost:3000

For local development, the frontend already points to `http://localhost:8000/api` by default — no `.env` setup needed.

---

## 🌐 Deployment

### Database → Render PostgreSQL

1. Go to https://render.com → **New** → **PostgreSQL**
2. Name it `insurepro-db` → Plan: **Free** → **Create Database**
3. Copy the **Internal Database URL** from the Connections section
4. Add it as `DATABASE_URL` environment variable on your backend service

### Backend → Render

1. Push `backend/` to a GitHub repo
2. Go to https://render.com → **New Web Service**
3. Connect your GitHub repo
4. Settings:
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn backend.main:app --host 0.0.0.0 --port $PORT`
   - **Python Version**: 3.9
5. Environment Variables:
   - `DATABASE_URL` = Internal Database URL from Render PostgreSQL
6. Deploy → copy your service URL

### Frontend → Vercel

1. Push `frontend/` to a GitHub repo
2. Go to https://vercel.com → **New Project** → Import repo
3. Settings:
   - **Framework**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. Environment Variables:
   - `VITE_API_BASE` = `https://your-render-url.onrender.com/api`
5. Deploy!

---

## 🔑 Environment Variables

| Variable | Where | Description |
|---|---|---|
| `DATABASE_URL` | Backend (Render) | PostgreSQL connection string |
| `VITE_API_BASE` | Frontend (Vercel) | Full backend API URL |

> No Gemini or any other API keys required — OCR runs fully offline with Tesseract.

---

## 🧪 API Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/api/health` | Health check + DB status |
| GET | `/api/debug` | Tesseract version check |
| POST | `/api/validate` | Validate report date (upload image) |
| POST | `/api/extract` | Extract medical values (upload image) |
| POST | `/api/underwrite` | Full risk assessment + quote |
| POST | `/api/save-application` | Save policy application to PostgreSQL |

---

## 🗄️ Database Schema

When a user clicks **Get Policy Now**, the following data is saved to the `applications` table in PostgreSQL:

| Column | Type | Description |
|---|---|---|
| `id` | SERIAL | Auto-increment primary key |
| `created_at` | TIMESTAMP | Application submission time |
| `name` | VARCHAR | Policyholder name |
| `age` | INTEGER | Age |
| `gender` | VARCHAR | Gender |
| `email` | VARCHAR | Email address |
| `phone` | VARCHAR | Phone number |
| `location` | VARCHAR | City/location |
| `height` | FLOAT | Height in cm |
| `weight` | FLOAT | Weight in kg |
| `bmi` | FLOAT | Calculated BMI |
| `smoking` | BOOLEAN | Smoking status |
| `alcohol` | BOOLEAN | Alcohol use |
| `exercise` | VARCHAR | Exercise level |
| `family_history` | TEXT | Family medical history |
| `glucose_fasting` | FLOAT | Fasting glucose (mg/dL) |
| `hba1c` | FLOAT | HbA1c (%) |
| `bp_systolic` | FLOAT | Systolic BP (mmHg) |
| `bp_diastolic` | FLOAT | Diastolic BP (mmHg) |
| `cholesterol_total` | FLOAT | Total cholesterol (mg/dL) |
| `triglycerides` | FLOAT | Triglycerides (mg/dL) |
| `risk_score` | FLOAT | Calculated risk score |
| `premium_tier` | VARCHAR | Platinum / Gold / Silver / Standard / Declined |
| `premium_annual` | INTEGER | Annual premium in INR |
| `coverage` | VARCHAR | Coverage amount |
| `reference_id` | VARCHAR | Unique reference (e.g. INS-A3K9XP) |

---

## 🏆 Premium Tiers

| Tier | Risk Score | Coverage | Base Premium |
|---|---|---|---|
| Platinum 💎 | ≤ 1.5 | ₹1 Crore | ₹4,000/yr |
| Gold 🏆 | ≤ 3.0 | ₹75 Lakhs | ₹6,000/yr |
| Silver 🥈 | ≤ 5.0 | ₹50 Lakhs | ₹9,000/yr |
| Standard 📋 | ≤ 7.0 | ₹25 Lakhs | ₹13,000/yr |
| Declined ❌ | > 7.0 | N/A | — |

> Premiums are multiplied by an age factor (1.15x for 36–45, 1.35x for 46–55, 1.6x for 55+)

---

## 🧬 Risk Factors Assessed

- Age bracket (18–35 low risk → 65+ critical)
- BMI (underweight / normal / overweight / obese)
- Smoking & alcohol use
- Exercise level
- Family medical history (diabetes, heart disease, cancer, hypertension)
- Fasting glucose & HbA1c (ADA guidelines)
- Blood pressure (AHA/ACC guidelines)
- Total cholesterol & triglycerides

---

## 🧪 Sample Profiles (built into the app)

| Profile | Age | Condition | Expected Result |
|---|---|---|---|
| Arjun Sharma | 28 | Healthy, active | Platinum / Gold |
| Meena Patel | 48 | Overweight, family history | Silver / Standard |
| Rajan Verma | 62 | Smoker, obese, multiple conditions | Declined |

---

## ⚠️ Disclaimer

This is an **academic demonstration project** only. Not a real insurance product. Medical risk assessment is for educational purposes and does not constitute medical or financial advice.
