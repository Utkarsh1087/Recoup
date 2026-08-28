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

const LayoutWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const location = useLocation();
  const [isDemoRunning, setIsDemoRunning] = useState(false);

  // If path is payment simulator, bypass dashboard layout wrapping completely
  const isSimulator = location.pathname.startsWith("/payment-simulator");

  // Run Demo Recovery
  const handleRunDemo = async () => {
    try {
      setIsDemoRunning(true);
      const res = await api.runDemoBatch();
      alert(`Demo execution complete! Agent ran recovery on ${res.processed} open cases.`);
    } catch (e) {
      alert("Error executing demo batch");
    } finally {
      setIsDemoRunning(false);
    }
  };

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

  if (isSimulator) {
    return <>{children}</>;
  }

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

  return (
    <div className="flex min-h-screen bg-[#f5f9fc] text-slate-800">
      {/* Fixed Sidebar */}
      <Sidebar onReset={handleResetData} />
      
      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen">
        <Header 
          title={getHeaderTitle(location.pathname)} 
          onRunDemo={handleRunDemo} 
          isDemoRunning={isDemoRunning} 
        />
        <main className="flex-1 bg-[#f5f9fc]/50">
          {children}
        </main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Router>
      <LayoutWrapper>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/cases" element={<Cases />} />
          <Route path="/cases/:id" element={<CaseDetail />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/customers" element={<Customers />} />
          <Route path="/agent" element={<AgentConsole />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/payment-simulator/:tx_id" element={<PaymentSimulator />} />
        </Routes>
      </LayoutWrapper>
    </Router>
  );
};

export default App;
