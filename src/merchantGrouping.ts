import type { CSVTransaction } from './types';

export interface MerchantGroup {
  merchant: string;
  count: number;
  types: string[];
  amount: number;
  minDate: string;
  maxDate: string;
}

const UNKNOWN_MERCHANT = '(No description)';

export function extractMerchantName(description: string): string {
  const normalized = description.trim().replace(/\s+/g, ' ');
  if (!normalized) return UNKNOWN_MERCHANT;

  const specialIndex = normalized.search(/[^A-Za-z0-9\s]/);
  const beforeSpecial = (specialIndex === -1 ? normalized : normalized.slice(0, specialIndex)).trim();
  if (!beforeSpecial) return UNKNOWN_MERCHANT;

  const twoWords = beforeSpecial.split(/\s+/).slice(0, 2).join(' ');
  return twoWords || UNKNOWN_MERCHANT;
}

export function merchantGroupKey(description: string): string {
  return extractMerchantName(description).toUpperCase();
}

function parseSortableDate(dateStr: string): number | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  return isNaN(parsed.getTime()) ? null : parsed.getTime();
}

export function groupTransactionsByMerchant(transactions: CSVTransaction[]): MerchantGroup[] {
  const groups = new Map<string, {
    merchant: string;
    count: number;
    types: Set<string>;
    amount: number;
    minDate: string;
    maxDate: string;
    minTime: number | null;
    maxTime: number | null;
  }>();

  for (const transaction of transactions) {
    const key = merchantGroupKey(transaction.description);
    const existing = groups.get(key);
    const time = parseSortableDate(transaction.date);

    if (!existing) {
      groups.set(key, {
        merchant: extractMerchantName(transaction.description),
        count: 1,
        types: new Set(transaction.type ? [transaction.type] : []),
        amount: transaction.amount,
        minDate: transaction.date,
        maxDate: transaction.date,
        minTime: time,
        maxTime: time,
      });
      continue;
    }

    existing.count += 1;
    existing.amount += transaction.amount;
    if (transaction.type) {
      existing.types.add(transaction.type);
    }

    if (time !== null && (existing.minTime === null || time < existing.minTime)) {
      existing.minTime = time;
      existing.minDate = transaction.date;
    }
    if (time !== null && (existing.maxTime === null || time > existing.maxTime)) {
      existing.maxTime = time;
      existing.maxDate = transaction.date;
    }
  }

  return Array.from(groups.values())
    .map(group => ({
      merchant: group.merchant,
      count: group.count,
      types: Array.from(group.types).sort(),
      amount: group.amount,
      minDate: group.minDate,
      maxDate: group.maxDate,
    }))
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount) || a.merchant.localeCompare(b.merchant));
}
