import React from "react";
import { Play, AlertTriangle, Sparkles, Bot } from "lucide-react";

interface HeaderProps {
  title: string;
  onRunDemo: () => void;
  isDemoRunning: boolean;
  dateFilterType: "monthly" | "custom";
  setDateFilterType: (val: "monthly" | "custom") => void;
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  missionResultsCount?: number;
  onOpenMissionControl?: () => void;
}

import { getAvailableMonths, getMonthDateRange } from "../utils/dateUtils";

export const Header: React.FC<HeaderProps> = ({ 
  title, 
  onRunDemo, 
  isDemoRunning,
  dateFilterType,
  setDateFilterType,
  selectedMonth,
  setSelectedMonth,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  missionResultsCount = 0,
  onOpenMissionControl
}) => {
  const monthsList = getAvailableMonths();

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-40 px-8 flex items-center justify-between text-slate-800 shadow-sm">
      <div>
        <h1 className="font-bold text-sm text-slate-900 uppercase tracking-wider">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Premium Date/Month Selector */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginRight: "12px" }}>
          {dateFilterType === "monthly" ? (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Month:</span>
              <select 
                value={selectedMonth}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "CUSTOM") {
                    setDateFilterType("custom");
                  } else {
                    setSelectedMonth(val);
                    const range = getMonthDateRange(val);
                    setStartDate(range.startDate);
                    setEndDate(range.endDate);
                  }
                }}
                className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2.5 py-1.5 outline-none text-slate-700 cursor-pointer hover:border-slate-350 transition-colors shadow-sm"
              >
                {monthsList.map((m) => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
                <option value="CUSTOM">Custom Range...</option>
              </select>
            </div>
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ fontSize: "10px", fontWeight: "700", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Range:</span>
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 outline-none text-slate-700 shadow-sm"
              />
              <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>to</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-white border border-slate-200 rounded-md px-2 py-1 outline-none text-slate-700 shadow-sm"
              />
              <button 
                onClick={() => {
                  setDateFilterType("monthly");
                  setSelectedMonth("2026-08");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#0ea5e9",
                  fontSize: "11px",
                  fontWeight: "700",
                  cursor: "pointer",
                  textDecoration: "underline",
                  marginLeft: "4px"
                }}
              >
                Reset
              </button>
            </div>
          )}
        </div>

        {/* Test Mode Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Test Mode Active
        </div>

        {/* Live AI Recovery Activity Button (Shown when results exist or running) */}
        {(missionResultsCount > 0 || isDemoRunning) && (
          <button
            onClick={onOpenMissionControl}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold text-sky-700 bg-sky-50 hover:bg-sky-100 border border-sky-200 transition-colors shadow-xs cursor-pointer"
          >
            <Bot className="w-3.5 h-3.5 text-sky-600 animate-pulse" />
            <span>AI Activity ({missionResultsCount})</span>
          </button>
        )}

        {/* Play Action Button */}
        <button
          onClick={onRunDemo}
          disabled={isDemoRunning}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
        >
          {isDemoRunning ? (
            <>
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Processing cases...
            </>
          ) : (
            <>
              <Play className="w-3 h-3 fill-white text-white" />
              Run Demo Recovery
            </>
          )}
        </button>
      </div>
    </header>
  );
};
export default Header;
