import { Platform, PermissionsAndroid } from "react-native";
import { getDB } from "./db";
import { parseSMS, parseMpesaSMS } from "./parser";
import { SMS_SOURCES } from "@/constants/categories";

export async function requestSMSPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const results = await PermissionsAndroid.requestMultiple([
      PermissionsAndroid.PERMISSIONS.READ_SMS,
      PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
    ]);
    return results[PermissionsAndroid.PERMISSIONS.READ_SMS] === PermissionsAndroid.RESULTS.GRANTED;
  } catch (err) {
    console.error("[Soldi] Permission error:", err);
    return false;
  }
}

async function saveTransaction(parsed: NonNullable<ReturnType<typeof parseSMS>>): Promise<boolean> {
  const db = await getDB();
  try {
    const result = await db.runAsync(
      `INSERT OR IGNORE INTO transactions
      (id, receipt_no, type, source, details, paid_in, paid_out, balance, date, category, person)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        parsed.id,
        parsed.receipt_no,
        parsed.type,
        parsed.source,
        parsed.details,
        parsed.paid_in,
        parsed.paid_out,
        parsed.balance,
        parsed.date,
        parsed.category,
        parsed.person,
      ]
    );
    if (result.changes === 0) return false; // duplicate receipt_no

    // Update people table for sends
    if (parsed.person && parsed.paid_out > 0 && parsed.source === "MPESA") {
      await db.runAsync(
        `INSERT INTO people (id, name, phone, total_sent, times_sent)
         VALUES (?, ?, '', ?, 1)
         ON CONFLICT(name, phone) DO UPDATE SET
           total_sent = total_sent + ?,
           times_sent = times_sent + 1`,
        [parsed.id + "_p", parsed.person, parsed.paid_out, parsed.paid_out]
      );
    }

    return true;
  } catch {
    return false; // duplicate
  }
}

export async function readAllSMS(): Promise<Record<string, number>> {
  if (Platform.OS !== "android") return {};

  const results: Record<string, number> = {};

  try {
    const { readSms } = require("../modules/sms-reader");

    for (const sender of SMS_SOURCES) {
      console.log(`[Soldi] Reading SMS from ${sender}...`);
      const messages: { body: string; date: number }[] = await readSms(sender, 5000);
      console.log(`[Soldi] Found ${messages.length} SMS from ${sender}`);

      let imported = 0;
      for (const msg of messages) {
        const parsed = parseSMS(msg.body, sender);
        if (!parsed) continue;
        const saved = await saveTransaction(parsed);
        if (saved) imported++;
      }

      results[sender] = imported;
      console.log(`[Soldi] Imported ${imported} from ${sender}`);
    }
  } catch (err) {
    console.error("[Soldi] SMS read error:", err);
  }

  return results;
}

export async function importFromStatement(csvContent: string): Promise<number> {
  const lines = csvContent.split("\n").filter((l) => l.trim());
  let imported = 0;

  for (let i = 1; i < lines.length; i++) {
    const parsed = parseMpesaSMS(lines[i]);
    if (!parsed) continue;
    const saved = await saveTransaction(parsed);
    if (saved) imported++;
  }

  return imported;
}
