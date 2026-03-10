import { useState, useRef, useCallback } from "react";
import { Upload, FileImage, CheckCircle, XCircle, Loader2, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";
import Tesseract from "tesseract.js";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

// ── Date extraction (runs in browser) ────────────────────────────────────────
function extractDate(text) {
  const monthMap = {jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  const patterns = [
    { re: /\b(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})\b/, fmt: "dmy" },
    { re: /\b(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})\b/, fmt: "ymd" },
    { re: /\b(\d{1,2})\s+(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*[\s,]+(\d{4})\b/i, fmt: "dmy_text" },
  ];
  const keywords = ["collection","collected","report date","date of","sample date","date:"];
  const lines = text.toLowerCase().split("\n");

  const tryParse = (m, fmt) => {
    const g = m;
    try {
      let d, mo, y;
      if (fmt === "dmy") { d=+g[1]; mo=+g[2]; y=+g[3]; }
      else if (fmt === "ymd") { y=+g[1]; mo=+g[2]; d=+g[3]; }
      else { d=+g[1]; mo=monthMap[g[2].toLowerCase().slice(0,3)]; y=+g[3]; }
      if (d>=1&&d<=31&&mo>=1&&mo<=12&&y>=2000&&y<=2030)
        return `${String(d).padStart(2,"0")}/${String(mo).padStart(2,"0")}/${y}`;
    } catch {}
    return null;
  };

  // near keywords first
  for (let i = 0; i < lines.length; i++) {
    if (keywords.some(k => lines[i].includes(k))) {
      const chunk = lines.slice(Math.max(0,i-1), i+3).join(" ");
      for (const {re, fmt} of patterns) {
        const m = chunk.match(re);
        if (m) { const r = tryParse(m, fmt); if (r) return r; }
      }
    }
  }
  // full text fallback
  for (const {re, fmt} of patterns) {
    const m = text.match(re);
    if (m) { const r = tryParse(m, fmt); if (r) return r; }
  }
  return null;
}

function parseDate(str) {
  const fmts = [
    [/^(\d{2})\/(\d{2})\/(\d{4})$/, (a)=>new Date(+a[3],+a[2]-1,+a[1])],
    [/^(\d{2})-(\d{2})-(\d{4})$/, (a)=>new Date(+a[3],+a[2]-1,+a[1])],
    [/^(\d{4})-(\d{2})-(\d{2})$/, (a)=>new Date(+a[1],+a[2]-1,+a[3])],
  ];
  for (const [re, fn] of fmts) {
    const m = str.match(re);
    if (m) return fn(m);
  }
  return null;
}

// ── Medical extraction (runs in browser) ─────────────────────────────────────
function extractNumber(text, patterns) {
  for (const p of patterns) {
    const m = text.match(new RegExp(p, "i"));
    if (m) { const v = parseFloat(m[1].replace(",","")); if (!isNaN(v)) return v; }
  }
  return null;
}

function extractMedical(text) {
  const t = text.replace(/\n/g, " ");
  return {
    glucose_fasting: extractNumber(t, [
      "fasting\\s*(?:glucose|blood\\s*sugar)[^\\d]*(\\d+\\.?\\d*)",
      "glucose\\s*[,\\-\\(]?\\s*f\\b[^\\d]*(\\d+\\.?\\d*)",
      "fbs[^\\d]*(\\d+\\.?\\d*)",
    ]),
    glucose_pp: extractNumber(t, [
      "post\\s*(?:prandial|meal)[^\\d]*(\\d+\\.?\\d*)",
      "ppbs[^\\d]*(\\d+\\.?\\d*)",
    ]),
    hba1c: extractNumber(t, [
      "hba1c[^\\d]*(\\d+\\.?\\d*)",
      "hb\\s*a1c[^\\d]*(\\d+\\.?\\d*)",
      "glycated[^\\d]*(\\d+\\.?\\d*)",
    ]),
    bp_systolic: extractNumber(t, [
      "(?:bp|blood\\s*pressure)[^\\d]*(\\d{2,3})\\s*\\/",
      "systolic[^\\d]*(\\d{2,3})",
    ]),
    bp_diastolic: extractNumber(t, [
      "(?:bp|blood\\s*pressure)[^\\d]*\\d{2,3}\\s*\\/\\s*(\\d{2,3})",
      "diastolic[^\\d]*(\\d{2,3})",
    ]),
    cholesterol_total: extractNumber(t, [
      "total\\s*cholesterol[^\\d]*(\\d+\\.?\\d*)",
      "cholesterol[^\\d]*(\\d+\\.?\\d*)",
    ]),
    hdl: extractNumber(t, ["hdl[^\\d]*(\\d+\\.?\\d*)"]),
    ldl: extractNumber(t, ["ldl[^\\d]*(\\d+\\.?\\d*)"]),
    triglycerides: extractNumber(t, ["triglycerides?[^\\d]*(\\d+\\.?\\d*)"]),
    hemoglobin: extractNumber(t, ["h(?:a|e)moglobin[^\\d]*(\\d+\\.?\\d*)", "\\bhb\\b[^\\d]*(\\d+\\.?\\d*)"]),
    creatinine: extractNumber(t, ["creatinine[^\\d]*(\\d+\\.?\\d*)"]),
    uric_acid: extractNumber(t, ["uric\\s*acid[^\\d]*(\\d+\\.?\\d*)"]),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ClinicalRiskAssessment({ profile, onNext, onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("idle");
  const [progress, setProgress] = useState(0);
  const [validationResult, setValidationResult] = useState(null);
  const [medicalData, setMedicalData] = useState(null);
  const [error, setError] = useState("");
  const inputRef = useRef();

  const handleFile = async (f) => {
    if (!f) return;
    if (!["image/jpeg","image/png","image/webp"].includes(f.type)) {
      setError("Please upload a JPEG, PNG, or WebP image.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
    setValidationResult(null);
    setMedicalData(null);
    await processFile(f);
  };

  const processFile = async (f) => {
    setStatus("ocr");
    setProgress(0);

    try {
      // Run Tesseract OCR in browser
      const result = await Tesseract.recognize(f, "eng", {
        logger: m => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        }
      });

      const text = result.data.text;
      if (!text.trim()) {
        setStatus("invalid");
        setValidationResult({ error: "Could not read text from image. Please upload a clearer photo." });
        return;
      }

      // Extract date in browser
      setStatus("validating");
      const dateStr = extractDate(text);
      if (!dateStr) {
        setStatus("invalid");
        setValidationResult({ error: "Could not find report date. Make sure the report has a visible date." });
        return;
      }

      const reportDate = parseDate(dateStr);
      if (!reportDate) {
        setStatus("invalid");
        setValidationResult({ error: `Could not parse date: ${dateStr}` });
        return;
      }

      const daysOld = Math.max(0, Math.floor((Date.now() - reportDate.getTime()) / 86400000));
      if (daysOld > 7) {
        setStatus("invalid");
        setValidationResult({ error: `Report is ${daysOld} days old. Please upload a report from the last 7 days.` });
        return;
      }

      // Extract medical values in browser
      setStatus("extracting");
      const medical = extractMedical(text);

      // Send only the text to backend for underwriting (no OCR needed on server)
      setValidationResult({ valid: true, date: dateStr, days_old: daysOld });
      setMedicalData(medical);
      setStatus("valid");

    } catch (e) {
      setError(`OCR failed: ${e.message}`);
      setStatus("idle");
    }
  };

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, []);

  const handleSubmit = () => {
    if (status !== "valid" || !medicalData) return;
    onNext(medicalData);
  };

  const MedVal = ({ label, val, unit = "" }) => {
    if (!val) return null;
    return (
      <div className="bg-slate-800/60 rounded-lg px-3 py-2 border border-slate-700">
        <p className="text-slate-400 text-xs">{label}</p>
        <p className="text-white font-bold text-sm">{val} <span className="text-slate-400 font-normal text-xs">{unit}</span></p>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-violet-500/10 rounded-xl border border-violet-500/20">
          <FileImage size={22} className="text-violet-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Clinical Risk Assessment</h2>
          <p className="text-slate-400 text-sm">Step 2 of 3 — Upload recent medical report (within 7 days)</p>
        </div>
      </div>

      {/* Upload zone */}
      <div
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center transition-all duration-200 cursor-pointer
          ${dragging ? "border-cyan-400 bg-cyan-500/10" : "border-slate-600 hover:border-slate-500 bg-slate-800/30"}
          ${preview ? "pb-4" : "py-12"}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input ref={inputRef} type="file" className="hidden" accept="image/*" onChange={e => handleFile(e.target.files[0])} />
        {preview ? (
          <div className="space-y-3">
            <img src={preview} alt="Report preview" className="max-h-48 mx-auto rounded-xl object-contain shadow-lg" />
            <p className="text-slate-400 text-sm">{file?.name}</p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="w-16 h-16 mx-auto bg-slate-700/60 rounded-2xl flex items-center justify-center">
              <Upload size={28} className="text-slate-400" />
            </div>
            <p className="text-white font-semibold">Drag & drop medical report here</p>
            <p className="text-slate-500 text-sm">or click to browse — JPEG, PNG, WebP</p>
          </div>
        )}
      </div>

      {/* OCR Progress */}
      {status === "ocr" && (
        <div className="space-y-2 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="text-blue-400 animate-spin" />
            <p className="text-blue-300 text-sm">Running OCR in browser... {progress}%</p>
          </div>
          <div className="w-full bg-slate-700 rounded-full h-1.5">
            <div className="bg-blue-400 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} />
          </div>
        </div>
      )}

      {status === "validating" && (
        <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <Loader2 size={18} className="text-blue-400 animate-spin" />
          <p className="text-blue-300 text-sm">Validating report date...</p>
        </div>
      )}

      {status === "extracting" && (
        <div className="flex items-center gap-3 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
          <Loader2 size={18} className="text-violet-400 animate-spin" />
          <p className="text-violet-300 text-sm">Extracting medical values...</p>
        </div>
      )}

      {status === "invalid" && validationResult && (
        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <XCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-red-300 font-semibold text-sm">Report Invalid</p>
            <p className="text-red-400 text-xs mt-1">{validationResult.error}</p>
          </div>
        </div>
      )}

      {status === "valid" && validationResult && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
            <CheckCircle size={18} className="text-green-400 shrink-0" />
            <div>
              <p className="text-green-300 font-semibold text-sm">✓ Report Validated</p>
              <p className="text-green-400 text-xs mt-0.5">Date: {validationResult.date} — {validationResult.days_old} days old</p>
            </div>
          </div>
          {medicalData && Object.values(medicalData).some(v => v !== null) && (
            <div>
              <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3">Extracted Values</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                <MedVal label="Fasting Glucose" val={medicalData.glucose_fasting} unit="mg/dL" />
                <MedVal label="PP Glucose" val={medicalData.glucose_pp} unit="mg/dL" />
                <MedVal label="HbA1c" val={medicalData.hba1c} unit="%" />
                <MedVal label="BP Systolic" val={medicalData.bp_systolic} unit="mmHg" />
                <MedVal label="BP Diastolic" val={medicalData.bp_diastolic} unit="mmHg" />
                <MedVal label="Cholesterol" val={medicalData.cholesterol_total} unit="mg/dL" />
                <MedVal label="HDL" val={medicalData.hdl} unit="mg/dL" />
                <MedVal label="LDL" val={medicalData.ldl} unit="mg/dL" />
                <MedVal label="Triglycerides" val={medicalData.triglycerides} unit="mg/dL" />
                <MedVal label="Hemoglobin" val={medicalData.hemoglobin} unit="g/dL" />
                <MedVal label="Creatinine" val={medicalData.creatinine} unit="mg/dL" />
                <MedVal label="Uric Acid" val={medicalData.uric_acid} unit="mg/dL" />
              </div>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
          <AlertCircle size={18} className="text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      <div className="flex gap-3">
        <button onClick={onBack} className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all">
          <ChevronLeft size={16} /> Back
        </button>
        <button
          onClick={handleSubmit}
          disabled={status !== "valid"}
          className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-400 hover:to-purple-500 disabled:from-slate-700 disabled:to-slate-700 disabled:text-slate-500 text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-violet-500/20 disabled:shadow-none"
        >
          Calculate Coverage <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
