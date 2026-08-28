import React from "react";
import { Link, useLocation } from "react-router-dom";
import { 
  LayoutDashboard, 
  ShieldAlert, 
  CreditCard, 
  Users, 
  Bot, 
  BarChart3, 
  History,
  DollarSign
} from "lucide-react";

interface SidebarProps {
  onReset: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onReset }) => {
  const location = useLocation();
  
  const navItems = [
    { name: "Dashboard", path: "/", icon: LayoutDashboard },
    { name: "Recovery Cases", path: "/cases", icon: ShieldAlert },
    { name: "Transactions", path: "/transactions", icon: CreditCard },
    { name: "Customers", path: "/customers", icon: Users },
    { name: "AI Agent", path: "/agent", icon: Bot },
    { name: "Analytics", path: "/analytics", icon: BarChart3 },
    { name: "Audit Logs", path: "/audit-logs", icon: History },
  ];

  return (
    <div className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 text-slate-600 shadow-sm">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-slate-200 gap-2">
        <div className="bg-sky-500 p-1.5 rounded-lg text-white font-bold flex items-center justify-center shadow-sm">
          <DollarSign className="w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-lg text-slate-900 tracking-wide">Re<span className="text-sky-500">coup</span></span>
          <span className="block text-[9px] text-slate-400 font-semibold uppercase tracking-wider">Revenue Protection</span>
        </div>
      </div>

      {/* Nav List */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.name}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                isActive 
                  ? "bg-sky-50 text-sky-600 shadow-sm" 
                  : "hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <item.icon className="w-4 h-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Footer Controls */}
      <div className="p-4 border-t border-slate-200 space-y-3">
        <button
          onClick={onReset}
          className="w-full bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 text-xs py-2 rounded-lg font-medium transition-colors cursor-pointer"
        >
          Reset Demo Data
        </button>
        <div className="text-[10px] text-center text-slate-400 font-mono">
          Recoup v1.0.0 (Test Mode)
        </div>
      </div>
    </div>
  );
};
export default Sidebar;
