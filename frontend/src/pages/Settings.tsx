import React, { useState } from "react";
import { Sliders, Shield, KeyRound, Save } from "lucide-react";

export const Settings: React.FC = () => {
  const [provider, setProvider] = useState("mock");
  const [escalationCap, setEscalationCap] = useState(50000);
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Platform Settings</h2>
      </div>

      <form onSubmit={handleSave} className="max-w-2xl bg-white border border-slate-200 rounded-xl p-8 space-y-6 shadow-sm">
        
        {/* Section 1: AI Engine Configuration */}
        <div className="space-y-4">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Shield className="w-4 h-4 text-sky-500" />
            AI Decision Routing
          </h3>
          <div className="space-y-3">
            <label className="block text-xs text-slate-400 font-bold font-mono">LLM Provider Preference</label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "mock", name: "Mock Model (Rule)", desc: "Zero-config standalone demo fallback" },
                { id: "gemini", name: "Google Gemini", desc: "Native tool calling via Gemini API key" },
                { id: "openai", name: "OpenAI GPT", desc: "Standard structured JSON completions" }
              ].map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => setProvider(opt.id)}
                  className={`border p-4 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                    provider === opt.id 
                      ? "border-sky-500 bg-sky-50/30 text-slate-900" 
                      : "border-slate-200 bg-slate-50/30 text-slate-500 hover:border-slate-350"
                  }`}
                >
                  <span className="text-xs font-bold block">{opt.name}</span>
                  <span className="text-[9px] text-slate-400 mt-2 block leading-normal">{opt.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Section 2: Policy Thresholds */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-4 h-4 text-sky-500" />
            Safety & Dunning Boundaries
          </h3>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="block text-xs text-slate-400 font-bold font-mono">Max Recovery Attempts</label>
              <select className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500">
                <option value="2">2 attempts (Recommended Cap)</option>
                <option value="3">3 attempts</option>
                <option value="4">4 attempts</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="block text-xs text-slate-400 font-bold font-mono">High-Value Escalate Cap (INR)</label>
              <input
                type="number"
                value={escalationCap}
                onChange={(e) => setEscalationCap(parseInt(e.target.value))}
                className="w-full bg-white border border-slate-200 rounded-lg p-2.5 text-xs text-slate-700 focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Payment Integrations */}
        <div className="border-t border-slate-100 pt-6 space-y-4">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-sky-500" />
            Gateways Integration
          </h3>
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-500 space-y-2">
            <p className="font-bold text-slate-800">Razorpay Test Mode</p>
            <p className="leading-relaxed text-[11px] text-slate-55">
              To trigger actual test transactions, set the <code className="font-mono bg-white border border-slate-200 px-1 rounded text-slate-600">RAZORPAY_KEY_ID</code> and <code className="font-mono bg-white border border-slate-200 px-1 rounded text-slate-600">RAZORPAY_KEY_SECRET</code> in the backend root <code className="font-mono">.env</code> file. When absent, the system executes simulated mock payments automatically.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-100 pt-6 flex items-center justify-between">
          <span className="text-[10px] text-slate-400 uppercase font-mono font-bold">Changes persist immediately locally</span>
          <button
            type="submit"
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-5 py-2.5 rounded-lg text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saved ? "Saved Configuration!" : "Save Settings"}
          </button>
        </div>

      </form>
    </div>
  );
};
export default Settings;
