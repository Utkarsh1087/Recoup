import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, RecoveryCase } from "../services/api";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { ProcessedCaseResult } from "../components/AiMissionControlModal";

interface CasesProps {
  dateFilterType: "monthly" | "custom";
  selectedMonth: string;
  startDate: string;
  endDate: string;
  missionResults?: ProcessedCaseResult[];
  onInspectMissionCase?: (caseId: number) => void;
}

export const Cases: React.FC<CasesProps> = ({
  dateFilterType,
  selectedMonth,
  startDate,
  endDate,
  missionResults = [],
  onInspectMissionCase
}) => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  // Sorting state
  const [sortBy, setSortBy] = useState("date_desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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

  // Reset to first page when search filters, dates, or sorting options change
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, dateFilterType, selectedMonth, startDate, endDate, sortBy]);

  // Filter cases by active date range
  const dateFilteredCases = cases.filter((c) => {
    let startFilter: Date;
    let endFilter: Date;

    if (dateFilterType === "monthly") {
      const [year, month] = selectedMonth.split("-").map(Number);
      startFilter = new Date(year, month - 1, 1);
      endFilter = new Date(year, month, 0, 23, 59, 59);
    } else {
      startFilter = new Date(startDate);
      startFilter.setHours(0, 0, 0, 0);
      endFilter = new Date(endDate);
      endFilter.setHours(23, 59, 59, 999);
    }

    const cDate = new Date(c.created_at);
    return cDate >= startFilter && cDate <= endFilter;
  });

  const filteredCases = dateFilteredCases.filter(c => {
    const nameMatch = c.customer?.name.toLowerCase().includes(search.toLowerCase());
    const emailMatch = c.customer?.email.toLowerCase().includes(search.toLowerCase());
    return nameMatch || emailMatch;
  });

  // Apply sorting rules
  const sortedCases = [...filteredCases].sort((a, b) => {
    if (sortBy === "date_desc") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    }
    if (sortBy === "date_asc") {
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    }
    if (sortBy === "amount_desc") {
      return b.amount_at_risk - a.amount_at_risk;
    }
    if (sortBy === "amount_asc") {
      return a.amount_at_risk - b.amount_at_risk;
    }
    if (sortBy === "prob_desc") {
      return b.recovery_probability - a.recovery_probability;
    }
    if (sortBy === "prob_asc") {
      return a.recovery_probability - b.recovery_probability;
    }
    return 0;
  });

  // Calculate pagination offsets
  const totalPages = Math.ceil(sortedCases.length / itemsPerPage);
  const paginatedCases = sortedCases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "RECOVERED":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "FAILED":
      case "STOPPED":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      case "ESCALATED":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      default:
        return "bg-sky-50 text-sky-700 border border-sky-200";
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen text-slate-800">
      {/* Category Tabs */}
      <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.filter}
              onClick={() => setActiveTab(tab.filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.filter
                  ? "bg-sky-500 text-white shadow-sm"
                  : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Sort By + Search toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-4 rounded-xl shadow-sm">
        {/* Right filters container */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort By:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
            >
              <option value="date_desc">Date (Newest)</option>
              <option value="date_asc">Date (Oldest)</option>
              <option value="amount_desc">Risk (Highest)</option>
              <option value="amount_asc">Risk (Lowest)</option>
              <option value="prob_desc">Probability (Highest)</option>
              <option value="prob_asc">Probability (Lowest)</option>
            </select>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search customer name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
            />
          </div>
        </div>
      </div>

      {/* Main Cases Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
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
                  {paginatedCases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 px-6 text-center text-slate-400 text-xs">
                        No matching recovery cases found.
                      </td>
                    </tr>
                  ) : (
                    paginatedCases.map((c) => {
                      const missionMatch = missionResults.find(r => r.case_id === c.id);
                      return (
                        <tr 
                          key={c.id} 
                          className={`border-b transition-colors text-xs text-slate-600 ${
                            missionMatch 
                              ? "bg-sky-50/60 hover:bg-sky-100/60 border-l-4 border-l-sky-500 border-slate-100" 
                              : "border-slate-100 hover:bg-slate-50/20"
                          }`}
                        >
                          <td className="py-4 px-6 font-mono font-semibold text-slate-400 whitespace-nowrap">
                            <div className="flex items-center gap-2">
                              <span>#REC-{c.id}</span>
                              {missionMatch && (
                                <span className="bg-sky-100 text-sky-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 font-sans">
                                  <Sparkles className="w-2.5 h-2.5 text-sky-600" />
                                  AI Action
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-4 px-6 whitespace-nowrap">
                            <div className="font-bold text-slate-900">{c.customer?.name}</div>
                            <div className="text-[10px] text-slate-400">{c.customer?.email}</div>
                          </td>
                          <td className="py-4 px-6">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-500 font-mono font-semibold whitespace-nowrap">
                              {c.source_type.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">₹{c.amount_at_risk.toLocaleString("en-IN")}</td>
                          <td className="py-4 px-6 text-center font-mono font-bold text-slate-700 whitespace-nowrap">{Math.round(c.recovery_probability * 100)}%</td>
                          <td className="py-4 px-6 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${
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
                            <span className={`px-2.5 py-1 rounded-full text-[9px] font-semibold tracking-wide uppercase whitespace-nowrap ${getStatusBadge(c.status)}`}>
                              {c.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="py-4 px-6 text-slate-400 whitespace-nowrap">{new Date(c.created_at).toLocaleDateString()}</td>
                          <td className="py-4 px-6 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {missionMatch && onInspectMissionCase && (
                                <button
                                  type="button"
                                  onClick={() => onInspectMissionCase(c.id)}
                                  title="See what AI did for this customer"
                                  className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 px-2 py-1.5 rounded-md font-bold transition-all shadow-xs cursor-pointer text-[11px]"
                                >
                                  <Sparkles className="w-3 h-3 text-sky-600" />
                                  See AI Action
                                </button>
                              )}
                              <Link 
                                to={`/cases/${c.id}`}
                                className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-md font-semibold transition-colors shadow-sm"
                              >
                                Inspect
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredCases.length > 0 && (
              <div className="flex justify-between items-center px-6 py-4 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
                <div>
                  Showing <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-bold text-slate-700">
                    {Math.min(currentPage * itemsPerPage, filteredCases.length)}
                  </span>{" "}
                  of <span className="font-bold text-slate-700">{filteredCases.length}</span> recovery cases
                </div>
                
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-sm cursor-pointer"
                  >
                    First
                  </button>
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-sm cursor-pointer"
                  >
                    Previous
                  </button>
                  
                  <span className="px-3 py-1.5 text-slate-600 font-bold bg-slate-100 rounded border border-slate-200">
                    Page {currentPage} of {totalPages || 1}
                  </span>
                  
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-sm cursor-pointer"
                  >
                    Next
                  </button>
                  <button
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages || totalPages === 0}
                    className="px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed font-semibold transition-colors shadow-sm cursor-pointer"
                  >
                    Last
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Cases;
