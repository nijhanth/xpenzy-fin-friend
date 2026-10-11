import { useState, useEffect, useRef } from 'react';
import { Send, Plus, X, ArrowLeft, Trash2, Search, MessageCircle, Users, MoreHorizontal, Sparkles, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/useChat';
import { usePresence } from '@/hooks/usePresence';
import { formatDistanceToNow } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  updated_at: string;
  other_user_name?: string;
  other_user_id?: string;
}

interface Profile {
  user_id: string;
  display_name: string;
  email: string;
}

export const Message = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Profile[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [conversationToDelete, setConversationToDelete] = useState<string | null>(null);
  const [conversationSearch, setConversationSearch] = useState('');
  const [searching, setSearching] = useState(false);
  const [loadingConversations, setLoadingConversations] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, loading, sendMessage } = useChat(
    selectedConversation,
    user?.id || ''
  );
  
  const { isUserOnline } = usePresence(user?.id, selectedConversation);

  useEffect(() => {
    if (user) {
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  };

  const fetchConversations = async () => {
    if (!user) return;

    setLoadingConversations(true);
    try {
      const { data: participations, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const conversationIds = participations?.map((p) => p.conversation_id) || [];

      if (conversationIds.length === 0) {
        setConversations([]);
        return;
      }

      {
        const { data: convs, error: convsError } = await supabase
          .from('conversations')
          .select('*')
          .in('id', conversationIds)
          .order('updated_at', { ascending: false });

        if (convsError) throw convsError;

        const enrichedConvs = await Promise.all(
          (convs || []).map(async (conv) => {
            if (conv.type === 'individual') {
              const { data: participants } = await supabase
                .from('conversation_participants')
                .select('user_id')
                .eq('conversation_id', conv.id)
                .neq('user_id', user.id)
                .single();

              if (participants) {
                const { data: profile } = await supabase
                  .from('profiles')
                  .select('user_id, display_name')
                  .eq('user_id', participants.user_id)
                  .single();

                const displayName = profile?.display_name || 'User';

                return {
                  ...conv,
                  other_user_name: displayName,
                  other_user_id: participants.user_id,
                };
              }
            }
            return conv;
          })
        );

        setConversations(enrichedConvs);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoadingConversations(false);
    }
  };

  const handleSearch = async () => {
    if (!user) return;
    
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      toast({
        title: 'Error',
        description: 'Please enter a name to search',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    try {
      const { data, error } = await supabase
        .rpc('search_users_by_name', {
          search_query: trimmedQuery,
          current_user_id: user.id
        });

      if (error) throw error;
      const profiles = (data || []).map((d: any) => ({
        user_id: d.user_id,
        display_name: d.display_name,
        email: null
      }));
      setSearchResults(profiles);
      
      if (!data || data.length === 0) {
        toast({
          title: 'No results',
          description: 'No users found matching your search',
        });
      }
    } catch (error) {
      console.error('Error searching users:', error);
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const startNewChat = async (otherUserId: string, otherUserName: string) => {
    if (!user) return;

    try {
      // Check if conversation already exists
      const { data: existingParticipations } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      const conversationIds = existingParticipations?.map((p) => p.conversation_id) || [];

      if (conversationIds.length > 0) {
        const { data: otherParticipations } = await supabase
          .from('conversation_participants')
          .select('conversation_id')
          .eq('user_id', otherUserId)
          .in('conversation_id', conversationIds);

        if (otherParticipations && otherParticipations.length > 0) {
          const existingConvId = otherParticipations[0].conversation_id;
          setSelectedConversation(existingConvId);
          setShowModal(false);
          setSearchQuery('');
          return;
        }
      }

      // Use the database function to create conversation and add participants atomically
      const { data: conversationId, error: convError } = await supabase
        .rpc('create_conversation_with_participants', {
          p_type: 'individual',
          p_user1_id: user.id,
          p_user2_id: otherUserId,
        });

      if (convError) {
        console.error('Error creating conversation:', convError);
        throw convError;
      }

      // Now we can access the conversation since both users are participants
      setSelectedConversation(conversationId);
      setShowModal(false);
      setSearchQuery('');
      await fetchConversations();

      toast({
        title: 'Success',
        description: `Started chat with ${otherUserName}`,
      });
    } catch (error: any) {
      console.error('Error in startNewChat:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  const handleSendMessage = async () => {
    if (!messageInput.trim() || !selectedConversation) return;

    await sendMessage(messageInput.trim());
    setMessageInput('');
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleDeleteClick = (conversationId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversationToDelete(conversationId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!conversationToDelete) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationToDelete);

      if (error) throw error;

      // Update UI immediately
      setConversations(conversations.filter(c => c.id !== conversationToDelete));
      
      // If deleted conversation was selected, clear selection
      if (selectedConversation === conversationToDelete) {
        setSelectedConversation(null);
      }

      toast({
        title: 'Success',
        description: 'Chat deleted successfully',
      });
    } catch (error: any) {
      console.error('Error deleting conversation:', error);
      toast({
        title: 'Error',
        description: error?.message || 'Failed to delete chat',
        variant: 'destructive',
      });
    } finally {
      setDeleteDialogOpen(false);
      setConversationToDelete(null);
    }
  };

  if (!user) {
    return <div className="flex min-h-[60vh] items-center justify-center"><p className="text-muted-foreground">Please log in to access messages</p></div>;
  }

  const currentConversation = conversations.find((c) => c.id === selectedConversation);
  const visibleConversations = conversations.filter((conv) =>
    (conv.type === 'group' ? conv.name : conv.other_user_name || 'Chat')?.toLowerCase().includes(conversationSearch.trim().toLowerCase())
  );
  const conversationName = currentConversation?.type === 'group'
    ? currentConversation.name || 'Group chat'
    : currentConversation?.other_user_name || 'Chat';

  return (
    <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:px-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <Sparkles className="h-3.5 w-3.5" /> Your community
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Messages</h1>
          <p className="mt-1 text-sm text-muted-foreground">Stay connected with your finance circle.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl bg-primary px-3.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-4"
        >
          <Plus className="h-4 w-4" /> <span className="hidden sm:inline">New chat</span><span className="sm:hidden">New</span>
        </button>
      </div>

      <div className="flex min-h-[460px] overflow-hidden rounded-2xl border border-border/80 bg-card shadow-[0_16px_48px_-32px_hsl(var(--foreground)/0.3)] md:h-[min(70vh,760px)] md:min-h-[560px]">
        <aside className={`${selectedConversation ? 'hidden' : 'flex'} w-full flex-col border-r border-border/70 bg-card md:flex md:w-[320px] md:shrink-0 lg:w-[360px]`}>
          <div className="border-b border-border/70 p-4 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-foreground">Your chats</h2>
                <p className="mt-0.5 text-xs text-muted-foreground">{conversations.length} conversation{conversations.length === 1 ? '' : 's'}</p>
              </div>
              <button onClick={() => setShowModal(true)} aria-label="Start a new chat" className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input value={conversationSearch} onChange={(e) => setConversationSearch(e.target.value)} placeholder="Search conversations" aria-label="Search conversations" className="h-10 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10" />
            </div>
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto p-2.5 sm:p-3">
            {loadingConversations ? (
              <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading conversations…</div>
            ) : visibleConversations.length === 0 ? (
              <div className="flex h-full min-h-64 flex-col items-center justify-center px-6 py-10 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircle className="h-6 w-6" /></div>
                <h3 className="font-semibold text-foreground">{conversationSearch ? 'No matches found' : 'Your chats start here'}</h3>
                <p className="mt-1.5 max-w-[230px] text-sm leading-5 text-muted-foreground">{conversationSearch ? 'Try another name or clear your search.' : 'Start a conversation and keep your finance circle in the loop.'}</p>
                {!conversationSearch && <button onClick={() => setShowModal(true)} className="mt-4 text-sm font-semibold text-primary hover:underline">Find someone to chat with</button>}
              </div>
            ) : visibleConversations.map((conv) => {
              const name = conv.type === 'group' ? conv.name || 'Group chat' : conv.other_user_name || 'Chat';
              const selected = selectedConversation === conv.id;
              return (
                <div key={conv.id} className={`group flex w-full items-center gap-3 rounded-xl p-3 text-left transition ${selected ? 'bg-primary/10 ring-1 ring-primary/15' : 'hover:bg-muted/70'}`}>
                  <button onClick={() => setSelectedConversation(conv.id)} className="flex min-w-0 flex-1 items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <div className={`relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-sm font-bold ${selected ? 'bg-primary text-primary-foreground' : 'bg-gradient-to-br from-primary/20 to-primary/5 text-primary'}`}>
                      {name.charAt(0).toUpperCase()}
                      {conv.type === 'individual' && conv.other_user_id && isUserOnline(conv.other_user_id) && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />}
                    </div>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-2"><span className="truncate text-sm font-semibold text-foreground">{name}</span><span className="shrink-0 text-[11px] text-muted-foreground">{formatDistanceToNow(new Date(conv.updated_at), { addSuffix: false })}</span></span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">{conv.type === 'group' ? <Users className="h-3 w-3" /> : <MessageCircle className="h-3 w-3" />}{conv.type === 'group' ? 'Group conversation' : conv.other_user_id && isUserOnline(conv.other_user_id) ? 'Active now' : 'Conversation'}</span>
                    </span>
                  </button>
                  <button onClick={(e) => handleDeleteClick(conv.id, e)} aria-label={`Delete chat with ${name}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground opacity-100 transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-2 border-t border-border/70 px-4 py-3 text-xs text-muted-foreground"><span className="h-2 w-2 rounded-full bg-emerald-500" /> Online status updates automatically</div>
        </aside>

        <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} min-w-0 flex-1 flex-col bg-background/50`}>
          {selectedConversation && currentConversation ? (
            <>
              <header className="flex min-h-[72px] items-center justify-between border-b border-border/70 bg-card/85 px-3 py-3 backdrop-blur sm:px-5">
                <div className="flex min-w-0 items-center gap-3">
                  <button onClick={() => setSelectedConversation(null)} aria-label="Back to conversations" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-muted-foreground hover:bg-accent hover:text-foreground md:hidden"><ArrowLeft className="h-5 w-5" /></button>
                  <div className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 font-bold text-primary">
                    {conversationName.charAt(0).toUpperCase()}
                    {currentConversation.type === 'individual' && currentConversation.other_user_id && isUserOnline(currentConversation.other_user_id) && <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-emerald-500" />}
                  </div>
                  <div className="min-w-0">
                    <h2 className="truncate text-sm font-semibold text-foreground sm:text-base">{conversationName}</h2>
                    <p className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                      {currentConversation.type === 'group' ? <><Users className="h-3 w-3" /> Group chat</> : currentConversation.other_user_id && isUserOnline(currentConversation.other_user_id) ? <><span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Online</> : 'Direct message'}
                    </p>
                  </div>
                </div>
                <button onClick={(e) => handleDeleteClick(currentConversation.id, e)} aria-label="Delete this chat" className="flex h-9 w-9 items-center justify-center rounded-xl text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><MoreHorizontal className="h-5 w-5" /></button>
              </header>

              <main className="flex-1 space-y-5 overflow-y-auto px-3 py-5 sm:px-6 sm:py-7">
                <div className="mx-auto flex max-w-xl items-center gap-3 text-[10px] font-medium uppercase tracking-[0.15em] text-muted-foreground/70"><span className="h-px flex-1 bg-border/70" /> Conversation <span className="h-px flex-1 bg-border/70" /></div>
                {loading && messages.length === 0 ? (
                  <div className="flex h-48 items-center justify-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin" /> Loading messages…</div>
                ) : messages.length === 0 ? (
                  <div className="flex h-[min(40vh,320px)] flex-col items-center justify-center text-center">
                    <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary"><MessageCircle className="h-5 w-5" /></div>
                    <h3 className="font-semibold text-foreground">Say hello</h3>
                    <p className="mt-1 max-w-xs text-sm text-muted-foreground">This is the beginning of your conversation with {conversationName}.</p>
                  </div>
                ) : messages.map((msg) => {
                  const isOwnMessage = msg.user_id === user.id;
                  return (
                    <div key={msg.id} className={`flex items-end gap-2.5 ${isOwnMessage ? 'justify-end' : 'justify-start'}`}>
                      {!isOwnMessage && <div className="mb-5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold text-muted-foreground">{(msg.profiles?.display_name || 'U').charAt(0).toUpperCase()}</div>}
                      <div className={`max-w-[86%] sm:max-w-[72%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                        {!isOwnMessage && <span className="mb-1 px-1 text-[11px] font-medium text-muted-foreground">{msg.profiles?.display_name || 'Unknown'}</span>}
                        <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed shadow-sm ${isOwnMessage ? 'rounded-br-md bg-primary text-primary-foreground' : 'rounded-bl-md border border-border/70 bg-card text-foreground'}`}>
                          <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        </div>
                        <span className="mt-1 px-1 text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}</span>
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </main>

              <footer className="border-t border-border/70 bg-card/90 p-3 sm:p-4">
                <div className="mx-auto flex max-w-4xl items-end gap-2 rounded-2xl border border-input bg-background p-2 shadow-sm transition focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/10">
                  <textarea ref={textareaRef} value={messageInput} onChange={(e) => { setMessageInput(e.target.value); autoResize(); }} onKeyDown={handleKeyPress} rows={1} placeholder="Write a message…" aria-label="Write a message" className="max-h-32 min-h-10 flex-1 resize-none bg-transparent px-2 py-2.5 text-sm text-foreground outline-none placeholder:text-muted-foreground" />
                  <button onClick={handleSendMessage} disabled={!messageInput.trim() || loading} aria-label="Send message" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"><Send className="h-4 w-4" /></button>
                </div>
                <p className="mt-2 hidden text-center text-[10px] text-muted-foreground sm:block">Press Enter to send · Shift + Enter for a new line</p>
              </footer>
            </>
          ) : (
            <div className="hidden flex-1 flex-col items-center justify-center p-8 text-center md:flex">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-[1.75rem] bg-gradient-to-br from-primary/15 to-primary/5 text-primary ring-1 ring-primary/10"><MessageCircle className="h-8 w-8" /></div>
              <h2 className="text-xl font-bold tracking-tight text-foreground">A little closer, every day</h2>
              <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">Choose a conversation to pick up where you left off, or start a new one with someone in your circle.</p>
              <button onClick={() => setShowModal(true)} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90"><Plus className="h-4 w-4" /> Start a conversation</button>
            </div>
          )}
        </div>
      </div>

      {/* Start conversation dialog */}
      {showModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-foreground/35 p-4 backdrop-blur-sm" onMouseDown={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="new-chat-title" className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-2xl">
            <div className="flex items-start justify-between border-b border-border/70 p-5">
              <div><div className="mb-2 flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Users className="h-4 w-4" /></div><h3 id="new-chat-title" className="font-semibold text-foreground">Start a conversation</h3><p className="mt-1 text-sm text-muted-foreground">Find someone by their name.</p></div>
              <button onClick={() => { setShowModal(false); setSearchQuery(''); setSearchResults([]); }} aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>
            <div className="p-5">
              <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="flex gap-2">
                <div className="relative flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><input value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} type="search" placeholder="Search by name" autoFocus className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary/60 focus:ring-2 focus:ring-primary/10" /></div>
                <button type="submit" disabled={searching || !searchQuery.trim()} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:bg-primary/90 disabled:opacity-50">{searching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}</button>
              </form>
              <div className="mt-4 max-h-64 space-y-1 overflow-y-auto">
                {searchResults.length === 0 ? <div className="rounded-xl bg-muted/50 px-4 py-8 text-center"><div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-background text-muted-foreground"><Search className="h-4 w-4" /></div><p className="text-sm text-muted-foreground">Search for someone to begin a chat.</p></div> : searchResults.map((profile) => (
                  <button key={profile.user_id} onClick={() => startNewChat(profile.user_id, profile.display_name || 'Unknown')} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                    <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">{(profile.display_name || 'U').charAt(0).toUpperCase()}</span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-semibold text-foreground">{profile.display_name || 'Unknown'}</span><span className="text-xs text-muted-foreground">Xpenzy member</span></span><Check className="h-4 w-4 text-muted-foreground" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be undone and all messages will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
};
