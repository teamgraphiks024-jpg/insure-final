import os
import re
import logging
import subprocess
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from PIL import Image
import pytesseract
import io

# Set tesseract path based on OS
if os.name == "nt":
    # Windows
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
else:
    # Linux (Render) - install if missing
    try:
        result = subprocess.run(["which", "tesseract"], capture_output=True, text=True)
        if not result.stdout.strip():
            subprocess.run(["apt-get", "install", "-y", "tesseract-ocr"], capture_output=True)
    except Exception as e:
        print(f"Tesseract setup: {e}")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="InsurePro AI", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Models ───────────────────────────────────────────────────────────────────

class ProfileData(BaseModel):
    name: str
    age: int
    gender: str
    email: str
    phone: str
    location: str
    height: float
    weight: float
    smoking: bool
    alcohol: bool
    exercise: str
    family_history: Optional[str] = ""

class UnderwriteRequest(BaseModel):
    profile: ProfileData
    medical: dict

# ─── OCR ──────────────────────────────────────────────────────────────────────

def run_ocr(image_bytes: bytes) -> str:
    try:
        image = Image.open(io.BytesIO(image_bytes))
        # Enhance for better OCR
        image = image.convert("L")  # grayscale
        text = pytesseract.image_to_string(image, config="--psm 6")
        logger.info(f"OCR extracted {len(text)} chars")
        return text
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return ""

# ─── Date Extraction ──────────────────────────────────────────────────────────

def extract_date(text: str) -> Optional[str]:
    patterns = [
        (r"\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b", "dmy"),
        (r"\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b", "ymd"),
        (r"\b(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*[\s,]+(\d{4})\b", "dmy_text"),
    ]
    month_map = {"jan":1,"feb":2,"mar":3,"apr":4,"may":5,"jun":6,
                 "jul":7,"aug":8,"sep":9,"oct":10,"nov":11,"dec":12}

    keywords = ["collection", "collected", "report date", "date of", "sample date", "date:"]
    lines = text.lower().split("\n")

    # First pass: look near date keywords
    for i, line in enumerate(lines):
        if any(kw in line for kw in keywords):
            search_text = " ".join(lines[max(0,i-1):i+3])
            for pattern, fmt in patterns:
                m = re.search(pattern, search_text, re.IGNORECASE)
                if m:
                    return parse_match(m, fmt, month_map)

    # Second pass: any date in full text
    for pattern, fmt in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            return parse_match(m, fmt, month_map)

    return None


def parse_match(m, fmt, month_map):
    try:
        g = m.groups()
        if fmt == "dmy":
            d, mo, y = int(g[0]), int(g[1]), int(g[2])
        elif fmt == "ymd":
            y, mo, d = int(g[0]), int(g[1]), int(g[2])
        elif fmt == "dmy_text":
            d = int(g[0])
            mo = month_map.get(g[1].lower()[:3], 0)
            y = int(g[2])
        else:
            return None
        if 1 <= d <= 31 and 1 <= mo <= 12 and 2000 <= y <= 2030:
            return f"{d:02d}/{mo:02d}/{y}"
    except:
        pass
    return None


def parse_date_flexible(date_str: str) -> Optional[datetime]:
    formats = ["%d/%m/%Y", "%m/%d/%Y", "%Y/%m/%d",
               "%d-%m-%Y", "%Y-%m-%d", "%d.%m.%Y"]
    for fmt in formats:
        try:
            return datetime.strptime(date_str.strip(), fmt)
        except:
            continue
    return None

# ─── Medical Value Extraction ─────────────────────────────────────────────────

def extract_number(text: str, patterns: list) -> Optional[float]:
    for pattern in patterns:
        m = re.search(pattern, text, re.IGNORECASE)
        if m:
            try:
                return float(m.group(1).replace(",", ""))
            except:
                continue
    return None


def extract_medical(text: str) -> dict:
    t = text.replace("\n", " ")
    return {
        "glucose_fasting": extract_number(t, [
            r"fasting\s*(?:glucose|blood\s*sugar)[^\d]*(\d+\.?\d*)",
            r"glucose\s*[,\-\(]?\s*f\b[^\d]*(\d+\.?\d*)",
            r"fbs[^\d]*(\d+\.?\d*)",
            r"blood\s*glucose\s*fasting[^\d]*(\d+\.?\d*)",
        ]),
        "glucose_pp": extract_number(t, [
            r"post\s*(?:prandial|meal)[^\d]*(\d+\.?\d*)",
            r"pp\s*glucose[^\d]*(\d+\.?\d*)",
            r"ppbs[^\d]*(\d+\.?\d*)",
        ]),
        "hba1c": extract_number(t, [
            r"hba1c[^\d]*(\d+\.?\d*)",
            r"hb\s*a1c[^\d]*(\d+\.?\d*)",
            r"glycated\s*haemoglobin[^\d]*(\d+\.?\d*)",
            r"glycosylated[^\d]*(\d+\.?\d*)",
        ]),
        "bp_systolic": extract_number(t, [
            r"(?:bp|blood\s*pressure)[^\d]*(\d{2,3})\s*\/",
            r"systolic[^\d]*(\d{2,3})",
        ]),
        "bp_diastolic": extract_number(t, [
            r"(?:bp|blood\s*pressure)[^\d]*\d{2,3}\s*\/\s*(\d{2,3})",
            r"diastolic[^\d]*(\d{2,3})",
        ]),
        "cholesterol_total": extract_number(t, [
            r"total\s*cholesterol[^\d]*(\d+\.?\d*)",
            r"cholesterol\s*total[^\d]*(\d+\.?\d*)",
            r"cholesterol[^\d]*(\d+\.?\d*)",
        ]),
        "hdl": extract_number(t, [
            r"hdl[^\d]*(\d+\.?\d*)",
            r"hdl\s*cholesterol[^\d]*(\d+\.?\d*)",
        ]),
        "ldl": extract_number(t, [
            r"ldl[^\d]*(\d+\.?\d*)",
            r"ldl\s*cholesterol[^\d]*(\d+\.?\d*)",
        ]),
        "triglycerides": extract_number(t, [
            r"triglycerides?[^\d]*(\d+\.?\d*)",
            r"trig[^\d]*(\d+\.?\d*)",
        ]),
        "hemoglobin": extract_number(t, [
            r"h(?:a|e)moglobin[^\d]*(\d+\.?\d*)",
            r"\bhb\b[^\d]*(\d+\.?\d*)",
        ]),
        "creatinine": extract_number(t, [
            r"creatinine[^\d]*(\d+\.?\d*)",
            r"s\.?\s*creatinine[^\d]*(\d+\.?\d*)",
        ]),
        "uric_acid": extract_number(t, [
            r"uric\s*acid[^\d]*(\d+\.?\d*)",
            r"s\.?\s*uric[^\d]*(\d+\.?\d*)",
        ]),
    }

# ─── Risk Engine ──────────────────────────────────────────────────────────────

def calculate_bmi(height_cm: float, weight_kg: float) -> float:
    h = height_cm / 100
    return round(weight_kg / (h * h), 1)


def calculate_risk_score(profile: ProfileData, medical: dict) -> dict:
    risk = 0.0
    factors = []

    age = profile.age
    if age <= 35:
        risk += 0.5; factors.append({"label": "Age 18-35", "impact": "Low", "score": 0.5})
    elif age <= 45:
        risk += 1.0; factors.append({"label": "Age 36-45", "impact": "Moderate", "score": 1.0})
    elif age <= 55:
        risk += 1.8; factors.append({"label": "Age 46-55", "impact": "High", "score": 1.8})
    elif age <= 65:
        risk += 2.5; factors.append({"label": "Age 56-65", "impact": "Very High", "score": 2.5})
    else:
        risk += 3.5; factors.append({"label": "Age 65+", "impact": "Critical", "score": 3.5})

    bmi = calculate_bmi(profile.height, profile.weight)
    if bmi < 18.5:
        risk += 1.0; factors.append({"label": f"BMI {bmi} (Underweight)", "impact": "Moderate", "score": 1.0})
    elif bmi <= 24.9:
        factors.append({"label": f"BMI {bmi} (Normal)", "impact": "None", "score": 0.0})
    elif bmi <= 29.9:
        risk += 1.2; factors.append({"label": f"BMI {bmi} (Overweight)", "impact": "Moderate", "score": 1.2})
    elif bmi <= 34.9:
        risk += 2.0; factors.append({"label": f"BMI {bmi} (Obese I)", "impact": "High", "score": 2.0})
    else:
        risk += 3.0; factors.append({"label": f"BMI {bmi} (Obese II+)", "impact": "Critical", "score": 3.0})

    if profile.smoking:
        risk += 2.0; factors.append({"label": "Smoker", "impact": "High", "score": 2.0})
    if profile.alcohol:
        risk += 0.8; factors.append({"label": "Alcohol Use", "impact": "Moderate", "score": 0.8})

    exercise_map = {"none": 1.0, "light": 0.3, "moderate": 0.0, "heavy": 0.0}
    ex_score = exercise_map.get(profile.exercise, 0.5)
    if ex_score > 0:
        risk += ex_score; factors.append({"label": f"Exercise: {profile.exercise}", "impact": "Low", "score": ex_score})

    if profile.family_history:
        fh = profile.family_history.lower()
        if any(w in fh for w in ["diabetes","heart","cancer","hypertension"]):
            risk += 1.5; factors.append({"label": "Significant Family History", "impact": "High", "score": 1.5})

    def sf(val):
        try: return float(val)
        except: return None

    glucose = sf(medical.get("glucose_fasting"))
    if glucose:
        if glucose >= 126:
            risk += 2.5; factors.append({"label": f"Fasting Glucose {glucose} (Diabetic)", "impact": "Critical", "score": 2.5})
        elif glucose >= 100:
            risk += 1.2; factors.append({"label": f"Fasting Glucose {glucose} (Pre-diabetic)", "impact": "High", "score": 1.2})

    hba1c = sf(medical.get("hba1c"))
    if hba1c:
        if hba1c >= 6.5:
            risk += 2.0; factors.append({"label": f"HbA1c {hba1c}% (Diabetic)", "impact": "Critical", "score": 2.0})
        elif hba1c >= 5.7:
            risk += 1.0; factors.append({"label": f"HbA1c {hba1c}% (Pre-diabetic)", "impact": "Moderate", "score": 1.0})

    sys_bp = sf(medical.get("bp_systolic"))
    if sys_bp:
        if sys_bp >= 180:
            risk += 3.0; factors.append({"label": f"BP {sys_bp} (Crisis)", "impact": "Critical", "score": 3.0})
        elif sys_bp >= 140:
            risk += 2.0; factors.append({"label": f"BP {sys_bp} (Stage 2 HTN)", "impact": "High", "score": 2.0})
        elif sys_bp >= 130:
            risk += 1.0; factors.append({"label": f"BP {sys_bp} (Stage 1 HTN)", "impact": "Moderate", "score": 1.0})

    chol = sf(medical.get("cholesterol_total"))
    if chol:
        if chol >= 240:
            risk += 1.5; factors.append({"label": f"Cholesterol {chol} (High)", "impact": "High", "score": 1.5})
        elif chol >= 200:
            risk += 0.8; factors.append({"label": f"Cholesterol {chol} (Borderline)", "impact": "Moderate", "score": 0.8})

    trig = sf(medical.get("triglycerides"))
    if trig:
        if trig >= 500:
            risk += 2.0; factors.append({"label": f"Triglycerides {trig} (Very High)", "impact": "Critical", "score": 2.0})
        elif trig >= 200:
            risk += 1.0; factors.append({"label": f"Triglycerides {trig} (High)", "impact": "High", "score": 1.0})

    return {"total": round(risk, 2), "bmi": bmi, "factors": factors}


def determine_premium_tier(risk_score: float, age: int) -> dict:
    age_multiplier = 1.0
    if age > 55: age_multiplier = 1.6
    elif age > 45: age_multiplier = 1.35
    elif age > 35: age_multiplier = 1.15

    if risk_score <= 1.5:
        tier, base, coverage, color = "Platinum", 4000, "1 Crore", "#10B981"
    elif risk_score <= 3.0:
        tier, base, coverage, color = "Gold", 6000, "75 Lakhs", "#F59E0B"
    elif risk_score <= 5.0:
        tier, base, coverage, color = "Silver", 9000, "50 Lakhs", "#6366F1"
    elif risk_score <= 7.0:
        tier, base, coverage, color = "Standard", 13000, "25 Lakhs", "#EF4444"
    else:
        return {"tier": "Declined", "premium": None, "coverage": "N/A",
                "color": "#6B7280", "reason": "Risk profile exceeds underwriting limits"}

    premium = int(base * age_multiplier)
    return {"tier": tier, "premium": premium, "coverage": f"₹{coverage}",
            "color": color, "annual": premium, "monthly": round(premium / 12)}

# ─── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/api/health")
def health():
    return {"status": "ok", "ocr": "tesseract", "version": "2.0.0"}

@app.get("/api/debug")
def debug():
    try:
        ver = pytesseract.get_tesseract_version()
        return {"tesseract_version": str(ver), "status": "ok"}
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.post("/api/validate")
async def validate_report(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = run_ocr(content)
        logger.info(f"OCR preview: {text[:300]}")

        if not text.strip():
            return {"valid": False, "error": "Could not read text from image. Please upload a clearer photo."}

        date_str = extract_date(text)
        logger.info(f"Extracted date: {date_str}")

        if not date_str:
            return {"valid": False, "error": "Could not find report date. Make sure the report has a visible date.", "ocr_preview": text[:300]}

        report_date = parse_date_flexible(date_str)
        if not report_date:
            return {"valid": False, "error": f"Could not parse date: {date_str}"}

        days_old = max(0, (datetime.now() - report_date).days)

        if days_old > 7:
            return {"valid": False, "error": f"Report is {days_old} days old. Please upload a report from the last 7 days.", "date": date_str}

        return {"valid": True, "date": date_str, "days_old": days_old,
                "message": f"Report is {days_old} days old - valid!"}

    except Exception as e:
        logger.error(f"Validate error: {e}")
        return {"valid": False, "error": f"Server error: {str(e)}"}

@app.post("/api/extract")
async def extract_endpoint(file: UploadFile = File(...)):
    try:
        content = await file.read()
        text = run_ocr(content)
        if not text.strip():
            return {"medical": {}, "ocr_text": ""}
        medical = extract_medical(text)
        return {"medical": medical, "ocr_text": text[:1000]}
    except Exception as e:
        logger.error(f"Extract error: {e}")
        return {"medical": {}, "error": str(e)}

@app.post("/api/underwrite")
async def underwrite(req: UnderwriteRequest):
    try:
        risk = calculate_risk_score(req.profile, req.medical)
        premium = determine_premium_tier(risk["total"], req.profile.age)
        return {
            "risk": risk,
            "premium": premium,
            "profile": {"name": req.profile.name, "age": req.profile.age, "bmi": risk["bmi"]}
        }
    except Exception as e:
        logger.error(f"Underwrite error: {e}")
        return {"error": str(e)}