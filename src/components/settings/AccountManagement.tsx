import { useMemo, useState } from 'react';
import { ArrowDownUp, Building2, Pencil, Plus, Star, Trash2, Wallet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useFinancial } from '@/contexts/FinancialContext';
import { AccountPicker } from '@/components/forms/AccountPicker';
import { getAccountBalances } from '@/lib/financialAccounts';
import type { FinancialAccount, FinancialAccountType } from '@/types/financial';

const banks = [
  'State Bank of India', 'HDFC Bank', 'ICICI Bank', 'Punjab National Bank', 'Bank of Baroda',
  'Canara Bank', 'Union Bank of India', 'Axis Bank', 'Kotak Mahindra Bank', 'IndusInd Bank',
  'IDFC FIRST Bank', 'Yes Bank', 'Federal Bank', 'Bank of India', 'Central Bank of India',
  'Indian Bank', 'UCO Bank', 'Indian Overseas Bank', 'Bank of Maharashtra', 'IDBI Bank',
  'AU Small Finance Bank', 'Bandhan Bank', 'RBL Bank', 'Karnataka Bank', 'South Indian Bank',
  'City Union Bank', 'DBS Bank India', 'HSBC India', 'Standard Chartered India',
];

const accountTypes: Array<{ value: FinancialAccountType; label: string }> = [
  { value: 'savings', label: 'Savings account' },
  { value: 'current', label: 'Current account' },
  { value: 'salary', label: 'Salary account' },
  { value: 'cash', label: 'Cash' },
  { value: 'wallet', label: 'Wallet' },
  { value: 'other', label: 'Other' },
];

const currency = (amount: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 2,
}).format(amount);

const today = () => {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

const emptyAccount = (): Omit<FinancialAccount, 'id'> => ({
  name: '',
  bankName: '',
  accountType: 'savings',
  branchName: '',
  ifscCode: '',
  lastFour: '',
  openingBalance: 0,
  openingBalanceDate: today(),
  isActive: true,
  isDefault: false,
});

export const AccountManagement = () => {
  const { data, isLoading, accountFeaturesAvailable, addAccount, updateAccount, setDefaultAccount, addAccountTransfer, deleteAccountTransfer } = useFinancial();
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [account, setAccount] = useState<Omit<FinancialAccount, 'id'>>(emptyAccount());
  const [bankChoice, setBankChoice] = useState('');
  const [otherBank, setOtherBank] = useState('');
  const [fromAccountId, setFromAccountId] = useState<string | null>(null);
  const [toAccountId, setToAccountId] = useState<string | null>(null);
  const [transferGoalId, setTransferGoalId] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferDate, setTransferDate] = useState(today());
  const [transferNotes, setTransferNotes] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const balances = useMemo(() => getAccountBalances(data), [data]);

  const beginAdd = () => {
    setEditingId(null);
    setAccount(emptyAccount());
    setBankChoice('');
    setOtherBank('');
    setDialogOpen(true);
  };

  const beginEdit = (selected: FinancialAccount) => {
    setEditingId(selected.id);
    setAccount({
      name: selected.name,
      bankName: selected.bankName,
      accountType: selected.accountType,
      branchName: selected.branchName || '',
      ifscCode: selected.ifscCode || '',
      lastFour: selected.lastFour || '',
      openingBalance: selected.openingBalance,
      openingBalanceDate: selected.openingBalanceDate,
      isActive: selected.isActive,
      isDefault: selected.isDefault,
    });
    const knownBank = banks.includes(selected.bankName);
    setBankChoice(knownBank ? selected.bankName : 'Other');
    setOtherBank(knownBank ? '' : selected.bankName);
    setDialogOpen(true);
  };

  const saveAccount = async () => {
    const bankName = bankChoice === 'Other' ? otherBank.trim() : bankChoice;
    const lastFour = account.lastFour?.trim() || '';
    const ifscCode = account.ifscCode?.trim().toUpperCase() || '';
    if (!account.name.trim() || !bankName) {
      toast({ title: 'Account name and bank are required', variant: 'destructive' });
      return;
    }
    if (lastFour && !/^\d{4}$/.test(lastFour)) {
      toast({ title: 'Enter only the last four account digits', variant: 'destructive' });
      return;
    }
    if (ifscCode && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) {
      toast({ title: 'Enter a valid-format IFSC code or leave it blank', variant: 'destructive' });
      return;
    }
    if (!Number.isFinite(account.openingBalance) || !account.openingBalanceDate || account.openingBalanceDate > today()) {
      toast({ title: 'Enter a valid opening balance and date', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      const savedAccount = {
        ...account,
        name: account.name.trim(),
        bankName,
        lastFour,
        ifscCode,
        isDefault: editingId
          ? account.isDefault
          : account.isActive && (account.isDefault || !data.accounts.some(item => item.isDefault && item.isActive)),
      };
      if (editingId) await updateAccount(editingId, savedAccount);
      else await addAccount(savedAccount);
      if (editingId && account.isDefault && !account.isActive) {
        const replacement = data.accounts.find(item => item.id !== editingId && item.isActive);
        await setDefaultAccount(replacement?.id ?? null);
      }
      setDialogOpen(false);
      toast({ title: editingId ? 'Account updated' : 'Account added' });
    } catch (error) {
      toast({
        title: 'Could not save account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const saveTransfer = async () => {
    const amount = Number(transferAmount);
    if (!fromAccountId || !toAccountId || fromAccountId === toAccountId || !activeAccounts.some(item => item.id === fromAccountId) || !activeAccounts.some(item => item.id === toAccountId) || !Number.isFinite(amount) || amount <= 0 || !transferDate || transferDate > today()) {
      toast({ title: 'Choose two different accounts and enter a valid transfer amount', variant: 'destructive' });
      return;
    }
    setIsSaving(true);
    try {
      await addAccountTransfer({
        from_account_id: fromAccountId,
        to_account_id: toAccountId,
        savings_goal_id: transferGoalId || null,
        amount,
        date: transferDate,
        notes: transferNotes.trim(),
      });
      setTransferOpen(false);
      setTransferAmount('');
      setTransferNotes('');
      setTransferDate(today());
      setTransferGoalId('');
      toast({ title: 'Transfer recorded', description: 'Account balances updated; this was not counted as income or an expense.' });
    } catch (error) {
      toast({
        title: 'Could not record transfer',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const activeAccounts = data.accounts.filter(item => item.isActive);
  const accountLabel = (id: string) => {
    const item = data.accounts.find(accountItem => accountItem.id === id);
    return item ? `${item.name} · ${item.bankName}` : 'Archived account';
  };

  const handleSetDefault = async (id: string) => {
    try {
      await setDefaultAccount(id);
      toast({ title: 'Default account updated', description: 'New transactions will use this account by default.' });
    } catch (error) {
      toast({
        title: 'Could not set default account',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <Card className="bg-gradient-card border-border shadow-card">
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2 text-lg font-semibold">
            <Building2 className="h-5 w-5" /> Accounts
          </CardTitle>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTransferOpen(true)} disabled={isLoading || !accountFeaturesAvailable || activeAccounts.length < 2}>
              <ArrowDownUp className="mr-1 h-4 w-4" /> Transfer
            </Button>
            <Button size="sm" onClick={beginAdd} disabled={isLoading || !accountFeaturesAvailable}>
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Add accounts from an Indian bank, cash, or wallet. Mark one as default to preselect it for new transactions; you can choose a different account each time. IFSC and branch are optional; branch details are entered manually. This is for tracking only and does not connect to your bank or initiate payments. Never enter a full account number.
          </p>
          {!isLoading && !accountFeaturesAvailable ? (
            <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-muted-foreground">Apply the latest Supabase database migration to enable account management. Your existing financial records are still available.</p>
          ) : isLoading ? (
            <p className="py-5 text-center text-sm text-muted-foreground">Loading accounts…</p>
          ) : data.accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-5 text-center">
              <Wallet className="mx-auto mb-2 h-6 w-6 text-muted-foreground" />
              <p className="text-sm font-medium">No accounts added yet</p>
              <p className="mt-1 text-xs text-muted-foreground">Existing transactions remain available and can stay unassigned.</p>
            </div>
          ) : (
            <div className="divide-y divide-border rounded-lg border border-border">
              {data.accounts.map(item => (
                <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-2 truncate font-medium">
                      <span className="truncate">{item.name}{item.lastFour ? ` · ••${item.lastFour}` : ''}</span>
                      {item.isDefault && <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">Default</span>}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">{item.bankName} · {accountTypes.find(type => type.value === item.accountType)?.label}{item.branchName ? ` · ${item.branchName}` : ''}{!item.isActive ? ' · Archived' : ''}</p>
                    <p className="mt-1 text-sm font-semibold">Tracked balance: {currency(balances.get(item.id) || 0)}</p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    {!item.isDefault && item.isActive && (
                      <Button variant="ghost" size="icon" aria-label={`Set ${item.name} as default`} onClick={() => { void handleSetDefault(item.id); }}>
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" aria-label={`Edit ${item.name}`} onClick={() => beginEdit(item)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {data.transfers.length > 0 && (
            <div className="pt-2">
              <h3 className="mb-2 text-sm font-semibold">Recent transfers</h3>
              <div className="space-y-2">
                {data.transfers.slice(0, 5).map(transfer => (
                  <div key={transfer.id} className="flex items-center justify-between gap-2 rounded-md bg-muted/50 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <p className="truncate">{accountLabel(transfer.from_account_id)} → {accountLabel(transfer.to_account_id)}</p>
                      <p className="text-muted-foreground">{transfer.date}{transfer.notes ? ` · ${transfer.notes}` : ''}</p>
                      {transfer.savings_goal_id && <p className="text-muted-foreground">Savings goal: {data.savings.find(goal => goal.id === transfer.savings_goal_id)?.name || 'Archived goal'}</p>}
                    </div>
                    <span className="shrink-0 font-medium">{currency(Number(transfer.amount))}</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Delete transfer" onClick={async () => {
                      if (!window.confirm('Delete this transfer? Both account balances will be recalculated.')) return;
                      try {
                        await deleteAccountTransfer(transfer.id);
                        toast({ title: 'Transfer deleted' });
                      } catch (error) {
                        toast({ title: 'Could not delete transfer', description: error instanceof Error ? error.message : 'Please try again.', variant: 'destructive' });
                      }
                    }}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Edit account' : 'Add account'}</DialogTitle>
            <DialogDescription>Use a nickname to tell multiple accounts at the same bank apart.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="account-name">Account nickname</Label>
              <Input id="account-name" maxLength={60} placeholder="e.g. Salary account" value={account.name} onChange={event => setAccount({ ...account, name: event.target.value })} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-bank">Bank or provider</Label>
              <select id="account-bank" value={bankChoice} onChange={event => {
                setBankChoice(event.target.value);
                if (event.target.value !== 'Other') setAccount({
                  ...account,
                  bankName: event.target.value,
                  ...(event.target.value === 'Cash' ? { accountType: 'cash' as const } : {}),
                });
              }} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">Select a bank or provider</option>
                {banks.map(bank => <option key={bank} value={bank}>{bank}</option>)}
                <option value="Cash">Cash</option>
                <option value="Other">Other / enter manually</option>
              </select>
              {bankChoice === 'Other' && <Input maxLength={80} aria-label="Bank or provider name" placeholder="Enter bank or provider" value={otherBank} onChange={event => setOtherBank(event.target.value)} />}
            </div>
            <div className="space-y-2">
              <Label htmlFor="account-type">Account type</Label>
              <select id="account-type" value={account.accountType} onChange={event => setAccount({ ...account, accountType: event.target.value as FinancialAccountType })} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                {accountTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-branch">Branch (optional)</Label>
                <Input id="account-branch" maxLength={80} value={account.branchName || ''} onChange={event => setAccount({ ...account, branchName: event.target.value })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-ifsc">IFSC (optional)</Label>
                <Input id="account-ifsc" maxLength={11} autoCapitalize="characters" placeholder="e.g. SBIN0000001" value={account.ifscCode || ''} onChange={event => setAccount({ ...account, ifscCode: event.target.value.toUpperCase() })} />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="account-last-four">Last four digits (optional)</Label>
                <Input id="account-last-four" inputMode="numeric" maxLength={4} value={account.lastFour || ''} onChange={event => setAccount({ ...account, lastFour: event.target.value.replace(/\D/g, '').slice(0, 4) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-opening-balance">Opening balance (₹)</Label>
                <Input id="account-opening-balance" type="number" step="0.01" value={account.openingBalance} onChange={event => setAccount({ ...account, openingBalance: Number(event.target.value) })} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="account-opening-date">Balance as of</Label>
                <Input id="account-opening-date" type="date" max={today()} value={account.openingBalanceDate} onChange={event => setAccount({ ...account, openingBalanceDate: event.target.value })} />
              </div>
            </div>
            <p className="text-xs text-muted-foreground">The tracked balance starts with this amount on the selected date. Transactions before that date are excluded.</p>
            {editingId && (
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={account.isActive} onChange={event => setAccount({ ...account, isActive: event.target.checked })} />
                Available for new transactions
              </label>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveAccount()} disabled={isSaving}>{isSaving ? 'Saving…' : 'Save account'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={transferOpen} onOpenChange={setTransferOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Transfer between accounts</DialogTitle>
            <DialogDescription>Record a transfer between your accounts. It updates tracked balances, is excluded from income and expenses, and does not initiate a real bank payment.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <AccountPicker id="transfer-from" label="From account" accounts={activeAccounts} value={fromAccountId} onChange={setFromAccountId} />
            <AccountPicker id="transfer-to" label="To account" accounts={activeAccounts} value={toAccountId} onChange={setToAccountId} />
            <div className="space-y-2">
              <Label htmlFor="transfer-savings-goal">Link to savings goal (optional)</Label>
              <select id="transfer-savings-goal" value={transferGoalId} onChange={event => setTransferGoalId(event.target.value)} className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">No savings goal</option>
                {data.savings.filter(goal => (goal.status ?? 'active') === 'active').map(goal => <option key={goal.id} value={goal.id}>{goal.name}</option>)}
              </select>
              <p className="text-xs text-muted-foreground">Linking the transfer records goal progress without counting the transfer as an expense.</p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-amount">Amount (₹)</Label>
              <Input id="transfer-amount" type="number" min="0.01" step="0.01" value={transferAmount} onChange={event => setTransferAmount(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-date">Date</Label>
              <Input id="transfer-date" type="date" max={today()} value={transferDate} onChange={event => setTransferDate(event.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="transfer-notes">Note (optional)</Label>
              <Input id="transfer-notes" maxLength={240} value={transferNotes} onChange={event => setTransferNotes(event.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferOpen(false)}>Cancel</Button>
            <Button onClick={() => void saveTransfer()} disabled={isSaving}>Record transfer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
