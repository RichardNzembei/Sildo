// ── Spending Channels (deterministic from transaction type) ──

export const CHANNELS = [
  "Paybill",
  "Buy Goods",
  "Send Money",
  "Withdrawal",
  "Airtime & Data",
  "Fuliza",
  "Loan",
  "Loan Repayment",
  "Bank Transfer",
  "Salary",
  "Received",
  "Other",
] as const;

export type Channel = (typeof CHANNELS)[number];

export const BUDGETABLE_CHANNELS = [
  "Paybill",
  "Buy Goods",
  "Send Money",
  "Withdrawal",
  "Airtime & Data",
] as const;

export type BudgetableChannel = (typeof BUDGETABLE_CHANNELS)[number];

export const CHANNEL_FROM_TYPE: Record<string, Channel> = {
  SENT: "Send Money",
  PAYBILL: "Paybill",
  BUYGOODS: "Buy Goods",
  WITHDRAWAL: "Withdrawal",
  AIRTIME: "Airtime & Data",
  BUNDLE: "Airtime & Data",
  FULIZA: "Fuliza",
  MPESA_LOAN: "Loan",
  KCB_DEBIT: "Bank Transfer",
  KCB_CREDIT: "Bank Transfer",
  KCB_LOAN: "Loan",
  KCB_REPAYMENT: "Loan Repayment",
  LOOP_SALARY: "Salary",
  LOOP_ADVANCE: "Loan",
  LOOP_REPAYMENT: "Loan Repayment",
  RECEIVED: "Received",
};

export const CHANNEL_ICONS: Record<Channel, string> = {
  Paybill: "receipt",
  "Buy Goods": "cart",
  "Send Money": "people",
  Withdrawal: "cash",
  "Airtime & Data": "phone-portrait",
  Fuliza: "alert-circle",
  Loan: "trending-down",
  "Loan Repayment": "return-up-back",
  "Bank Transfer": "swap-horizontal",
  Salary: "trending-up",
  Received: "arrow-down-circle",
  Other: "ellipsis-horizontal",
};

export const CHANNEL_COLORS: Record<Channel, string> = {
  Paybill: "#4BC0C0",
  "Buy Goods": "#FF6384",
  "Send Money": "#FF6B6B",
  Withdrawal: "#FFB300",
  "Airtime & Data": "#FFCE56",
  Fuliza: "#FF5252",
  Loan: "#FF5252",
  "Loan Repayment": "#FF9F40",
  "Bank Transfer": "#42A5F5",
  Salary: "#00E676",
  Received: "#00C853",
  Other: "#6B7280",
};

export function channelFromType(type: string): Channel {
  return CHANNEL_FROM_TYPE[type] ?? "Other";
}

// ── Legacy (kept for backward compat with old DB rows) ──

export const CATEGORIES = [
  "Food & Groceries", "Transport", "Airtime & Data", "Rent & Utilities",
  "Shopping", "Entertainment", "Health", "Education", "Family & Friends",
  "Business", "Savings", "Fuliza", "Loan", "Salary", "Banking", "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<string, string> = {
  "Food & Groceries": "cart", Transport: "car", "Airtime & Data": "phone-portrait",
  "Rent & Utilities": "home", Shopping: "bag-handle", Entertainment: "film",
  Health: "medkit", Education: "school", "Family & Friends": "people",
  Business: "briefcase", Savings: "wallet", Fuliza: "alert-circle",
  Loan: "cash", Salary: "trending-up", Banking: "business", Other: "ellipsis-horizontal",
};

// ── Shared ──

export const SMS_SOURCES = ["MPESA", "KCB", "KCB-Bank", "LOOP"] as const;

export function formatKES(amount: number): string {
  return `KES ${Math.abs(amount).toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getMonthKey(date?: Date): string {
  const d = date ?? new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
