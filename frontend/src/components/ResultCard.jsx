import { Shield, TrendingUp, AlertTriangle, CheckCircle, XCircle, RefreshCw, Star, Activity } from "lucide-react";

const TIER_ICONS = { Platinum: "💎", Gold: "🏆", Silver: "🥈", Standard: "📋", Declined: "❌" };

export default function ResultCard({ result, onReset }) {
  if (!result) return null;
  const { risk, premium, profile } = result;
  const declined = premium.tier === "Declined";

  const impactColor = (impact) => {
    if (impact === "None") return "text-green-400";
    if (impact === "Low") return "text-blue-400";
    if (impact === "Moderate") return "text-yellow-400";
    if (impact === "High") return "text-orange-400";
    return "text-red-400";
  };

  const impactBg = (impact) => {
    if (impact === "None") return "bg-green-500/10 border-green-500/30";
    if (impact === "Low") return "bg-blue-500/10 border-blue-500/30";
    if (impact === "Moderate") return "bg-yellow-500/10 border-yellow-500/30";
    if (impact === "High") return "bg-orange-500/10 border-orange-500/30";
    return "bg-red-500/10 border-red-500/30";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
          <Shield size={22} className="text-emerald-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Insurance Quote</h2>
          <p className="text-slate-400 text-sm">Step 3 of 3 — Your personalised assessment</p>
        </div>
      </div>

      {/* Main quote card */}
      <div className={`relative overflow-hidden rounded-2xl p-6 border ${declined ? "bg-red-500/5 border-red-500/30" : "bg-gradient-to-br from-slate-800 to-slate-900 border-slate-700"}`}>
        {!declined && (
          <div className="absolute inset-0 opacity-5" style={{
            backgroundImage: "radial-gradient(circle at 80% 20%, #06b6d4 0%, transparent 60%)"
          }} />
        )}
        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <p className="text-slate-400 text-sm mb-1">Hello, {profile.name}</p>
              <div className="flex items-center gap-3">
                <span className="text-3xl">{TIER_ICONS[premium.tier]}</span>
                <div>
                  <h3 className="text-2xl font-black text-white">{premium.tier} Plan</h3>
                  {!declined && <p className="text-slate-400 text-sm">Coverage: {premium.coverage}</p>}
                </div>
              </div>
            </div>
            {!declined ? (
              <div className="text-right">
                <p className="text-slate-400 text-xs uppercase tracking-wider">Annual Premium</p>
                <p className="text-3xl font-black" style={{ color: premium.color }}>
                  ₹{premium.annual?.toLocaleString("en-IN")}
                </p>
                <p className="text-slate-400 text-sm">₹{premium.monthly?.toLocaleString("en-IN")} / month</p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-red-400">
                <XCircle size={20} />
                <span className="font-bold">Application Declined</span>
              </div>
            )}
          </div>

          {declined && (
            <p className="mt-4 text-red-300 text-sm bg-red-500/10 rounded-lg p-3 border border-red-500/20">
              {premium.reason}
            </p>
          )}
        </div>
      </div>

      {/* Risk Score */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Risk Score", value: risk.total, icon: <TrendingUp size={16} />, color: risk.total > 5 ? "#EF4444" : risk.total > 3 ? "#F59E0B" : "#10B981" },
          { label: "BMI", value: risk.bmi, icon: <Activity size={16} />, color: "#06B6D4" },
          { label: "Age", value: profile.age, icon: <Star size={16} />, color: "#8B5CF6" },
        ].map(item => (
          <div key={item.label} className="bg-slate-800/60 rounded-xl p-4 border border-slate-700 text-center">
            <div className="flex items-center justify-center gap-1.5 mb-2" style={{ color: item.color }}>
              {item.icon}
              <span className="text-xs font-semibold uppercase tracking-wider">{item.label}</span>
            </div>
            <p className="text-2xl font-black text-white">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Risk Factors */}
      {risk.factors.length > 0 && (
        <div>
          <p className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-3 flex items-center gap-2">
            <AlertTriangle size={13} /> Risk Factor Breakdown
          </p>
          <div className="space-y-2">
            {risk.factors.map((f, i) => (
              <div key={i} className={`flex items-center justify-between p-3 rounded-xl border ${impactBg(f.impact)}`}>
                <div className="flex items-center gap-2">
                  {f.impact === "None" ? <CheckCircle size={14} className="text-green-400" /> : <AlertTriangle size={14} className={impactColor(f.impact)} />}
                  <span className="text-white text-sm">{f.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-bold ${impactColor(f.impact)}`}>{f.impact}</span>
                  <span className="text-slate-500 text-xs">+{f.score}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={onReset}
          className="flex items-center gap-2 px-6 py-4 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl transition-all"
        >
          <RefreshCw size={16} /> Restart
        </button>
        {!declined && (
          <button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-emerald-500/20">
            🎉 Get Policy Now
          </button>
        )}
      </div>
    </div>
  );
}
