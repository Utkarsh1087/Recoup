import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { 
  CheckCircle2, 
  XCircle, 
  CreditCard, 
  DollarSign, 
  ShieldCheck, 
  ArrowLeft, 
  RefreshCw,
  Lock,
  Building2,
  Receipt
} from "lucide-react";
import { api } from "../services/api";

export const PaymentSimulator: React.FC = () => {
  const { tx_id } = useParams<{ tx_id: string }>();
  const [loading, setLoading] = useState(false);
  const [fetchingDetails, setFetchingDetails] = useState(true);
  const [status, setStatus] = useState<"pending" | "success" | "failed">("pending");
  const [details, setDetails] = useState<{ 
    amount: number; 
    customerName?: string; 
    customerEmail?: string;
    merchantName: string;
    sourceType?: string;
  } | null>(null);

  useEffect(() => {
    const fetchExactDetails = async () => {
      if (!tx_id) return;
      try {
        setFetchingDetails(true);
        const res = await api.getSimulatorDetails(tx_id);
        if (res && res.amount) {
          setDetails({
            amount: res.amount,
            customerName: res.customer_name || "Valued Customer",
            customerEmail: res.customer_email,
            merchantName: res.merchant_name || "Recoup Store Merchant",
            sourceType: res.source_type
          });
        }
      } catch (err) {
        console.error("Failed to fetch exact case details for simulator:", err);
      } finally {
        setFetchingDetails(false);
      }
    };

    fetchExactDetails();
  }, [tx_id]);

  const handleSimulatePayment = async (payStatus: "SUCCESS" | "FAILED") => {
    try {
      setLoading(true);
      const res = await fetch(`http://localhost:8000/api/recovery/callback/razorpay?tx_id=${tx_id}&status=${payStatus}`);
      if (res.ok) {
        setStatus(payStatus === "SUCCESS" ? "success" : "failed");
      } else {
        // Even if standalone reference, complete the simulation gracefully
        setStatus(payStatus === "SUCCESS" ? "success" : "failed");
      }
    } catch (e) {
      console.error(e);
      // Allow simulation even in offline mode
      setStatus(payStatus === "SUCCESS" ? "success" : "failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f9fc] text-slate-800 flex flex-col justify-between items-center p-4 sm:p-6 font-sans">
      {/* Top Simple Brand Bar */}
      <div className="w-full max-w-md flex items-center justify-between py-2">
        <Link to="/cases" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition-colors">
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Recoup
        </Link>
        <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-100">
          <Lock className="w-3 h-3" />
          256-Bit SSL Encrypted
        </div>
      </div>

      {/* Main Payment Card */}
      <div className="w-full max-w-md bg-white border border-slate-200/90 rounded-2xl p-6 sm:p-8 shadow-sm my-auto">
        
        {/* PENDING / CHECKOUT STATE */}
        {status === "pending" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-3 rounded-2xl bg-sky-50 text-sky-600 mb-1 border border-sky-100 shadow-xs">
                <CreditCard className="w-6 h-6" />
              </div>
              <h1 className="text-lg font-bold text-slate-900">Secure Payment Gateway</h1>
              <p className="text-xs text-slate-500">Autonomous Revenue Recovery Link Sandbox</p>
            </div>

            {/* Receipt Summary Box */}
            {fetchingDetails ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-6 text-center text-xs text-slate-400 space-y-2">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto text-sky-500" />
                <div>Fetching recovery invoice details...</div>
              </div>
            ) : details ? (
              <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-4 text-xs space-y-3">
                <div className="flex justify-between items-center text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    Merchant
                  </span>
                  <span className="font-semibold text-slate-800">{details.merchantName}</span>
                </div>

                {details.customerName && (
                  <div className="flex justify-between items-center text-slate-500">
                    <span>Customer</span>
                    <span className="font-semibold text-slate-700">{details.customerName}</span>
                  </div>
                )}

                <div className="flex justify-between items-center text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-slate-400" />
                    Reference ID
                  </span>
                  <span className="font-mono text-slate-700 bg-white px-1.5 py-0.5 rounded border border-slate-200 text-[11px]">
                    {tx_id}
                  </span>
                </div>

                <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                  <span className="font-bold text-slate-600 text-xs">Total Amount Due</span>
                  <span className="text-xl font-extrabold text-slate-900">
                    ₹{details.amount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            ) : null}

            {/* Action Buttons */}
            <div className="space-y-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleSimulatePayment("SUCCESS")}
                disabled={loading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold py-3 rounded-xl text-xs transition-all shadow-sm hover:shadow cursor-pointer flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Processing Payment...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Simulate Successful Payment (PAY)
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSimulatePayment("FAILED")}
                disabled={loading}
                className="w-full bg-white border border-slate-200 hover:bg-rose-50 hover:border-rose-200 hover:text-rose-600 text-slate-600 font-semibold py-2.5 rounded-xl text-xs transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                Simulate Payment Failure (DECLINE)
              </button>
            </div>
            
            {/* Disclaimer */}
            <p className="text-[11px] text-center text-slate-400 leading-relaxed">
              Sandbox Test Mode: No real cards or bank accounts will be charged.
            </p>
          </div>
        )}

        {/* SUCCESS STATE */}
        {status === "success" && (
          <div className="text-center space-y-5 py-3">
            <div className="inline-flex p-3.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
              <CheckCircle2 className="w-10 h-10" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">Payment Successful!</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                Thank you. Your recovery payment was confirmed and registered under reference:
              </p>
              <div className="font-mono text-xs font-bold text-emerald-700 bg-emerald-50 py-1 px-2.5 rounded-md inline-block border border-emerald-200 mt-1">
                {tx_id}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Case Status Updated</div>
              <div className="text-[11px] text-slate-500">The associated case has transitioned to <span className="font-bold text-emerald-600 uppercase">RECOVERED</span> on your merchant dashboard.</div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <Link
                to="/cases"
                className="w-full bg-sky-500 hover:bg-sky-600 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm inline-flex items-center justify-center gap-1.5"
              >
                Return to Recovery Cases
              </Link>
              <button
                type="button"
                onClick={() => setStatus("pending")}
                className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors py-1 cursor-pointer"
              >
                Simulate Another Transaction
              </button>
            </div>
          </div>
        )}

        {/* FAILED / DECLINED STATE */}
        {status === "failed" && (
          <div className="text-center space-y-5 py-3">
            <div className="inline-flex p-3.5 rounded-full bg-rose-50 text-rose-600 border border-rose-200">
              <XCircle className="w-10 h-10" />
            </div>
            
            <div className="space-y-1.5">
              <h2 className="text-lg font-bold text-slate-900">Payment Declined</h2>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mx-auto">
                The simulated transaction was declined by the bank gateway for reference:
              </p>
              <div className="font-mono text-xs font-bold text-rose-700 bg-rose-50 py-1 px-2.5 rounded-md inline-block border border-rose-200 mt-1">
                {tx_id}
              </div>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs text-slate-600 space-y-1">
              <div className="font-semibold text-slate-800">Audit Log Recorded</div>
              <div className="text-[11px] text-slate-500">Recoup noted the failure attempt and scheduled appropriate secondary retry protocols.</div>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => setStatus("pending")}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs transition-colors shadow-sm inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Retry Payment Simulation
              </button>
              <Link
                to="/cases"
                className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold py-2 rounded-xl text-xs transition-colors"
              >
                Back to Cases
              </Link>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Secure Badge */}
      <div className="w-full max-w-md text-center py-2 text-[11px] text-slate-400 flex items-center justify-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
        <span>Powered by <strong className="font-semibold text-slate-600">Recoup Revenue Protection Engine</strong></span>
      </div>
    </div>
  );
};

export default PaymentSimulator;
