import Anthropic from "@anthropic-ai/sdk";
import { getDB } from "./db";
import { formatKES, getMonthKey } from "@/constants/categories";

const SYSTEM_PROMPT = `You are Soldi, a personal finance advisor for Richard, a Kenyan user.
You have access to his full financial picture across three sources:
- M-PESA: daily mobile money transactions (sends, receives, paybill, airtime, Fuliza)
- KCB: bank account credits, debits, and loans
- Loop: salary payments and salary advances

Analyze ALL sources together to give specific, practical advice in simple English.
Be direct, friendly and occasionally humorous. Always reference actual numbers from the data.
Format currency as KES with commas. Keep responses concise but actionable.
When asked about spending, break it down by category with exact amounts.
When discussing debt, consider Fuliza, Loop advances, and KCB loans together.
When discussing income, distinguish between salary (Loop), bank credits (KCB), and M-PESA receipts.`;

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

async function getTransactionContext(): Promise<string> {
  const db = await getDB();
  const threeMonthsAgo = new Date();
  threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

  const transactions = await db.getAllAsync<{
    type: string;
    source: string;
    paid_in: number;
    paid_out: number;
    balance: number;
    date: string;
    category: string;
    person: string;
  }>(
    `SELECT type, source, paid_in, paid_out, balance, date, category, person
     FROM transactions WHERE date >= ? ORDER BY date DESC LIMIT 500`,
    [threeMonthsAgo.toISOString()]
  );

  const currentMonth = getMonthKey();

  const monthlyStats = await db.getFirstAsync<{ income: number; expenses: number }>(
    `SELECT COALESCE(SUM(paid_in), 0) as income, COALESCE(SUM(paid_out), 0) as expenses
     FROM transactions WHERE strftime('%Y-%m', date) = ?`,
    [currentMonth]
  );

  const mpesaBal = await db.getFirstAsync<{ balance: number }>(
    "SELECT balance FROM transactions WHERE source = 'MPESA' ORDER BY date DESC LIMIT 1"
  );
  const kcbBal = await db.getFirstAsync<{ balance: number }>(
    "SELECT balance FROM transactions WHERE source = 'KCB' ORDER BY date DESC LIMIT 1"
  );

  const categoryBreakdown = await db.getAllAsync<{ category: string; total: number }>(
    `SELECT category, SUM(paid_out) as total FROM transactions
     WHERE strftime('%Y-%m', date) = ? AND paid_out > 0
     GROUP BY category ORDER BY total DESC`,
    [currentMonth]
  );

  // Income by source
  const incomeBySource = await db.getAllAsync<{ source: string; type: string; total: number }>(
    `SELECT source, type, SUM(paid_in) as total FROM transactions
     WHERE strftime('%Y-%m', date) = ? AND paid_in > 0
     GROUP BY source, type ORDER BY total DESC`,
    [currentMonth]
  );

  // Debt tracking
  const fulizaDebt = await db.getFirstAsync<{ total: number }>(
    "SELECT COALESCE(SUM(paid_out), 0) as total FROM transactions WHERE type = 'FULIZA'"
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

  let context = `=== RICHARD'S FINANCIAL DATA ===\n`;
  context += `M-PESA Balance: ${formatKES(mpesaBal?.balance ?? 0)}\n`;
  context += `KCB Balance: ${formatKES(kcbBal?.balance ?? 0)}\n`;
  context += `Combined Balance: ${formatKES((mpesaBal?.balance ?? 0) + (kcbBal?.balance ?? 0))}\n`;
  context += `This Month Income: ${formatKES(monthlyStats?.income ?? 0)}\n`;
  context += `This Month Expenses: ${formatKES(monthlyStats?.expenses ?? 0)}\n\n`;

  context += `=== INCOME BY SOURCE (This Month) ===\n`;
  for (const row of incomeBySource) {
    context += `${row.source} (${row.type}): ${formatKES(row.total)}\n`;
  }

  context += `\n=== OUTSTANDING DEBT ===\n`;
  context += `Fuliza: ${formatKES(fulizaDebt?.total ?? 0)}\n`;
  context += `Loop Advances: ${formatKES(Math.max(0, (loopAdv?.received ?? 0) - (loopAdv?.repaid ?? 0)))}\n`;
  context += `KCB Loans: ${formatKES(Math.max(0, (kcbLoan?.received ?? 0) - (kcbLoan?.repaid ?? 0)))}\n`;

  context += `\n=== SPENDING BY CATEGORY (This Month) ===\n`;
  for (const cat of categoryBreakdown) {
    context += `${cat.category}: ${formatKES(cat.total)}\n`;
  }

  context += `\n=== RECENT TRANSACTIONS (Last 3 months, up to 100) ===\n`;
  for (const t of transactions.slice(0, 100)) {
    context += `${t.date} | ${t.source} | ${t.type} | ${t.person || "N/A"} | ${t.category} | In: ${formatKES(t.paid_in)} | Out: ${formatKES(t.paid_out)} | Bal: ${formatKES(t.balance)}\n`;
  }

  return context;
}

export async function sendMessage(
  userMessage: string,
  chatHistory: ChatMessage[]
): Promise<string> {
  const apiKey = process.env.EXPO_PUBLIC_ANTHROPIC_API_KEY;
  if (!apiKey || apiKey === "your_key_here") {
    return "Please set your Anthropic API key in the .env file to use the AI advisor. Set EXPO_PUBLIC_ANTHROPIC_API_KEY to your key.";
  }

  const context = await getTransactionContext();
  const systemPrompt = `${SYSTEM_PROMPT}\n\n${context}`;

  const messages: { role: "user" | "assistant"; content: string }[] =
    chatHistory.slice(-10).map((m) => ({
      role: m.role,
      content: m.content,
    }));
  messages.push({ role: "user", content: userMessage });

  try {
    const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
    const response = await client.messages.create({
      model: "claude-sonnet-4-6-20250514",
      max_tokens: 1024,
      system: systemPrompt,
      messages,
    });

    const textBlock = response.content.find((b) => b.type === "text");
    return textBlock?.text ?? "I could not generate a response. Please try again.";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return `Sorry, I encountered an error: ${msg}. Please check your API key and try again.`;
  }
}

export async function getChatHistory(): Promise<ChatMessage[]> {
  const db = await getDB();
  return db.getAllAsync<ChatMessage>(
    "SELECT * FROM chat_messages ORDER BY created_at ASC"
  );
}

export async function saveChatMessage(
  message: ChatMessage
): Promise<void> {
  const db = await getDB();
  await db.runAsync(
    "INSERT INTO chat_messages (id, role, content, created_at) VALUES (?, ?, ?, ?)",
    [message.id, message.role, message.content, message.created_at]
  );
}

export async function clearChatHistory(): Promise<void> {
  const db = await getDB();
  await db.runAsync("DELETE FROM chat_messages");
}

export const SUGGESTED_QUESTIONS = [
  "How did I spend this month?",
  "Where can I cut costs?",
  "What's my total debt across all sources?",
  "Who am I sending the most money to?",
  "Can I afford to save KES 5,000 this month?",
  "When is my next Loop repayment?",
  "How much Fuliza have I used?",
];
