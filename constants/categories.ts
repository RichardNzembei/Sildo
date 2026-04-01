export const CATEGORIES = [
  "Food & Groceries",
  "Transport",
  "Airtime & Data",
  "Rent & Utilities",
  "Shopping",
  "Entertainment",
  "Health",
  "Education",
  "Family & Friends",
  "Business",
  "Savings",
  "Fuliza",
  "Loan",
  "Salary",
  "Banking",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<Category, string> = {
  "Food & Groceries": "cart",
  Transport: "car",
  "Airtime & Data": "phone-portrait",
  "Rent & Utilities": "home",
  Shopping: "bag-handle",
  Entertainment: "film",
  Health: "medkit",
  Education: "school",
  "Family & Friends": "people",
  Business: "briefcase",
  Savings: "wallet",
  Fuliza: "alert-circle",
  Loan: "cash",
  Salary: "trending-up",
  Banking: "business",
  Other: "ellipsis-horizontal",
};

export const CATEGORY_COLORS: Record<Category, string> = {
  "Food & Groceries": "#FF6384",
  Transport: "#36A2EB",
  "Airtime & Data": "#FFCE56",
  "Rent & Utilities": "#4BC0C0",
  Shopping: "#9966FF",
  Entertainment: "#FF9F40",
  Health: "#C9CBCF",
  Education: "#7BC67E",
  "Family & Friends": "#FF6B6B",
  Business: "#4ECDC4",
  Savings: "#00C853",
  Fuliza: "#FF5252",
  Loan: "#FFB300",
  Salary: "#00E676",
  Banking: "#42A5F5",
  Other: "#6B7280",
};

export const TRANSACTION_TYPES = [
  "SENT",
  "RECEIVED",
  "PAYBILL",
  "BUYGOODS",
  "WITHDRAWAL",
  "FULIZA",
  "MPESA_LOAN",
  "AIRTIME",
  "BUNDLE",
  "KCB_CREDIT",
  "KCB_DEBIT",
  "KCB_LOAN",
  "KCB_REPAYMENT",
  "LOOP_SALARY",
  "LOOP_ADVANCE",
  "LOOP_REPAYMENT",
] as const;

export type TransactionType = (typeof TRANSACTION_TYPES)[number];

export const SMS_SOURCES = ["MPESA", "KCB", "KCB-Bank", "LOOP"] as const;
export type SmsSource = (typeof SMS_SOURCES)[number];

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
