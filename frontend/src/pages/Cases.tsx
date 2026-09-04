import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, RecoveryCase } from "../services/api";
import { Search, ArrowRight, Sparkles } from "lucide-react";
import { ProcessedCaseResult } from "../components/AiMissionControlModal";
import { TablePagination } from "../components/TablePagination";

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
  const [totalCases, setTotalCases] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("All");

  // Sorting state
  const [sortBy, setSortBy] = useState("date_desc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

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

      let startFilter: string | undefined;
      let endFilter: string | undefined;

      if (dateFilterType === "monthly") {
        const [year, month] = selectedMonth.split("-").map(Number);
        startFilter = new Date(year, month - 1, 1).toISOString();
        endFilter = new Date(year, month, 0, 23, 59, 59).toISOString();
      } else {
        const s = new Date(startDate);
        s.setHours(0, 0, 0, 0);
        startFilter = s.toISOString();
        const e = new Date(endDate);
        e.setHours(23, 59, 59, 999);
        endFilter = e.toISOString();
      }
      
      const res = await api.getRecoveryCases({
        status: statusParam,
        priority: "All",
        source_type: sourceParam,
        search,
        start_date: startFilter,
        end_date: endFilter,
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      });
      setCases(res.items || []);
      setTotalCases(res.total || 0);
    } catch (e) {
      console.error("Error fetching cases", e);
      setCases([]);
      setTotalCases(0);
    } finally {
      setLoading(false);
    }
  };

  // Reset to first page when search filters, dates, or active tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, search, dateFilterType, selectedMonth, startDate, endDate, itemsPerPage]);

  useEffect(() => {
    fetchCases();
  }, [activeTab, search, dateFilterType, selectedMonth, startDate, endDate, currentPage, itemsPerPage]);

  // Apply sorting rules to current page view
  const sortedCases = [...cases].sort((a, b) => {
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
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 bg-slate-50/50 min-h-screen text-slate-800">
      {/* Category Tabs */}
      <div className="bg-white border border-slate-200 p-3 sm:p-4 rounded-xl shadow-sm overflow-x-auto">
        <div className="flex gap-1.5 min-w-max">
          {tabs.map((tab) => (
            <button
              key={tab.filter}
              onClick={() => setActiveTab(tab.filter)}
              className={`px-3.5 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
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

      {/* Sort By, Search + Gmail Pagination toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Recovery Cases</h2>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          {/* Sort By Dropdown */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort:</span>
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
          <div className="relative w-full sm:w-52 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID (e.g. 150), name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
            />
          </div>

          {/* Top Gmail-style Pagination */}
          <div className="border-l border-slate-200 pl-3 sm:pl-4">
            <TablePagination
              currentPage={currentPage}
              totalItems={totalCases}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[25, 50, 100]}
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
              <table className="w-full text-left border-collapse min-w-[860px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-3 lg:px-4 whitespace-nowrap">Case ID</th>
                    <th className="py-3 px-3 lg:px-4 whitespace-nowrap">Customer</th>
                    <th className="py-3 px-3 lg:px-4 whitespace-nowrap">Problem</th>
                    <th className="py-3 px-3 lg:px-4 whitespace-nowrap">At Risk</th>
                    <th className="py-3 px-3 lg:px-4 whitespace-nowrap">Recovered</th>
                    <th className="py-3 px-2 lg:px-3 text-center whitespace-nowrap">Probability</th>
                    <th className="py-3 px-2 lg:px-3 text-center whitespace-nowrap">Priority</th>
                    <th className="py-3 px-2 lg:px-3 text-center whitespace-nowrap">Status</th>
                    <th className="py-3 px-3 lg:px-4 text-right whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedCases.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-12 px-6 text-center text-slate-400 text-xs">
                        No recovery cases match your active filters or search.
                      </td>
                    </tr>
                  ) : (
                    sortedCases.map((c) => {
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
                          <td className="py-3.5 px-3 lg:px-4 font-mono font-semibold text-slate-500 whitespace-nowrap">#REC-{c.id}</td>
                          <td className="py-3.5 px-3 lg:px-4">
                            <div className="flex items-center gap-2">
                              <div className="min-w-0">
                                <div className="font-bold text-slate-900 truncate max-w-[120px] sm:max-w-[150px] xl:max-w-[180px]" title={c.customer?.name}>
                                  {c.customer?.name}
                                </div>
                                <div className="text-[10px] text-slate-400 truncate max-w-[120px] sm:max-w-[150px] xl:max-w-[180px]" title={c.customer?.email}>
                                  {c.customer?.email}
                                </div>
                              </div>
                              {missionMatch && (
                                <span className="bg-sky-100 text-sky-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 font-sans shrink-0">
                                  <Sparkles className="w-2.5 h-2.5 text-sky-600" />
                                  AI
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3.5 px-3 lg:px-4 whitespace-nowrap">
                            <span className="bg-slate-100 px-2 py-0.5 rounded text-[10px] text-slate-600 font-mono font-medium whitespace-nowrap inline-block">
                              {c.source_type.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 lg:px-4 font-bold text-slate-900 whitespace-nowrap">
                            ₹{Number(c.amount_at_risk).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </td>
                          <td className="py-3.5 px-3 lg:px-4 font-bold text-emerald-600 whitespace-nowrap">
                            {c.amount_recovered > 0 
                              ? `₹${Number(c.amount_recovered).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                              : "—"}
                          </td>
                          <td className="py-3.5 px-2 lg:px-3 text-center font-mono font-bold text-slate-700 whitespace-nowrap">
                            {Math.round(c.recovery_probability * 100)}%
                          </td>
                          <td className="py-3.5 px-2 lg:px-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap inline-block ${
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
                          <td className="py-3.5 px-2 lg:px-3 text-center whitespace-nowrap">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap inline-block ${getStatusBadge(c.status)}`}>
                              {c.status.replace(/_/g, " ")}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 lg:px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {missionMatch && onInspectMissionCase && (
                                <button
                                  type="button"
                                  onClick={() => onInspectMissionCase(c.id)}
                                  title="See what AI did for this customer"
                                  className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 px-2 py-1 rounded-md font-bold transition-all shadow-xs cursor-pointer text-[11px] whitespace-nowrap"
                                >
                                  <Sparkles className="w-2.5 h-2.5 text-sky-600" />
                                  AI Action
                                </button>
                              )}
                              <Link 
                                to={`/cases/${c.id}`}
                                className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2 py-1 sm:px-2.5 sm:py-1 rounded-md font-semibold transition-all shadow-sm whitespace-nowrap text-xs"
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

            {/* Bottom Toolbar Pagination */}
            {totalCases > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
                <span className="text-slate-400 text-[11px]">
                  Total Cases: <span className="font-bold text-slate-700">{totalCases.toLocaleString("en-IN")}</span>
                </span>
                
                <TablePagination
                  currentPage={currentPage}
                  totalItems={totalCases}
                  itemsPerPage={itemsPerPage}
                  onPageChange={setCurrentPage}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Cases;
