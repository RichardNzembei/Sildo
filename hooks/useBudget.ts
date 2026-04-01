import { useState, useEffect, useCallback } from "react";
import * as Crypto from "expo-crypto";
import { getDB } from "@/lib/db";
import { getMonthKey } from "@/constants/categories";
import type { Category } from "@/constants/categories";

export interface Budget {
  id: string;
  category: string;
  amount: number;
  month: string;
  spent: number;
}

export function useBudget() {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBudgeted, setTotalBudgeted] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDB();
      const month = getMonthKey();

      // Get budgets and actual spending
      const items = await db.getAllAsync<Budget>(
        `SELECT b.id, b.category, b.amount, b.month,
                COALESCE((
                  SELECT SUM(t.paid_out)
                  FROM transactions t
                  WHERE t.category = b.category
                  AND strftime('%Y-%m', t.date) = b.month
                ), 0) as spent
         FROM budgets b
         WHERE b.month = ?
         ORDER BY b.category`,
        [month]
      );

      setBudgets(items);
      setTotalBudgeted(items.reduce((sum, b) => sum + b.amount, 0));
      setTotalSpent(items.reduce((sum, b) => sum + b.spent, 0));
    } catch (e) {
      console.error("Failed to load budgets:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addBudget = useCallback(
    async (category: Category, amount: number) => {
      const db = await getDB();
      const month = getMonthKey();
      await db.runAsync(
        `INSERT INTO budgets (id, category, amount, month)
         VALUES (?, ?, ?, ?)
         ON CONFLICT(category, month) DO UPDATE SET amount = ?`,
        [Crypto.randomUUID(), category, amount, month, amount]
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

  return { budgets, loading, totalBudgeted, totalSpent, addBudget, deleteBudget, refresh };
}
