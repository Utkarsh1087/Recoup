import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, RecoveryCase } from "../services/api";
import { 
  ArrowLeft, 
  ShieldAlert, 
  Bot, 
  Play, 
  CheckCircle2, 
  AlertTriangle,
  User,
  CreditCard,
  Percent,
  RefreshCw
} from "lucide-react";

export const CaseDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const caseId = parseInt(id || "0");
  const [caseDetail, setCaseDetail] = useState<RecoveryCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchDetail = async () => {
    try {
      const data = await api.getCaseDetail(caseId);
      setCaseDetail(data);
    } catch (e) {
      console.error("Error loading case details", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [caseId]);

  const handleRunRecovery = async () => {
    try {
      setActionLoading(true);
      await api.runRecovery(caseId);
      await fetchDetail();
    } catch (e) {
      alert("Error executing recovery action");
    } finally {
      setActionLoading(false);
    }
  };

  const handleEscalate = async () => {
    const reason = prompt("Enter reason for manual escalation:", "Merchant manual escalation");
    if (reason === null) return;
    try {
      setActionLoading(true);
      await api.escalateCase(caseId, reason);
      await fetchDetail();
    } catch (e) {
      alert("Error escalating case");
    } finally {
      setActionLoading(false);
    }
  };

  const handleStop = async () => {
    const reason = prompt("Enter reason for stopping recovery workflow:", "Merchant manual cancellation");
    if (reason === null) return;
    try {
      setActionLoading(true);
      await api.stopCase(caseId, reason);
      await fetchDetail();
    } catch (e) {
      alert("Error stopping workflow");
    } finally {
      setActionLoading(false);
    }
  };

  const handleResolve = async () => {
    try {
      setActionLoading(true);
      await api.resolveCase(caseId);
      await fetchDetail();
    } catch (e) {
      alert("Error resolving case");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center h-[calc(100vh-4rem)] bg-slate-50">
        <div className="w-10 h-10 border-4 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!caseDetail) {
    return (
      <div className="p-8 text-center bg-slate-50 min-h-screen text-slate-900">
        <h3 className="text-xl font-bold">Case Not Found</h3>
        <Link to="/cases" className="text-sky-500 mt-4 inline-block hover:underline font-semibold">Back to Cases</Link>
      </div>
    );
  }

  const getEventIcon = (type: string) => {
    switch (type) {
      case "DETECTION":
        return <ShieldAlert className="w-4 h-4 text-blue-500" />;
      case "DIAGNOSIS":
        return <Bot className="w-4 h-4 text-indigo-500" />;
      case "POLICY_CHECK":
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case "ACTION_EXECUTION":
        return <Play className="w-4 h-4 text-sky-500 fill-sky-500" />;
      case "VERIFICATION":
        return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
      default:
        return <RefreshCw className="w-4 h-4 text-slate-500" />;
    }
  };

  const isTerminal = ["RECOVERED", "FAILED", "ESCALATED", "STOPPED"].includes(caseDetail.status);

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">
      {/* Top action header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div className="flex items-center gap-4">
          <Link to="/cases" className="bg-white border border-slate-200 p-2 rounded-lg text-slate-400 hover:text-slate-700 transition-colors shadow-sm">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-extrabold text-slate-900">Case #REC-{caseDetail.id}</h2>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase ${
                caseDetail.status === "RECOVERED" 
                  ? "bg-emerald-50 border border-emerald-100 text-emerald-600" 
                  : caseDetail.status === "ESCALATED" 
                  ? "bg-amber-50 border border-amber-100 text-amber-600" 
                  : caseDetail.status === "FAILED" 
                  ? "bg-rose-50 border border-rose-100 text-rose-600"
                  : "bg-slate-100 border border-slate-200 text-slate-600"
              }`}>
                {caseDetail.status.replace("_", " ")}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1 font-mono">Source Event: {caseDetail.source_type.replace("_", " ")} | ID: {caseDetail.source_id}</p>
          </div>
        </div>

        {/* Workflow Actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleRunRecovery}
            disabled={actionLoading || isTerminal}
            className="bg-sky-500 hover:bg-sky-600 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all disabled:opacity-50 flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            {actionLoading ? (
              <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <Play className="w-3.5 h-3.5 fill-white" />
            )}
            Run Agent Recovery
          </button>
          
          <button
            onClick={handleEscalate}
            disabled={actionLoading || caseDetail.status === "ESCALATED"}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            Escalate Case
          </button>
          
          <button
            onClick={handleStop}
            disabled={actionLoading || caseDetail.status === "STOPPED"}
            className="bg-white border border-slate-200 hover:bg-slate-50 text-rose-600 px-4 py-2 rounded-lg text-xs font-bold transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            Stop Workflow
          </button>
          
          <button
            onClick={handleResolve}
            disabled={actionLoading || caseDetail.status === "RECOVERED"}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-lg text-xs transition-all disabled:opacity-50 shadow-sm cursor-pointer"
          >
            Mark Succeeded
          </button>
        </div>
      </div>

      {/* Grid split columns */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        
        {/* Left Side: Metadata Card */}
        <div className="lg:col-span-2 space-y-6">
          {/* Customer Metadata Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="w-4 h-4 text-sky-500" />
              Customer Profile
            </h3>
            
            <div className="space-y-4">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Full Name</span>
                <p className="text-xs font-bold text-slate-900 mt-0.5">{caseDetail.customer?.name}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Email Address</span>
                  <p className="text-xs font-semibold text-slate-600 truncate mt-0.5">{caseDetail.customer?.email}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Phone Number</span>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{caseDetail.customer?.phone || "N/A"}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4 grid grid-cols-3 gap-2">
                <div className="text-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">LTV</span>
                  <span className="text-xs font-extrabold text-slate-900 mt-1 block">₹{caseDetail.customer?.lifetime_value.toLocaleString("en-IN")}</span>
                </div>
                <div className="text-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Orders</span>
                  <span className="text-xs font-extrabold text-slate-900 mt-1 block">{caseDetail.customer?.successful_orders} / {caseDetail.customer?.total_orders}</span>
                </div>
                <div className="text-center bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Success Rate</span>
                  <span className="text-xs font-extrabold text-emerald-600 mt-1 block">
                    {caseDetail.customer ? Math.round((caseDetail.customer.successful_orders / Math.max(1, caseDetail.customer.total_orders)) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* At Risk Details Card */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
            <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-sky-500" />
              At-Risk Context
            </h3>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center bg-slate-50 p-3 rounded-lg border border-slate-150">
                <div>
                  <span className="text-[10px] text-slate-400 block uppercase font-bold font-mono">Amount At Risk</span>
                  <span className="text-lg font-extrabold text-rose-600 mt-0.5 block">₹{caseDetail.amount_at_risk.toLocaleString("en-IN")}</span>
                </div>
                <div className="text-right">
                  <span className="text-[9px] text-slate-400 block uppercase font-bold font-mono">Probability</span>
                  <span className="text-sm font-bold text-emerald-600 mt-0.5 block">{Math.round(caseDetail.recovery_probability * 100)}%</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Priority</span>
                  <p className="text-xs font-bold text-slate-800 mt-0.5">{caseDetail.priority}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono">Recovered Amt</span>
                  <p className="text-xs font-bold text-emerald-600 mt-0.5">₹{caseDetail.amount_recovered.toLocaleString("en-IN")}</p>
                </div>
              </div>
              
              <div className="border-t border-slate-100 pt-4 space-y-3">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono block">AI Diagnosis</span>
                  <p className="text-xs text-slate-600 mt-1 leading-relaxed bg-slate-50 p-2.5 rounded border border-slate-200/80">{caseDetail.diagnosis || "No diagnosis logged. Click 'Run Agent Recovery'."}</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold font-mono block">Recommended Action</span>
                  <p className="text-xs text-sky-600 font-bold font-mono mt-1 uppercase tracking-wide">{caseDetail.recommended_action || "None"}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Timeline Audit Trail */}
        <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col">
          <h3 className="font-bold text-xs text-slate-400 uppercase tracking-wider mb-6 flex items-center gap-2">
            <Percent className="w-4 h-4 text-sky-500" />
            Agent Decision Logs & Audit Trail
          </h3>

          <div className="relative border-l border-slate-200 pl-6 ml-3 space-y-8 flex-1">
            {caseDetail.audit_logs && caseDetail.audit_logs.length > 0 ? (
              caseDetail.audit_logs.map((log) => (
                <div key={log.id} className="relative">
                  {/* Circle Marker */}
                  <span className="absolute -left-10 top-0.5 bg-white border border-slate-200 p-1.5 rounded-full flex items-center justify-center shadow-sm">
                    {getEventIcon(log.event_type)}
                  </span>
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="bg-slate-100 px-2 py-0.5 rounded text-[9px] font-bold text-slate-500 uppercase tracking-wider font-mono">
                        {log.event_type}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </span>
                    </div>
                    
                    {log.agent_reasoning_summary && (
                      <p className="text-xs text-slate-600 leading-relaxed font-sans">{log.agent_reasoning_summary}</p>
                    )}

                    {log.policy_check && (
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-[9px] text-slate-400 uppercase font-bold font-mono">Policy:</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                          log.policy_check.startsWith("PASSED") 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : "bg-rose-50 text-rose-600 border border-rose-100"
                        }`}>
                          {log.policy_check}
                        </span>
                      </div>
                    )}

                    {/* Tool Call Box */}
                    {log.tool_called && (
                      <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 mt-2 space-y-2 font-mono text-[10px] text-slate-600">
                        <div className="flex items-center justify-between text-[9px] border-b border-slate-150 pb-1.5">
                          <span className="text-sky-600 font-bold">tool_call: {log.tool_called}()</span>
                          {log.result && (
                            <span className={`font-bold uppercase ${log.result === "SUCCESS" ? "text-emerald-600" : "text-rose-600"}`}>
                              {log.result}
                            </span>
                          )}
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase block text-[8px] font-bold">Parameters:</span>
                          <span className="text-slate-500 block mt-0.5">{log.tool_input_summary}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 uppercase block text-[8px] font-bold">Result payload:</span>
                          <span className="text-slate-600 block mt-0.5 whitespace-pre-wrap">{log.tool_result_summary}</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-slate-400 text-xs py-12">
                No workflow operations recorded. Click 'Run Agent Recovery' to initiate the agent.
              </div>
            )}
          </div>
        </div>
        
      </div>
    </div>
  );
};
export default CaseDetail;
