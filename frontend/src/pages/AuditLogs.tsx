import React, { useEffect, useState } from "react";
import { api, AuditLog } from "../services/api";
import { Search } from "lucide-react";
import { TablePagination } from "../components/TablePagination";

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [eventFilter, setEventFilter] = useState("All");

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(50);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const res = await api.getAuditLogs({
        search,
        event_type: eventFilter,
        skip: (currentPage - 1) * itemsPerPage,
        limit: itemsPerPage
      });
      setLogs(res.items || []);
      setTotalLogs(res.total || 0);
    } catch (e) {
      console.error("Error loading audit logs", e);
      setLogs([]);
      setTotalLogs(0);
    } finally {
      setLoading(false);
    }
  };

  // Reset to first page when search or event filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [search, eventFilter, itemsPerPage]);

  useEffect(() => {
    fetchLogs();
  }, [search, eventFilter, currentPage, itemsPerPage]);

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 bg-slate-50/50 min-h-screen text-slate-800">
      
      {/* Search, Filter & Table Pagination Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 p-3.5 sm:p-4 rounded-xl shadow-sm">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">System Audit Trail</h2>

        <div className="flex flex-wrap items-center gap-3">
          {/* Event Type Filter */}
          <div className="flex items-center gap-1.5 whitespace-nowrap">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Event:</span>
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
            >
              <option value="All">All Events</option>
              <option value="DETECTION">Detection</option>
              <option value="DIAGNOSIS">Diagnosis</option>
              <option value="POLICY_CHECK">Policy Check</option>
              <option value="ACTION_EXECUTION">Action Execution</option>
              <option value="RECOVERY_SUCCESS">Recovery Success</option>
            </select>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-52 md:w-56">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Search reasoning, action..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:border-sky-500 transition-colors shadow-sm"
            />
          </div>

          {/* Top Pagination */}
          <div className="border-l border-slate-200 pl-3 sm:pl-4">
            <TablePagination
              currentPage={currentPage}
              totalItems={totalLogs}
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
                    <th className="py-3 px-3 lg:px-4">Timestamp</th>
                    <th className="py-3 px-3 lg:px-4">Case ID</th>
                    <th className="py-3 px-3 lg:px-4">Event Type</th>
                    <th className="py-3 px-3 lg:px-4">Agent Reasoning Summary</th>
                    <th className="py-3 px-3 lg:px-4">Action / Tool Call</th>
                    <th className="py-3 px-3 lg:px-4">Policy Verification</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 px-6 text-center text-slate-400 text-xs">
                        No audit logs recorded matching your filter.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors text-xs text-slate-600">
                        <td className="py-3.5 px-3 lg:px-4 font-mono text-[10px] text-slate-400 whitespace-nowrap">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3.5 px-3 lg:px-4 font-mono font-bold text-slate-900 whitespace-nowrap">
                          #REC-{log.recovery_case_id}
                        </td>
                        <td className="py-3.5 px-3 lg:px-4 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase whitespace-nowrap ${
                            log.event_type === "DETECTION" 
                              ? "text-blue-600 bg-blue-50 border border-blue-100" 
                              : log.event_type === "DIAGNOSIS"
                              ? "text-indigo-600 bg-indigo-50 border border-indigo-100"
                              : log.event_type === "POLICY_CHECK"
                              ? "text-yellow-600 bg-yellow-50 border border-yellow-100"
                              : log.event_type === "ACTION_EXECUTION"
                              ? "text-sky-600 bg-sky-50 border border-sky-100"
                              : "text-emerald-600 bg-emerald-50 border border-emerald-100"
                          }`}>
                            {log.event_type}
                          </span>
                        </td>
                        <td className="py-3.5 px-3 lg:px-4 max-w-sm truncate text-slate-600 font-sans font-medium" title={log.agent_reasoning_summary || ""}>
                          {log.agent_reasoning_summary || "Automated tool invocation."}
                        </td>
                        <td className="py-3.5 px-3 lg:px-4 font-mono text-[10px] whitespace-nowrap">
                          {log.tool_called ? (
                            <span className="text-sky-600 font-bold">{log.tool_called}()</span>
                          ) : log.action ? (
                            <span className="text-slate-500 font-semibold">{log.action}</span>
                          ) : (
                            <span className="text-slate-400">N/A</span>
                          )}
                        </td>
                        <td className="py-3.5 px-3 lg:px-4 whitespace-nowrap">
                          {log.policy_check ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold whitespace-nowrap ${
                              log.policy_check.startsWith("PASSED") 
                                ? "text-emerald-600 bg-emerald-50 border border-emerald-100" 
                                : "text-rose-600 bg-rose-50 border border-rose-100"
                            }`}>
                              {log.policy_check.split(":")[0]}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Bottom Toolbar Pagination */}
            {totalLogs > 0 && (
              <div className="flex flex-wrap justify-between items-center gap-3 px-4 sm:px-6 py-3.5 bg-slate-50/50 border-t border-slate-100 text-xs text-slate-500">
                <span className="text-slate-400 text-[11px]">
                  Total Audit Logs: <span className="font-bold text-slate-700">{totalLogs.toLocaleString("en-IN")}</span>
                </span>
                
                <TablePagination
                  currentPage={currentPage}
                  totalItems={totalLogs}
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
export default AuditLogs;
