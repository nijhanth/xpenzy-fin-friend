import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2, Trash2 } from 'lucide-react';
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
  const { refreshBudgets, refreshExpenses } = useFinancial();
  const { user, loading: authLoading } = useAuth();
  const userId = user?.id;
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [isClearingMemories, setIsClearingMemories] = useState(false);
  const [hasAcceptedDataUse, setHasAcceptedDataUse] = useState(false);
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
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.id === assistantId) {
                  return prev.map((message, index) => index === prev.length - 1
                    ? { ...message, content: assistantContent }
                    : message);
                }
                return [...prev, { id: assistantId, role: 'assistant', content: assistantContent }]
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
        <Card className="fixed bottom-24 right-4 z-40 flex h-[min(480px,calc(100dvh-7rem))] w-[calc(100vw-2rem)] max-w-[340px] animate-slide-up flex-col border bg-card shadow-elevated">
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
          
          {!hasAcceptedDataUse ? (
            <div className="flex flex-1 flex-col justify-center gap-4 p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Your data stays in your control
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                When you ask a question, Xpenzy sends your question, up to 20 recent chat messages (capped at an estimated 6,000 tokens), and your current-month financial summaries to the configured Gemini API. Your chat history is saved to your Xpenzy account in Supabase. Xpenzy may also remember stable, non-sensitive preferences and facts you mention to personalize future answers; it does not train Gemini on your chats. Use the trash icon to clear these memories. Explicit requests to record an expense or change a budget are saved to your account.
              </p>
              <Button onClick={() => setHasAcceptedDataUse(true)}>Continue to AI</Button>
              <p className="text-xs text-muted-foreground">AI responses are suggestions, not financial advice. Review your records before acting.</p>
            </div>
          ) : (
            <>
              <div className="flex-1 space-y-3 overflow-y-auto p-4" ref={scrollRef} aria-live="polite">
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

              <div className="border-t border-border p-3">
                <div className="flex gap-2">
                  <Input
                    placeholder="Ask about your finances..."
                    aria-label="Ask Xpenzy AI about your finances"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="min-w-0 flex-1"
                    disabled={isLoading || isHistoryLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    aria-label="Send question"
                    disabled={isLoading || isHistoryLoading || !inputValue.trim()}
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">AI-generated answers may be inaccurate. Verify amounts in Transactions.</p>
              </div>
            </>
          )}
        </Card>
      )}
    </>
  );
};
