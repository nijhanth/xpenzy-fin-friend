import { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { supabase, SUPABASE_URL } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

const CHAT_URL = `${SUPABASE_URL}/functions/v1/ai-assistant`;

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export const FloatingAIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm **Xpenzy AI** 🤖\n\nI can help you with:\n- 📊 Spending analysis\n- 💡 Money-saving tips\n- 📈 Financial insights\n\nAsk me anything about your finances!",
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [hasAcceptedDataUse, setHasAcceptedDataUse] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: inputValue };
    const currentMessages = [...messages, userMsg];
    setMessages(currentMessages);
    setInputValue('');
    setIsLoading(true);

    let assistantContent = '';

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData?.session?.access_token;
      if (!accessToken) throw new Error('Please sign in to use AI assistant');

      const resp = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          action: 'chat',
          messages: currentMessages.filter(m => m.id !== '1').map(m => ({ role: m.role, content: m.content })),
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        if (resp.status === 402 || String(err.error || '').includes('LOVABLE_API_KEY')) {
          throw new Error('AI is not configured or has no available credits. You can still use Xpenzy without AI.');
        }
        if (resp.status === 429) {
          throw new Error('AI is temporarily busy. Please try again later.');
        }
        throw new Error(err.error || 'AI service error');
      }

      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No stream');

      const decoder = new TextDecoder();
      let buffer = '';

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
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantContent += content;
              setMessages(prev => {
                const last = prev[prev.length - 1];
                if (last?.role === 'assistant' && last.id.startsWith('ai-')) {
                  return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantContent } : m);
                }
                return [...prev, { id: 'ai-' + Date.now(), role: 'assistant', content: assistantContent }];
              });
            }
          } catch { buffer = line + '\n' + buffer; break; }
        }
      }
    } catch (e: any) {
      setMessages(prev => [...prev, {
        id: 'err-' + Date.now(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${e.message}. Please try again.`,
      }]);
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
              <Button variant="ghost" size="icon" aria-label="Close Xpenzy AI assistant" onClick={() => setIsOpen(false)} className="h-8 w-8">
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          
          {!hasAcceptedDataUse ? (
            <div className="flex flex-1 flex-col justify-center gap-4 p-5">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Sparkles className="h-4 w-4 text-primary" aria-hidden />
                Your data stays in your control
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                When you ask a question, Xpenzy sends your current-month recorded transactions, budget, savings and investment summaries to the configured Lovable AI service to prepare an answer. Nothing is sent until you continue and ask.
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
                    disabled={isLoading}
                  />
                  <Button
                    onClick={handleSendMessage}
                    size="icon"
                    aria-label="Send question"
                    disabled={isLoading || !inputValue.trim()}
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
