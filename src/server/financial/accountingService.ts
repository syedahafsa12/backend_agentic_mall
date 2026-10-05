// Mock double-entry accounting ledger. Every entry posted here is asserted
// to balance (sum of debits === sum of credits) before it's committed —
// a real invariant, not a display trick. Swap for a real accounting
// provider (QuickBooks/Akaunting/Campfire) by reimplementing postEntry()
// against that API; callers never change.
import { query, queryOne } from "@/server/db/pool";

export interface JournalLine {
  accountName: string;
  debit?: number;
  credit?: number;
}

export interface AccountingEntry {
  id: string;
  entry_number: string;
  entry_date: string;
  reference: string;
  description: string;
  created_at: string;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

async function nextEntryNumber(attempt = 0): Promise<string> {
  const year = new Date().getFullYear();
  const row = await queryOne<{ count: string }>(`select count(*) from demo_accounting_entries`);
  const seq = Number(row?.count ?? 0) + 4821 + attempt; // cosmetic offset so numbers look like an established ledger
  return `JE-${year}-${String(seq).padStart(6, "0")}`;
}

/** Throws if the lines don't balance — callers should never be able to post an unbalanced entry. */
export async function postJournalEntry(input: { reference: string; description: string; lines: JournalLine[] }): Promise<AccountingEntry> {
  const totalDebit = round2(input.lines.reduce((s, l) => s + (l.debit ?? 0), 0));
  const totalCredit = round2(input.lines.reduce((s, l) => s + (l.credit ?? 0), 0));
  if (totalDebit !== totalCredit) {
    throw new Error(`Journal entry does not balance: debits ${totalDebit} !== credits ${totalCredit}`);
  }

  let entry: AccountingEntry | undefined;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      entry = await queryOne<AccountingEntry>(
        `insert into demo_accounting_entries (entry_number, reference, description) values ($1,$2,$3) returning *`,
        [await nextEntryNumber(attempt), input.reference, input.description],
      );
      break;
    } catch (err) {
      const isUniqueViolation = (err as { code?: string }).code === "23505";
      if (!isUniqueViolation || attempt === 4) throw err;
    }
  }
  if (!entry) throw new Error("failed to post journal entry");

  for (const line of input.lines) {
    await query(
      `insert into demo_accounting_lines (entry_id, account_name, debit, credit) values ($1,$2,$3,$4)`,
      [entry.id, line.accountName, line.debit ?? 0, line.credit ?? 0],
    );
  }
  return entry;
}

export async function getJournalEntry(entryId: string) {
  const entry = await queryOne(`select * from demo_accounting_entries where id = $1`, [entryId]);
  if (!entry) return null;
  const lines = await query(`select * from demo_accounting_lines where entry_id = $1 order by created_at`, [entryId]);
  return { entry, lines };
}

export async function listJournalEntries(limit = 50) {
  return query(`select * from demo_accounting_entries order by created_at desc limit $1`, [limit]);
}
