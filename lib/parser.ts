import * as Crypto from "expo-crypto";
import type { Category } from "@/constants/categories";

export type SmsSourceType = "MPESA" | "KCB" | "LOOP";

export interface ParsedTransaction {
  id: string;
  receipt_no: string;
  type: string;
  source: SmsSourceType;
  details: string;
  paid_in: number;
  paid_out: number;
  balance: number;
  date: string;
  category: Category;
  person: string;
}

// ── Shared helpers ──

function parseKES(text: string): number {
  // matches "KES X", "KES.X", "Ksh X", "KES 1,234.00"
  const match = text.match(/(?:KES|Ksh)\.?\s*([\d,]+\.?\d*)/i);
  if (match) return parseFloat(match[1].replace(/,/g, ""));
  return 0;
}

function extractAmountAfter(text: string, prefix: string): number {
  const pattern = new RegExp(`${prefix}\\s*(?:KES|Ksh)\\.?\\s*([\\d,]+\\.?\\d*)`, "i");
  const match = text.match(pattern);
  if (match) return parseFloat(match[1].replace(/,/g, ""));
  return 0;
}

function convertTo24Hr(timeStr: string): string {
  const match = timeStr.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([APap][Mm])/);
  if (!match) return "00:00:00";
  let hours = parseInt(match[1], 10);
  const minutes = match[2];
  const seconds = match[3] ?? "00";
  const period = match[4].toUpperCase();
  if (period === "PM" && hours !== 12) hours += 12;
  if (period === "AM" && hours === 12) hours = 0;
  return `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
}

function hashId(text: string): string {
  let h = 0;
  for (let i = 0; i < text.length; i++) {
    h = ((h << 5) - h + text.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}

// ── M-PESA parser ──

function extractMpesaBalance(text: string): number {
  const match = text.match(
    /(?:balance|M-PESA balance)\s+(?:is|was)\s+Ksh([\d,]+\.?\d*)/i
  );
  if (match) return parseFloat(match[1].replace(/,/g, ""));
  return 0;
}

function extractMpesaReceiptNo(text: string): string {
  const match = text.match(/([A-Z0-9]{10})/);
  return match?.[1] ?? "";
}

function extractMpesaDate(text: string): string {
  const match = text.match(
    /on\s+(\d{1,2}\/\d{1,2}\/\d{2,4})\s+at\s+(\d{1,2}:\d{2}\s*[APap][Mm])/i
  );
  if (match) {
    const parts = match[1].split("/");
    const day = parts[0].padStart(2, "0");
    const month = parts[1].padStart(2, "0");
    let year = parts[2];
    if (year.length === 2) year = `20${year}`;
    return `${year}-${month}-${day}T${convertTo24Hr(match[2])}`;
  }
  return new Date().toISOString();
}

function extractMpesaPerson(text: string): string {
  const patterns = [
    /sent to\s+(.+?)\s+(?:\d|for)/i,
    /received\s+Ksh[\d,.]+\s+from\s+(.+?)\s+(?:\d|on)/i,
    /paid to\s+(.+?)(?:\.\s|$)/i,
    /bought\s+.+?\s+from\s+(.+?)\s+(?:on|\.)/i,
    /to\s+(.+?)\s+(?:New|on)/i,
  ];
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1].trim().replace(/\s+/g, " ");
  }
  return "";
}

function detectMpesaType(text: string): string {
  const lower = text.toLowerCase();
  if (lower.includes("fuliza")) return "FULIZA";
  if (lower.includes("m-shwari") || (lower.includes("loan") && lower.includes("m-pesa")))
    return "MPESA_LOAN";
  if (lower.includes("airtime")) return "AIRTIME";
  if (lower.includes("bundle")) return "BUNDLE";
  if (lower.includes("sent to")) return "SENT";
  if (lower.includes("received")) return "RECEIVED";
  if (lower.includes("paid to") && lower.includes("paybill")) return "PAYBILL";
  if (lower.includes("paid to") || lower.includes("bought")) return "BUYGOODS";
  if (lower.includes("withdraw")) return "WITHDRAWAL";
  return "SENT";
}

function categorizeMpesa(text: string, type: string): Category {
  const lower = text.toLowerCase();
  if (type === "FULIZA") return "Fuliza";
  if (type === "MPESA_LOAN") return "Loan";
  if (type === "AIRTIME" || type === "BUNDLE") return "Airtime & Data";
  if (lower.includes("safaricom") || lower.includes("airtime") || lower.includes("bundle"))
    return "Airtime & Data";
  if (lower.includes("kplc") || lower.includes("nairobi water")) return "Rent & Utilities";
  if (lower.includes("uber") || lower.includes("bolt") || lower.includes("matatu"))
    return "Transport";
  if (lower.includes("naivas") || lower.includes("quickmart") || lower.includes("carrefour"))
    return "Food & Groceries";
  if (lower.includes("hospital") || lower.includes("pharmacy")) return "Health";
  if (lower.includes("school") || lower.includes("university")) return "Education";
  if (type === "SENT" || type === "RECEIVED") return "Family & Friends";
  if (type === "PAYBILL" || type === "BUYGOODS") return "Shopping";
  return "Other";
}

export function parseMpesaSMS(body: string): ParsedTransaction | null {
  if (!body || body.length < 20) return null;
  const receiptNo = extractMpesaReceiptNo(body);
  if (!receiptNo) return null;

  const type = detectMpesaType(body);
  const balance = extractMpesaBalance(body);
  const date = extractMpesaDate(body);
  const person = extractMpesaPerson(body);

  let paidIn = 0;
  let paidOut = 0;
  if (type === "RECEIVED") {
    paidIn = extractAmountAfter(body, "received") || parseKES(body);
  } else {
    paidOut =
      extractAmountAfter(body, "sent") || extractAmountAfter(body, "paid") ||
      extractAmountAfter(body, "bought") || extractAmountAfter(body, "Give") ||
      extractAmountAfter(body, "Withdraw") || parseKES(body);
  }

  return {
    id: Crypto.randomUUID(),
    receipt_no: receiptNo,
    type,
    source: "MPESA",
    details: body.substring(0, 500),
    paid_in: paidIn,
    paid_out: paidOut,
    balance,
    date,
    category: categorizeMpesa(body, type),
    person,
  };
}

// ── KCB parser ──
// Formats from actual SMS:
// "MBNHE... Completed. Your SEND TO M-PESA request of KES 10.00 from 130****534 to 254****396 - NAME at 2026-03-27 01:55:29 PM..."
// "MBNHE... Confirmed! You have received KES 10.00 from NAME - 130****534 at 2026-03-27 01:55:29 PM via KCB."

function extractKcbDate(text: string): string {
  // "at 2026-03-27 01:55:29 PM"
  const match = text.match(/at\s+(\d{4}-\d{2}-\d{2})\s+(\d{1,2}:\d{2}:\d{2}\s*[APap][Mm])/i);
  if (match) return `${match[1]}T${convertTo24Hr(match[2])}`;
  // "on DD/MM/YYYY at HH:MM PM"
  const match2 = text.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+at\s+(\d{1,2}:\d{2}\s*[APap][Mm])/i);
  if (match2) {
    const day = match2[1].padStart(2, "0");
    const month = match2[2].padStart(2, "0");
    return `${match2[3]}-${month}-${day}T${convertTo24Hr(match2[4])}`;
  }
  return new Date().toISOString();
}

function extractKcbRef(text: string): string {
  // First token is usually the ref: "MBNHE72RMQZ3MWO3"
  const match = text.match(/^([A-Z0-9]{10,})/);
  if (match) return match[1];
  // M-PESA REF
  const mpesaRef = text.match(/M-PESA REF:\s*([A-Z0-9]+)/i);
  if (mpesaRef) return `KCB_${mpesaRef[1]}`;
  return `KCB_${hashId(text)}`;
}

export function parseKcbSMS(body: string): ParsedTransaction | null {
  if (!body || body.length < 20) return null;
  const lower = body.toLowerCase();

  // Skip OTP, PIN errors, and non-transaction messages
  if (lower.includes("activation code") || lower.includes("pin was incorrect") ||
      lower.includes("verification") || lower.includes("otp")) return null;
  // Skip M-PESA forwarded messages (they start with "Ksh X sent to KCB Pay Bill")
  if (lower.startsWith("ksh") && lower.includes("pay bill")) return null;

  let type: string;
  let paidIn = 0;
  let paidOut = 0;
  let category: Category;
  let person = "";

  if (lower.includes("send to m-pesa") && lower.includes("completed")) {
    // "Your SEND TO M-PESA request of KES X from ACCT to PHONE - NAME"
    type = "KCB_DEBIT";
    paidOut = extractAmountAfter(body, "of");
    category = "Banking";
    const nameMatch = body.match(/to\s+\d[\d*]+-\s*(.+?)\s+at/i);
    if (nameMatch) person = nameMatch[1].trim();
  } else if (lower.includes("confirmed") && lower.includes("received")) {
    // "Confirmed! You have received KES X from NAME - ACCT at DATE via KCB"
    type = "KCB_CREDIT";
    paidIn = extractAmountAfter(body, "received");
    category = "Banking";
    const nameMatch = body.match(/from\s+(.+?)\s+-\s+\d/i);
    if (nameMatch) person = nameMatch[1].trim();
  } else if (lower.includes("loan disbursement") || lower.includes("loan of")) {
    type = "KCB_LOAN";
    paidIn = parseKES(body);
    category = "Loan";
    person = "KCB Loan";
  } else if (lower.includes("repayment")) {
    type = "KCB_REPAYMENT";
    paidOut = parseKES(body);
    category = "Loan";
    person = "KCB Loan";
  } else if (lower.includes("credited")) {
    type = "KCB_CREDIT";
    paidIn = parseKES(body);
    category = "Banking";
  } else if (lower.includes("debited")) {
    type = "KCB_DEBIT";
    paidOut = parseKES(body);
    category = "Banking";
  } else {
    return null;
  }

  if (paidIn === 0 && paidOut === 0) return null;

  return {
    id: Crypto.randomUUID(),
    receipt_no: extractKcbRef(body),
    type,
    source: "KCB",
    details: body.substring(0, 500),
    paid_in: paidIn,
    paid_out: paidOut,
    balance: 0,
    date: extractKcbDate(body),
    category,
    person,
  };
}

// ── LOOP parser ──
// Formats from actual SMS:
// "RICHARD, your M-Pesa transfer of KES 58.00 to 254716899396 has been successfully processed. Fee charged is KES.0.00. LOOP Ref NHE7298664YT, M-Pesa Ref UCRD8ANMQQ on 27/03/2026 17:15:18."
// "You have successfully credited your Bank account with KES 50.00 via M-Pesa from 254... on DD/MM/YYYY..."
// "KES.2,500.00 received on M-PESA from NAME-PHONE. LOOP Ref ..., M-Pesa Ref ... on DD/MM/YYYY..."
// "You have successfully sent KES X to PHONE - NAME. Fee:KES.X. LOOP Ref..., M-Pesa Ref... on DD/MM/YYYY..."

function extractLoopDate(text: string): string {
  // "on 27/03/2026 17:15:18" or "on 27/03/2026 HH:MM:SS"
  const match = text.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2}:\d{2})/i);
  if (match) {
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    return `${match[3]}-${month}-${day}T${match[4]}`;
  }
  // "on DD/MM/YYYY HH:MM"
  const match2 = text.match(/on\s+(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}:\d{2})/i);
  if (match2) {
    const day = match2[1].padStart(2, "0");
    const month = match2[2].padStart(2, "0");
    return `${match2[3]}-${month}-${day}T${match2[4]}:00`;
  }
  return new Date().toISOString();
}

function extractLoopRef(text: string): string {
  const match = text.match(/LOOP\s+Ref\s+([A-Z0-9]+)/i);
  if (match) return match[1];
  return `LOOP_${hashId(text)}`;
}

function extractLoopPerson(text: string): string {
  // "to PHONE - NAME" or "from NAME-PHONE"
  const toMatch = text.match(/to\s+\d[\d*]+\s*-\s*(.+?)(?:\.|Fee|$)/i);
  if (toMatch) return toMatch[1].trim();
  const fromMatch = text.match(/from\s+(.+?)-\d[\d*]+/i);
  if (fromMatch) return fromMatch[1].trim();
  const sentTo = text.match(/to\s+(\d{12,})/);
  if (sentTo) return sentTo[1];
  return "";
}

export function parseLoopSMS(body: string): ParsedTransaction | null {
  if (!body || body.length < 20) return null;
  const lower = body.toLowerCase();

  // Skip OTP, verification, device binding
  if (lower.includes("verification code") || lower.includes("activation code") ||
      lower.includes("bound the new device") || lower.includes("has failed")) return null;

  let type: string;
  let paidIn = 0;
  let paidOut = 0;
  let category: Category;

  if (lower.includes("m-pesa transfer") && lower.includes("successfully processed")) {
    // "your M-Pesa transfer of KES X to PHONE has been successfully processed"
    type = "SENT";
    paidOut = extractAmountAfter(body, "of");
    category = "Family & Friends";
  } else if (lower.includes("credited your bank account")) {
    // "You have successfully credited your Bank account with KES X via M-Pesa"
    type = "KCB_CREDIT";
    paidIn = extractAmountAfter(body, "with");
    category = "Banking";
  } else if (lower.includes("received on m-pesa")) {
    // "KES.X received on M-PESA from NAME-PHONE"
    type = "RECEIVED";
    paidIn = parseKES(body);
    category = "Family & Friends";
  } else if (lower.includes("successfully sent")) {
    // "You have successfully sent KES X to PHONE - NAME"
    type = "SENT";
    paidOut = extractAmountAfter(body, "sent");
    category = "Family & Friends";
  } else if (lower.includes("salary")) {
    type = "LOOP_SALARY";
    paidIn = parseKES(body);
    category = "Salary";
  } else if (lower.includes("advance") && lower.includes("approved")) {
    type = "LOOP_ADVANCE";
    paidIn = parseKES(body);
    category = "Loan";
  } else if (lower.includes("repayment")) {
    type = "LOOP_REPAYMENT";
    paidOut = parseKES(body);
    category = "Loan";
  } else {
    return null;
  }

  if (paidIn === 0 && paidOut === 0) return null;

  return {
    id: Crypto.randomUUID(),
    receipt_no: extractLoopRef(body),
    type,
    source: "LOOP",
    details: body.substring(0, 500),
    paid_in: paidIn,
    paid_out: paidOut,
    balance: 0,
    date: extractLoopDate(body),
    category,
    person: extractLoopPerson(body),
  };
}

// ── Unified parser ──

export function parseSMS(body: string, sender: string): ParsedTransaction | null {
  const s = sender.toUpperCase();
  if (s === "MPESA" || s === "M-PESA") return parseMpesaSMS(body);
  if (s.includes("KCB")) return parseKcbSMS(body);
  if (s === "LOOP") return parseLoopSMS(body);
  return null;
}
