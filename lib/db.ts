import * as SQLite from "expo-sqlite";

let db: SQLite.SQLiteDatabase | null = null;

export async function getDB(): Promise<SQLite.SQLiteDatabase> {
  if (db) return db;
  db = await SQLite.openDatabaseAsync("soldi.db");
  await initTables(db);
  return db;
}

async function initTables(database: SQLite.SQLiteDatabase): Promise<void> {
  await database.execAsync(`
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      receipt_no TEXT UNIQUE,
      type TEXT NOT NULL,
      source TEXT DEFAULT 'MPESA',
      details TEXT,
      paid_in REAL DEFAULT 0,
      paid_out REAL DEFAULT 0,
      balance REAL,
      date TEXT NOT NULL,
      category TEXT,
      person TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );`);

  // Migrate: add source column if missing
  try {
    const cols = await database.getAllAsync<{ name: string }>(
      "PRAGMA table_info(transactions)"
    );
    const hasSource = cols.some((c) => c.name === "source");
    if (!hasSource) {
      await database.execAsync(
        "ALTER TABLE transactions ADD COLUMN source TEXT DEFAULT 'MPESA'"
      );
      console.log("[Soldi] Added source column to transactions");
    }
  } catch (e) {
    console.error("[Soldi] Migration error:", e);
  }

  await database.execAsync(`

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      month TEXT NOT NULL,
      spent REAL DEFAULT 0,
      UNIQUE(category, month)
    );

    CREATE TABLE IF NOT EXISTS savings_goals (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      target REAL NOT NULL,
      saved REAL DEFAULT 0,
      deadline TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS people (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT,
      total_sent REAL DEFAULT 0,
      times_sent INTEGER DEFAULT 0,
      monthly_limit REAL,
      UNIQUE(name, phone)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date);
    CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
    CREATE INDEX IF NOT EXISTS idx_transactions_type ON transactions(type);
    CREATE INDEX IF NOT EXISTS idx_transactions_source ON transactions(source);
    CREATE INDEX IF NOT EXISTS idx_budgets_month ON budgets(month);
  `);
}

export async function getSetting(key: string): Promise<string | null> {
  const database = await getDB();
  const row = await database.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = ?",
    [key]
  );
  return row?.value ?? null;
}

export async function setSetting(key: string, value: string): Promise<void> {
  const database = await getDB();
  await database.runAsync(
    "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
    [key, value]
  );
}
