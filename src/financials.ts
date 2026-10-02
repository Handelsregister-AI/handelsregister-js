import type {
  FinancialAccountName,
  FinancialAccountNode,
  FinancialAccounts,
} from './types.js';

export function financialAccountName(
  name: FinancialAccountName | string | null | undefined,
  language: 'en' | 'de' = 'en',
): string {
  if (typeof name === 'string') return name;
  return name?.[language] || name?.en || name?.de || name?.in_report || '';
}

/** Normalize older dictionaries locally; API responses remain unchanged. */
export function financialAccountEntries(
  accounts: FinancialAccounts | undefined,
): FinancialAccountNode[] {
  if (Array.isArray(accounts)) return accounts;
  if (!accounts || typeof accounts !== 'object') return [];
  if ('name' in accounts) return [accounts as unknown as FinancialAccountNode];
  return Object.entries(accounts).map(([name, value]) => ({
    name,
    value: typeof value === 'number' || value === null ? value : undefined,
    ...(value && typeof value === 'object' && !Array.isArray(value)
      ? { children: financialAccountEntries(value as Record<string, unknown>) }
      : {}),
  }));
}

/** Depth-first traversal in report order, retaining the original list nodes. */
export function* walkFinancialAccounts(
  accounts: FinancialAccounts | undefined,
): Generator<FinancialAccountNode> {
  for (const account of financialAccountEntries(accounts)) {
    yield account;
    yield* walkFinancialAccounts(account.children);
  }
}
