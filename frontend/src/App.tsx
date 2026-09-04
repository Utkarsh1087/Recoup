import React, { useState } from "react";
import { HashRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import AgentConsole from "./pages/AgentConsole";
import Analytics from "./pages/Analytics";
import Transactions from "./pages/Transactions";
import Customers from "./pages/Customers";
import AuditLogs from "./pages/AuditLogs";
import Settings from "./pages/Settings";
import PaymentSimulator from "./pages/PaymentSimulator";
import { api } from "./services/api";
import { getCurrentMonthValue, getMonthDateRange } from "./utils/dateUtils";

import { AiMissionControlModal, ProcessedCaseResult } from "./components/AiMissionControlModal";

interface LayoutWrapperProps {
  children: React.ReactNode;
  dateFilterType: "monthly" | "custom";
  setDateFilterType: (val: "monthly" | "custom") => void;
  selectedMonth: string;
  setSelectedMonth: (val: string) => void;
  startDate: string;
  setStartDate: (val: string) => void;
  endDate: string;
  setEndDate: (val: string) => void;
  isDemoRunning: boolean;
  onRunDemo: () => void;
  missionResults: ProcessedCaseResult[];
  onOpenMissionControl: () => void;
}

const LayoutWrapper: React.FC<LayoutWrapperProps> = ({ 
  children,
  dateFilterType,
  setDateFilterType,
  selectedMonth,
  setSelectedMonth,
  startDate,
  setStartDate,
  endDate,
  setEndDate,
  isDemoRunning,
  onRunDemo,
  missionResults,
  onOpenMissionControl
}) => {
  const location = useLocation();

  // If path is payment simulator, bypass dashboard layout wrapping completely
  const isSimulator = location.pathname.startsWith("/payment-simulator");

  // Reset database back to seed
  const handleResetData = async () => {
    const confirmReset = window.confirm("Reset database back to default seed data? All active case progressions will be wiped.");
    if (!confirmReset) return;
    try {
      await api.resetDatabase();
      alert("Database reset completed successfully!");
      window.location.reload();
    } catch (e) {
      alert("Error resetting database");
    }
  };

  // Get active title based on path
  const getHeaderTitle = (path: string) => {
    if (path === "/") return "Merchant Overview";
    if (path.startsWith("/cases/")) return "Inspect Case Logs";
    if (path === "/cases") return "Revenue Recovery Center";
    if (path === "/transactions") return "Transaction Log Ledger";
    if (path === "/customers") return "Merchant Customer base";
    if (path === "/agent") return "Recoup Orchestrator Core";
    if (path === "/analytics") return "Financial Analytics Engine";
    if (path === "/audit-logs") return "Systemic Operations Trace Log";
    if (path === "/settings") return "Configuration settings";
    return "Recoup Protection";
  };

  if (isSimulator) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen bg-[#f5f9fc] text-slate-800 overflow-x-hidden">
      {/* Fixed Sidebar */}
      <Sidebar onReset={handleResetData} />
      
      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen min-w-0 overflow-x-hidden">
        <Header 
          title={getHeaderTitle(location.pathname)} 
          onRunDemo={onRunDemo} 
          isDemoRunning={isDemoRunning} 
          dateFilterType={dateFilterType}
          setDateFilterType={setDateFilterType}
          selectedMonth={selectedMonth}
          setSelectedMonth={setSelectedMonth}
          startDate={startDate}
          setStartDate={setStartDate}
          endDate={endDate}
          setEndDate={setEndDate}
          missionResultsCount={missionResults.length}
          onOpenMissionControl={onOpenMissionControl}
        />
        <main className="flex-1 bg-[#f5f9fc]/50 min-w-0 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  // Global Date/Month Filter States
  const [dateFilterType, setDateFilterType] = useState<"monthly" | "custom">("monthly");
  const initialMonth = getCurrentMonthValue();
  const initialRange = getMonthDateRange(initialMonth);
  const [selectedMonth, setSelectedMonth] = useState(initialMonth); // Dynamic YYYY-MM
  const [startDate, setStartDate] = useState(initialRange.startDate);
  const [endDate, setEndDate] = useState(initialRange.endDate);

  // Live Mission Control States
  const [isDemoRunning, setIsDemoRunning] = useState(false);
  const [isMissionControlOpen, setIsMissionControlOpen] = useState(false);
  const [missionResults, setMissionResults] = useState<ProcessedCaseResult[]>([]);
  const [selectedMissionCaseId, setSelectedMissionCaseId] = useState<number | null>(null);

  // Run Demo Recovery
  const handleRunDemo = async () => {
    try {
      setIsDemoRunning(true);
      setSelectedMissionCaseId(null);
      setIsMissionControlOpen(true);
      setMissionResults([]);
      const res = await api.runDemoBatch();
      if (res && res.results) {
        setMissionResults(res.results);
      }
    } catch (e) {
      alert("Error executing demo batch");
    } finally {
      setIsDemoRunning(false);
    }
  };

  const handleInspectMissionCase = (caseId: number) => {
    setSelectedMissionCaseId(caseId);
    setIsMissionControlOpen(true);
  };

  return (
    <Router>
      <LayoutWrapper
        dateFilterType={dateFilterType}
        setDateFilterType={setDateFilterType}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        startDate={startDate}
        setStartDate={setStartDate}
        endDate={endDate}
        setEndDate={setEndDate}
        isDemoRunning={isDemoRunning}
        onRunDemo={handleRunDemo}
        missionResults={missionResults}
        onOpenMissionControl={() => setIsMissionControlOpen(true)}
      >
        <Routes>
          <Route 
            path="/" 
            element={
              <Dashboard 
                dateFilterType={dateFilterType} 
                selectedMonth={selectedMonth} 
                startDate={startDate} 
                endDate={endDate}
                missionResults={missionResults}
                onInspectMissionCase={handleInspectMissionCase}
              />
            } 
          />
          <Route 
            path="/cases" 
            element={
              <Cases 
                dateFilterType={dateFilterType} 
                selectedMonth={selectedMonth} 
                startDate={startDate} 
                endDate={endDate}
                missionResults={missionResults}
                onInspectMissionCase={handleInspectMissionCase}
              />
            } 
          />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route 
            path="/transactions" 
            element={
              <Transactions 
                dateFilterType={dateFilterType} 
                selectedMonth={selectedMonth} 
                startDate={startDate} 
                endDate={endDate}
              />
            } 
          />
          <Route path="/customers" element={<Customers />} />
          <Route path="/agent" element={<AgentConsole />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/payment-simulator/:tx_id" element={<PaymentSimulator />} />
        </Routes>
      </LayoutWrapper>

      {/* Global AI Mission Control Reasoning Modal */}
      <AiMissionControlModal
        isOpen={isMissionControlOpen}
        onClose={() => setIsMissionControlOpen(false)}
        isRunning={isDemoRunning}
        results={missionResults}
        totalToProcess={8}
        selectedCaseId={selectedMissionCaseId}
      />
    </Router>
  );
};

export default App;
