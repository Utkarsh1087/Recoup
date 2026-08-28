import React from "react";
import { Play, AlertTriangle } from "lucide-react";

interface HeaderProps {
  title: string;
  onRunDemo: () => void;
  isDemoRunning: boolean;
}

export const Header: React.FC<HeaderProps> = ({ title, onRunDemo, isDemoRunning }) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-40 px-8 flex items-center justify-between text-slate-800 shadow-sm">
      <div>
        <h1 className="font-bold text-sm text-slate-900 uppercase tracking-wider">{title}</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* Test Mode Badge */}
        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold">
          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
          Test Mode Active
        </div>

        {/* Play Action Button */}
        <button
          onClick={onRunDemo}
          disabled={isDemoRunning}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold text-white bg-sky-500 hover:bg-sky-600 disabled:opacity-50 transition-colors shadow-sm cursor-pointer`}
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
