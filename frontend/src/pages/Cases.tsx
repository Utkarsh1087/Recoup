import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, RecoveryCase } from "../services/api";
import { Search, ArrowRight } from "lucide-react";

export const Cases: React.FC = () => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  const tabs = [
    { label: "All Cases", filter: "All" },
    { label: "Payment Failures", filter: "PAYMENT_FAILURE" },
    { label: "Checkout Abandonment", filter: "CHECKOUT_ABANDONMENT" },
    { label: "Subscription Failures", filter: "SUBSCRIPTION_FAILURE" },
    { label: "Recovered", filter: "RECOVERED" },
    { label: "Escalated", filter: "ESCALATED" },
    { label: "Failed", filter: "FAILED" }
  ];

  const fetchCases = async () => {
    try {
      setLoading(true);
      const statusParam = ["RECOVERED", "ESCALATED", "FAILED"].includes(activeTab) ? activeTab : "All";
      const sourceParam = ["PAYMENT_FAILURE", "CHECKOUT_ABANDONMENT", "SUBSCRIPTION_FAILURE"].includes(activeTab) ? activeTab : "All";
      
      const data = await api.getRecoveryCases(statusParam, "All", sourceParam);
      setCases(data);
    } catch (e) {
      console.error("Error fetching cases", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, [activeTab]);

  const filteredCases = cases.filter(c => {
    const nameMatch = c.customer?.name.toLowerCase().includes(search.toLowerCase());
    const emailMatch = c.customer?.email.toLowerCase().includes(search.toLowerCase());
    return nameMatch || emailMatch;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "DETECTED":
        return "bg-blue-50 border border-blue-100 text-blue-600";
      case "ANALYZING":
        return "bg-indigo-50 border border-indigo-100 text-indigo-600";
      case "ACTION_PENDING":
        return "bg-yellow-50 border border-yellow-100 text-yellow-600";
      case "IN_PROGRESS":
        return "bg-sky-50 border border-sky-100 text-sky-600";
      case "RECOVERED":
        return "bg-emerald-50 border border-emerald-100 text-emerald-600";
      case "FAILED":
        return "bg-rose-50 border border-rose-100 text-rose-600";
      case "ESCALATED":
        return "bg-amber-50 border border-amber-100 text-amber-600";
      default:
        return "bg-slate-50 border border-slate-200 text-slate-600";
    }
  };

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">
      {/* Filters & Tabs Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.label}
              onClick={() => setActiveTab(tab.filter)}
              className={`px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === tab.filter 
                  ? "bg-sky-500 text-white shadow-sm" 
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        
        {/* Search */}
        <div className="relative w-full md:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
            <Search className="w-4 h-4" />
          </span>
          <input
            type="text"
            placeholder="Search customer email/name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
          />
        </div>
      </div>

      {/* Main Cases Table */}
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
                  <th className="py-4 px-6">Case ID</th>
                  <th className="py-4 px-6">Customer</th>
                  <th className="py-4 px-6">Source</th>
                  <th className="py-4 px-6">Amount</th>
                  <th className="py-4 px-6 text-center">Probability</th>
                  <th className="py-4 px-6 text-center">Priority</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6">Created Date</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {filteredCases.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 px-6 text-center text-slate-400 text-xs">
                      No matching recovery cases found.
                    </td>
                  </tr>
                ) : (
                  filteredCases.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors text-xs text-slate-600">
                      <td className="py-4 px-6 font-mono font-semibold text-slate-400">#REC-{c.id}</td>
                      <td className="py-4 px-6">
                        <div className="font-bold text-slate-900">{c.customer?.name}</div>
                        <div className="text-[10px] text-slate-400">{c.customer?.email}</div>
                      </td>
                      <td className="py-4 px-6">
                        <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500 font-mono font-semibold">
                          {c.source_type.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-6 font-bold text-slate-900">₹{c.amount_at_risk.toLocaleString("en-IN")}</td>
                      <td className="py-4 px-6 text-center font-mono font-bold text-slate-700">{Math.round(c.recovery_probability * 100)}%</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          c.priority === "CRITICAL" 
                            ? "bg-rose-50 text-rose-600 border border-rose-100" 
                            : c.priority === "HIGH" 
                            ? "bg-orange-50 text-orange-600 border border-orange-100" 
                            : c.priority === "MEDIUM" 
                            ? "bg-yellow-50 text-yellow-600 border border-yellow-100" 
                            : "bg-sky-50 text-sky-600 border border-sky-100"
                        }`}>
                          {c.priority}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wide uppercase ${getStatusBadge(c.status)}`}>
                          {c.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-400">{new Date(c.created_at).toLocaleDateString()}</td>
                      <td className="py-4 px-6 text-right">
                        <Link 
                          to={`/cases/${c.id}`}
                          className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-md font-semibold transition-colors shadow-sm"
                        >
                          Inspect
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
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
export default Cases;
