import React, { useEffect, useState } from "react";
import { api, Transaction } from "../services/api";
import { Search } from "lucide-react";
import { TablePagination } from "../components/TablePagination";

interface TransactionsProps {
  dateFilterType?: "monthly" | "custom";
  selectedMonth?: string;
  startDate?: string;
  endDate?: string;
}

export const Transactions: React.FC<TransactionsProps> = ({
  dateFilterType,
  selectedMonth,
  startDate,
  endDate
}) => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [totalTxs, setTotalTxs] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchTxs = async () => {
    try {
      setLoading(true);

      let startFilter: string | undefined;
      let endFilter: string | undefined;

      if (dateFilterType && selectedMonth) {
        if (dateFilterType === "monthly") {
          const [year, month] = selectedMonth.split("-").map(Number);
          startFilter = new Date(year, month - 1, 1).toISOString();
          endFilter = new Date(year, month, 0, 23, 59, 59).toISOString();
        } else if (startDate && endDate) {
          const s = new Date(startDate);
          s.setHours(0, 0, 0, 0);
          startFilter = s.toISOString();
          const e = new Date(endDate);
          e.setHours(23, 59, 59, 999);
          endFilter = e.toISOString();
        }
      }

      const res = await api.getTransactions({
        status: statusFilter,
        payment_method: methodFilter,
        search,
        start_date: startFilter,
        end_date: endFilter,
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      });
      setTxs(res.items || []);
      setTotalTxs(res.total || 0);
    } catch (e) {
      console.error("Error fetching transactions", e);
      setTxs([]);
      setTotalTxs(0);
    } finally {
      setLoading(false);
    }
  };

  // Reset to first page when search filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, methodFilter, dateFilterType, selectedMonth, startDate, endDate, itemsPerPage]);

  useEffect(() => {
    fetchTxs();
  }, [search, statusFilter, methodFilter, dateFilterType, selectedMonth, startDate, endDate, currentPage, itemsPerPage]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 bg-slate-50/50 min-h-screen text-slate-800">
      
      {/* Search, Filter & Gmail Pagination Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction History</h2>

        {/* Dropdown Filters Container */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
            >
              <option value="All">All Statuses</option>
              <option value="SUCCESS">Success</option>
              <option value="FAILED">Failed</option>
              <option value="PENDING">Pending</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
            >
              <option value="All">All Methods</option>
              <option value="UPI">UPI</option>
              <option value="CARD">Card</option>
              <option value="NETBANKING">Netbanking</option>
              <option value="WALLET">Wallet</option>
              <option value="EMI">EMI</option>
            </select>
          </div>

          {/* Search Input Box */}
          <div className="relative w-full sm:w-52 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, method..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
            />
          </div>

          {/* Top Gmail-style Pagination */}
          <div className="border-l border-slate-200 pl-3 sm:pl-4">
            <TablePagination
              currentPage={currentPage}
              totalItems={totalTxs}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[25, 50, 100]}
            />
          </div>
        </div>
      </div>

      {/* Main Transactions Table Card */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[780px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-3 lg:px-4">Tx ID</th>
                    <th className="py-3 px-3 lg:px-4">Customer ID</th>
                    <th className="py-3 px-3 lg:px-4">Amount</th>
                    <th className="py-3 px-3 lg:px-4">Method</th>
                    <th className="py-3 px-3 lg:px-4">Status</th>
                    <th className="py-3 px-3 lg:px-4">Gateway Ref</th>
                    <th className="py-3 px-3 lg:px-4">Failure Reason</th>
                    <th className="py-3 px-3 lg:px-4">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {txs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 px-6 text-center text-slate-400 text-xs">
                        No transactions found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    txs.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors text-xs text-slate-600">
                        <td className="py-3.5 px-3 lg:px-4 font-mono font-semibold text-slate-400 whitespace-nowrap">#TX-{tx.id}</td>
                        <td className="py-3.5 px-3 lg:px-4 font-mono whitespace-nowrap">Cust #{tx.customer_id}</td>
                        <td className="py-3.5 px-3 lg:px-4 font-bold text-slate-900 whitespace-nowrap">₹{tx.amount.toLocaleString("en-IN")}</td>
                        <td className="py-3.5 px-3 lg:px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">{tx.payment_method}</td>
                        <td className="py-3.5 px-3 lg:px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${
                            tx.status === "SUCCESS" 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                              : tx.status === "FAILED"
                              ? "bg-rose-50 text-rose-600 border border-rose-100" 
                              : "bg-yellow-50 text-yellow-600 border border-yellow-100"
                          }`}>
                            {tx.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 lg:px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">{tx.razorpay_reference || "N/A"}</td>
                        <td className="py-3.5 px-3 lg:px-4 text-rose-600 font-mono text-[10px] whitespace-nowrap">{tx.failure_reason || "None"}</td>
                        <td className="py-3.5 px-3 lg:px-4 text-slate-400 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Toolbar Pagination */}
            {totalTxs > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
                <span className="text-slate-400 text-[11px]">
                  Total Transactions: <span className="font-bold text-slate-700">{totalTxs.toLocaleString("en-IN")}</span>
                </span>
                
                <TablePagination
                  currentPage={currentPage}
                  totalItems={totalTxs}
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
export default Transactions;
