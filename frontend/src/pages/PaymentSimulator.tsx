import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, XCircle, CreditCard, DollarSign } from "lucide-react";

export const PaymentSimulator: React.FC = () => {
  const { tx_id } = useParams<{ tx_id: string }>();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<"pending" | "success" | "failed">("pending");
  const [details, setDetails] = useState<{ amount: number; description: string } | null>(null);

  useEffect(() => {
    // Generate realistic amount for simulation screen
    const seedAmount = Math.floor(Math.random() * 8000) + 1200;
    setDetails({
      amount: seedAmount,
      description: `Simulated Recovery Checkout for Transaction Reference: ${tx_id}`
    });
  }, [tx_id]);

  const handleSimulatePayment = async (payStatus: "SUCCESS" | "FAILED") => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8000/api/recovery/callback/razorpay?tx_id=${tx_id}&status=${payStatus}`);
      if (res.ok) {
        setStatus(payStatus === "SUCCESS" ? "success" : "failed");
      } else {
        alert("Webhook callback failed to resolve.");
      }
    } catch (e) {
      console.error(e);
      alert("Error sending callback to backend server.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl relative overflow-hidden">
        
        {/* Decorative Top Glow */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-500 via-sky-500 to-amber-500"></div>

        {status === "pending" && (
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 mb-2 border border-emerald-500/20">
                <CreditCard className="w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">RecoverAI Secure Gateway</h2>
              <p className="text-xs text-slate-500">Test-Mode Payment Simulation Sandbox</p>
            </div>

            {details && (
              <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl text-xs space-y-3 font-mono">
                <div className="flex justify-between items-center text-slate-400">
                  <span>Merchant</span>
                  <span className="text-white font-semibold">Demo Sandbox Merchant</span>
                </div>
                <div className="flex justify-between items-center text-slate-400">
                  <span>Reference ID</span>
                  <span className="text-slate-200">{tx_id}</span>
                </div>
                <div className="border-t border-slate-800/80 pt-3 flex justify-between items-center">
                  <span className="text-slate-400">Total Amount Due</span>
                  <span className="text-lg font-bold text-emerald-400">₹{details.amount.toLocaleString("en-IN")}</span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              <button
                onClick={() => handleSimulatePayment("SUCCESS")}
                disabled={loading}
                className="w-full bg-emerald-400 hover:bg-emerald-300 disabled:opacity-50 text-slate-950 font-bold py-3 rounded-xl text-xs transition-colors shadow-lg cursor-pointer"
              >
                {loading ? "Processing..." : "Simulate Successful Payment (PAY)"}
              </button>

              <button
                onClick={() => handleSimulatePayment("FAILED")}
                disabled={loading}
                className="w-full bg-slate-950 border border-slate-800 hover:bg-slate-800 text-rose-500 font-bold py-3 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Simulate Payment Fail (DECLINE)
              </button>
            </div>
            
            <p className="text-[10px] text-center text-slate-600 leading-normal">
              No real bank charges will apply. Clicking successful will trigger webhook verification on the dashboard cases.
            </p>
          </div>
        )}

        {status === "success" && (
          <div className="text-center space-y-6 py-6">
            <div className="inline-flex p-4 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 animate-pulse">
              <CheckCircle2 className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Payment Successful!</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Thank you. Your invoice has been processed successfully under Reference: <span className="font-mono text-emerald-400">{tx_id}</span>.
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-[10px] text-slate-500 font-mono">
              The RecoverAI case state has shifted to RECOVERED. You can close this tab now.
            </div>
          </div>
        )}

        {status === "failed" && (
          <div className="text-center space-y-6 py-6">
            <div className="inline-flex p-4 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <XCircle className="w-12 h-12" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Payment Failed</h2>
              <p className="text-xs text-slate-400 leading-relaxed">
                Your payment attempt was declined by the bank gateway simulator. Reference: <span className="font-mono text-rose-400">{tx_id}</span>.
              </p>
            </div>
            <div className="bg-slate-950/60 p-3 rounded-lg border border-slate-800/60 text-[10px] text-slate-500 font-mono">
              The RecoverAI case has registered retry failure and updated audit timelines.
            </div>
            <button
              onClick={() => setStatus("pending")}
              className="text-xs text-emerald-400 hover:underline font-semibold"
            >
              Try Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
};
export default PaymentSimulator;
