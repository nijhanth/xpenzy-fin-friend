import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, Bell, CalendarClock, Check, CircleCheck, Clock3, FileText, Plus, Search, Wallet } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { database, expenseService } from '@/lib/database';
import { useFinancial } from '@/contexts/FinancialContext';
import { toast } from 'sonner';
import { NoteForm } from '@/components/forms/NoteForm';
import { EditDeleteMenu } from '@/components/ui/edit-delete-menu';
import { formatDisplayDate } from '@/lib/dateFormat';
import { AIInsightsCard } from '@/components/ai/AIInsights';

type Note = {
  id: string;
  title: string;
  amount: number | string;
  due_date: string;
  category: string;
  priority: 'low' | 'medium' | 'high';
  is_completed: boolean;
  reminder?: string | null;
  notes?: string | null;
  updated_at?: string;
};

type NotesFilter = 'all' | 'upcoming' | 'overdue' | 'completed';
type ReminderDateFilter = 'all' | 'today' | 'next7days' | 'thisMonth' | 'custom';

const currency = (amount: number | string) => new Intl.NumberFormat('en-IN', {
  style: 'currency', currency: 'INR', maximumFractionDigits: 0,
}).format(Number(amount) || 0);

const localDate = (value: string) => new Date(`${value?.slice(0, 10)}T00:00:00`);
const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

const priorityStyles: Record<Note['priority'], string> = {
  high: 'border-rose-500/20 bg-rose-500/10 text-rose-700 dark:text-rose-300',
  medium: 'border-amber-500/20 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  low: 'border-emerald-500/20 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
};

const filterOptions: Array<{ id: NotesFilter; label: string }> = [
  { id: 'all', label: 'All reminders' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'overdue', label: 'Overdue' },
  { id: 'completed', label: 'Completed' },
];

export const Notes = () => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [reopeningNote, setReopeningNote] = useState<Note | null>(null);
  const [linkingNote, setLinkingNote] = useState<Note | null>(null);
  const [linkingType, setLinkingType] = useState<'expense' | 'savings' | 'investment' | 'investment-holding'>('expense');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [selectedExpenseId, setSelectedExpenseId] = useState('');
  const [linkingExpense, setLinkingExpense] = useState(false);
  const [reopening, setReopening] = useState(false);
  const [activeFilter, setActiveFilter] = useState<NotesFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [dateFilter, setDateFilter] = useState<ReminderDateFilter>('all');
  const [customDateFrom, setCustomDateFrom] = useState('');
  const [customDateTo, setCustomDateTo] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { data: financialData, refreshExpenses, updateExpense, updateSavingsTransaction, updateInvestmentTransaction, updateInvestmentEntry } = useFinancial();

  const loadNotes = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setLoading(true);
      const data = await database.notes.getAll();
      setNotes(data as Note[]);
    } catch (error: any) {
      toast.error('Could not load reminders', { description: error.message });
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadNotes(true);
  }, [loadNotes]);

  const handleAddNote = async (noteData: any) => {
    try {
      await database.notes.create(noteData);
      toast.success('Reminder added');
      setShowAddDialog(false);
      await loadNotes();
    } catch (error: any) {
      toast.error('Could not add reminder', { description: error.message });
    }
  };

  const handleUpdateNote = async (noteData: any) => {
    if (!editingNote) return;
    try {
      await database.notes.update(editingNote.id, noteData);
      toast.success('Reminder updated');
      setEditingNote(null);
      await loadNotes();
    } catch (error: any) {
      toast.error('Could not update reminder', { description: error.message });
    }
  };

  const handleDeleteNote = async (id: string) => {
    try {
      await database.notes.delete(id);
      toast.success('Reminder deleted');
      await loadNotes();
    } catch (error: any) {
      toast.error('Could not delete reminder', { description: error.message });
    }
  };

  const handleMarkComplete = async (note: Note) => {
    if (note.is_completed) {
      setReopeningNote(note);
      return;
    }

    try {
      await database.notes.markComplete(note.id, true);
      toast.success('Reminder marked complete');
      await loadNotes();
    } catch (error: any) {
      toast.error('Could not update reminder', { description: error.message });
    }
  };

  const linkedExpenses = reopeningNote
    ? financialData.expenses.filter((expense) => expense.linkedNoteId === reopeningNote.id)
    : [];
  const linkedSavingsTransactions = reopeningNote
    ? financialData.savingsTransactions.filter((transaction) => transaction.linked_note_id === reopeningNote.id)
    : [];
  const linkedInvestmentTransactions = reopeningNote
    ? financialData.investmentTransactions.filter((transaction) => transaction.linked_note_id === reopeningNote.id)
    : [];
  const linkedInvestmentEntries = reopeningNote
    ? financialData.investments.filter((investment) => investment.linked_note_id === reopeningNote.id)
    : [];
  const expenseCandidates = linkingNote
    ? financialData.expenses.filter((expense) => !expense.linkedNoteId || expense.linkedNoteId === linkingNote.id)
    : [];
  const filteredExpenseCandidates = expenseCandidates.filter((expense) => {
    const query = expenseSearch.trim().toLowerCase();
    return !query || [expense.category, expense.subcategory, expense.notes, expense.paymentMode, expense.date]
      .some((value) => String(value || '').toLowerCase().includes(query));
  });
  const savingsCandidates = linkingNote ? financialData.savingsTransactions.filter((item) => !item.linked_note_id || item.linked_note_id === linkingNote.id) : [];
  const filteredSavingsCandidates = savingsCandidates.filter((item) => {
    const goalName = financialData.savings.find((goal) => goal.id === item.savings_goal_id)?.name || '';
    const query = expenseSearch.trim().toLowerCase();
    return !query || [goalName, item.notes, item.date, item.amount].some((value) => String(value || '').toLowerCase().includes(query));
  });
  const investmentCandidates = linkingNote ? financialData.investmentTransactions.filter((item) => !item.linked_note_id || item.linked_note_id === linkingNote.id) : [];
  const filteredInvestmentCandidates = investmentCandidates.filter((item) => {
    const investmentName = financialData.investments.find((investment) => investment.id === item.investment_id)?.name || '';
    const query = expenseSearch.trim().toLowerCase();
    return !query || [investmentName, item.notes, item.date, item.amount].some((value) => String(value || '').toLowerCase().includes(query));
  });
  const investmentHoldingCandidates = linkingNote ? financialData.investments.filter((item) => !item.linked_note_id || item.linked_note_id === linkingNote.id) : [];
  const filteredInvestmentHoldingCandidates = investmentHoldingCandidates.filter((item) => {
    const query = expenseSearch.trim().toLowerCase();
    return !query || [item.name, item.type, item.notes, item.date].some((value) => String(value || '').toLowerCase().includes(query));
  });

  const openExpenseLinker = (note: Note) => {
    const currentLink = financialData.expenses.find((expense) => expense.linkedNoteId === note.id);
    const currentSavingsLink = financialData.savingsTransactions.find((transaction) => transaction.linked_note_id === note.id);
    const currentInvestmentLink = financialData.investmentTransactions.find((transaction) => transaction.linked_note_id === note.id);
    const currentInvestmentHoldingLink = financialData.investments.find((investment) => investment.linked_note_id === note.id);
    setLinkingNote(note);
    setLinkingType(currentLink ? 'expense' : currentSavingsLink ? 'savings' : currentInvestmentLink ? 'investment' : currentInvestmentHoldingLink ? 'investment-holding' : 'expense');
    setSelectedExpenseId(currentLink?.id || currentSavingsLink?.id || currentInvestmentLink?.id || currentInvestmentHoldingLink?.id || '');
    setExpenseSearch('');
  };

  const handleLinkSelectedExpense = async () => {
    if (!linkingNote || !selectedExpenseId || linkingExpense) return;
    setLinkingExpense(true);
    try {
      for (const item of financialData.expenses.filter((entry) => entry.linkedNoteId === linkingNote.id)) {
        if (linkingType === 'expense' && item.id === selectedExpenseId) continue;
        const unlinked = await updateExpense(item.id, { linkedNoteId: null });
        if (!unlinked) return;
      }
      for (const item of financialData.savingsTransactions.filter((entry) => entry.linked_note_id === linkingNote.id)) {
        if (linkingType === 'savings' && item.id === selectedExpenseId) continue;
        if (await updateSavingsTransaction(item.id, { linked_note_id: null }, false) === false) return;
      }
      for (const item of financialData.investmentTransactions.filter((entry) => entry.linked_note_id === linkingNote.id)) {
        if (linkingType === 'investment' && item.id === selectedExpenseId) continue;
        if (await updateInvestmentTransaction(item.id, { linked_note_id: null }, false) === false) return;
      }
      for (const item of financialData.investments.filter((entry) => entry.linked_note_id === linkingNote.id)) {
        if (linkingType === 'investment-holding' && item.id === selectedExpenseId) continue;
        await updateInvestmentEntry(item.id, { linked_note_id: null }, false);
      }

      let description = '';
      if (linkingType === 'expense') {
        const selected = financialData.expenses.find((entry) => entry.id === selectedExpenseId);
        if (!selected) return;
        if (selected.linkedNoteId !== linkingNote.id) {
          const linked = await updateExpense(selected.id, { linkedNoteId: linkingNote.id });
          if (!linked) return;
        }
        description = `${selected.category} - ${currency(selected.amount)} - ${formatDisplayDate(selected.date)}`;
        await refreshExpenses();
      } else if (linkingType === 'savings') {
        const selected = financialData.savingsTransactions.find((entry) => entry.id === selectedExpenseId);
        if (!selected) return;
        if (await updateSavingsTransaction(selected.id, { linked_note_id: linkingNote.id }, false) === false) return;
        description = `Savings deposit - ${currency(selected.amount)} - ${formatDisplayDate(selected.date)}`;
      } else if (linkingType === 'investment') {
        const selected = financialData.investmentTransactions.find((entry) => entry.id === selectedExpenseId);
        if (!selected) return;
        if (await updateInvestmentTransaction(selected.id, { linked_note_id: linkingNote.id }, false) === false) return;
        description = `Investment contribution - ${currency(selected.amount)} - ${formatDisplayDate(selected.date)}`;
      } else {
        const selected = financialData.investments.find((entry) => entry.id === selectedExpenseId);
        if (!selected) return;
        await updateInvestmentEntry(selected.id, { linked_note_id: linkingNote.id }, false);
        description = `${selected.name} holding - ${selected.type} - ${formatDisplayDate(selected.date)}`;
      }

      toast.success('Transaction linked', {
        description: `${description}. You can mark the reminder complete from its card.`,
      });
      setLinkingNote(null);
    } catch (error: any) {
      toast.error('Could not link transaction', { description: error.message });
    } finally {
      setLinkingExpense(false);
    }
  };
  const confirmReopenReminder = async () => {
    if (!reopeningNote || reopening) return;
    setReopening(true);
    try {
      await expenseService.unlinkReminder(reopeningNote.id);
      const unlinkResults = await Promise.all([
        ...financialData.savingsTransactions
          .filter((transaction) => transaction.linked_note_id === reopeningNote.id)
          .map((transaction) => updateSavingsTransaction(transaction.id, { linked_note_id: null }, false)),
        ...financialData.investmentTransactions
          .filter((transaction) => transaction.linked_note_id === reopeningNote.id)
          .map((transaction) => updateInvestmentTransaction(transaction.id, { linked_note_id: null }, false)),
        ...financialData.investments
          .filter((investment) => investment.linked_note_id === reopeningNote.id)
          .map((investment) => updateInvestmentEntry(investment.id, { linked_note_id: null }, false)),
      ]);
      if (unlinkResults.some((result) => result === false)) throw new Error('Some transaction links could not be cleared. Please try again.');
      await database.notes.markComplete(reopeningNote.id, false);
      await Promise.all([refreshExpenses(), loadNotes()]);
      toast.success('Reminder reopened', {
        description: linkedExpenses.length || linkedSavingsTransactions.length || linkedInvestmentTransactions.length || linkedInvestmentEntries.length
          ? `Linked transactions remain in history; their reminder links were cleared.`
          : 'You can link this reminder to a future expense.',
      });
      setReopeningNote(null);
    } catch (error: any) {
      toast.error('Could not reopen reminder', { description: error.message });
    } finally {
      setReopening(false);
    }
  };

  const today = startOfToday();
  const notesByDueDate = useMemo(() => [...notes].sort((a, b) => a.due_date.localeCompare(b.due_date)), [notes]);
  const activeNotes = notesByDueDate.filter((note) => !note.is_completed);
  const overdueNotes = activeNotes.filter((note) => localDate(note.due_date) < today);
  const dueSoonNotes = activeNotes.filter((note) => {
    const dueDate = localDate(note.due_date);
    const daysAway = Math.round((dueDate.getTime() - today.getTime()) / 86400000);
    return daysAway >= 0 && daysAway <= 7;
  });
  const completedNotes = notes.filter((note) => note.is_completed);
  const todayKey = [today.getFullYear(), String(today.getMonth() + 1).padStart(2, '0'), String(today.getDate()).padStart(2, '0')].join('-');
  const next7DaysEnd = new Date(today);
  next7DaysEnd.setDate(next7DaysEnd.getDate() + 7);
  const next7DaysEndKey = [next7DaysEnd.getFullYear(), String(next7DaysEnd.getMonth() + 1).padStart(2, '0'), String(next7DaysEnd.getDate()).padStart(2, '0')].join('-');
  const totalUpcomingAmount = activeNotes
    .filter((note) => localDate(note.due_date) >= today)
    .reduce((sum, note) => sum + (Number(note.amount) || 0), 0);
  const categories = useMemo(() => [...new Set(notes.map((note) => note.category).filter(Boolean))].sort(), [notes]);
  const noteDigest = useMemo(() => notes.map((note) => `${note.id}:${note.is_completed}:${note.updated_at || note.due_date}`).join('|'), [notes]);

  const filteredNotes = notesByDueDate.filter((note) => {
    const dueDate = localDate(note.due_date);
    const matchesStatus = activeFilter === 'all'
      || (activeFilter === 'completed' && note.is_completed)
      || (activeFilter === 'overdue' && !note.is_completed && dueDate < today)
      || (activeFilter === 'upcoming' && !note.is_completed && dueDate >= today);
    const matchesCategory = selectedCategory === 'all' || note.category === selectedCategory;
    const dueDateKey = note.due_date.slice(0, 10);
    const matchesDate = dateFilter === 'all'
      || (dateFilter === 'today' && dueDateKey === todayKey)
      || (dateFilter === 'next7days' && dueDateKey >= todayKey && dueDateKey <= next7DaysEndKey)
      || (dateFilter === 'thisMonth' && dueDate.getFullYear() === today.getFullYear() && dueDate.getMonth() === today.getMonth())
      || (dateFilter === 'custom'
        && (!customDateFrom || dueDateKey >= customDateFrom)
        && (!customDateTo || dueDateKey <= customDateTo)
        && !(customDateFrom && customDateTo && customDateFrom > customDateTo));
    const query = searchQuery.trim().toLowerCase();
    const matchesSearch = !query || [note.title, note.category, note.notes || ''].some((value) => value.toLowerCase().includes(query));
    return matchesStatus && matchesCategory && matchesDate && matchesSearch;
  });
  const hasActiveFilters = activeFilter !== 'all'
    || selectedCategory !== 'all'
    || dateFilter !== 'all'
    || Boolean(searchQuery.trim());

  const clearFilters = () => {
    setActiveFilter('all');
    setSelectedCategory('all');
    setDateFilter('all');
    setCustomDateFrom('');
    setCustomDateTo('');
    setSearchQuery('');
  };

  const getDueLabel = (note: Note) => {
    const dueDate = localDate(note.due_date);
    if (note.is_completed) return { label: 'Completed', className: 'text-muted-foreground', icon: CircleCheck };
    if (dueDate < today) return { label: 'Overdue', className: 'text-rose-600 dark:text-rose-400', icon: AlertCircle };
    if (dueDate.getTime() === today.getTime()) return { label: 'Due today', className: 'text-amber-600 dark:text-amber-400', icon: Clock3 };
    return { label: `Due ${formatDisplayDate(note.due_date)}`, className: 'text-muted-foreground', icon: CalendarClock };
  };

  if (loading) {
    return <div className="flex min-h-[60vh] items-center justify-center text-primary"><span className="h-8 w-8 animate-spin rounded-full border-2 border-current border-r-transparent" aria-label="Loading reminders" /></div>;
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-3 pb-8 pt-4 sm:space-y-6 sm:px-6 sm:pt-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Bell className="h-3.5 w-3.5" /> Bills, plans & due dates
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Notes & Reminders</h1>
          <p className="mt-1 text-sm text-muted-foreground">Keep important payments and plans on schedule.</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)} className="min-h-11 w-full rounded-xl sm:w-auto">
          <Plus className="mr-2 h-4 w-4" /> Add reminder
        </Button>
      </header>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4" aria-label="Reminder summary">
        <Card className="border-border/70 bg-card/80 shadow-sm"><CardContent className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary sm:h-10 sm:w-10"><Bell className="h-4 w-4 sm:h-5 sm:w-5" /></span>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">Active reminders</p><p className="text-xl font-bold tabular-nums">{activeNotes.length}</p></div>
        </CardContent></Card>
        <Card className="border-border/70 bg-card/80 shadow-sm"><CardContent className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-500/10 text-rose-600 sm:h-10 sm:w-10"><AlertCircle className="h-4 w-4 sm:h-5 sm:w-5" /></span>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">Overdue</p><p className="text-xl font-bold tabular-nums">{overdueNotes.length}</p></div>
        </CardContent></Card>
        <Card className="border-border/70 bg-card/80 shadow-sm"><CardContent className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 sm:h-10 sm:w-10"><CalendarClock className="h-4 w-4 sm:h-5 sm:w-5" /></span>
          <div className="min-w-0"><p className="text-xs text-muted-foreground">Due in 7 days</p><p className="text-xl font-bold tabular-nums">{dueSoonNotes.length}</p></div>
        </CardContent></Card>
        <Card className="border-border/70 bg-card/80 shadow-sm"><CardContent className="flex items-center gap-2.5 p-3 sm:gap-3 sm:p-5">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 sm:h-10 sm:w-10"><Wallet className="h-4 w-4 sm:h-5 sm:w-5" /></span>
          <div className="min-w-0"><p className="truncate text-xs text-muted-foreground">Upcoming amount</p><p className="truncate text-lg font-bold tabular-nums">{currency(totalUpcomingAmount)}</p></div>
        </CardContent></Card>
      </section>

      <section className="space-y-4" aria-label="Your reminders">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="scrollbar-hide flex max-w-full snap-x gap-1 overflow-x-auto rounded-xl bg-muted/60 p-1" role="tablist" aria-label="Filter reminders">
            {filterOptions.map(({ id, label }) => (
              <button key={id} type="button" role="tab" aria-selected={activeFilter === id} onClick={() => setActiveFilter(id)} className={`min-h-11 shrink-0 snap-start rounded-lg px-3 py-2 text-xs font-medium transition-colors sm:text-sm ${activeFilter === id ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>
                {label}<span className="ml-1.5 text-[10px] opacity-70">{id === 'all' ? notes.length : id === 'upcoming' ? activeNotes.length - overdueNotes.length : id === 'overdue' ? overdueNotes.length : completedNotes.length}</span>
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-[minmax(12rem,1fr)_10rem_12rem] lg:w-auto lg:min-w-[38rem]">
            <div className="relative col-span-2 sm:col-span-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search reminders" aria-label="Search reminders" className="min-h-11 pl-9" />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger aria-label="Filter by category" className="min-h-11"><SelectValue placeholder="All categories" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={(value) => setDateFilter(value as ReminderDateFilter)}>
              <SelectTrigger aria-label="Filter by due date" className="min-h-11"><SelectValue placeholder="All dates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All dates</SelectItem>
                <SelectItem value="today">Due today</SelectItem>
                <SelectItem value="next7days">Next 7 days</SelectItem>
                <SelectItem value="thisMonth">This month</SelectItem>
                <SelectItem value="custom">Custom range</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {dateFilter === 'custom' && (
          <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/70 bg-card/70 p-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end sm:p-4">
            <div className="space-y-1.5">
              <label htmlFor="reminder-date-from" className="text-xs font-medium text-muted-foreground">From</label>
              <Input id="reminder-date-from" type="date" className="min-h-11" value={customDateFrom} onChange={(event) => setCustomDateFrom(event.target.value)} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="reminder-date-to" className="text-xs font-medium text-muted-foreground">To</label>
              <Input id="reminder-date-to" type="date" className="min-h-11" value={customDateTo} onChange={(event) => setCustomDateTo(event.target.value)} />
            </div>
            <Button type="button" variant="outline" className="col-span-2 min-h-11 sm:col-span-1" onClick={() => { setCustomDateFrom(''); setCustomDateTo(''); }}>
              Clear dates
            </Button>
            {customDateFrom && customDateTo && customDateFrom > customDateTo && (
              <p role="alert" className="col-span-2 text-xs text-destructive sm:col-span-3">The start date must be on or before the end date.</p>
            )}
          </div>
        )}

        {filteredNotes.length ? (
          <div className="grid gap-3 sm:gap-4 xl:grid-cols-2">
            {filteredNotes.map((note) => {
              const due = getDueLabel(note);
              const DueIcon = due.icon;
              const noteLinkedExpenses = financialData.expenses.filter((expense) => expense.linkedNoteId === note.id);
              const noteLinkedSavings = financialData.savingsTransactions.filter((transaction) => transaction.linked_note_id === note.id);
              const noteLinkedInvestments = financialData.investmentTransactions.filter((transaction) => transaction.linked_note_id === note.id);
              const noteLinkedInvestmentEntries = financialData.investments.filter((investment) => investment.linked_note_id === note.id);
              const hasLinkedTransactions = noteLinkedExpenses.length + noteLinkedSavings.length + noteLinkedInvestments.length + noteLinkedInvestmentEntries.length > 0;
              return (
                <Card key={note.id} className={`overflow-hidden border-border/70 shadow-sm transition-shadow hover:shadow-md ${note.is_completed ? 'opacity-70' : ''}`}>
                  <CardContent className="p-3.5 sm:p-5">
                    <div className="flex items-start gap-3">
                      <span className={`mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${note.is_completed ? 'bg-muted text-muted-foreground' : due.label === 'Overdue' ? 'bg-rose-500/10 text-rose-600' : 'bg-primary/10 text-primary'}`}>
                        {note.is_completed ? <Check className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className={`break-words font-semibold text-foreground ${note.is_completed ? 'line-through' : ''}`}>{note.title}</h2>
                            <div className="mt-2 flex flex-wrap items-center gap-1.5">
                              <Badge variant="outline" className="text-[10px]">{note.category}</Badge>
                              <Badge className={`border text-[10px] capitalize ${priorityStyles[note.priority] || priorityStyles.medium}`}>{note.priority || 'medium'} priority</Badge>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-start gap-1">
                            <p className="pt-1 text-sm font-bold tabular-nums text-foreground sm:text-base">{currency(note.amount)}</p>
                            <EditDeleteMenu onEdit={() => setEditingNote(note)} onDelete={() => handleDeleteNote(note.id)} itemName="reminder" />
                          </div>
                        </div>
                        {note.notes && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-muted-foreground">{note.notes}</p>}
                        {hasLinkedTransactions && (
                          <div className="mt-3 space-y-1 rounded-lg bg-muted/50 px-3 py-2">
                            {noteLinkedExpenses.map((expense) => (
                              <p key={expense.id} className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                                <Wallet className="h-3.5 w-3.5 shrink-0" />
                                <span>Linked expense:</span>
                                <span className="font-medium text-foreground">{expense.category}</span>
                                <span>- {currency(expense.amount)} - {formatDisplayDate(expense.date)}</span>
                              </p>
                            ))}
                            {noteLinkedSavings.map((transaction) => (
                              <p key={transaction.id} className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                                <Wallet className="h-3.5 w-3.5 shrink-0" />
                                <span>Linked savings:</span>
                                <span className="font-medium text-foreground">{financialData.savings.find((goal) => goal.id === transaction.savings_goal_id)?.name || 'Savings goal'}</span>
                                <span>· {currency(transaction.amount)} · {formatDisplayDate(transaction.date)}</span>
                              </p>
                            ))}
                            {noteLinkedInvestments.map((transaction) => (
                              <p key={transaction.id} className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                                <Wallet className="h-3.5 w-3.5 shrink-0" />
                                <span>Linked investment:</span>
                                <span className="font-medium text-foreground">{financialData.investments.find((investment) => investment.id === transaction.investment_id)?.name || 'Investment'}</span>
                                <span>· {currency(transaction.amount)} · {formatDisplayDate(transaction.date)}</span>
                              </p>
                            ))}
                            {noteLinkedInvestmentEntries.map((investment) => (
                              <p key={investment.id} className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                                <Wallet className="h-3.5 w-3.5 shrink-0" />
                                <span>Linked investment:</span>
                                <span className="font-medium text-foreground">{investment.name}</span>
                                <span>- {investment.type} - {formatDisplayDate(investment.date)}</span>
                              </p>
                            ))}
                          </div>
                        )}
                        <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
                            <span className={`inline-flex items-center gap-1.5 font-medium ${due.className}`}><DueIcon className="h-3.5 w-3.5" />{due.label}</span>
                            {note.reminder && <span className="inline-flex items-center gap-1.5 text-muted-foreground"><Clock3 className="h-3.5 w-3.5" />{note.reminder}</span>}
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:flex">
                            <Button variant="outline" onClick={() => openExpenseLinker(note)} className="min-h-11 w-full px-2 text-xs sm:min-h-9 sm:w-auto sm:px-3 sm:text-sm">
                              {hasLinkedTransactions ? 'Change link' : 'Link transaction'}
                            </Button>
                            <Button variant={note.is_completed ? 'outline' : 'secondary'} onClick={() => handleMarkComplete(note)} className="min-h-11 w-full px-2 text-xs sm:min-h-9 sm:w-auto sm:px-3 sm:text-sm">
                              {note.is_completed ? 'Reopen' : 'Mark complete'}
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <Card className="border-dashed border-border/80 bg-muted/20 shadow-none">
            <CardContent className="flex min-h-64 flex-col items-center justify-center px-5 py-10 text-center">
              <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Bell className="h-7 w-7" /></span>
              <h2 className="font-semibold text-foreground">{notes.length ? 'No reminders match these filters' : 'Nothing on your list yet'}</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">{notes.length ? 'Try another search or category, or switch the reminder status.' : 'Add a bill, renewal, or payment date and keep it visible here.'}</p>
              {!notes.length && <Button onClick={() => setShowAddDialog(true)} className="mt-4 rounded-xl"><Plus className="mr-2 h-4 w-4" />Add your first reminder</Button>}
              {notes.length > 0 && hasActiveFilters && <Button variant="outline" onClick={clearFilters} className="mt-4 min-h-11 rounded-xl">Clear filters</Button>}
            </CardContent>
          </Card>
        )}
      </section>

      <AIInsightsCard
        title="AI Notes & Reminder Tips"
        focus="notes"
        autoGenerate
        isDataLoading={loading}
        showLanguageSelector
        refreshKey={noteDigest}
      />

      <Dialog open={!!linkingNote} onOpenChange={(open) => !open && !linkingExpense && setLinkingNote(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4">
            <DialogTitle>Link a transaction to {linkingNote?.title}</DialogTitle>
            <DialogDescription>Choose one unlinked expense, savings deposit, investment holding, or investment contribution.</DialogDescription>
          </DialogHeader>
          <div className="shrink-0 px-5 pt-4">
            <Select value={linkingType} onValueChange={(value) => {
              if (value === 'expense' || value === 'savings' || value === 'investment' || value === 'investment-holding') {
                setLinkingType(value);
                setSelectedExpenseId('');
              }
            }}>
              <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="savings">Savings deposit</SelectItem>
                <SelectItem value="investment">Investment contribution</SelectItem>
                <SelectItem value="investment-holding">Investment holding</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative shrink-0 px-5 pt-4">
            <Search className="pointer-events-none absolute left-8 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={expenseSearch}
              onChange={(event) => setExpenseSearch(event.target.value)}
              placeholder={`Search ${linkingType === 'expense' ? 'category, payment method, notes, or date' : 'name, notes, or date'}`}
              aria-label={`Search unlinked ${linkingType} transactions`}
              className="min-h-11 pl-9"
            />
          </div>
          <div className="min-h-0 flex-1 space-y-2 overflow-y-auto px-5 py-3">
            {linkingType === 'expense' ? (
              filteredExpenseCandidates.length ? filteredExpenseCandidates.map((expense) => (
                <button key={expense.id} type="button" aria-pressed={selectedExpenseId === expense.id} onClick={() => setSelectedExpenseId(expense.id)} className={`min-h-16 w-full rounded-xl border p-3 text-left transition-colors ${selectedExpenseId === expense.id ? 'border-primary bg-primary/5' : 'border-border/70 hover:bg-muted/60'}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{expense.category}{expense.subcategory ? ` · ${expense.subcategory}` : ''}</p>
                    {expense.notes && <p className="mt-0.5 truncate text-sm text-muted-foreground">{expense.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDisplayDate(expense.date)} · {expense.paymentMode}</p>
                  </div><p className="shrink-0 font-semibold tabular-nums text-foreground">{currency(expense.amount)}</p></div>
                </button>
              )) : <p className="py-8 text-center text-sm text-muted-foreground">No unlinked expenses match this search.</p>
            ) : linkingType === 'savings' ? (
              filteredSavingsCandidates.length ? filteredSavingsCandidates.map((transaction) => (
                <button key={transaction.id} type="button" aria-pressed={selectedExpenseId === transaction.id} onClick={() => setSelectedExpenseId(transaction.id)} className={`min-h-16 w-full rounded-xl border p-3 text-left transition-colors ${selectedExpenseId === transaction.id ? 'border-primary bg-primary/5' : 'border-border/70 hover:bg-muted/60'}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{financialData.savings.find((goal) => goal.id === transaction.savings_goal_id)?.name || 'Savings goal'}</p>
                    {transaction.notes && <p className="mt-0.5 truncate text-sm text-muted-foreground">{transaction.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDisplayDate(transaction.date)} · Savings deposit</p>
                  </div><p className="shrink-0 font-semibold tabular-nums text-foreground">{currency(transaction.amount)}</p></div>
                </button>
              )) : <p className="py-8 text-center text-sm text-muted-foreground">No unlinked savings deposits match this search.</p>
            ) : linkingType === 'investment' ? (
              filteredInvestmentCandidates.length ? filteredInvestmentCandidates.map((transaction) => (
                <button key={transaction.id} type="button" aria-pressed={selectedExpenseId === transaction.id} onClick={() => setSelectedExpenseId(transaction.id)} className={`min-h-16 w-full rounded-xl border p-3 text-left transition-colors ${selectedExpenseId === transaction.id ? 'border-primary bg-primary/5' : 'border-border/70 hover:bg-muted/60'}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{financialData.investments.find((investment) => investment.id === transaction.investment_id)?.name || 'Investment'}</p>
                    {transaction.notes && <p className="mt-0.5 truncate text-sm text-muted-foreground">{transaction.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{formatDisplayDate(transaction.date)} · Investment contribution</p>
                  </div><p className="shrink-0 font-semibold tabular-nums text-foreground">{currency(transaction.amount)}</p></div>
                </button>
              )) : <p className="py-8 text-center text-sm text-muted-foreground">No unlinked investment contributions match this search.</p>
            ) : (
              filteredInvestmentHoldingCandidates.length ? filteredInvestmentHoldingCandidates.map((investment) => (
                <button key={investment.id} type="button" aria-pressed={selectedExpenseId === investment.id} onClick={() => setSelectedExpenseId(investment.id)} className={`min-h-16 w-full rounded-xl border p-3 text-left transition-colors ${selectedExpenseId === investment.id ? 'border-primary bg-primary/5' : 'border-border/70 hover:bg-muted/60'}`}>
                  <div className="flex items-start justify-between gap-3"><div className="min-w-0">
                    <p className="truncate font-medium text-foreground">{investment.name}</p>
                    {investment.notes && <p className="mt-0.5 truncate text-sm text-muted-foreground">{investment.notes}</p>}
                    <p className="mt-1 text-xs text-muted-foreground">{investment.type} - {formatDisplayDate(investment.date)}</p>
                  </div><p className="shrink-0 font-semibold tabular-nums text-foreground">{currency(investment.current || investment.invested)}</p></div>
                </button>
              )) : <p className="py-8 text-center text-sm text-muted-foreground">No unlinked investment holdings match this search.</p>
            )}
          </div>
          <DialogFooter className="shrink-0 border-t border-border/70 px-4 py-3 sm:px-5">
            <Button variant="outline" className="min-h-11" onClick={() => setLinkingNote(null)} disabled={linkingExpense}>Cancel</Button>
            <Button className="min-h-11" onClick={handleLinkSelectedExpense} disabled={!selectedExpenseId || linkingExpense}>
              {linkingExpense ? 'Linking...' : `Link ${linkingType === 'expense' ? 'expense' : linkingType === 'savings' ? 'savings' : linkingType === 'investment-holding' ? 'holding' : 'investment'}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4"><DialogTitle>Add reminder</DialogTitle></DialogHeader>
          <NoteForm onSubmit={handleAddNote} onCancel={() => setShowAddDialog(false)} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!editingNote} onOpenChange={(open) => !open && setEditingNote(null)}>
        <DialogContent className="flex max-h-[calc(100dvh-2rem)] flex-col overflow-hidden p-0 sm:max-w-lg">
          <DialogHeader className="shrink-0 border-b border-border/70 px-5 py-4"><DialogTitle>Edit reminder</DialogTitle></DialogHeader>
          <NoteForm onSubmit={handleUpdateNote} onCancel={() => setEditingNote(null)} initialData={editingNote} />
        </DialogContent>
      </Dialog>

      <Dialog open={!!reopeningNote} onOpenChange={(open) => !open && setReopeningNote(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Reopen this reminder?</DialogTitle>
            <DialogDescription>
              {linkedExpenses.length || linkedSavingsTransactions.length || linkedInvestmentTransactions.length || linkedInvestmentEntries.length
                ? 'This reminder is linked to financial transactions. Reopening will clear those links, but keep every transaction in history.'
                : 'This reminder has no linked transactions. Reopening it will make it available to link again.'}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReopeningNote(null)} disabled={reopening}>Cancel</Button>
            <Button onClick={confirmReopenReminder} disabled={reopening}>
              {reopening ? 'Reopening...' : 'Reopen and unlink'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
