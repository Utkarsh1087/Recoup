export interface MonthOption {
  value: string; // YYYY-MM
  label: string; // e.g., "September 2026"
}

export const getAvailableMonths = (): MonthOption[] => {
  const months: MonthOption[] = [];
  const now = new Date();
  
  // Generate current month + past 11 months
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, "0");
    const value = `${year}-${monthNum}`;
    const label = d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    months.push({ value, label });
  }
  return months;
};

export const getCurrentMonthValue = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const monthNum = String(now.getMonth() + 1).padStart(2, "0");
  return `${year}-${monthNum}`;
};

export const getMonthDateRange = (monthVal: string) => {
  const [year, month] = monthVal.split("-").map(Number);
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
  const lastDay = new Date(year, month, 0).getDate();
  const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
};
