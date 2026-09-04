import React, { useEffect, useState } from "react";
import { api, Customer } from "../services/api";
import { Search } from "lucide-react";
import { TablePagination } from "../components/TablePagination";

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [totalCustomers, setTotalCustomers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [subscriptionFilter, setSubscriptionFilter] = useState("All");
  const [segmentFilter, setSegmentFilter] = useState("All");
  const [sortBy, setSortBy] = useState("id_asc");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomers({
        search,
        subscription_status: subscriptionFilter,
        segment: segmentFilter,
        sort_by: sortBy,
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      });
      setCustomers(res.items || []);
      setTotalCustomers(res.total || 0);
    } catch (e) {
      console.error("Error loading customers", e);
      setCustomers([]);
      setTotalCustomers(0);
    } finally {
      setLoading(false);
    }
  };

  // Reset to first page when search filters, segments, or sorting change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, subscriptionFilter, segmentFilter, sortBy, itemsPerPage]);

  useEffect(() => {
    fetchCustomers();
  }, [search, subscriptionFilter, segmentFilter, sortBy, currentPage, itemsPerPage]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 bg-slate-50/50 min-h-screen text-slate-800">
      {/* Search, Filter & Gmail Pagination Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Base</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Dropdown Filters Container */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Subscription Filter */}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sub:</span>
              <select
                value={subscriptionFilter}
                onChange={(e) => setSubscriptionFilter(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
              >
                <option value="All">All</option>
                <option value="ACTIVE">Active</option>
                <option value="PAST_DUE">Past Due</option>
                <option value="CANCELLED">Cancelled</option>
                <option value="NONE">None</option>
              </select>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 whitespace-nowrap">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Sort:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
              >
                <option value="id_asc">ID (1 to 1000)</option>
                <option value="id_desc">ID (1000 to 1)</option>
                <option value="ltv_desc">LTV (Highest)</option>
                <option value="ltv_asc">LTV (Lowest)</option>
                <option value="orders_desc">Orders (Most)</option>
                <option value="failures_desc">Failed Payments (Most)</option>
              </select>
            </div>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-52 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search ID, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
            />
          </div>

          {/* Top Gmail-style Pagination */}
          <div className="border-l border-slate-200 pl-3 sm:pl-4">
            <TablePagination
              currentPage={currentPage}
              totalItems={totalCustomers}
              itemsPerPage={itemsPerPage}
              onPageChange={setCurrentPage}
              onItemsPerPageChange={setItemsPerPage}
              pageSizeOptions={[25, 50, 100]}
            />
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-3 lg:px-4">ID</th>
                    <th className="py-3 px-3 lg:px-4">Name</th>
                    <th className="py-3 px-3 lg:px-4">Email</th>
                    <th className="py-3 px-3 lg:px-4">Phone</th>
                    <th className="py-3 px-3 lg:px-4">Lifetime Value</th>
                    <th className="py-3 px-2 lg:px-3 text-center">Orders Successful</th>
                    <th className="py-3 px-2 lg:px-3 text-center">Failed Payments</th>
                    <th className="py-3 px-2 lg:px-3 text-center">Subscription</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-12 px-6 text-center text-slate-400 text-xs">
                        No matching customer records found.
                      </td>
                    </tr>
                  ) : (
                    customers.map((c) => (
                      <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors text-xs text-slate-600">
                        <td className="py-3.5 px-3 lg:px-4 font-mono font-semibold text-slate-400 whitespace-nowrap">#CUST-{c.id}</td>
                        <td className="py-3.5 px-3 lg:px-4 font-bold text-slate-900 whitespace-nowrap">{c.name}</td>
                        <td className="py-3.5 px-3 lg:px-4 text-slate-600 font-mono whitespace-nowrap truncate max-w-[160px]" title={c.email}>{c.email}</td>
                        <td className="py-3.5 px-3 lg:px-4 text-slate-400 font-mono whitespace-nowrap">{c.phone || "N/A"}</td>
                        <td className="py-3.5 px-3 lg:px-4 font-bold text-slate-900 whitespace-nowrap">₹{c.lifetime_value.toLocaleString("en-IN")}</td>
                        <td className="py-3.5 px-2 lg:px-3 text-center text-slate-800 whitespace-nowrap">{c.successful_orders} / {c.total_orders}</td>
                        <td className="py-3.5 px-2 lg:px-3 text-center text-rose-600 font-bold whitespace-nowrap">{c.failed_payments}</td>
                        <td className="py-3.5 px-2 lg:px-3 text-center whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${
                            c.subscription_status === "ACTIVE" 
                              ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                              : c.subscription_status === "PAST_DUE"
                              ? "bg-amber-50 text-amber-600 border border-amber-100" 
                              : c.subscription_status === "CANCELLED"
                              ? "bg-rose-50 text-rose-600 border border-rose-100" 
                              : "bg-slate-100 text-slate-400 border border-slate-200"
                          }`}>
                            {c.subscription_status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Toolbar Pagination */}
            {totalCustomers > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
                <span className="text-slate-400 text-[11px]">
                  Total Customers: <span className="font-bold text-slate-700">{totalCustomers.toLocaleString("en-IN")}</span>
                </span>
                
                <TablePagination
                  currentPage={currentPage}
                  totalItems={totalCustomers}
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
export default Customers;
