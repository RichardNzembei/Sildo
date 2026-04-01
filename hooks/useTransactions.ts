import { useState, useEffect, useCallback } from "react";
import { getDB } from "@/lib/db";
import { getMonthKey, type Channel } from "@/constants/categories";

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
  channel: string;
  person: string;
}

export interface MonthlyFlow {
  earnings: number;
  spent: number;
  saved: number;
  mpesaBalance: number;
}

export interface EarningSource {
  label: string;
  amount: number;
}

export interface ChannelSpend {
  channel: string;
  total: number;
  count: number;
}

export interface DebtSummary {
  fulizaTotal: number;
  loopAdvances: number;
  kcbLoans: number;
  totalDebt: number;
}

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [monthlyFlow, setMonthlyFlow] = useState<MonthlyFlow>({
    earnings: 0, spent: 0, saved: 0, mpesaBalance: 0,
  });
  const [earningSources, setEarningSources] = useState<EarningSource[]>([]);
  const [channelSpend, setChannelSpend] = useState<ChannelSpend[]>([]);
  const [debtSummary, setDebtSummary] = useState<DebtSummary>({
    fulizaTotal: 0, loopAdvances: 0, kcbLoans: 0, totalDebt: 0,
  });

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDB();
      const month = getMonthKey();

      const txns = await db.getAllAsync<Transaction>(
        "SELECT * FROM transactions ORDER BY date DESC"
      );
      setTransactions(txns);

      // M-PESA balance
      const mpesa = await db.getFirstAsync<{ balance: number }>(
        "SELECT balance FROM transactions WHERE source = 'MPESA' ORDER BY date DESC LIMIT 1"
      );

      // Earnings this month: Salary + Received + Bank credits coming IN
      const earnings = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE channel IN ('Salary', 'Received', 'Bank Transfer')
         AND paid_in > 0 AND strftime('%Y-%m', date) = ?`,
        [month]
      );

      // Spending this month: all budgetable channels
      const spent = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_out), 0) as total FROM transactions
         WHERE channel IN ('Paybill', 'Buy Goods', 'Send Money', 'Withdrawal', 'Airtime & Data')
         AND paid_out > 0 AND strftime('%Y-%m', date) = ?`,
        [month]
      );

      // Saved this month: money moved INTO bank (KCB_CREDIT from LOOP, or paid_out Bank Transfer to KCB)
      const saved = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_out), 0) as total FROM transactions
         WHERE channel = 'Bank Transfer' AND paid_out > 0
         AND strftime('%Y-%m', date) = ?`,
        [month]
      );

      setMonthlyFlow({
        earnings: earnings?.total ?? 0,
        spent: spent?.total ?? 0,
        saved: saved?.total ?? 0,
        mpesaBalance: mpesa?.balance ?? 0,
      });

      // Earning sources breakdown
      const sources: EarningSource[] = [];
      const loopSalary = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE channel = 'Salary' AND paid_in > 0 AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      if (loopSalary && loopSalary.total > 0)
        sources.push({ label: "Salary (Loop)", amount: loopSalary.total });

      const received = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE channel = 'Received' AND paid_in > 0 AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      if (received && received.total > 0)
        sources.push({ label: "M-PESA Received", amount: received.total });

      const bankIn = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE channel = 'Bank Transfer' AND paid_in > 0 AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      if (bankIn && bankIn.total > 0)
        sources.push({ label: "Bank Credits", amount: bankIn.total });
      setEarningSources(sources);

      // Spending by channel
      const channels = await db.getAllAsync<ChannelSpend>(
        `SELECT channel, SUM(paid_out) as total, COUNT(*) as count
         FROM transactions
         WHERE channel IN ('Paybill', 'Buy Goods', 'Send Money', 'Withdrawal', 'Airtime & Data')
         AND paid_out > 0 AND strftime('%Y-%m', date) = ?
         GROUP BY channel ORDER BY total DESC`,
        [month]
      );
      setChannelSpend(channels);

      // Debt summary
      const fuliza = await db.getFirstAsync<{ total: number }>(
        "SELECT COALESCE(SUM(paid_out), 0) as total FROM transactions WHERE channel = 'Fuliza'"
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
      const fd = fuliza?.total ?? 0;
      const la = Math.max(0, (loopAdv?.received ?? 0) - (loopAdv?.repaid ?? 0));
      const kl = Math.max(0, (kcbLoan?.received ?? 0) - (kcbLoan?.repaid ?? 0));
      setDebtSummary({ fulizaTotal: fd, loopAdvances: la, kcbLoans: kl, totalDebt: fd + la + kl });

    } catch (e) {
      console.error("Failed to load transactions:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const search = useCallback(
    async (query: string, dateFrom?: string, dateTo?: string, channel?: Channel) => {
      const db = await getDB();
      let sql = "SELECT * FROM transactions WHERE 1=1";
      const params: (string | number)[] = [];
      if (query) {
        sql += " AND (details LIKE ? OR person LIKE ?)";
        params.push(`%${query}%`, `%${query}%`);
      }
      if (dateFrom) { sql += " AND date >= ?"; params.push(dateFrom); }
      if (dateTo) { sql += " AND date <= ?"; params.push(dateTo); }
      if (channel) { sql += " AND channel = ?"; params.push(channel); }
      sql += " ORDER BY date DESC";
      setTransactions(await db.getAllAsync<Transaction>(sql, params));
    },
    []
  );

  const exportCSV = useCallback((): string => {
    const header = "Date,Source,Channel,Type,Person,Paid In,Paid Out,Balance,Receipt No\n";
    const rows = transactions
      .map((t) =>
        `${t.date},${t.source ?? "MPESA"},${t.channel ?? ""},${t.type},"${t.person}",${t.paid_in},${t.paid_out},${t.balance},${t.receipt_no}`
      )
      .join("\n");
    return header + rows;
  }, [transactions]);

  return {
    transactions, loading, monthlyFlow, earningSources, channelSpend,
    debtSummary, refresh, search, exportCSV,
  };
}
