import { FinancialAccount } from '@/types/financial';

interface AccountPickerProps {
  accounts: FinancialAccount[];
  value?: string | null;
  onChange: (value: string | null) => void;
  id: string;
  label?: string;
}

export const AccountPicker = ({ accounts, value, onChange, id, label = 'Account (optional)' }: AccountPickerProps) => {
  if (accounts.length === 0) return null;

  const availableAccounts = accounts.filter(account => account.isActive || account.id === value);
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-medium leading-none">{label}</label>
      <select
        id={id}
        value={value || 'none'}
        onChange={event => onChange(event.target.value === 'none' ? null : event.target.value)}
        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <option value="none">Not specified</option>
        {availableAccounts.map(account => (
          <option key={account.id} value={account.id}>
            {account.name} · {account.bankName}{account.lastFour ? ` · ••${account.lastFour}` : ''}{account.isDefault ? ' (default)' : ''}{!account.isActive ? ' (archived)' : ''}
          </option>
        ))}
      </select>
    </div>
  );
};
