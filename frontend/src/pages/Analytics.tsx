import React, { useEffect, useState } from "react";
import { api, RecoveryCase, DashboardSummary } from "../services/api";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell 
} from "recharts";
import { BarChart3, ShieldAlert, Award, AlertTriangle, PlayCircle } from "lucide-react";

export const Analytics: React.FC = () => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [casesData, sumData] = await Promise.all([
          api.getRecoveryCases("All", "All", "All"),
          api.getDashboardSummary()
        ]);
        setCases(casesData);
        setSummary(sumData);
      } catch (e) {
        console.error("Error loading analytics", e);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  if (loading || !summary) {
    return (
      <div className="p-8 flex justify-center items-center h-[calc(100vh-4rem)] bg-slate-50">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const totalCompleted = cases.filter(c => ["RECOVERED", "FAILED", "ESCALATED", "STOPPED"].includes(c.status)).length;
  
  const actionCounts: Record<string, { name: string; count: number; recovered: number }> = {
    payment_retry: { name: "Automatic Retry", count: 0, recovered: 0 },
    alternative_payment_method: { name: "Alternate Link", count: 0, recovered: 0 },
    recovery_message: { name: "Recovery Message", count: 0, recovered: 0 },
    bounded_incentive: { name: "10% Discount Coupon", count: 0, recovered: 0 },
  };

  cases.forEach(c => {
    if (c.selected_action && actionCounts[c.selected_action]) {
      actionCounts[c.selected_action].count += 1;
      if (c.status === "RECOVERED") {
        actionCounts[c.selected_action].recovered += c.amount_recovered;
      }
    }
  });

  const actionChartData = Object.values(actionCounts);

  const reasonCounts: Record<string, number> = {};
  cases.forEach(c => {
    let cat = "Gateway Issue";
    const diag = (c.diagnosis || "").toLowerCase();
    if (diag.includes("insufficient")) cat = "Insufficient Funds";
    else if (diag.includes("expired")) cat = "Expired Credentials";
    else if (diag.includes("decline")) cat = "Bank Decline";
    else if (diag.includes("shipping")) cat = "Shipping Cost Drop";
    else if (diag.includes("abandoned")) cat = "Cart Abandonment";
    else if (diag.includes("invoice") || diag.includes("receivable")) cat = "Invoice Delayed";

    reasonCounts[cat] = (reasonCounts[cat] || 0) + 1;
  });

  const reasonChartData = Object.entries(reasonCounts).map(([name, value]) => ({ name, value }));

  const PIE_COLORS = ["#0ea5e9", "#ef4444", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899"];

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen text-slate-850">
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Avg Recovery Value</span>
              <h4 className="text-xl font-extrabold text-slate-900 mt-2">
                ₹{summary.cases_recovered > 0 ? Math.round(summary.revenue_recovered / summary.cases_recovered).toLocaleString("en-IN") : 0}
              </h4>
            </div>
            <Award className="w-5 h-5 text-sky-500" />
          </div>
          <span className="text-[9px] text-slate-400 block mt-3 uppercase font-mono font-bold">Per successful recovery</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Interventions</span>
              <h4 className="text-xl font-extrabold text-slate-900 mt-2">
                {cases.filter(c => c.selected_action).length}
              </h4>
            </div>
            <PlayCircle className="w-5 h-5 text-sky-500" />
          </div>
          <span className="text-[9px] text-slate-400 block mt-3 uppercase font-mono font-bold">Automated operations</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Recovery rate</span>
              <h4 className="text-xl font-extrabold text-emerald-600 mt-2">{summary.recovery_rate}%</h4>
            </div>
            <BarChart3 className="w-5 h-5 text-emerald-600" />
          </div>
          <span className="text-[9px] text-slate-400 block mt-3 uppercase font-mono font-bold">Overall efficacy</span>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Escalation Rate</span>
              <h4 className="text-xl font-extrabold text-amber-600 mt-2">
                {totalCompleted > 0 ? Math.round((summary.cases_escalated / totalCompleted) * 100) : 0}%
              </h4>
            </div>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <span className="text-[9px] text-slate-400 block mt-3 uppercase font-mono font-bold">Manual handoff percentage</span>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Intervention Performance Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-6">Recovered Amount by Intervention Type</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={actionChartData}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v}`} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }}
                  formatter={(val: any) => [`₹${val.toLocaleString("en-IN")}`]}
                />
                <Bar dataKey="recovered" name="Amount Recovered" fill="#0ea5e9" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Failure Reasons Pie Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-6">Risk Categories Breakdown</h4>
          <div className="h-64 flex flex-col md:flex-row items-center justify-between">
            <div className="w-full md:w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={reasonChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {reasonChartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0" }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            
            {/* Custom Legend */}
            <div className="w-full md:w-1/2 space-y-2 mt-4 md:mt-0 font-mono text-[10px]">
              {reasonChartData.map((entry, index) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}></span>
                  <span className="text-slate-600 truncate max-w-[150px] font-semibold">{entry.name}</span>
                  <span className="text-slate-400 font-bold ml-auto">{entry.value} cases</span>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
export default Analytics;
