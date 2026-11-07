import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Trash2, ImagePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase, SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import { useFinancial } from '@/contexts/FinancialContext';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

const CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-assistant`;
const MAX_HISTORY_MESSAGES = 20;
const MAX_CONTEXT_TOKENS = 6000;
const CHARACTERS_PER_ESTIMATED_TOKEN = 3;
const MAX_RECEIPT_IMAGE_BYTES = 3 * 1024 * 1024;
const RECEIPT_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const PAYMENT_MODES = ['Cash', 'UPI', 'Card', 'Bank Transfer', 'Net Banking'] as const;
const INCOME_CATEGORIES = ['Salary', 'Freelance', 'Gift', 'Investment', 'Business', 'Custom'] as const;

type TransactionType = 'expense' | 'income' | 'savings' | 'investment' | 'unknown';
type PaymentMode = (typeof PAYMENT_MODES)[number] | 'Unknown';

interface TransactionDraft {
  transactionType: TransactionType;
  amount: number;
  date: string;
  description: string;
  category: string;
  paymentMode: PaymentMode;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

const welcomeMessage: Message = {
  id: '1',
  role: 'assistant',
  content: "Hi! I'm **Xpenzy AI** 🤖\n\nI can help you with:\n- 📊 Spending analysis\n- 💡 Money-saving tips\n- 📈 Financial insights\n\nAsk me anything about your finances!",
};

const estimateTokens = (content: string) =>
  Math.ceil(Array.from(content).length / CHARACTERS_PER_ESTIMATED_TOKEN);

const limitContext = (messages: Message[]) => {
  const recentMessages = messages.slice(-MAX_HISTORY_MESSAGES);
  const context: Message[] = [];
  let tokenCount = 0;

  for (let index = recentMessages.length - 1; index >= 0; index--) {
    const message = recentMessages[index];
    const messageTokens = estimateTokens(message.content);
    const remainingTokens = MAX_CONTEXT_TOKENS - tokenCount;

    if (messageTokens <= remainingTokens) {
      context.unshift(message);
      tokenCount += messageTokens;
      continue;
    }

    if (context.length === 0 && message.role === 'user' && remainingTokens > 0) {
      const maxCharacters = remainingTokens * CHARACTERS_PER_ESTIMATED_TOKEN;
      context.unshift({ ...message, content: Array.from(message.content).slice(-maxCharacters).join('') });
    }
    break;
  }

  return context;
};

const getChatHistoryError = (action: 'load' | 'save', error: { message: string }) =>
  new Error(`Could not ${action} chat history: ${error.message}`);

export const FloatingAIAssistant = () => {
  const {
    data: financialData,
    refreshBudgets,
    refreshExpenses,
    refreshIncome,
    refreshSavings,
    refreshSavingsTransactions,
    refreshInvestmentTransactions,
  } = useFinancial();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isClearingMemories, setIsClearingMemories] = useState(false);
  const [hasAcceptedDataUse, setHasAcceptedDataUse] = useState(false);
  const [imageDataUrl, setImageDataUrl] = useState<string | null>(null);
  const [transactionDraft, setTransactionDraft] = useState<TransactionDraft | null>(null);
  const [selectedTargetId, setSelectedTargetId] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (authLoading) return;

    let cancelled = false;
    const loadHistory = async () => {
      setIsHistoryLoading(true);
      setMessages([welcomeMessage]);
      if (!userId) {
        setIsHistoryLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('ai_chat_messages')
        .select('id, role, content')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(MAX_HISTORY_MESSAGES);

      if (cancelled) return;
      if (error) {
        toast.error(getChatHistoryError('load', error).message);
        setMessages([welcomeMessage]);
      } else {
        const history = (data || []).reverse().map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
        }));
        setMessages(history.length > 0 ? history : [welcomeMessage]);
      }
      setIsHistoryLoading(false);
    };

    void loadHistory();
    return () => { cancelled = true; };
  }, [authLoading, userId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const persistMessage = async (message: Message, userId: string) => {
    const { error: insertError } = await supabase.from('ai_chat_messages').insert({
      id: message.id,
      user_id: userId,
      role: message.role,
      content: message.content,
    });
    if (insertError) throw getChatHistoryError('save', insertError);

    const { data: expiredMessages, error: queryError } = await supabase
      .from('ai_chat_messages')
      .select('id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .range(MAX_HISTORY_MESSAGES, MAX_HISTORY_MESSAGES + 999);
    if (queryError) throw getChatHistoryError('save', queryError);

    if (expiredMessages.length > 0) {
      const { error: deleteError } = await supabase
        .from('ai_chat_messages')
        .delete()
        .eq('user_id', userId)
        .in('id', expiredMessages.map((expiredMessage) => expiredMessage.id));
      if (deleteError) throw getChatHistoryError('save', deleteError);
    }
  };

  const persistWithNotice = async (message: Message, userId: string) => {
    try {
      await persistMessage(message, userId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not save chat history.');
    }
  };

  const selectImage = async (file: File) => {
    if (!RECEIPT_IMAGE_TYPES.includes(file.type)) {
      toast.error('Choose a JPEG, PNG, or WebP screenshot.');
      return;
    }
    if (file.size > MAX_RECEIPT_IMAGE_BYTES) {
      toast.error('Screenshot must be 3 MB or smaller.');
      return;
    }

    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(new Error('Could not read the selected image.'));
        reader.onload = () => {
          if (typeof reader.result !== 'string') {
            reject(new Error('Could not read the selected image.'));
            return;
          }
          resolve(reader.result);
        };
        reader.readAsDataURL(file);
      });
      setImageDataUrl(dataUrl);
      setTransactionDraft(null);
      setSelectedTargetId('');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not read the selected image.');
    }
  };

  const extractImageTransaction = async () => {
    if (!imageDataUrl || !user || isLoading || isHistoryLoading) return;

    const prompt = inputValue.trim();
    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: `🖼️ ${prompt || 'Please read this payment screenshot and prepare a transaction draft.'}`,
    };
    setMessages((previous) => [...previous.filter((message) => message.id !== '1'), userMessage].slice(-MAX_HISTORY_MESSAGES));
    setIsLoading(true);
    setTransactionDraft(null);
    const [imageHeader, imageData] = imageDataUrl.split(',', 2);
    const mimeType = imageHeader.match(/^data:(image\/(?:jpeg|png|webp));base64$/)?.[1];
    if (!mimeType || !imageData) {
      setIsLoading(false);
      toast.error('The selected image could not be prepared. Please choose it again.');
      return;
    }

    try {
      await persistWithNotice(userMessage, user.id);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Please sign in to use AI assistant');

      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'extract_transaction',
          image: { mimeType, data: imageData },
          input: prompt,
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not read the screenshot.');

      const extracted = result.draft;
      if (!extracted || typeof extracted !== 'object') throw new Error('AI returned no transaction draft.');
      const recognizedType = ['expense', 'income', 'savings', 'investment', 'unknown'].includes(extracted.transactionType)
        ? extracted.transactionType as TransactionType
        : 'unknown';
      const recognizedMode = [...PAYMENT_MODES, 'Unknown'].includes(extracted.paymentMode)
        ? extracted.paymentMode as PaymentMode
        : 'Unknown';
      const recognizedDate = typeof extracted.date === 'string'
        && /^\d{4}-\d{2}-\d{2}$/.test(extracted.date)
        && !Number.isNaN(Date.parse(`${extracted.date}T00:00:00Z`))
        && new Date(`${extracted.date}T00:00:00Z`).toISOString().slice(0, 10) === extracted.date
        ? extracted.date
        : '';
      setTransactionDraft({
        transactionType: recognizedType,
        amount: typeof extracted.amount === 'number' && Number.isFinite(extracted.amount) ? extracted.amount : 0,
        date: recognizedDate,
        description: typeof extracted.description === 'string' ? extracted.description.slice(0, 500) : '',
        category: typeof extracted.category === 'string' ? extracted.category.slice(0, 100) : '',
        paymentMode: recognizedMode,
      });
      setSelectedTargetId('');
      setImageDataUrl(null);
      setInputValue('');

      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: 'I read the screenshot. Review and edit the details below, choose the section to save it to, and confirm. Nothing is saved until you confirm.',
      };
      setMessages((previous) => [...previous, assistantMessage].slice(-MAX_HISTORY_MESSAGES));
      await persistWithNotice(assistantMessage, user.id);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not read the screenshot.';
      toast.error(message);
      const assistantMessage: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: `I couldn't read that screenshot: ${message}`,
      };
      setMessages((previous) => [...previous, assistantMessage].slice(-MAX_HISTORY_MESSAGES));
      await persistWithNotice(assistantMessage, user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const clearMemories = async () => {
    if (!user || isClearingMemories) return;
    if (!window.confirm('Clear the preferences and non-sensitive details Xpenzy AI remembers? Your chat history and financial records will not be deleted.')) return;

    setIsClearingMemories(true);
    const { error } = await supabase.from('ai_user_memories').delete().eq('user_id', user.id);
    setIsClearingMemories(false);
    if (error) {
      toast.error(`Could not clear AI memories: ${error.message}`);
    } else {
      toast.success('AI memories cleared. Your chat history and financial records were kept.');
    }
  };

  const handleSendMessage = async () => {
    if (imageDataUrl) {
      await extractImageTransaction();
      return;
    }
    if (!inputValue.trim() || isLoading || isHistoryLoading || !user) return;

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: inputValue };
    const currentMessages = [...messages.filter((message) => message.id !== '1'), userMsg]
      .slice(-MAX_HISTORY_MESSAGES);
    setMessages(currentMessages);
    setInputValue('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      await persistWithNotice(userMsg, user.id);
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Please sign in to use AI assistant');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: SUPABASE_PUBLISHABLE_KEY,
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'chat',
          messages: limitContext(currentMessages).map(({ role, content }) => ({ role, content })),
          timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 402 || String(err.error || '').includes('LOVABLE_API_KEY')) {
          throw new Error('AI is not configured or has no available credits. You can still use Xpenzy without AI.');
        }
        if (resp.status === 429) {
          throw new Error('Gemini free-tier quota or rate limit reached. Check Google AI Studio usage, then try again later.');
        }
        throw new Error(err.error || 'AI service error');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';
      const assistantId = crypto.randomUUID();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);
          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;
          try {
            const parsed = JSON.parse(jsonStr);
            const delta = parsed.choices?.[0]?.delta;
            const content = delta?.content;
            if (delta?.budgetChanged) {
              await refreshBudgets();
            }
            if (delta?.expenseChanged) {
              await refreshExpenses();
            }
            if (delta?.incomeChanged) {
              await refreshIncome();
            }
            if (delta?.savingsChanged) {
              await refreshSavings();
            }
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.id === assistantId) {
                  return prev.map((message, index) => index === prev.length - 1
                    ? { ...message, content: assistantContent }
                    : message);
                }
                return [...prev, { id: assistantId, role: 'assistant' as const, content: assistantContent }]
                  .slice(-MAX_HISTORY_MESSAGES);
              });
            }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }

      if (assistantContent) {
        await persistWithNotice({ id: assistantId, role: 'assistant', content: assistantContent }, user.id);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'Unknown error';
      const errorMessageEntry: Message = {
        id: crypto.randomUUID(),
        role: 'assistant',
        content: errorMessage === 'Failed to fetch'
          ? 'Sorry, I could not reach the AI service. The ai-assistant Supabase function may not be deployed. Please try again after deployment.'
          : `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
      };
      setMessages(prev => [...prev, errorMessageEntry].slice(-MAX_HISTORY_MESSAGES));
      await persistWithNotice(errorMessageEntry, user.id);
    } finally {
      setIsLoading(false);
    }
  };

  const saveTransactionDraft = async () => {
    if (!transactionDraft || !user) return;
    const { transactionType, amount, date, category, paymentMode, description } = transactionDraft;
    if (transactionType === 'unknown') {
      toast.error('Choose the correct section before saving.');
      return;
    }
    if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000) {
      toast.error('Enter a valid transaction amount.');
      return;
    }
    if (!date || Number.isNaN(Date.parse(`${date}T00:00:00Z`))) {
      toast.error('Choose a valid transaction date.');
      return;
    }
    if ((transactionType === 'expense' || transactionType === 'income') && !PAYMENT_MODES.includes(paymentMode as (typeof PAYMENT_MODES)[number])) {
      toast.error('Choose the payment method shown in the screenshot.');
      return;
    }
    if ((transactionType === 'expense' || transactionType === 'income') && !category.trim()) {
      toast.error('Enter a category before saving.');
      return;
    }
    if (description.length > 500) {
      toast.error('Description must be 500 characters or fewer.');
      return;
    }

    try {
      if (transactionType === 'expense') {
        const { error } = await supabase.from('expense_entries').insert({
          amount,
          date,
          category: category.trim(),
          subcategory: 'General',
          payment_mode: paymentMode,
          notes: description.trim(),
          user_id: user.id,
        });
        if (error) throw error;
        await refreshExpenses();
      } else if (transactionType === 'income') {
        const { error } = await supabase.from('income_entries').insert({
          amount,
          date,
          category: category.trim(),
          custom_category: INCOME_CATEGORIES.includes(category.trim() as (typeof INCOME_CATEGORIES)[number]) ? null : category.trim(),
          payment_mode: paymentMode,
          notes: description.trim(),
          user_id: user.id,
        });
        if (error) throw error;
        await refreshIncome();
      } else if (transactionType === 'savings') {
        if (!selectedTargetId || !financialData.savings.some((goal) => goal.id === selectedTargetId && goal.status !== 'completed')) {
          toast.error('Choose an active savings goal for this deposit.');
          return;
        }
        const { error } = await supabase.from('savings_transactions').insert({
          savings_goal_id: selectedTargetId,
          amount,
          date,
          notes: description.trim(),
          user_id: user.id,
        });
        if (error) throw error;
        await refreshSavingsTransactions();
      } else {
        if (!selectedTargetId || !financialData.investments.some((investment) => investment.id === selectedTargetId)) {
          toast.error('Choose an investment holding for this contribution.');
          return;
        }
        const { error } = await supabase.from('investment_transactions').insert({
          investment_id: selectedTargetId,
          amount,
          date,
          notes: description.trim(),
          profit_loss: 0,
          user_id: user.id,
        });
        if (error) throw error;
        await refreshInvestmentTransactions();
      }

      toast.success(`${transactionType[0].toUpperCase()}${transactionType.slice(1)} transaction saved.`);
      setTransactionDraft(null);
      setSelectedTargetId('');
    } catch (error) {
      console.error('Could not save AI transaction draft:', error);
      toast.error(error instanceof Error ? `Could not save transaction: ${error.message}` : 'Could not save transaction.');
    }
  };

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          aria-label="Open Xpenzy AI assistant"
          className="fixed bottom-24 right-4 w-14 h-14 rounded-full bg-gradient-primary shadow-glow hover:scale-110 transition-all duration-200 z-40"
          size="icon"
        >
          <Sparkles className="w-6 h-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-24 right-4 z-40 flex h-[min(560px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[380px] animate-slide-up flex-col border bg-card shadow-elevated">
          <CardHeader className="pb-3 border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                Xpenzy AI
              </CardTitle>
              <div className="flex items-center gap-1">
                {user && (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Clear AI memories"
                    title="Clear AI memories"
                    onClick={() => { void clearMemories(); }}
                    disabled={isClearingMemories || isLoading}
                    className="h-8 w-8"
                  >
                    {isClearingMemories ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                )}
                <Button variant="ghost" size="icon" aria-label="Close Xpenzy AI assistant" onClick={() => setIsOpen(false)} className="h-8 w-8">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          
          <>
            {!hasAcceptedDataUse && (
              <div className="shrink-0 space-y-3 border-b border-border bg-muted/40 p-3">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                  Allow AI chat and screenshot reading
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  When you ask a question, Xpenzy sends your question, up to 20 recent chat messages (capped at an estimated 6,000 tokens), and your current-month financial summaries to the configured Gemini API. If you attach a payment screenshot, it is sent to Gemini to read and is not stored by Xpenzy; extracted transaction details are only saved after you review and confirm them. Your chat history is saved to your Xpenzy account in Supabase. Xpenzy may also remember stable, non-sensitive preferences and facts you mention to personalize future answers; it does not train Gemini on your chats. Use the trash icon to clear these memories. Explicit requests to record a transaction or change a budget are saved to your account.
                </p>
                <Button type="button" size="sm" onClick={() => setHasAcceptedDataUse(true)}>Continue to AI</Button>
              </div>
            )}
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4" ref={scrollRef} aria-live="polite">
                {messages.map((message) => (
                  <div key={message.id} className={cn("flex", message.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted text-foreground rounded-bl-md"
                    )}>
                      {message.role === 'assistant' ? (
                        <div className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
                          <ReactMarkdown>{message.content}</ReactMarkdown>
                        </div>
                      ) : message.content}
                    </div>
                  </div>
                ))}
                {transactionDraft && (
                  <section className="rounded-xl border border-primary/25 bg-background p-3" aria-label="Review transaction draft">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold">Review transaction</h3>
                      <Button type="button" variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => { setTransactionDraft(null); setSelectedTargetId(''); }}>Discard</Button>
                    </div>
                    <div className="space-y-2.5">
                      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                        Save to section
                        <select
                          value={transactionDraft.transactionType}
                          onChange={(event) => {
                            setTransactionDraft((draft) => draft ? { ...draft, transactionType: event.target.value as TransactionType } : draft);
                            setSelectedTargetId('');
                          }}
                          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                        >
                          <option value="unknown">Choose a section</option>
                          <option value="expense">Expense</option>
                          <option value="income">Income</option>
                          <option value="savings">Savings deposit</option>
                          <option value="investment">Investment contribution</option>
                        </select>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                          Amount (₹)
                          <Input
                            type="number"
                            min="0.01"
                            max="1000000000"
                            step="0.01"
                            value={transactionDraft.amount || ''}
                            onChange={(event) => setTransactionDraft((draft) => draft ? { ...draft, amount: Number(event.target.value) } : draft)}
                            aria-label="Transaction amount"
                            className="h-9"
                          />
                        </label>
                        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                          Date
                          <Input
                            type="date"
                            value={transactionDraft.date}
                            onChange={(event) => setTransactionDraft((draft) => draft ? { ...draft, date: event.target.value } : draft)}
                            aria-label="Transaction date"
                            className="h-9"
                          />
                        </label>
                      </div>
                      {(transactionDraft.transactionType === 'expense' || transactionDraft.transactionType === 'income') && (
                        <>
                          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                            {transactionDraft.transactionType === 'expense' ? 'Expense category' : 'Income category'}
                            <Input
                              value={transactionDraft.category}
                              maxLength={100}
                              onChange={(event) => setTransactionDraft((draft) => draft ? { ...draft, category: event.target.value } : draft)}
                              placeholder={transactionDraft.transactionType === 'expense' ? 'e.g. Food, Travel' : INCOME_CATEGORIES.join(', ')}
                              aria-label="Transaction category"
                              className="h-9"
                            />
                          </label>
                          <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                            Payment method
                            <select
                              value={transactionDraft.paymentMode}
                              onChange={(event) => setTransactionDraft((draft) => draft ? { ...draft, paymentMode: event.target.value as PaymentMode } : draft)}
                              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                            >
                              <option value="Unknown">Choose payment method</option>
                              {PAYMENT_MODES.map((mode) => <option key={mode} value={mode}>{mode}</option>)}
                            </select>
                          </label>
                        </>
                      )}
                      {(transactionDraft.transactionType === 'savings' || transactionDraft.transactionType === 'investment') && (
                        <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                          {transactionDraft.transactionType === 'savings' ? 'Savings goal' : 'Investment holding'}
                          <select
                            value={selectedTargetId}
                            onChange={(event) => setSelectedTargetId(event.target.value)}
                            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground"
                          >
                            <option value="">Choose {transactionDraft.transactionType === 'savings' ? 'a savings goal' : 'an investment'}</option>
                            {transactionDraft.transactionType === 'savings'
                              ? financialData.savings.filter((goal) => goal.status !== 'completed').map((goal) => (
                                <option key={goal.id} value={goal.id}>{goal.name}</option>
                              ))
                              : financialData.investments.map((investment) => (
                                <option key={investment.id} value={investment.id}>{investment.name}</option>
                              ))}
                          </select>
                          {transactionDraft.transactionType === 'savings' && !financialData.savings.some((goal) => goal.status !== 'completed') && (
                            <span className="block text-[11px] font-normal">Create a savings goal before adding a deposit.</span>
                          )}
                          {transactionDraft.transactionType === 'investment' && financialData.investments.length === 0 && (
                            <span className="block text-[11px] font-normal">Create an investment holding before adding a contribution.</span>
                          )}
                        </label>
                      )}
                      <label className="block space-y-1 text-xs font-medium text-muted-foreground">
                        Description
                        <Input
                          value={transactionDraft.description}
                          maxLength={500}
                          onChange={(event) => setTransactionDraft((draft) => draft ? { ...draft, description: event.target.value } : draft)}
                          placeholder="Merchant or transaction details"
                          aria-label="Transaction description"
                          className="h-9"
                        />
                      </label>
                      <Button type="button" className="w-full" onClick={() => { void saveTransactionDraft(); }} disabled={isLoading || transactionDraft.transactionType === 'unknown'}>
                        Confirm and save
                      </Button>
                      <p className="text-[11px] leading-relaxed text-muted-foreground">Check the amount, section, and date. Savings and investment deposits require an existing goal or holding.</p>
                    </div>
                  </section>
                )}
                {isLoading && messages[messages.length - 1]?.role === 'user' && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-2xl rounded-bl-md px-4 py-3">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    </div>
                  </div>
                )}
                {messages.length === 1 && (
                  <div className="flex flex-wrap gap-2" aria-label="Suggested questions">
                    {[
                      'How much did I spend on food this month?',
                      'Summarize my spending this week',
                      'Suggest a monthly budget from my spending',
                    ].map((prompt) => (
                      <Button key={prompt} type="button" size="sm" variant="outline" onClick={() => setInputValue(prompt)}>
                        {prompt}
                      </Button>
                    ))}
                  </div>
                )}
              </div>

              <div className="shrink-0 border-t border-border p-3">
                {imageDataUrl && (
                  <div className="mb-2 flex items-center gap-2 rounded-lg border border-border p-2">
                    <img src={imageDataUrl} alt="Selected payment screenshot preview" className="h-12 w-12 rounded object-cover" />
                    <span className="min-w-0 flex-1 text-xs text-muted-foreground">Screenshot ready for AI to read</span>
                    <Button type="button" variant="ghost" size="icon" aria-label="Remove screenshot" className="h-7 w-7" onClick={() => setImageDataUrl(null)}>
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                )}
                <div className="flex gap-2">
                  <Input
                    placeholder={imageDataUrl ? 'Optional: say what this payment is for...' : 'Ask about your finances...'}
                    aria-label="Ask Xpenzy AI about your finances"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void handleSendMessage();
                      }
                    }}
                    onPaste={(event) => {
                      const imageItem = Array.from(event.clipboardData.items).find((item) => item.type.startsWith('image/'));
                      const file = imageItem?.getAsFile();
                      if (file) {
                        event.preventDefault();
                        void selectImage(file);
                      }
                    }}
                    className="min-w-0 flex-1"
                    disabled={!hasAcceptedDataUse || isLoading || isHistoryLoading}
                  />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    aria-label="Upload payment screenshot"
                    disabled={!hasAcceptedDataUse || isLoading || isHistoryLoading}
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void selectImage(file);
                      event.target.value = '';
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label="Upload payment screenshot"
                    title="Upload or paste a payment screenshot"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={!hasAcceptedDataUse || isLoading || isHistoryLoading}
                  >
                    <ImagePlus className="h-4 w-4" />
                  </Button>
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    aria-label={imageDataUrl ? 'Read screenshot' : 'Send question'}
                    disabled={!hasAcceptedDataUse || isLoading || isHistoryLoading || (!inputValue.trim() && !imageDataUrl)}
                  >
                    {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : imageDataUrl ? <Sparkles className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {hasAcceptedDataUse
                    ? 'JPEG, PNG, or WebP up to 3 MB. Verify extracted details before saving.'
                    : 'Continue to AI above to enable messaging and screenshot upload.'}
                </p>
              </div>
          </>
        </Card>
      )}
    </>
  );
};
