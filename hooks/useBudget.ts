import { useState, useEffect, useCallback } from "react";
import * as Crypto from "expo-crypto";
import { getDB } from "@/lib/db";
import { getMonthKey, type BudgetableChannel } from "@/constants/categories";

export interface Budget {
  id: string;
  channel: string;
  amount: number;
  month: string;
  spent: number;
}

export function useBudget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBudgeted, setTotalBudgeted] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);
  const [earnings, setEarnings] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDB();
      const month = getMonthKey();

      const items = await db.getAllAsync<Budget>(
        `SELECT b.id, b.channel, b.amount, b.month,
                COALESCE((
                  SELECT SUM(t.paid_out)
                  FROM transactions t
                  WHERE t.channel = b.channel
                  AND strftime('%Y-%m', t.date) = b.month
                  AND t.paid_out > 0
                ), 0) as spent
         FROM budgets b
         WHERE b.month = ? AND b.channel IS NOT NULL
         ORDER BY b.channel`,
        [month]
      );

      setBudgets(items);
      setTotalBudgeted(items.reduce((s, b) => s + b.amount, 0));
      setTotalSpent(items.reduce((s, b) => s + b.spent, 0));

      // Get earnings for surplus calc
      const earn = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE channel IN ('Salary', 'Received', 'Bank Transfer')
         AND paid_in > 0 AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      setEarnings(earn?.total ?? 0);
    } catch (e) {
      console.error("Failed to load budgets:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const addBudget = useCallback(
    async (channel: BudgetableChannel, amount: number) => {
      const db = await getDB();
      const month = getMonthKey();
      await db.runAsync(
        `INSERT INTO budgets (id, channel, category, amount, month)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(category, month) DO UPDATE SET amount = ?, channel = ?`,
        [Crypto.randomUUID(), channel, channel, amount, month, amount, channel]
      );
      await refresh();
    },
    [refresh]
  );

  const deleteBudget = useCallback(
    async (id: string) => {
      const db = await getDB();
      await db.runAsync("DELETE FROM budgets WHERE id = ?", [id]);
      await refresh();
    },
    [refresh]
  );

  const surplus = earnings - totalBudgeted;

  return { budgets, loading, totalBudgeted, totalSpent, earnings, surplus, addBudget, deleteBudget, refresh };
}
