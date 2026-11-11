import type { FinancialAccount, FinancialData } from '@/types/financial';

export const getDefaultAccountId = (accounts: FinancialAccount[]) =>
  accounts.find(account => account.isActive && account.isDefault)?.id ?? null;

export const getAccountBalances = (
  data: Pick<FinancialData, 'accounts' | 'income' | 'expenses' | 'savingsTransactions' | 'investmentTransactions' | 'transfers'>,
) => {
  const balances = new Map(data.accounts.map(account => [account.id, Number(account.openingBalance || 0)]));
  const accountsById = new Map(data.accounts.map(account => [account.id, account]));
  const applyTransaction = (accountId: string | null | undefined, amount: number, date: string) => {
    const account = accountId ? accountsById.get(accountId) : undefined;
    if (account && date >= account.openingBalanceDate) {
      balances.set(account.id, (balances.get(account.id) || 0) + amount);
    }
  };

  data.income.forEach(entry => applyTransaction(entry.accountId, Number(entry.amount || 0), entry.date));
  data.expenses.forEach(entry => applyTransaction(entry.accountId, -Number(entry.amount || 0), entry.date));
  data.savingsTransactions.forEach(entry => applyTransaction(entry.account_id, -Number(entry.amount || 0), entry.date));
  data.investmentTransactions.forEach(entry => applyTransaction(entry.account_id, -Number(entry.amount || 0), entry.date));
  data.transfers.forEach(transfer => {
    applyTransaction(transfer.from_account_id, -Number(transfer.amount || 0), transfer.date);
    applyTransaction(transfer.to_account_id, Number(transfer.amount || 0), transfer.date);
  });

  return balances;
};
