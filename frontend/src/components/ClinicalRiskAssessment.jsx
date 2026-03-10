import { useState, useRef, useCallback } from "react";
import { Upload, FileImage, CheckCircle, XCircle, Loader2, ChevronRight, ChevronLeft, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

export default function ClinicalRiskAssessment({ profile, onNext, onBack }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState("idle"); // idle | validating | valid | invalid | extracting
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
    await validateAndExtract(f);
  };

  const validateAndExtract = async (f) => {
    setStatus("validating");
    setValidationResult(null);
    setMedicalData(null);

    const fd = new FormData();
    fd.append("file", f);

    try {
      const vRes = await fetch(`${API}/validate`, { method: "POST", body: fd });
      const vData = await vRes.json();
      setValidationResult(vData);

      if (!vData.valid) {
        setStatus("invalid");
        return;
      }

      setStatus("extracting");
      const fd2 = new FormData();
      fd2.append("file", f);
      const eRes = await fetch(`${API}/extract`, { method: "POST", body: fd2 });
      const eData = await eRes.json();
      setMedicalData(eData.medical || {});
      setStatus("valid");
    } catch (e) {
      setError("Server error. Make sure the backend is running.");
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
            <div>
              <p className="text-white font-semibold">Drag & drop medical report here</p>
              <p className="text-slate-500 text-sm mt-1">or click to browse — JPEG, PNG, WebP</p>
            </div>
          </div>
        )}
      </div>

      {/* Status */}
      {status === "validating" && (
        <div className="flex items-center gap-3 p-4 bg-blue-500/10 border border-blue-500/30 rounded-xl">
          <Loader2 size={18} className="text-blue-400 animate-spin" />
          <p className="text-blue-300 text-sm">Validating report date with AI...</p>
        </div>
      )}

      {status === "extracting" && (
        <div className="flex items-center gap-3 p-4 bg-violet-500/10 border border-violet-500/30 rounded-xl">
          <Loader2 size={18} className="text-violet-400 animate-spin" />
          <p className="text-violet-300 text-sm">Extracting medical values with Gemini Vision...</p>
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
              <p className="text-green-400 text-xs mt-0.5">
                Date: {validationResult.date} — {validationResult.days_old} days old
              </p>
            </div>
          </div>

          {medicalData && Object.keys(medicalData).length > 0 && (
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
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
        >
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
