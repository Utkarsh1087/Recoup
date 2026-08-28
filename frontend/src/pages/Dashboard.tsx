import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  api, 
  DashboardSummary, 
  SourceRecovery, 
  TimelinePoint, 
  RecoveryCase 
} from "../services/api";
import { 
  TrendingUp, 
  ShieldAlert, 
  CheckCircle, 
  ArrowRight, 
  Activity,
  Zap
} from "lucide-react";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  Legend
} from "recharts";

const formatCurrency = (val: number) => {
  if (val >= 100000) {
    return `₹${(val / 100000).toFixed(2)}L`;
  }
  return `₹${val.toLocaleString("en-IN")}`;
};

export const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [sources, setSources] = useState<SourceRecovery[]>([]);
  const [timeline, setTimeline] = useState<TimelinePoint[]>([]);
  const [opps, setOpps] = useState<RecoveryCase[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [sumData, srcData, timeData, casesData] = await Promise.all([
        api.getDashboardSummary(),
        api.getDashboardSources(),
        api.getDashboardTimeline(),
        api.getRecoveryCases("All", "All", "All")
      ]);
      setSummary(sumData);
      setSources(srcData);
      setTimeline(timeData);
      
      const pendingOpps = casesData
        .filter(c => ["DETECTED", "ACTION_PENDING"].includes(c.status))
        .sort((a, b) => b.amount_at_risk - a.amount_at_risk)
        .slice(0, 5);
      setOpps(pendingOpps);
    } catch (e) {
      console.error("Error loading dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchDashboardData, 5000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !summary) {
    return (
      <div className="p-8 flex justify-center items-center h-[calc(100vh-4rem)] bg-slate-50">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Soft visual colors
  const COLORS = ["#0ea5e9", "#ef4444", "#3b82f6", "#f59e0b"];

  return (
    <div className="p-8 space-y-8 bg-slate-50/50 min-h-screen text-slate-800">
      {/* Top Summary Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {/* Card 1: Revenue at Risk */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue At Risk</span>
              <h3 className="text-2xl font-extrabold text-rose-600 mt-2">{formatCurrency(summary.revenue_at_risk)}</h3>
            </div>
            <div className="bg-rose-50 p-2.5 rounded-lg text-rose-600 border border-rose-100">
              <ShieldAlert className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-bold text-rose-600">{(summary.cases_analyzed - summary.cases_recovered)}</span> active leak cases
          </div>
        </div>

        {/* Card 2: Recovered */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue Recovered</span>
              <h3 className="text-2xl font-extrabold text-emerald-600 mt-2">{formatCurrency(summary.revenue_recovered)}</h3>
            </div>
            <div className="bg-emerald-50 p-2.5 rounded-lg text-emerald-600 border border-emerald-100">
              <CheckCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            <span className="font-bold text-emerald-600">{summary.cases_recovered}</span> cases won back successfully
          </div>
        </div>

        {/* Card 3: Recovery Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recovery Rate</span>
              <h3 className="text-2xl font-extrabold text-sky-600 mt-2">{summary.recovery_rate}%</h3>
            </div>
            <div className="bg-sky-55 p-2.5 rounded-lg text-sky-600 bg-sky-50 border border-sky-100">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${summary.recovery_rate}%` }}></div>
          </div>
        </div>

        {/* Card 4: Action Center */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cases Escalated</span>
              <h3 className="text-2xl font-extrabold text-amber-600 mt-2">{summary.cases_escalated}</h3>
            </div>
            <div className="bg-amber-50 p-2.5 rounded-lg text-amber-600 border border-amber-100">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-xs text-slate-500">
            Requires human support action
          </div>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Over Time Timeline Area Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 lg:col-span-2 shadow-sm">
          <div className="flex items-center justify-between mb-6">
            <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Revenue Protection Trend</h4>
            <div className="text-[10px] text-slate-500 bg-slate-100 px-2.5 py-1 rounded font-semibold">Daily aggregation</div>
          </div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timeline}>
                <defs>
                  <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={10} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v}`} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" }}
                  formatter={(val: any) => [`₹${val.toLocaleString("en-IN")}`]}
                />
                <Legend verticalAlign="top" height={36}/>
                <Area name="Risk Amount" type="monotone" dataKey="at_risk" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2} />
                <Area name="Recovered Amount" type="monotone" dataKey="recovered" stroke="#10b981" fillOpacity={1} fill="url(#colorRecovered)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Source breakdown chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-6">Risk by Source Channel</h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={sources}>
                <XAxis dataKey="source" stroke="#94a3b8" fontSize={8} tickFormatter={(v) => v.split("_")[0]} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v) => `₹${v}`} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", color: "#0f172a" }}
                  formatter={(val: any) => [`₹${val.toLocaleString("en-IN")}`]}
                />
                <Bar dataKey="total_recovered" name="Recovered" fill="#0ea5e9" radius={[4, 4, 0, 0]}>
                  {sources.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Opportunities Section */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-200 flex justify-between items-center bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-sky-500 fill-sky-100" />
            <h4 className="font-bold text-xs text-slate-700 uppercase tracking-wider">Top Recovery Opportunities</h4>
          </div>
          <Link to="/cases" className="text-xs text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1">
            View All Cases
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/30">
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Source Problem</th>
                <th className="py-4 px-6">Risk Value</th>
                <th className="py-4 px-6 text-center">Probability</th>
                <th className="py-4 px-6">Priority</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {opps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 px-6 text-center text-slate-400 text-xs">
                    No open opportunities. Run simulator setup to test.
                  </td>
                </tr>
              ) : (
                opps.map((o) => (
                  <tr key={o.id} className="border-b border-slate-100 hover:bg-slate-50/30 transition-colors text-xs text-slate-600">
                    <td className="py-4 px-6">
                      <div className="font-bold text-slate-900">{o.customer?.name}</div>
                      <div className="text-[10px] text-slate-400">{o.customer?.email}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] text-slate-500 font-mono font-semibold">
                        {o.source_type.replace("_", " ")}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-bold text-slate-900">₹{o.amount_at_risk.toLocaleString("en-IN")}</td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <div className="w-12 bg-slate-100 h-2 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              o.recovery_probability >= 0.7 
                                ? "bg-emerald-500" 
                                : o.recovery_probability >= 0.4 
                                ? "bg-amber-500" 
                                : "bg-rose-500"
                            }`} 
                            style={{ width: `${o.recovery_probability * 100}%` }}
                          ></div>
                        </div>
                        <span className="text-[10px] font-mono font-bold text-slate-800">{Math.round(o.recovery_probability * 100)}%</span>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wide uppercase ${
                        o.priority === "CRITICAL" 
                          ? "bg-rose-50 text-rose-600 border border-rose-100" 
                          : o.priority === "HIGH" 
                          ? "bg-orange-50 text-orange-600 border border-orange-100" 
                          : o.priority === "MEDIUM" 
                          ? "bg-yellow-50 text-yellow-600 border border-yellow-100" 
                          : "bg-sky-50 text-sky-600 border border-sky-100"
                      }`}>
                        {o.priority}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <Link 
                        to={`/cases/${o.id}`}
                        className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shadow-sm"
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
      </div>
    </div>
  );
};
export default Dashboard;
