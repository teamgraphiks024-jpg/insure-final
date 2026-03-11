import { useState } from "react";
import PolicyHolderProfile from "./components/PolicyHolderProfile";
import ClinicalRiskAssessment from "./components/ClinicalRiskAssessment";
import ResultCard from "./components/ResultCard";
import { Shield, Loader2 } from "lucide-react";

const API = import.meta.env.VITE_API_BASE || "http://localhost:8000/api";

export default function App() {
  const [step, setStep] = useState(1);
  const [profile, setProfile] = useState(null);
  const [medical, setMedical] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleProfileNext = (data) => {
    setProfile(data);
    setStep(2);
  };

  const handleMedicalNext = async (medicalData) => {
    setMedical(medicalData);
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`${API}/underwrite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile, medical: medicalData }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      setStep(3);
    } catch (e) {
      setError("Failed to calculate quote. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(1); setProfile(null); setMedical(null); setResult(null); setError("");
  };

  const steps = [
    { n: 1, label: "Profile" },
    { n: 2, label: "Medical Report" },
    { n: 3, label: "Quote" },
  ];

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white" style={{ fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 rounded-full opacity-10 blur-3xl" style={{ background: "radial-gradient(circle, #0EA5E9, transparent)" }} />
        <div className="absolute bottom-1/3 right-1/4 w-80 h-80 rounded-full opacity-8 blur-3xl" style={{ background: "radial-gradient(circle, #8B5CF6, transparent)" }} />
      </div>

      <div className="relative z-10 max-w-2xl mx-auto px-4 py-10">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-4">
            <Shield size={14} /> AI-Powered Underwriting
          </div>
          <h1 className="text-4xl font-black text-white mb-2 tracking-tight">
            Insure<span className="text-cyan-400">Pro</span> AI
          </h1>
          <p className="text-slate-400">Health insurance underwriting powered by Trust</p>
        </div>

        {/* Step Progress */}
        <div className="flex items-center justify-center gap-0 mb-8">
          {steps.map((s, i) => (
            <div key={s.n} className="flex items-center">
              <div className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold transition-all
                ${step === s.n ? "bg-cyan-500/20 text-cyan-400 border border-cyan-500/40" :
                  step > s.n ? "text-green-400" : "text-slate-600"}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold
                  ${step > s.n ? "bg-green-500 text-white" : step === s.n ? "bg-cyan-500 text-white" : "bg-slate-700 text-slate-400"}`}>
                  {step > s.n ? "✓" : s.n}
                </span>
                {s.label}
              </div>
              {i < steps.length - 1 && <div className={`w-8 h-px mx-1 ${step > s.n ? "bg-green-500/50" : "bg-slate-700"}`} />}
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-slate-900/80 backdrop-blur-xl rounded-3xl border border-slate-700/60 p-8 shadow-2xl">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4">
              <Loader2 size={36} className="text-cyan-400 animate-spin" />
              <p className="text-slate-300 font-medium">Calculating your insurance quote...</p>
              <p className="text-slate-500 text-sm">Analysing risk factors with AI</p>
            </div>
          ) : (
            <>
              {error && (
                <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-sm">
                  {error}
                </div>
              )}
              {step === 1 && <PolicyHolderProfile onNext={handleProfileNext} />}
              {step === 2 && <ClinicalRiskAssessment profile={profile} onNext={handleMedicalNext} onBack={() => setStep(1)} />}
              {step === 3 && <ResultCard result={result} onReset={reset} />}
            </>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-6">
          InsurePro AI · For demonstration purposes only · Not a real insurance product
        </p>
      </div>
    </div>
  );
}
