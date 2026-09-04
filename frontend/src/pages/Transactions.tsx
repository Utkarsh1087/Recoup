import React, { useEffect, useState } from "react";
import { api, Transaction } from "../services/api";
import { Search } from "lucide-react";

export const Transactions: React.FC = () => {
  const [txs, setTxs] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [methodFilter, setMethodFilter] = useState("All");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 15;

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

  // Reset to first page when search filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter, methodFilter]);

  // Apply search and dropdown filters
  const filteredTxs = txs.filter((tx) => {
    const searchLower = search.toLowerCase();
    const matchesSearch = 
      `#tx-${tx.id}`.toLowerCase().includes(searchLower) ||
      `cust #${tx.customer_id}`.toLowerCase().includes(searchLower) ||
      (tx.razorpay_reference || "").toLowerCase().includes(searchLower) ||
      (tx.failure_reason || "").toLowerCase().includes(searchLower) ||
      tx.payment_method.toLowerCase().includes(searchLower);

    const matchesStatus = statusFilter === "All" || tx.status === statusFilter;
    const matchesMethod = methodFilter === "All" || tx.payment_method === methodFilter;

    return matchesSearch && matchesStatus && matchesMethod;
  });

  // Compute pagination offsets
  const totalPages = Math.ceil(filteredTxs.length / itemsPerPage);
  const paginatedTxs = filteredTxs.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Transaction History</h2>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-6 rounded-xl shadow-sm">
        
        {/* Dropdown Filters Container */}
        <div className="flex gap-3 flex-wrap">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
            >
              <option value="All">All Statuses</option>
              <option value="SUCCESS">Success Only</option>
              <option value="FAILED">Failed Only</option>
            </select>
          </div>

          {/* Payment Method Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Method:</span>
            <select
              value={methodFilter}
              onChange={(e) => setMethodFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
            >
              <option value="All">All Methods</option>
              <option value="CARD">Cards</option>
              <option value="UPI">UPI</option>
              <option value="NETBANKING">Netbanking</option>
              <option value="WALLET">Wallets</option>
            </select>
          </div>
        </div>

        {/* Search Input Box */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Search Tx ID, Customer ID, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
          />
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
                  {paginatedTxs.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 px-6 text-center text-slate-400 text-xs">
                        No transactions found matching your filter criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedTxs.map((tx) => (
                      <tr key={tx.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors text-xs text-slate-600">
                        <td className="py-4 px-6 font-mono font-semibold text-slate-400 whitespace-nowrap">#TX-{tx.id}</td>
                        <td className="py-4 px-6 font-mono whitespace-nowrap">Cust #{tx.customer_id}</td>
                        <td className="py-4 px-6 font-bold text-slate-900 whitespace-nowrap">₹{tx.amount.toLocaleString("en-IN")}</td>
                        <td className="py-4 px-6 font-mono text-[10px] text-slate-400 whitespace-nowrap">{tx.payment_method}</td>
                        <td className="py-4 px-6 whitespace-nowrap">
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
                        <td className="py-4 px-6 font-mono text-[10px] text-slate-400 whitespace-nowrap">{tx.razorpay_reference || "N/A"}</td>
                        <td className="py-4 px-6 text-rose-600 font-mono text-[10px] whitespace-nowrap">{tx.failure_reason || "None"}</td>
                        <td className="py-4 px-6 text-slate-400 whitespace-nowrap">{new Date(tx.created_at).toLocaleString()}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {filteredTxs.length > 0 && (
              <div className="flex justify-between items-center px-6 py-4 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
                <div>
                  Showing <span className="font-bold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-bold text-slate-700">
                    {Math.min(currentPage * itemsPerPage, filteredTxs.length)}
                  </span>{" "}
                  of <span className="font-bold text-slate-700">{filteredTxs.length}</span> transactions
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
export default Transactions;
