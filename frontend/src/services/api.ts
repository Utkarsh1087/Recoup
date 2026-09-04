const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" 
    ? "/api" 
    : "http://localhost:8000/api");


export interface DashboardSummary {
  revenue_at_risk: number;
  revenue_recovered: number;
  recovery_rate: number;
  cases_analyzed: number;
  cases_recovered: number;
  cases_escalated: number;
  cases_failed: number;
  cases_stopped: number;
}

export interface SourceRecovery {
  source: string;
  total_cases: number;
  total_risk: number;
  total_recovered: number;
  recovery_rate: number;
}

export interface TimelinePoint {
  date: string;
  at_risk: number;
  recovered: number;
}

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  lifetime_value: number;
  total_orders: number;
  successful_orders: number;
  failed_payments: number;
  previous_returns: number;
  subscription_status: string;
  created_at: string;
}

export interface AuditLog {
  id: number;
  recovery_case_id: number;
  timestamp: string;
  event_type: string;
  agent_reasoning_summary: string | null;
  tool_called: string | null;
  tool_input_summary: string | null;
  tool_result_summary: string | null;
  action: string | null;
  result: string | null;
  policy_check: string | null;
  created_at: string;
}

export interface RecoveryCase {
  id: number;
  customer_id: number;
  customer?: Customer;
  source_type: string;
  source_id: string;
  amount_at_risk: number;
  recovery_probability: number;
  priority: string;
  diagnosis: string | null;
  recommended_action: string | null;
  selected_action: string | null;
  status: string;
  amount_recovered: number;
  created_at: string;
  completed_at: string | null;
  audit_logs?: AuditLog[];
}

export interface Transaction {
  id: number;
  customer_id: number;
  amount: number;
  currency: string;
  payment_method: string;
  status: string;
  failure_reason: string | null;
  razorpay_reference: string | null;
  created_at: string;
  updated_at: string;
}

export const api = {
  // Health & Server Info
  async getHealth(): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/health`);
    return res.json();
  },

  // Dashboard
  async getDashboardSummary(): Promise<DashboardSummary> {

    const res = await fetch(`${API_BASE_URL}/dashboard/summary`);
    return res.json();
  },

  async getDashboardSources(): Promise<SourceRecovery[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/sources`);
    return res.json();
  },

  async getDashboardTimeline(): Promise<TimelinePoint[]> {
    const res = await fetch(`${API_BASE_URL}/dashboard/timeline`);
    return res.json();
  },

  // Cases
  async getRecoveryCases(status = "All", priority = "All", sourceType = "All"): Promise<RecoveryCase[]> {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (priority) params.append("priority", priority);
    if (sourceType) params.append("source_type", sourceType);

    const res = await fetch(`${API_BASE_URL}/recovery-cases?${params.toString()}`);
    return res.json();
  },

  async getCaseDetail(caseId: number): Promise<RecoveryCase> {
    const res = await fetch(`${API_BASE_URL}/recovery-cases/${caseId}`);
    if (!res.ok) throw new Error("Failed to load case detail");
    return res.json();
  },

  async runRecovery(caseId: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/recovery-cases/${caseId}/run`, {
      method: "POST"
    });
    return res.json();
  },

  async escalateCase(caseId: number, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/recovery-cases/${caseId}/escalate?reason=${encodeURIComponent(reason)}`, {
      method: "POST"
    });
    return res.json();
  },

  async stopCase(caseId: number, reason: string): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/recovery-cases/${caseId}/stop?reason=${encodeURIComponent(reason)}`, {
      method: "POST"
    });
    return res.json();
  },

  async resolveCase(caseId: number): Promise<any> {
    const res = await fetch(`${API_BASE_URL}/recovery-cases/${caseId}/resolve`, {
      method: "POST"
    });
    return res.json();
  },

  // Agent Chat
  async sendChatMessage(message: string): Promise<{ response: string }> {
    const res = await fetch(`${API_BASE_URL}/agent/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message })
    });
    return res.json();
  },

  // Data lists
  async getTransactions(): Promise<Transaction[]> {
    const res = await fetch(`${API_BASE_URL}/transactions`);
    return res.json();
  },

  async getCustomer(customerId: number): Promise<Customer> {
    const res = await fetch(`${API_BASE_URL}/customers/${customerId}`);
    return res.json();
  },

  async getAuditLogs(): Promise<AuditLog[]> {
    const res = await fetch(`${API_BASE_URL}/audit-logs`);
    return res.json();
  },

  // Demo controls
  async runDemoBatch(): Promise<{ processed: number; results: any[] }> {
    const res = await fetch(`${API_BASE_URL}/demo/run`, {
      method: "POST"
    });
    return res.json();
  },

  async resetDatabase(): Promise<{ status: string; message: string }> {
    const res = await fetch(`${API_BASE_URL}/demo/reset`, {
      method: "POST"
    });
    return res.json();
  }
};
