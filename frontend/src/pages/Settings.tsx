import React, { useState } from "react";
import { 
  Shield, 
  Save, 
  Sparkles, 
  MessageSquare, 
  Check, 
  Lock, 
  Bell
} from "lucide-react";

export const Settings: React.FC = () => {
  // Messaging mode (Ask permission vs Send automatically)
  const [messagingMode, setMessagingMode] = useState<string>(
    () => (typeof window !== "undefined" ? localStorage.getItem("recoup_messaging_mode") || "require_approval" : "require_approval")
  );
  const [languageTone, setLanguageTone] = useState("hinglish");
  const [primaryChannel, setPrimaryChannel] = useState("whatsapp");
  const [couponPrefix, setCouponPrefix] = useState("SAVE");

  // Limits & safety controls
  const [maxDiscount, setMaxDiscount] = useState(10);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [highValueCap, setHighValueCap] = useState(50000);
  const [blockCancelledSubs, setBlockCancelledSubs] = useState(true);

  // Notification preferences
  const [notifyHighValue, setNotifyHighValue] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  // Save feedback state
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof window !== "undefined") {
      localStorage.setItem("recoup_messaging_mode", messagingMode);
      localStorage.setItem("recoup_language_tone", languageTone);
      localStorage.setItem("recoup_primary_channel", primaryChannel);
      localStorage.setItem("recoup_coupon_prefix", couponPrefix);
      localStorage.setItem("recoup_max_discount", maxDiscount.toString());
      localStorage.setItem("recoup_max_attempts", maxAttempts.toString());
      localStorage.setItem("recoup_high_value_cap", highValueCap.toString());
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen text-slate-800">
      
      {/* Top Header */}
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-base font-extrabold text-slate-900 tracking-tight">Settings & Preferences</h2>
        <p className="text-xs text-slate-500 mt-1">Easily control how the AI talks to your customers, set discount limits, and choose notification alerts.</p>
      </div>

      <form onSubmit={handleSave} className="space-y-6 max-w-4xl">
        
        {/* ======================================================== */}
        {/* 1. HOW MESSAGES ARE SENT */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-sky-500" />
              1. How Customer Messages Are Sent
            </h3>
            <span className="text-[11px] text-slate-400">Control sending permission</span>
          </div>

          {/* Mode Choice Cards */}
          <div className="space-y-3">
            <label className="block text-xs text-slate-700 font-bold">When a payment fails, what should the AI do?</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              {/* Option A: Ask Permission First */}
              <div 
                onClick={() => setMessagingMode("require_approval")}
                className={`border p-5 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                  messagingMode === "require_approval" 
                    ? "border-emerald-500 bg-emerald-50/40 ring-2 ring-emerald-500/20 text-slate-900 shadow-xs" 
                    : "border-slate-200 bg-slate-50/30 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-emerald-600" />
                      Ask Me Before Sending (Recommended)
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-700">
                      You Approve First
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                    The AI drafts the message with the payment link and discount code, but <strong>waits for you to review or edit</strong> before it is sent to the customer.
                  </p>
                </div>
              </div>

              {/* Option B: Send Automatically */}
              <div 
                onClick={() => setMessagingMode("auto_send")}
                className={`border p-5 rounded-xl cursor-pointer transition-all flex flex-col justify-between ${
                  messagingMode === "auto_send" 
                    ? "border-sky-500 bg-sky-50/40 ring-2 ring-sky-500/20 text-slate-900 shadow-xs" 
                    : "border-slate-200 bg-slate-50/30 text-slate-600 hover:border-slate-300"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-sky-600" />
                      Send Automatically
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-sky-100 text-sky-700">
                      Auto-Pilot
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-2.5 leading-relaxed">
                    The AI automatically creates and <strong>sends the WhatsApp / SMS message immediately</strong> whenever a payment fails, without asking for approval.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Tone, Channel, Discount Code */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-2 border-t border-slate-100">
            <div className="space-y-2">
              <label className="block text-xs text-slate-700 font-bold">Language & Tone</label>
              <select 
                value={languageTone} 
                onChange={(e) => setLanguageTone(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="hinglish">Friendly Hinglish (Recommended for India)</option>
                <option value="english">Professional English</option>
                <option value="hindi">Simple Hindi</option>
              </select>
              <p className="text-[10px] text-slate-400">Sets the style of the customer message.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-slate-700 font-bold">Where to Send</label>
              <select 
                value={primaryChannel} 
                onChange={(e) => setPrimaryChannel(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2.5 text-xs text-slate-800 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="whatsapp">WhatsApp (Highest response rate)</option>
                <option value="sms">SMS Text Message</option>
                <option value="email">Email</option>
              </select>
              <p className="text-[10px] text-slate-400">Primary app used to reach the customer.</p>
            </div>

            <div className="space-y-2">
              <label className="block text-xs text-slate-700 font-bold">Discount Code Prefix</label>
              <input 
                type="text" 
                value={couponPrefix} 
                onChange={(e) => setCouponPrefix(e.target.value.toUpperCase())}
                placeholder="SAVE"
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-bold uppercase focus:outline-none focus:border-sky-500"
              />
              <p className="text-[10px] text-slate-400">Example: SAVE creates codes like SAVE10.</p>
            </div>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. DISCOUNT & SAFETY LIMITS */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Shield className="w-4 h-4 text-amber-500" />
              2. Discount & Follow-Up Limits
            </h3>
            <span className="text-[11px] text-slate-400">Set limits to protect your business</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Max Discount Slider */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-slate-700 font-bold">Maximum Discount Limit</label>
                <span className="text-xs font-bold text-sky-600 bg-sky-50 px-2 py-0.5 rounded border border-sky-100">Up to {maxDiscount}%</span>
              </div>
              <input 
                type="range" 
                min="0" 
                max="20" 
                step="1" 
                value={maxDiscount} 
                onChange={(e) => setMaxDiscount(parseInt(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer mt-1"
              />
              <p className="text-[10px] text-slate-400 leading-tight">AI will never offer a discount greater than {maxDiscount}%.</p>
            </div>

            {/* Max Retries */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs text-slate-700 font-bold">Maximum Follow-Up Reminders</label>
                <span className="text-xs font-bold text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-100">{maxAttempts} times</span>
              </div>
              <select 
                value={maxAttempts} 
                onChange={(e) => setMaxAttempts(parseInt(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 rounded-lg p-2 text-xs text-slate-800 font-medium focus:outline-none focus:border-sky-500 cursor-pointer"
              >
                <option value="1">1 reminder only</option>
                <option value="2">2 reminders (Recommended)</option>
                <option value="3">3 reminders</option>
              </select>
              <p className="text-[10px] text-slate-400 leading-tight">Stops sending reminders after {maxAttempts} tries to avoid spamming.</p>
            </div>

            {/* High Value Cap */}
            <div className="space-y-2">
              <label className="block text-xs text-slate-700 font-bold">Flag Large Orders For Personal Care</label>
              <div className="relative">
                <span className="absolute left-3 top-2 text-xs text-slate-400 font-bold">₹</span>
                <input 
                  type="number" 
                  value={highValueCap} 
                  onChange={(e) => setHighValueCap(parseInt(e.target.value))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-lg py-1.5 pl-7 pr-3 text-xs text-slate-800 font-bold focus:outline-none focus:border-sky-500"
                />
              </div>
              <p className="text-[10px] text-slate-400 leading-tight">Orders above ₹{highValueCap.toLocaleString("en-IN")} will be paused so you can call the customer directly.</p>
            </div>

          </div>

          <div className="pt-3 border-t border-slate-100 flex items-center gap-3">
            <input 
              type="checkbox" 
              id="blockSub" 
              checked={blockCancelledSubs} 
              onChange={(e) => setBlockCancelledSubs(e.target.checked)}
              className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
            />
            <label htmlFor="blockSub" className="text-xs text-slate-700 font-medium cursor-pointer">
              Do not send recovery messages to customers who already cancelled their subscription.
            </label>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. NOTIFICATIONS & ALERTS */}
        {/* ======================================================== */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <Bell className="w-4 h-4 text-indigo-500" />
              3. Alerts & Summary Reports
            </h3>
            <span className="text-[11px] text-slate-400">Choose when you want to be notified</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={notifyHighValue} 
                onChange={(e) => setNotifyHighValue(e.target.checked)}
                className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700">
                Alert me immediately when a high-value order (above <strong>₹{highValueCap.toLocaleString("en-IN")}</strong>) fails.
              </span>
            </label>

            <label className="flex items-center gap-3 cursor-pointer">
              <input 
                type="checkbox" 
                checked={dailyDigest} 
                onChange={(e) => setDailyDigest(e.target.checked)}
                className="w-4 h-4 rounded text-sky-500 accent-sky-500 cursor-pointer"
              />
              <span className="text-xs text-slate-700">
                Send me a daily recovery report showing total money recovered and pending cases.
              </span>
            </label>
          </div>
        </div>

        {/* ======================================================== */}
        {/* SAVE BUTTON */}
        {/* ======================================================== */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-200">
          <div className="text-xs text-slate-400">
            Changes will take effect immediately for all new payment recoveries.
          </div>
          <button
            type="submit"
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-6 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-sm transition-all cursor-pointer"
          >
            {saved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            {saved ? "Saved Successfully!" : "Save Preferences"}
          </button>
        </div>

      </form>
    </div>
  );
};

export default Settings;
