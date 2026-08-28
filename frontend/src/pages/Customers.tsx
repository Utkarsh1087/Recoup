import React, { useEffect, useState } from "react";

interface Customer {
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

export const Customers: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await fetch("http://localhost:8000/api/recovery-cases");
        const cases = await res.json();
        
        const customerMap: Record<number, Customer> = {};
        cases.forEach((c: any) => {
          if (c.customer && !customerMap[c.customer.id]) {
            customerMap[c.customer.id] = c.customer;
          }
        });
        
        setCustomers(Object.values(customerMap));
      } catch (e) {
        console.error("Error loading customers", e);
      } finally {
        setLoading(false);
      }
    };
    fetchCustomers();
  }, []);

  return (
    <div className="p-8 space-y-6 bg-slate-50/50 min-h-screen text-slate-800">
      <div className="border-b border-slate-200 pb-4">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer Directory</h2>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="p-16 flex justify-center items-center">
            <div className="w-8 h-8 border-3 border-sky-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-slate-50/50">
                  <th className="py-4 px-6">ID</th>
                  <th className="py-4 px-6">Name</th>
                  <th className="py-4 px-6">Email</th>
                  <th className="py-4 px-6">Phone</th>
                  <th className="py-4 px-6">Lifetime Value</th>
                  <th className="py-4 px-6 text-center">Orders Successful</th>
                  <th className="py-4 px-6 text-center">Failed Payments</th>
                  <th className="py-4 px-6 text-center">Subscription</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 px-6 text-center text-slate-400 text-xs">
                      No customer records found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => (
                    <tr key={c.id} className="border-b border-slate-100 hover:bg-slate-50/20 transition-colors text-xs text-slate-600">
                      <td className="py-4 px-6 font-mono font-semibold text-slate-400">#CUST-{c.id}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">{c.name}</td>
                      <td className="py-4 px-6 text-slate-600 font-mono">{c.email}</td>
                      <td className="py-4 px-6 text-slate-400 font-mono">{c.phone || "N/A"}</td>
                      <td className="py-4 px-6 font-bold text-slate-900">₹{c.lifetime_value.toLocaleString("en-IN")}</td>
                      <td className="py-4 px-6 text-center text-slate-800">{c.successful_orders} / {c.total_orders}</td>
                      <td className="py-4 px-6 text-center text-rose-600 font-bold">{c.failed_payments}</td>
                      <td className="py-4 px-6 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase ${
                          c.subscription_status === "ACTIVE" 
                            ? "bg-emerald-50 text-emerald-600 border border-emerald-100" 
                            : c.subscription_status === "PAST_DUE"
                            ? "bg-amber-50 text-amber-600 border border-amber-100"
                            : c.subscription_status === "CANCELLED"
                            ? "bg-rose-50 text-rose-600 border border-rose-100"
                            : "bg-slate-100 text-slate-400 border border-slate-200"
                        }`}>
                          {c.subscription_status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
export default Customers;
