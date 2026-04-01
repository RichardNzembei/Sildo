import { useState, useEffect, useCallback } from "react";
import * as Crypto from "expo-crypto";
import { getDB } from "@/lib/db";
import { getMonthKey } from "@/constants/categories";

export interface SavingsGoal {
  id: string;
  name: string;
  target: number;
  saved: number;
  deadline: string;
  created_at: string;
}

export function useSavings() {
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSaved, setTotalSaved] = useState(0);
  const [suggestedAmount, setSuggestedAmount] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDB();

      const items = await db.getAllAsync<SavingsGoal>(
        "SELECT * FROM savings_goals ORDER BY created_at DESC"
      );
      setGoals(items);
      setTotalSaved(items.reduce((sum, g) => sum + g.saved, 0));

      // Calculate suggested savings from income - expenses
      const month = getMonthKey();
      const stats = await db.getFirstAsync<{
        income: number;
        expenses: number;
      }>(
        `SELECT
          COALESCE(SUM(paid_in), 0) as income,
          COALESCE(SUM(paid_out), 0) as expenses
         FROM transactions
         WHERE strftime('%Y-%m', date) = ?`,
        [month]
      );
      const surplus = (stats?.income ?? 0) - (stats?.expenses ?? 0);
      setSuggestedAmount(Math.max(0, Math.round(surplus * 0.2))); // suggest saving 20% of surplus
    } catch (e) {
      console.error("Failed to load savings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const addGoal = useCallback(
    async (name: string, target: number, deadline: string) => {
      const db = await getDB();
      await db.runAsync(
        "INSERT INTO savings_goals (id, name, target, saved, deadline) VALUES (?, ?, ?, 0, ?)",
        [Crypto.randomUUID(), name, target, deadline]
      );
      await refresh();
    },
    [refresh]
  );

  const updateSaved = useCallback(
    async (id: string, amount: number) => {
      const db = await getDB();
      await db.runAsync(
        "UPDATE savings_goals SET saved = saved + ? WHERE id = ?",
        [amount, id]
      );
      await refresh();
    },
    [refresh]
  );

  const deleteGoal = useCallback(
    async (id: string) => {
      const db = await getDB();
      await db.runAsync("DELETE FROM savings_goals WHERE id = ?", [id]);
      await refresh();
    },
    [refresh]
  );

  return { goals, loading, totalSaved, suggestedAmount, addGoal, updateSaved, deleteGoal, refresh };
}
