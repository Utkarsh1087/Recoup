import React, { useState } from "react";
import { 
  X, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Send, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Clock,
  ArrowRight
} from "lucide-react";
import { Link } from "react-router-dom";

export interface ProcessedCaseResult {
  case_id: number;
  customer_name?: string;
  amount_at_risk?: number;
  source_type?: string;
  status: string;
  diagnosis: string;
  action_executed: string;
  action_result: any;
  reasoning?: string;
  timestamp?: string;
}

interface AiMissionControlModalProps {
  isOpen: boolean;
  onClose: () => void;
  isRunning: boolean;
  results: ProcessedCaseResult[];
  totalToProcess: number;
  selectedCaseId?: number | null;
}

export const AiMissionControlModal: React.FC<AiMissionControlModalProps> = ({
  isOpen,
  onClose,
  isRunning,
  results,
  totalToProcess,
  selectedCaseId = null
}) => {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  React.useEffect(() => {
    if (selectedCaseId) {
      setExpandedId(selectedCaseId);
    } else if (results.length > 0 && !expandedId) {
      setExpandedId(results[0].case_id);
    }
  }, [selectedCaseId, results]);

  if (!isOpen) return null;

  const toggleExpand = (id: number) => {
    setExpandedId(expandedId === id ? null : id);
  };

  const getActionBadge = (action: string) => {
    switch (action) {
      case "bounded_incentive":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded text-[10px] font-bold">10% Discount Sent</span>;
      case "escalate_to_human":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded text-[10px] font-bold">Flagged for Staff</span>;
      case "payment_retry":
        return <span className="bg-sky-50 text-sky-700 border border-sky-200 px-2 py-0.5 rounded text-[10px] font-bold">Automatic Bank Retry</span>;
      case "alternative_payment_method":
        return <span className="bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded text-[10px] font-bold">New Payment Link Sent</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2 py-0.5 rounded text-[10px] font-bold">{action.replace(/_/g, " ")}</span>;
    }
  };

  const getCleanStatusBadge = (status: string) => {
    switch (status) {
      case "RECOVERED":
        return "bg-emerald-50 text-emerald-700 border border-emerald-200";
      case "ESCALATED":
        return "bg-amber-50 text-amber-700 border border-amber-200";
      case "FAILED":
      case "STOPPED":
        return "bg-rose-50 text-rose-700 border border-rose-200";
      default:
        return "bg-sky-50 text-sky-700 border border-sky-200";
    }
  };

  const getStatusText = (status: string) => {
    if (status === "RECOVERED") return "Money Recovered";
    if (status === "ESCALATED") return "Needs Attention";
    if (status === "ACTION_PENDING" || status === "IN_PROGRESS") return "Message Sent";
    if (status === "FAILED") return "Could Not Recover";
    return status.replace(/_/g, " ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden text-slate-800">
        
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-sky-900 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="bg-sky-500/20 border border-sky-400/30 p-2 rounded-xl text-sky-400">
              <Sparkles className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold tracking-wide">Live AI Recovery Assistant</h3>
                {isRunning ? (
                  <span className="bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping"></span>
                    ANALYZING & RECOVERING...
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[9px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 font-mono">
                    <CheckCircle2 className="w-3 h-3" />
                    RECOVERY COMPLETE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-300 mt-0.5">
                Checking why payments failed, applying store discounts, and contacting customers.
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Live Progress Bar & Stats Ticker */}
        <div className="bg-slate-50 px-6 py-3 border-b border-slate-200 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3 flex-1 min-w-[200px]">
            <span className="text-xs font-bold text-slate-700 font-mono">
              Progress: {results.length} of {totalToProcess || results.length || 8} Customers
            </span>
            <div className="flex-1 bg-slate-200 h-2 rounded-full overflow-hidden max-w-xs">
              <div 
                className="bg-gradient-to-r from-sky-500 to-emerald-500 h-full transition-all duration-300 rounded-full"
                style={{ width: `${Math.min(100, Math.round((results.length / Math.max(1, totalToProcess || results.length || 8)) * 100))}%` }}
              ></div>
            </div>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            {isRunning ? "Analyzing failure causes and preparing recovery actions..." : "All dropped payments have been evaluated."}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 divide-y divide-slate-100">
          {results.length === 0 && isRunning && (
            <div className="text-center py-12 space-y-3">
              <div className="w-10 h-10 border-3 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-xs font-bold text-slate-700">Analyzing dropped transactions...</p>
              <p className="text-[11px] text-slate-400">Evaluating bank failure codes and customer purchase history...</p>
            </div>
          )}

          {results.length === 0 && !isRunning && (
            <div className="text-center py-12 text-slate-400 text-xs">
              No pending cases found. All customer payment issues have already been handled.
            </div>
          )}

          {results.map((res, index) => {
            const isExpanded = expandedId === res.case_id;
            return (
              <div key={res.case_id} className={`pt-4 first:pt-0 transition-all ${isExpanded ? "bg-slate-50/50 p-4 rounded-xl border border-slate-200" : ""}`}>
                
                {/* Case Row Header */}
                <div 
                  onClick={() => toggleExpand(res.case_id)}
                  className="flex items-center justify-between cursor-pointer gap-3 hover:bg-slate-50 p-2 rounded-lg transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-sky-100 text-sky-700 font-bold text-xs flex items-center justify-center font-mono">
                      {index + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-slate-900">Case #REC-{res.case_id}</span>
                        {res.customer_name && (
                          <span className="text-xs text-slate-600 font-medium">— {res.customer_name}</span>
                        )}
                        {getActionBadge(res.action_executed)}
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                        {res.diagnosis || "Evaluated by AI assistant"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${getCleanStatusBadge(res.status)}`}>
                      {getStatusText(res.status)}
                    </span>
                    {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                  </div>
                </div>

                {/* Expanded Thought Breakdown */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 space-y-3 pl-9 animate-in fade-in duration-150">
                    
                    {/* Step 1: AI Diagnosis */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-xs">
                      <div className="flex items-center gap-1.5 text-indigo-600 font-bold text-[10px] uppercase font-mono tracking-wider">
                        <Sparkles className="w-3.5 h-3.5" />
                        1. Why the Payment Failed
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed font-sans">
                        {res.diagnosis}
                      </p>
                    </div>

                    {/* Step 2: Policy Verification */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-xs">
                      <div className="flex items-center gap-1.5 text-amber-600 font-bold text-[10px] uppercase font-mono tracking-wider">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        2. Store Discount & Safety Check
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">
                        Verified store settings: Discount offer and retry limits are within your approved store rules.
                      </p>
                    </div>

                    {/* Step 3: Tool Execution & Outbound Dispatch */}
                    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-1 shadow-xs">
                      <div className="flex items-center gap-1.5 text-emerald-600 font-bold text-[10px] uppercase font-mono tracking-wider">
                        <Send className="w-3.5 h-3.5" />
                        3. Message Sent to Customer
                      </div>
                      <div className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded border border-slate-200 font-sans leading-relaxed">
                        {typeof res.action_result === "object" && res.action_result?.message ? (
                          <div className="space-y-1.5">
                            <div className="font-semibold text-slate-900">WhatsApp Message:</div>
                            <div className="italic text-slate-600 bg-white p-2 rounded border border-slate-100">
                              "{res.action_result.message}"
                            </div>
                            {res.action_result?.discount_code && (
                              <div className="text-[11px] text-emerald-700 font-medium">
                                Coupon Applied: <span className="font-mono font-bold">{res.action_result.discount_code}</span> ({res.action_result.discount_percent || 10}% Off)
                              </div>
                            )}
                          </div>
                        ) : typeof res.action_result === "object" ? (
                          <div className="text-[11px] text-slate-600">
                            Action completed: <strong>{res.action_executed.replace(/_/g, " ")}</strong>
                          </div>
                        ) : (
                          String(res.action_result)
                        )}
                      </div>
                    </div>

                    {/* Link to Full Case Detail */}
                    <div className="flex justify-end pt-1">
                      <Link 
                        to={`/cases/${res.case_id}`}
                        onClick={onClose}
                        className="text-xs font-bold text-sky-600 hover:text-sky-700 flex items-center gap-1 hover:underline cursor-pointer"
                      >
                        Open Case & WhatsApp Simulator <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                  </div>
                )}

              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            Click on any customer above to see full details and actions.
          </div>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs px-5 py-2 rounded-xl transition-all shadow-xs cursor-pointer"
          >
            Close Window
          </button>
        </div>

      </div>
    </div>
  );
};

export default AiMissionControlModal;
