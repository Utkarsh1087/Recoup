import React, { useEffect, useState } from "react";
import { api, AuditLog } from "../services/api";

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLogs = async () => {
      try {
        const data = await api.getAuditLogs();
        setLogs(data);
      } catch (e) {
        console.error("Error loading audit logs", e);
      } finally {
        setLoading(false);
      }
    };
    fetchLogs();
  }, []);

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">System Audit Trail</h2>
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
                  <th className="py-4 px-6">Timestamp</th>
                  <th className="py-4 px-6 font-mono">Case ID</th>
                  <th className="py-4 px-6">Event Type</th>
                  <th className="py-4 px-6">Agent Reasoning Summary</th>
                  <th className="py-4 px-6">Action / Tool Call</th>
                  <th className="py-4 px-6">Policy Verification</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 px-6 text-center text-slate-400 text-xs">
                      No logs recorded.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors text-xs text-slate-600">
                      <td className="py-4 px-6 font-mono text-[10px] text-slate-400">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4 px-6 font-mono font-bold text-slate-900">
                        #REC-{log.recovery_case_id}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
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
                      <td className="py-4 px-6 max-w-sm truncate text-slate-600 font-sans font-medium">
                        {log.agent_reasoning_summary || "Automated tool invocation."}
                      </td>
                      <td className="py-4 px-6 font-mono text-[10px]">
                        {log.tool_called ? (
                          <span className="text-sky-600 font-bold">{log.tool_called}()</span>
                        ) : log.action ? (
                          <span className="text-slate-500 font-semibold">{log.action}</span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        {log.policy_check ? (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
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
        )}
      </div>
    </div>
  );
};
export default AuditLogs;
