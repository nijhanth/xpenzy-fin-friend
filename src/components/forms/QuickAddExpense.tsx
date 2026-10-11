import { useEffect, useMemo, useState } from 'react';
import { Loader2, Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useFinancial } from '@/contexts/FinancialContext';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-assistant`;
const DEFAULTS = ['Food', 'Travel', 'Shopping', 'Bills', 'Entertainment', 'Health', 'Education', 'Other'];
const LAST_CAT_KEY = 'xpenzy:last-category';
const toDateInputValue = (date: Date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};
const today = () => toDateInputValue(new Date());

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}

export const QuickAddExpense = ({ open, onOpenChange }: Props) => {
  const { data, addExpense, deleteExpense } = useFinancial();
  const [text, setText] = useState('');
  const [aiBusy, setAiBusy] = useState(false);
  const [aiNote, setAiNote] = useState<string | null>(null);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Recent categories first, then budgets, then defaults
  const categories = useMemo(() => {
    const recent = [...data.expenses]
      .sort((a: any, b: any) => (b.date > a.date ? 1 : -1))
      .map((e: any) => e.category);
    return [...new Set([...recent, ...data.budgets.map((b: any) => b.category), ...DEFAULTS])].filter(Boolean).slice(0, 12) as string[];
  }, [data.expenses, data.budgets]);

  useEffect(() => {
    if (open) {
      setText(''); setAmount(''); setNote(''); setDate(today()); setError(null); setAiNote(null);
      setCategory(localStorage.getItem(LAST_CAT_KEY) || '');
    }
  }, [open]);

  const readText = async () => {
    if (!text.trim()) return;
    setAiBusy(true); setAiNote(null);
    try {
      const { data: s } = await supabase.auth.getSession();
      const token = s?.session?.access_token;
      if (!token) throw new Error('signin');
      const r = await fetch(CHAT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action: 'categorize', input: text.trim() }),
      });
      if (!r.ok) {
        const response = await r.json().catch(() => ({}));
        if (r.status === 402 || String(response.error || '').includes('LOVABLE_API_KEY')) {
          setAiNote('AI entry is unavailable. You can still enter the amount, category, and date manually.');
          return;
        }
        if (r.status === 429) {
          setAiNote('AI is temporarily busy. You can still enter the expense manually.');
          return;
        }
        const detail = typeof response.error === 'string' ? response.error : `Request failed (${r.status})`;
        throw new Error(detail);
      }
      const res = await r.json();
      if (res.amount) setAmount(String(res.amount));
      if (res.category) setCategory(res.category);
      if (res.note) setNote(res.note);
      if (/\byesterday\b/i.test(text)) {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        setDate(toDateInputValue(yesterday));
      } else if (/\btoday\b/i.test(text)) {
        setDate(today());
      }
      const explanation = typeof res.explanation === 'string' ? ` ${res.explanation}` : '';
      setAiNote(`AI suggests ${res.category || 'a category'}.${explanation} Review or change it before saving.`);
    } catch (cause) {
      console.error('AI expense entry failed:', cause);
      const detail = cause instanceof Error && cause.message !== 'Failed to fetch' ? ` (${cause.message})` : '';
      setAiNote(`Could not read that right now${detail}. Fill in the details below instead.`);
    } finally {
      setAiBusy(false);
    }
  };

  const save = async () => {
    const value = Number(amount);
    if (!value || value <= 0) return setError('Enter an amount greater than 0.');
    if (!category.trim()) return setError('Pick a category.');
    if (!date || date > today()) return setError('Choose today or an earlier date.');
    setError(null); setSaving(true);
    try {
      const added = await addExpense({ amount: value, date, category: category.trim(), subcategory: 'General', paymentMode: 'UPI', notes: note.trim() });
      if (!added) {
        setError('Could not save this expense. Please try again.');
        return;
      }
      localStorage.setItem(LAST_CAT_KEY, category.trim());
      onOpenChange(false);
      toast.success(`Saved ₹${value.toLocaleString('en-IN')} for ${category}`, {
        duration: 6000,
        action: added ? { label: 'Undo', onClick: () => deleteExpense(added.id) } : undefined,
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add expense</DialogTitle>
          <DialogDescription>Just the amount and a category. Everything else is optional.</DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="qa-text" className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5" /> Type it (optional)
          </Label>
          <div className="flex gap-2">
            <Input id="qa-text" placeholder='e.g. "₹250 lunch today"' value={text}
              onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && readText()} />
            <Button variant="secondary" onClick={readText} disabled={aiBusy || !text.trim()}>
              {aiBusy ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Fill in'}
            </Button>
          </div>
          {aiNote && <p className="text-xs text-muted-foreground">{aiNote}</p>}
        </div>

        <div className="space-y-4 pt-2">
          <div className="space-y-1.5">
            <Label htmlFor="qa-amount">Amount (₹)</Label>
            <Input id="qa-amount" type="number" inputMode="decimal" min="0" autoFocus className="text-2xl h-14 font-semibold"
              value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0" />
          </div>
          <div className="space-y-1.5">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button key={c} type="button" onClick={() => setCategory(c)}
                  className={cn('px-3 py-1.5 rounded-full text-sm border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                    category === c ? 'bg-primary text-primary-foreground border-primary' : 'bg-card border-border hover:bg-secondary')}>
                  {c}
                </button>
              ))}
            </div>
            {category && !categories.includes(category) && (
              <p className="text-xs text-muted-foreground">New category: {category}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="qa-date">Date</Label>
              <Input id="qa-date" type="date" max={today()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="qa-note">Note (optional)</Label>
              <Input id="qa-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Shop or detail" />
            </div>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button className="w-full h-12 text-base" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save expense'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
