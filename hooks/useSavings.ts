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
  const [actualSavedToBank, setActualSavedToBank] = useState(0);
  const [earnings, setEarnings] = useState(0);
  const [spent, setSpent] = useState(0);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const db = await getDB();
      const month = getMonthKey();

      // Manual goals
      const items = await db.getAllAsync<SavingsGoal>(
        "SELECT * FROM savings_goals ORDER BY created_at DESC"
      );
      setGoals(items);
      setTotalSaved(items.reduce((sum, g) => sum + g.saved, 0));

      // Actual saved to bank this month (Bank Transfer out from M-PESA)
      const saved = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_out), 0) as total FROM transactions
         WHERE channel = 'Bank Transfer' AND paid_out > 0
         AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      setActualSavedToBank(saved?.total ?? 0);

      // Earnings this month
      const earn = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_in), 0) as total FROM transactions
         WHERE channel IN ('Salary', 'Received', 'Bank Transfer')
         AND paid_in > 0 AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      setEarnings(earn?.total ?? 0);

      // Spent this month
      const sp = await db.getFirstAsync<{ total: number }>(
        `SELECT COALESCE(SUM(paid_out), 0) as total FROM transactions
         WHERE channel IN ('Paybill', 'Buy Goods', 'Send Money', 'Withdrawal', 'Airtime & Data')
         AND paid_out > 0 AND strftime('%Y-%m', date) = ?`,
        [month]
      );
      setSpent(sp?.total ?? 0);
    } catch (e) {
      console.error("Failed to load savings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

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
      await db.runAsync("UPDATE savings_goals SET saved = saved + ? WHERE id = ?", [amount, id]);
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

  return {
    goals, loading, totalSaved, actualSavedToBank,
    earnings, spent, addGoal, updateSaved, deleteGoal, refresh,
  };
}
