import React, { useEffect, useState } from "react";
import { api, Transaction } from "../services/api";

export const Transactions: React.FC = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTxs = async () => {
      try {
        const data = await api.getTransactions();
        setTxs(data);
      } catch (e) {
        console.error("Error fetching transactions", e);
      } finally {
        setLoading(false);
      }
    };
    fetchTxs();
  }, []);

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction History</h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">Tx ID</th>
                  <th className="py-4 px-6">Customer ID</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6">Method</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6">Gateway Ref</th>
                  <th className="py-4 px-6">Failure Reason</th>
                  <th className="py-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody>
                {txs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-6 text-center text-slate-400 text-xs">
                      No transactions recorded.
                    </td>
                  </tr>
                ) : (
                  txs.map((tx) => (
                    <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors text-xs text-slate-600">
                      <td className="py-4 px-6 font-mono font-semibold text-slate-400">#TX-{tx.id}</td>
                      <td className="py-4 px-6 font-mono">Cust #{tx.customer_id}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">₹{tx.amount.toLocaleString("en-IN")}</td>
                      <td className="py-4 px-6 font-mono text-[10px] text-slate-400">{tx.payment_method}</td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          tx.status === "SUCCESS" 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : tx.status === "FAILED"
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-yellow-50 text-yellow-600 border border-yellow-100"
                        }`}>
                          {tx.status}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-mono text-[10px] text-slate-400">{tx.razorpay_reference || "N/A"}</td>
                      <td className="py-4 px-6 text-rose-600 font-mono text-[10px]">{tx.failure_reason || "None"}</td>
                      <td className="py-4 px-6 text-slate-400">{new Date(tx.created_at).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default Transactions;
