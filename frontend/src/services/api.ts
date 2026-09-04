const API_BASE_URL = 
  import.meta.env.VITE_API_BASE_URL || 
  (typeof window !== "undefined" && window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1" 
    ? "/api" 
    : "http://localhost:8000/api");

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  skip?: number;
  limit?: number;
}

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

  // Cases (Server-Side Paginated)
  async getRecoveryCases(params?: {
    status?: string;
    priority?: string;
    source_type?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
    all?: boolean;
  }): Promise<PaginatedResponse<RecoveryCase>> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "All") query.append("status", params.status);
    if (params?.priority && params.priority !== "All") query.append("priority", params.priority);
    if (params?.source_type && params.source_type !== "All") query.append("source_type", params.source_type);
    if (params?.search) query.append("search", params.search);
    if (params?.start_date) query.append("start_date", params.start_date);
    if (params?.end_date) query.append("end_date", params.end_date);
    if (params?.skip !== undefined) query.append("skip", String(params.skip));
    if (params?.limit !== undefined) query.append("limit", String(params.limit));
    if (params?.all) query.append("all", "true");

    const res = await fetch(`${API_BASE_URL}/recovery-cases?${query.toString()}`);
    if (!res.ok) return { items: [], total: 0 };
    const data = await res.json();
    return Array.isArray(data) ? { items: data, total: data.length } : data;
  },

  async getAllRecoveryCases(): Promise<RecoveryCase[]> {
    const res = await fetch(`${API_BASE_URL}/recovery-cases?all=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.items || [];
  },

  // Customers (Server-Side Paginated)
  async getCustomers(params?: {
    search?: string;
    subscription_status?: string;
    segment?: string;
    sort_by?: string;
    skip?: number;
    limit?: number;
    all?: boolean;
  }): Promise<PaginatedResponse<Customer>> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.subscription_status && params.subscription_status !== "All") query.append("subscription_status", params.subscription_status);
    if (params?.segment && params.segment !== "All") query.append("segment", params.segment);
    if (params?.sort_by) query.append("sort_by", params.sort_by);
    if (params?.skip !== undefined) query.append("skip", String(params.skip));
    if (params?.limit !== undefined) query.append("limit", String(params.limit));
    if (params?.all) query.append("all", "true");

    const res = await fetch(`${API_BASE_URL}/customers?${query.toString()}`);
    if (!res.ok) return { items: [], total: 0 };
    const data = await res.json();
    return Array.isArray(data) ? { items: data, total: data.length } : data;
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

  // Transactions (Server-Side Paginated)
  async getTransactions(params?: {
    status?: string;
    payment_method?: string;
    search?: string;
    start_date?: string;
    end_date?: string;
    skip?: number;
    limit?: number;
    all?: boolean;
  }): Promise<PaginatedResponse<Transaction>> {
    const query = new URLSearchParams();
    if (params?.status && params.status !== "All") query.append("status", params.status);
    if (params?.payment_method && params.payment_method !== "All") query.append("payment_method", params.payment_method);
    if (params?.search) query.append("search", params.search);
    if (params?.start_date) query.append("start_date", params.start_date);
    if (params?.end_date) query.append("end_date", params.end_date);
    if (params?.skip !== undefined) query.append("skip", String(params.skip));
    if (params?.limit !== undefined) query.append("limit", String(params.limit));
    if (params?.all) query.append("all", "true");

    const res = await fetch(`${API_BASE_URL}/transactions?${query.toString()}`);
    if (!res.ok) return { items: [], total: 0 };
    const data = await res.json();
    return Array.isArray(data) ? { items: data, total: data.length } : data;
  },

  async getAllTransactions(): Promise<Transaction[]> {
    const res = await fetch(`${API_BASE_URL}/transactions?all=true`);
    if (!res.ok) return [];
    const data = await res.json();
    return Array.isArray(data) ? data : data.items || [];
  },

  async getCustomer(customerId: number): Promise<Customer> {
    const res = await fetch(`${API_BASE_URL}/customers/${customerId}`);
    return res.json();
  },

  // Audit Logs (Server-Side Paginated)
  async getAuditLogs(params?: {
    search?: string;
    event_type?: string;
    skip?: number;
    limit?: number;
    all?: boolean;
  }): Promise<PaginatedResponse<AuditLog>> {
    const query = new URLSearchParams();
    if (params?.search) query.append("search", params.search);
    if (params?.event_type && params.event_type !== "All") query.append("event_type", params.event_type);
    if (params?.skip !== undefined) query.append("skip", String(params.skip));
    if (params?.limit !== undefined) query.append("limit", String(params.limit));
    if (params?.all) query.append("all", "true");

    const res = await fetch(`${API_BASE_URL}/audit-logs?${query.toString()}`);
    if (!res.ok) return { items: [], total: 0 };
    const data = await res.json();
    return Array.isArray(data) ? { items: data, total: data.length } : data;
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
  },

  async getSimulatorDetails(reference: string): Promise<{
    amount: number;
    customer_name: string;
    customer_email?: string;
    case_id?: number;
    source_type: string;
    source_id: string;
    status: string;
    merchant_name: string;
  }> {
    const res = await fetch(`${API_BASE_URL}/recovery/simulator-details/${encodeURIComponent(reference)}`);
    if (!res.ok) {
      return {
        amount: 2500,
        customer_name: "Valued Customer",
        source_type: "CHECKOUT_ABANDONMENT",
        source_id: reference,
        status: "PENDING",
        merchant_name: "Recoup Store Merchant"
      };
    }
    return res.json();
  }
};
