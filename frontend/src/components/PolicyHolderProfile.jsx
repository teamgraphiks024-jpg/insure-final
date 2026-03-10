import { useState } from "react";
import { User, Mail, Phone, MapPin, ChevronRight, AlertCircle, FlaskConical } from "lucide-react";

const INPUT = "w-full bg-slate-800/60 border border-slate-700 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition-all";
const LABEL = "block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2";

// ── Sample profiles ──────────────────────────────────────────────────────────
const SAMPLES = [
  {
    label: "✅ Acceptable",
    color: "border-green-500/40 hover:border-green-400",
    textColor: "text-green-400",
    badge: "bg-green-500/10 text-green-400",
    data: {
      name: "Arjun Sharma", age: "28", gender: "male",
      email: "arjun.sharma@email.com", phone: "9876543210",
      location: "Bangalore", height: "175", weight: "70",
      smoking: false, alcohol: false, exercise: "moderate",
      family_history: ""
    }
  },
  {
    label: "⚠️ Needs Review",
    color: "border-yellow-500/40 hover:border-yellow-400",
    textColor: "text-yellow-400",
    badge: "bg-yellow-500/10 text-yellow-400",
    data: {
      name: "Meena Patel", age: "48", gender: "female",
      email: "meena.patel@email.com", phone: "9123456789",
      location: "Mumbai", height: "158", weight: "78",
      smoking: false, alcohol: true, exercise: "light",
      family_history: "Diabetes (father), Hypertension (mother)"
    }
  },
  {
    label: "❌ Declined",
    color: "border-red-500/40 hover:border-red-400",
    textColor: "text-red-400",
    badge: "bg-red-500/10 text-red-400",
    data: {
      name: "Rajan Verma", age: "62", gender: "male",
      email: "rajan.verma@email.com", phone: "9988776655",
      location: "Delhi", height: "168", weight: "105",
      smoking: true, alcohol: true, exercise: "none",
      family_history: "Heart disease (father), Diabetes (mother), Cancer (brother)"
    }
  }
];

// ── Input guards ─────────────────────────────────────────────────────────────
const blockNonDigits = (e) => {
  const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab"];
  if (!allowed.includes(e.key) && !/^\d$/.test(e.key)) e.preventDefault();
};

const blockNonLetters = (e) => {
  const allowed = ["Backspace","Delete","ArrowLeft","ArrowRight","Tab"," "];
  if (!allowed.includes(e.key) && !/^[a-zA-Z]$/.test(e.key)) e.preventDefault();
};

export default function PolicyHolderProfile({ onNext }) {
  const [form, setForm] = useState({
    name: "", age: "", gender: "male", email: "", phone: "",
    location: "", height: "", weight: "", smoking: false,
    alcohol: false, exercise: "moderate", family_history: ""
  });
  const [errors, setErrors] = useState({});
  const [showSamples, setShowSamples] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const fillSample = (data) => {
    setForm(data);
    setErrors({});
    setShowSamples(false);
  };

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (!form.age || parseInt(form.age) < 18 || parseInt(form.age) > 100) e.age = "Valid age 18–100 required";
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = "Valid email required";
    if (!form.phone.match(/^\d{10}$/)) e.phone = "10-digit phone required";
    if (!form.location.trim()) e.location = "Location required";
    if (!form.height || parseFloat(form.height) < 100 || parseFloat(form.height) > 250) e.height = "Height 100–250 cm";
    if (!form.weight || parseFloat(form.weight) < 20 || parseFloat(form.weight) > 300) e.weight = "Weight 20–300 kg";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (validate()) onNext({
      ...form,
      age: parseInt(form.age),
      height: parseFloat(form.height),
      weight: parseFloat(form.weight)
    });
  };

  const bmi = (s) => (parseFloat(s.weight) / Math.pow(parseFloat(s.height) / 100, 2)).toFixed(1);

  return (
    <div className="space-y-6">

      {/* Header row */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-cyan-500/10 rounded-xl border border-cyan-500/20">
            <User size={22} className="text-cyan-400" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">Policyholder Profile</h2>
            <p className="text-slate-400 text-sm">Step 1 of 3 — Personal & health details</p>
          </div>
        </div>
        <button
          onClick={() => setShowSamples(p => !p)}
          className="flex items-center gap-2 px-4 py-2 bg-slate-700/60 hover:bg-slate-600/60 border border-slate-600 hover:border-cyan-500/50 text-slate-300 text-sm font-medium rounded-xl transition-all"
        >
          <FlaskConical size={14} className="text-cyan-400" />
          Fill Sample Data
        </button>
      </div>

      {/* Sample cards */}
      {showSamples && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-4 space-y-3">
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Select a profile to auto-fill the form:</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {SAMPLES.map((s) => (
              <button
                key={s.label}
                onClick={() => fillSample(s.data)}
                className={`p-4 rounded-xl border bg-slate-800/80 text-left transition-all ${s.color}`}
              >
                <span className={`inline-block text-xs font-bold px-2 py-0.5 rounded-full mb-2 ${s.badge}`}>{s.label}</span>
                <p className="text-white text-sm font-semibold">{s.data.name}</p>
                <p className="text-slate-400 text-xs mt-0.5">Age {s.data.age} · BMI {bmi(s.data)} · {s.data.location}</p>
                <p className={`text-xs mt-1 font-medium ${s.textColor}`}>
                  {s.data.smoking ? "Smoker · " : ""}{s.data.alcohol ? "Alcohol · " : ""}Exercise: {s.data.exercise}
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Fields */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

        {/* Name — letters only */}
        <div>
          <label className={LABEL}>Full Name</label>
          <div className="relative">
            <User size={16} className="absolute left-3 top-3.5 text-slate-500" />
            <input
              className={INPUT + " pl-10"}
              placeholder="Rajesh Kumar"
              value={form.name}
              onKeyDown={blockNonLetters}
              onChange={e => set("name", e.target.value)}
              maxLength={50}
            />
          </div>
          {errors.name && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.name}</p>}
        </div>

        {/* Age — digits only */}
        <div>
          <label className={LABEL}>Age</label>
          <input
            className={INPUT}
            type="number"
            placeholder="35"
            min={18} max={100}
            value={form.age}
            onKeyDown={blockNonDigits}
            onChange={e => {
              const v = e.target.value;
              if (v === "" || (parseInt(v) >= 0 && parseInt(v) <= 100)) set("age", v);
            }}
          />
          {errors.age && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.age}</p>}
        </div>

        {/* Gender */}
        <div>
          <label className={LABEL}>Gender</label>
          <select className={INPUT} value={form.gender} onChange={e => set("gender", e.target.value)}>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
          </select>
        </div>

        {/* Email */}
        <div>
          <label className={LABEL}>Email</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-3.5 text-slate-500" />
            <input
              className={INPUT + " pl-10"}
              type="email"
              placeholder="rajesh@email.com"
              value={form.email}
              onChange={e => set("email", e.target.value)}
              maxLength={100}
            />
          </div>
          {errors.email && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.email}</p>}
        </div>

        {/* Phone — digits only, max 10 */}
        <div>
          <label className={LABEL}>Phone</label>
          <div className="relative">
            <Phone size={16} className="absolute left-3 top-3.5 text-slate-500" />
            <input
              className={INPUT + " pl-10"}
              type="tel"
              placeholder="9876543210"
              value={form.phone}
              onKeyDown={blockNonDigits}
              onChange={e => {
                const v = e.target.value.replace(/\D/g, "").slice(0, 10);
                set("phone", v);
              }}
              maxLength={10}
            />
          </div>
          {errors.phone && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.phone}</p>}
        </div>

        {/* Location — letters only */}
        <div>
          <label className={LABEL}>Location / City</label>
          <div className="relative">
            <MapPin size={16} className="absolute left-3 top-3.5 text-slate-500" />
            <input
              className={INPUT + " pl-10"}
              placeholder="Mumbai"
              value={form.location}
              onKeyDown={blockNonLetters}
              onChange={e => set("location", e.target.value)}
              maxLength={50}
            />
          </div>
          {errors.location && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.location}</p>}
        </div>

        {/* Height — digits only */}
        <div>
          <label className={LABEL}>Height (cm)</label>
          <input
            className={INPUT}
            type="number"
            placeholder="170"
            min={100} max={250}
            value={form.height}
            onKeyDown={blockNonDigits}
            onChange={e => {
              const v = e.target.value;
              if (v === "" || parseFloat(v) <= 250) set("height", v);
            }}
          />
          {errors.height && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.height}</p>}
        </div>

        {/* Weight — digits only */}
        <div>
          <label className={LABEL}>Weight (kg)</label>
          <input
            className={INPUT}
            type="number"
            placeholder="70"
            min={20} max={300}
            value={form.weight}
            onKeyDown={blockNonDigits}
            onChange={e => {
              const v = e.target.value;
              if (v === "" || parseFloat(v) <= 300) set("weight", v);
            }}
          />
          {errors.weight && <p className="text-red-400 text-xs mt-1 flex items-center gap-1"><AlertCircle size={12} />{errors.weight}</p>}
        </div>

      </div>

      {/* Lifestyle */}
      <div className="border-t border-slate-700/50 pt-5">
        <p className={LABEL + " mb-4"}>Lifestyle Factors</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-xl border border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all select-none">
            <input type="checkbox" className="w-4 h-4 accent-cyan-500" checked={form.smoking} onChange={e => set("smoking", e.target.checked)} />
            <span className="text-white text-sm font-medium">Smoker</span>
          </label>
          <label className="flex items-center gap-3 p-4 bg-slate-800/40 rounded-xl border border-slate-700 cursor-pointer hover:border-cyan-500/50 transition-all select-none">
            <input type="checkbox" className="w-4 h-4 accent-cyan-500" checked={form.alcohol} onChange={e => set("alcohol", e.target.checked)} />
            <span className="text-white text-sm font-medium">Alcohol</span>
          </label>
          <select className={INPUT} value={form.exercise} onChange={e => set("exercise", e.target.value)}>
            <option value="none">No Exercise</option>
            <option value="light">Light Exercise</option>
            <option value="moderate">Moderate Exercise</option>
            <option value="heavy">Heavy Exercise</option>
          </select>
        </div>
      </div>

      {/* Family History */}
      <div>
        <label className={LABEL}>Family Medical History (optional)</label>
        <textarea
          className={INPUT + " resize-none h-20"}
          placeholder="e.g. Diabetes (father), Hypertension (mother)..."
          value={form.family_history}
          onChange={e => set("family_history", e.target.value)}
          maxLength={300}
        />
      </div>

      {/* Next */}
      <button
        onClick={handleNext}
        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-4 rounded-xl transition-all duration-200 shadow-lg shadow-cyan-500/20"
      >
        Next Step <ChevronRight size={18} />
      </button>
    </div>
  );
}
