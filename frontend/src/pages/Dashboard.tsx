import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { 
  api, 
  SourceRecovery, 
  TimelinePoint, 
  RecoveryCase,
  Transaction
} from "../services/api";
import { 
  TrendingUp, 
  CheckCircle, 
  ArrowRight, 
  Activity,
  Zap,
  DollarSign,
  Target,
  Sparkles,
  Bot
} from "lucide-react";
import { getAvailableMonths } from "../utils/dateUtils";
import { ProcessedCaseResult } from "../components/AiMissionControlModal";
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

interface DashboardProps {
  dateFilterType: "monthly" | "custom";
  selectedMonth: string;
  startDate: string;
  endDate: string;
  missionResults?: ProcessedCaseResult[];
  onInspectMissionCase?: (caseId: number) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  dateFilterType,
  selectedMonth,
  startDate,
  endDate,
  missionResults = [],
  onInspectMissionCase
}) => {
  const [loading, setLoading] = useState(true);
  const [allCases, setAllCases] = useState<RecoveryCase[]>([]);
  const [allTxs, setAllTxs] = useState<Transaction[]>([]);

  // Calculated Metrics States
  const [metrics, setMetrics] = useState({
    monthlySales: 0,
    achievableRevenue: 0,
    struckRecovered: 0,
    recoveryRate: 0,
    humanSupportNeeded: 0
  });

  const [sourcesChart, setSourcesChart] = useState<SourceRecovery[]>([]);
  const [timelineChart, setTimelineChart] = useState<TimelinePoint[]>([]);
  const [opps, setOpps] = useState<RecoveryCase[]>([]);

  const monthsList = getAvailableMonths();

  const getActivePeriodLabel = () => {
    if (dateFilterType === "monthly") {
      const activeMonth = monthsList.find((m) => m.value === selectedMonth);
      return activeMonth ? activeMonth.label : selectedMonth;
    }
    return `${startDate} to ${endDate}`;
  };

  const loadData = async () => {
    try {
      const [casesData, txsData] = await Promise.all([
        api.getRecoveryCases("All", "All", "All"),
        api.getTransactions()
      ]);
      setAllCases(casesData);
      setAllTxs(txsData);
    } catch (e) {
      console.error("Error loading dashboard data", e);
    } finally {
      setLoading(false);
    }
  };

  // Run on mount
  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Compute metrics and charts dynamically whenever data or filters change
  useEffect(() => {
    if (allCases.length === 0 && allTxs.length === 0) return;

    // Define filter boundaries
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

    // 1. Filter Transactions
    const filteredTxs = allTxs.filter((tx) => {
      const txDate = new Date(tx.created_at);
      return txDate >= startFilter && txDate <= endFilter;
    });

    // 2. Filter Cases
    const filteredCases = allCases.filter((c) => {
      const cDate = new Date(c.created_at);
      return cDate >= startFilter && cDate <= endFilter;
    });

    // 3. Compute KPI Metrics
    const totalMonthlySale = filteredTxs
      .filter((t) => t.status === "SUCCESS")
      .reduce((sum, t) => sum + t.amount, 0);

    const struckRecovered = filteredCases
      .filter((c) => c.status === "RECOVERED")
      .reduce((sum, c) => sum + c.amount_recovered, 0);

    const revenueAtRisk = filteredCases
      .filter((c) => ["DETECTED", "ANALYZING", "ACTION_PENDING", "IN_PROGRESS"].includes(c.status))
      .reduce((sum, c) => sum + c.amount_at_risk, 0);

    const totalAchievableRevenue = totalMonthlySale + struckRecovered + revenueAtRisk;

    const recoveredCount = filteredCases.filter((c) => c.status === "RECOVERED").length;
    const completedCount = filteredCases.filter((c) => 
      ["RECOVERED", "FAILED", "ESCALATED", "STOPPED"].includes(c.status)
    ).length;
    const recoveryRate = completedCount > 0 ? (recoveredCount / completedCount) * 100 : 0;

    const humanSupportNeeded = filteredCases.filter((c) => c.status === "ESCALATED").length;

    setMetrics({
      monthlySales: totalMonthlySale,
      achievableRevenue: totalAchievableRevenue,
      struckRecovered: struckRecovered,
      recoveryRate: recoveryRate,
      humanSupportNeeded: humanSupportNeeded
    });

    // 4. Group Cases by Source for Bar Chart
    const sourceGroups: Record<string, { total_risk: number; total_recovered: number; total_cases: number }> = {};
    filteredCases.forEach((c) => {
      if (!sourceGroups[c.source_type]) {
        sourceGroups[c.source_type] = { total_risk: 0, total_recovered: 0, total_cases: 0 };
      }
      sourceGroups[c.source_type].total_risk += c.amount_at_risk;
      sourceGroups[c.source_type].total_recovered += c.amount_recovered;
      sourceGroups[c.source_type].total_cases += 1;
    });

    const groupedSources: SourceRecovery[] = Object.entries(sourceGroups).map(([src, val]) => ({
      source: src,
      total_cases: val.total_cases,
      total_risk: val.total_risk,
      total_recovered: val.total_recovered,
      recovery_rate: val.total_risk > 0 ? (val.total_recovered / val.total_risk) * 100 : 0
    }));
    setSourcesChart(groupedSources);

    // 5. Group Cases by Date for Area Chart (Timeline)
    const dateGroups: Record<string, { at_risk: number; recovered: number }> = {};
    filteredCases.forEach((c) => {
      const dateStr = new Date(c.created_at).toISOString().split("T")[0];
      if (!dateGroups[dateStr]) {
        dateGroups[dateStr] = { at_risk: 0, recovered: 0 };
      }
      dateGroups[dateStr].at_risk += c.amount_at_risk;
      dateGroups[dateStr].recovered += c.amount_recovered;
    });

    const groupedTimeline: TimelinePoint[] = Object.entries(dateGroups)
      .map(([date, val]) => ({
        date,
        at_risk: val.at_risk,
        recovered: val.recovered
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
    setTimelineChart(groupedTimeline);

    // 6. Filter Top Opportunities
    const pendingOpps = filteredCases
      .filter((c) => ["DETECTED", "ACTION_PENDING"].includes(c.status))
      .sort((a, b) => b.amount_at_risk - a.amount_at_risk)
      .slice(0, 5);
    setOpps(pendingOpps);

  }, [allCases, allTxs, dateFilterType, selectedMonth, startDate, endDate]);

  if (loading) {
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
      
      {/* 1. Five KPIs Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        
        {/* Card 1: Total Monthly Sale */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Total Monthly Sale</span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(metrics.monthlySales)}</h3>
            </div>
            <div className="bg-sky-50 p-2 rounded-lg text-sky-600 border border-sky-100">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            Money received in {getActivePeriodLabel()}
          </div>
        </div>

        {/* Card 2: Total Achievable Revenue */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Achievable Revenue</span>
              <h3 className="text-xl font-extrabold text-slate-900 mt-2">{formatCurrency(metrics.achievableRevenue)}</h3>
            </div>
            <div className="bg-indigo-50 p-2 rounded-lg text-indigo-600 border border-indigo-100">
              <Target className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            Potential sales in {getActivePeriodLabel()}
          </div>
        </div>

        {/* Card 3: Struck Revenue Recovered */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Struck Recovered</span>
              <h3 className="text-xl font-extrabold text-emerald-600 mt-2">{formatCurrency(metrics.struckRecovered)}</h3>
            </div>
            <div className="bg-emerald-50 p-2 rounded-lg text-emerald-600 border border-emerald-100">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            Won back in {getActivePeriodLabel()}
          </div>
        </div>

        {/* Card 4: Recovery Rate */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Recovery Rate</span>
              <h3 className="text-xl font-extrabold text-sky-600 mt-2">{metrics.recoveryRate.toFixed(1)}%</h3>
            </div>
            <div className="bg-sky-50 p-2 rounded-lg text-sky-600 border border-sky-100">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
            <div className="bg-sky-500 h-full rounded-full" style={{ width: `${metrics.recoveryRate}%` }}></div>
          </div>
        </div>

        {/* Card 5: Human Support Needed */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Human Support</span>
              <h3 className="text-xl font-extrabold text-amber-600 mt-2">{metrics.humanSupportNeeded}</h3>
            </div>
            <div className="bg-amber-50 p-2 rounded-lg text-amber-600 border border-amber-100">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-4 flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
            Escalations in {getActivePeriodLabel()}
          </div>
        </div>

      </div>

      {/* 2. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Timeline Area Chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm lg:col-span-2 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <div>
              <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                Daily Revenue: Failed vs. Recovered
              </h4>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Compares money lost in failed payments vs. money successfully won back by AI.
              </p>
            </div>
            <div className="flex items-center gap-3 text-[11px] font-bold">
              <span className="flex items-center gap-1 text-emerald-600">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Recovered
              </span>
              <span className="flex items-center gap-1 text-rose-500">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Failed at Checkout
              </span>
            </div>
          </div>

          <div className="h-64">
            {timelineChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No recovery timeline points recorded for this period.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#ef4444" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                    </linearGradient>
                    <linearGradient id="colorRecovered" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis 
                    dataKey="date" 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickFormatter={(d) => {
                      try {
                        const date = new Date(d);
                        return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                      } catch {
                        return d;
                      }
                    }} 
                    tickLine={false} 
                  />
                  <YAxis 
                    stroke="#94a3b8" 
                    fontSize={10} 
                    tickFormatter={(v: any) => formatCurrency(v)} 
                    tickLine={false} 
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    labelFormatter={(label: any) => {
                      try {
                        return new Date(String(label)).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
                      } catch {
                        return String(label || "");
                      }
                    }}
                    formatter={(value: any, name: any) => [
                      `₹${value.toLocaleString("en-IN")}`,
                      name === "recovered" ? "Recovered by AI" : "Failed / Dropped"
                    ]}
                  />
                  <Area type="monotone" dataKey="recovered" name="recovered" stroke="#10b981" fillOpacity={1} fill="url(#colorRecovered)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="at_risk" name="at_risk" stroke="#ef4444" fillOpacity={1} fill="url(#colorRisk)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Source breakdown chart */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
              Failures by Problem Type
            </h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Where payments failed and how much AI won back.
            </p>
          </div>

          <div className="h-64">
            {sourcesChart.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No active source channel data recorded.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart 
                  data={sourcesChart.map((s) => ({
                    ...s,
                    displayName: s.source === "CHECKOUT_DROPOFF" ? "Cart Dropoff"
                      : s.source === "FAILED_PAYMENT" ? "Card Failure"
                      : s.source === "CANCELLED_SUBSCRIPTION" ? "Subscription"
                      : s.source === "INVOICE_OVERDUE" ? "Overdue Inv"
                      : s.source.replace(/_/g, " ")
                  }))}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <XAxis dataKey="displayName" stroke="#94a3b8" fontSize={10} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={10} tickFormatter={(v: any) => formatCurrency(v)} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: "#ffffff", borderColor: "#e2e8f0", borderRadius: "10px", boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)" }}
                    formatter={(value: any, name: any) => [
                      `₹${value.toLocaleString("en-IN")}`,
                      name === "total_recovered" ? "Recovered Amount" : "Failed / At-Risk"
                    ]}
                  />
                  <Legend 
                    verticalAlign="top" 
                    height={30} 
                    wrapperStyle={{ fontSize: "10px", fontWeight: "bold" }}
                    formatter={(val) => val === "total_recovered" ? "Recovered" : "Failed"}
                  />
                  <Bar dataKey="total_risk" name="total_risk" fill="#f87171" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="total_recovered" name="total_recovered" fill="#34d399" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

      </div>

      {/* 3. Opportunities Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Top Recovery Opportunities ({getActivePeriodLabel()})</h4>
          <Link to="/cases" className="text-xs font-bold text-sky-500 hover:text-sky-600 flex items-center gap-1">
            View All Cases
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50">
                <th className="py-4 px-6">Customer</th>
                <th className="py-4 px-6">Source Problem</th>
                <th className="py-4 px-6">Risk Value</th>
                <th className="py-4 px-6 text-center">Probability</th>
                <th className="py-4 px-6 text-center">Priority</th>
                <th className="py-4 px-6 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {opps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 px-6 text-center text-slate-400 text-xs">
                    No active recovery opportunities found for this period.
                  </td>
                </tr>
              ) : (
                opps.map((c) => {
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
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div>
                            <div className="font-bold text-slate-900">{c.customer?.name}</div>
                            <div className="text-[10px] text-slate-400">{c.customer?.email}</div>
                          </div>
                          {missionMatch && (
                            <span className="bg-sky-100 text-sky-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 font-sans">
                              <Sparkles className="w-2.5 h-2.5 text-sky-600" />
                              AI
                            </span>
                          )}
                        </div>
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
                      <td className="py-4 px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {missionMatch && onInspectMissionCase && (
                            <button
                              type="button"
                              onClick={() => onInspectMissionCase(c.id)}
                              title="View AI Agent Diagnosis & Actions for this case"
                              className="inline-flex items-center gap-1 bg-sky-50 border border-sky-200 hover:bg-sky-100 text-sky-700 px-2 py-1.5 rounded-md font-bold transition-all shadow-xs cursor-pointer text-[11px]"
                            >
                              <Bot className="w-3 h-3 text-sky-600" />
                              AI Insights
                            </button>
                          )}
                          <Link 
                            to={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-2.5 py-1.5 rounded-md font-semibold transition-all shadow-sm"
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
      </div>
      
    </div>
  );
};
export default Dashboard;
