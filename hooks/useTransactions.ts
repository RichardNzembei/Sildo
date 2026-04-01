import { useState, useEffect, useCallback } from "react";
import { getDB } from "@/lib/db";
import { getMonthKey } from "@/constants/categories";
import type { Category } from "@/constants/categories";

export interface Transaction {
  id: string;
  receipt_no: string;
  type: string;
  source: string;
  details: string;
  paid_in: number;
  paid_out: number;
  balance: number;
  date: string;
  category: string;
  person: string;
}

export interface MonthlyStats {
  income: number;
  expenses: number;
  mpesaBalance: number;
  kcbBalance: number;
  fulizaCount: number;
  fulizaTotal: number;
}

export interface IncomeBreakdown {
  mpesaReceived: number;
  kcbCredits: number;
  loopSalary: number;
}

export interface DebtSummary {
  fulizaTotal: number;
  loopAdvances: number;
  kcbLoans: number;
  totalDebt: number;
}

export interface CategorySpend {
  category: string;
  total: number;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats>({
    income: 0, expenses: 0, mpesaBalance: 0, kcbBalance: 0,
    fulizaCount: 0, fulizaTotal: 0,
  });
  const [incomeBreakdown, setIncomeBreakdown] = useState<IncomeBreakdown>({
    mpesaReceived: 0, kcbCredits: 0, loopSalary: 0,
  });
  const [debtSummary, setDebtSummary] = useState<DebtSummary>({
    fulizaTotal: 0, loopAdvances: 0, kcbLoans: 0, totalDebt: 0,
  });
  const [categorySpend, setCategorySpend] = useState<CategorySpend[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDB();
      const month = getMonthKey();

      const txns = await db.getAllAsync<Transaction>(
        "SELECT * FROM transactions ORDER BY date DESC"
      );
      setTransactions(txns);

      // Monthly totals
      const stats = await db.getFirstAsync<{ income: number; expenses: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as income, COALESCE(SUM(paid_out), 0) as expenses
         FROM transactions WHERE strftime('%Y-%m', date) = ?`,
        [month]
      );

      // M-PESA balance (latest MPESA transaction)
      const mpesa = await db.getFirstAsync<{ balance: number }>(
        "SELECT balance FROM transactions WHERE source = 'MPESA' ORDER BY date DESC LIMIT 1"
      );

      // KCB balance (latest KCB transaction)
      const kcb = await db.getFirstAsync<{ balance: number }>(
        "SELECT balance FROM transactions WHERE source = 'KCB' ORDER BY date DESC LIMIT 1"
      );

      // Fuliza this month
      const fuliza = await db.getFirstAsync<{ count: number; total: number }>(
        `SELECT COUNT(*) as count, COALESCE(SUM(paid_out), 0) as total
         FROM transactions WHERE type = 'FULIZA' AND strftime('%Y-%m', date) = ?`,
        [month]
      );

      setMonthlyStats({
        income: stats?.income ?? 0,
        expenses: stats?.expenses ?? 0,
        mpesaBalance: mpesa?.balance ?? 0,
        kcbBalance: kcb?.balance ?? 0,
        fulizaCount: fuliza?.count ?? 0,
        fulizaTotal: fuliza?.total ?? 0,
      });

      // Income breakdown this month
      const mpesaIncome = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE source = 'MPESA' AND type = 'RECEIVED' AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      const kcbIncome = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE type = 'KCB_CREDIT' AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      const loopIncome = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE type = 'LOOP_SALARY' AND strftime('%Y-%m', date) = ?`,
        [month]
      );

      setIncomeBreakdown({
        mpesaReceived: mpesaIncome?.total ?? 0,
        kcbCredits: kcbIncome?.total ?? 0,
        loopSalary: loopIncome?.total ?? 0,
      });

      // Debt summary — outstanding amounts (loans received minus repayments)
      const fulizaDebt = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_out), 0) as total FROM transactions WHERE type = 'FULIZA'`
      );
      const loopAdv = await db.getFirstAsync<{ received: number; repaid: number }>(
        `SELECT
          COALESCE((SELECT SUM(paid_in) FROM transactions WHERE type = 'LOOP_ADVANCE'), 0) as received,
          COALESCE((SELECT SUM(paid_out) FROM transactions WHERE type = 'LOOP_REPAYMENT'), 0) as repaid`
      );
      const kcbLoan = await db.getFirstAsync<{ received: number; repaid: number }>(
        `SELECT
          COALESCE((SELECT SUM(paid_in) FROM transactions WHERE type = 'KCB_LOAN'), 0) as received,
          COALESCE((SELECT SUM(paid_out) FROM transactions WHERE type = 'KCB_REPAYMENT'), 0) as repaid`
      );

      const fd = fulizaDebt?.total ?? 0;
      const la = Math.max(0, (loopAdv?.received ?? 0) - (loopAdv?.repaid ?? 0));
      const kl = Math.max(0, (kcbLoan?.received ?? 0) - (kcbLoan?.repaid ?? 0));

      setDebtSummary({
        fulizaTotal: fd,
        loopAdvances: la,
        kcbLoans: kl,
        totalDebt: fd + la + kl,
      });

      // Category spending
      const cats = await db.getAllAsync<CategorySpend>(
        `SELECT category, SUM(paid_out) as total FROM transactions
         WHERE strftime('%Y-%m', date) = ? AND paid_out > 0
         GROUP BY category ORDER BY total DESC`,
        [month]
      );
      setCategorySpend(cats);
    } catch (e) {
      console.error("Failed to load transactions:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const search = useCallback(
    async (query: string, dateFrom?: string, dateTo?: string, category?: Category) => {
      const db = await getDB();
      let sql = "SELECT * FROM transactions WHERE 1=1";
      const params: (string | number)[] = [];
      if (query) {
        sql += " AND (details LIKE ? OR person LIKE ?)";
        params.push(`%${query}%`, `%${query}%`);
      }
      if (dateFrom) { sql += " AND date >= ?"; params.push(dateFrom); }
      if (dateTo) { sql += " AND date <= ?"; params.push(dateTo); }
      if (category) { sql += " AND category = ?"; params.push(category); }
      sql += " ORDER BY date DESC";
      const results = await db.getAllAsync<Transaction>(sql, params);
      setTransactions(results);
    },
    []
  );

  const exportCSV = useCallback((): string => {
    const header = "Date,Source,Type,Person,Category,Paid In,Paid Out,Balance,Receipt No\n";
    const rows = transactions
      .map(
        (t) =>
          `${t.date},${t.source ?? "MPESA"},${t.type},"${t.person}",${t.category},${t.paid_in},${t.paid_out},${t.balance},${t.receipt_no}`
      )
      .join("\n");
    return header + rows;
  }, [transactions]);

  return {
    transactions, loading, monthlyStats, incomeBreakdown, debtSummary,
    categorySpend, refresh, search, exportCSV,
  };
}
