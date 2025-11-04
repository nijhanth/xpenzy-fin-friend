import { useState, useEffect, useRef } from 'react';
import { Send, Plus, X, ArrowLeft, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useChat } from '@/hooks/useChat';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { messages, loading, sendMessage } = useChat(
    selectedConversation,
    user?.id || ''
  );

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

    try {
      const { data: participations, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', user.id);

      if (error) throw error;

      const conversationIds = participations?.map((p) => p.conversation_id) || [];

      if (conversationIds.length > 0) {
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
                  .select('display_name')
                  .eq('user_id', participants.user_id)
                  .single();

                return {
                  ...conv,
                  other_user_name: profile?.display_name || 'Unknown',
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
    }
  };

  const handleSearch = async () => {
    if (!user) return;
    
    const trimmedQuery = searchQuery.trim();
    if (!trimmedQuery) {
      toast({
        title: 'Error',
        description: 'Please enter an email to search',
        variant: 'destructive',
      });
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('user_id, display_name, email')
        .neq('user_id', user.id)
        .or(`display_name.ilike.%${trimmedQuery}%,email.ilike.%${trimmedQuery}%`)
        .limit(10);

      if (error) throw error;
      setSearchResults(data || []);
      
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
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20 flex items-center justify-center p-4">
        <p className="text-muted-foreground">Please log in to access messages</p>
      </div>
    );
  }

  const currentConversation = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="flex h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Sidebar */}
      <aside className={`${selectedConversation ? 'hidden' : 'flex'} md:flex md:flex-col w-full md:w-1/4 bg-card shadow-lg border-r border-border`}>
        <div className="p-4 flex items-center justify-between border-b border-border">
          <h2 className="font-semibold text-lg text-foreground">Chats</h2>
          <button
            onClick={() => setShowModal(true)}
            className="bg-primary text-primary-foreground px-3 py-1 rounded-lg text-sm hover:bg-primary/90 transition flex items-center gap-1"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {conversations.length === 0 ? (
            <p className="text-center text-muted-foreground py-4 text-sm">
              No chats yet. Click + to start one.
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => setSelectedConversation(conv.id)}
                className={`flex items-center space-x-3 p-3 hover:bg-accent rounded-lg cursor-pointer transition group ${
                  selectedConversation === conv.id ? 'bg-accent' : ''
                }`}
              >
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  {(conv.other_user_name || conv.name || 'C')[0].toUpperCase()}
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">
                    {conv.type === 'group' ? conv.name : conv.other_user_name || 'Chat'}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(conv.updated_at), { addSuffix: true })}
                  </p>
                </div>
                <button
                  onClick={(e) => handleDeleteClick(conv.id, e)}
                  className="opacity-0 group-hover:opacity-100 p-2 hover:bg-destructive/10 rounded-lg transition-all"
                  aria-label="Delete chat"
                >
                  <Trash2 className="w-4 h-4 text-destructive" />
                </button>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Chat Window */}
      <div className={`${!selectedConversation ? 'hidden md:flex' : 'flex'} flex-1 flex-col relative h-full`}>
        {selectedConversation && currentConversation ? (
          <div className="flex flex-col h-full max-h-screen md:max-h-full pb-24 md:pb-0">
            <header className="bg-card shadow p-4 flex items-center justify-between border-b border-border">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setSelectedConversation(null)}
                  className="md:hidden mr-2"
                >
                  <ArrowLeft className="w-5 h-5 text-foreground" />
                </button>
                <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-semibold">
                  {(currentConversation.other_user_name || currentConversation.name || 'C')[0].toUpperCase()}
                </div>
                <div>
                  <h2 className="font-semibold text-lg text-foreground">
                    {currentConversation.type === 'group'
                      ? currentConversation.name
                      : currentConversation.other_user_name || 'Chat'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {currentConversation.type === 'group' ? 'Group Chat' : 'Online'}
                  </p>
                </div>
              </div>
            </header>

            <main className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
              {messages.map((msg) => {
                const isOwnMessage = msg.user_id === user.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[70%] rounded-xl px-4 py-2 break-words ${
                        isOwnMessage
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-secondary text-secondary-foreground'
                      }`}
                    >
                      {!isOwnMessage && (
                        <p className="text-xs opacity-70 mb-1">
                          {msg.profiles?.display_name || 'Unknown'}
                        </p>
                      )}
                      <p>{msg.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </main>

            <footer className="flex-shrink-0 bg-card p-4 border-t border-border flex gap-2">
              <textarea
                ref={textareaRef}
                value={messageInput}
                onChange={(e) => {
                  setMessageInput(e.target.value);
                  autoResize();
                }}
                onKeyPress={handleKeyPress}
                rows={1}
                placeholder="Type your message..."
                className="flex-1 border border-input bg-background rounded-xl px-4 py-2 focus:ring-2 focus:ring-ring focus:outline-none resize-none text-foreground placeholder:text-muted-foreground"
              />
              <button
                onClick={handleSendMessage}
                disabled={!messageInput.trim() || loading}
                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:bg-primary/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="w-5 h-5" />
              </button>
            </footer>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <p>Select a chat to start messaging</p>
          </div>
        )}
      </div>

      {/* User Search Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-4">
          <div className="bg-card rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-semibold text-lg text-foreground">Find New User</h3>
              <button
                onClick={() => {
                  setShowModal(false);
                  setSearchQuery('');
                  setSearchResults([]);
                }}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                type="text"
                placeholder="Search user by email or name"
                className="flex-1 border border-input bg-background rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:outline-none"
              />
              <button
                onClick={handleSearch}
                className="bg-primary text-primary-foreground px-4 py-2 rounded-lg hover:bg-primary/90 transition font-medium"
              >
                Search
              </button>
            </div>
            <div className="max-h-60 overflow-y-auto">
              {searchResults.length === 0 ? (
                <p className="text-center text-muted-foreground py-4 text-sm">
                  Enter an email and click Search to find users
                </p>
              ) : (
                searchResults.map((profile) => (
                  <div
                    key={profile.user_id}
                    onClick={() => startNewChat(profile.user_id, profile.display_name || profile.email || 'Unknown')}
                    className="p-3 hover:bg-accent rounded-lg cursor-pointer transition"
                  >
                    <p className="font-medium text-foreground">{profile.display_name || profile.email || 'Unknown'}</p>
                    {profile.email && profile.display_name && (
                      <p className="text-xs text-muted-foreground">{profile.email}</p>
                    )}
                  </div>
                ))
              )}
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
    </div>
  );
};
