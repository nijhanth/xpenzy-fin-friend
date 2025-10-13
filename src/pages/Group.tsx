import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Users, MessageCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { ChatMessage } from '@/components/chat/ChatMessage';
import { MessageInput } from '@/components/chat/MessageInput';
import { UserSearch } from '@/components/chat/UserSearch';
import { useChat } from '@/hooks/useChat';

interface Conversation {
  id: string;
  name: string | null;
  type: string;
  updated_at: string;
}

export const Group = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [groupConversationId, setGroupConversationId] = useState<string | null>(null);
  const [showUserSearch, setShowUserSearch] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const { messages, loading, sendMessage, deleteMessage } = useChat(
    selectedConversation,
    user?.id || ''
  );

  useEffect(() => {
    if (user) {
      initializeGroupChat();
      fetchConversations();
    }
  }, [user]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeGroupChat = async () => {
    if (!user) return;

    try {
      // Check if group conversation exists
      const { data: existing } = await supabase
        .from('conversations')
        .select('id')
        .eq('type', 'group')
        .eq('name', 'Family Expenses')
        .single();

      if (existing) {
        setGroupConversationId(existing.id);
        return;
      }

      // Create group conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          name: 'Family Expenses',
          type: 'group',
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add current user as participant
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert({
          conversation_id: conversation.id,
          user_id: user.id,
        });

      if (partError) throw partError;

      setGroupConversationId(conversation.id);
    } catch (error) {
      console.error('Error initializing group chat:', error);
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
        setConversations(convs || []);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load conversations',
        variant: 'destructive',
      });
    }
  };

  const startIndividualChat = async (otherUserId: string, otherUserName: string) => {
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
          setShowUserSearch(false);
          return;
        }
      }

      // Create new individual conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          type: 'individual',
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add both users as participants
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert([
          { conversation_id: conversation.id, user_id: user.id },
          { conversation_id: conversation.id, user_id: otherUserId },
        ]);

      if (partError) throw partError;

      setSelectedConversation(conversation.id);
      setShowUserSearch(false);
      fetchConversations();

      toast({
        title: 'Success',
        description: `Started chat with ${otherUserName}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to start chat',
        variant: 'destructive',
      });
    }
  };

  const openGroupChat = () => {
    if (groupConversationId) {
      setSelectedConversation(groupConversationId);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-background p-4 flex items-center justify-center">
        <p className="text-muted-foreground">Please log in to access chat</p>
      </div>
    );
  }

  if (selectedConversation) {
    const currentConversation = conversations.find((c) => c.id === selectedConversation);

    return (
      <div className="min-h-screen bg-background flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedConversation(null)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold">
                {currentConversation?.name || 'Chat'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {currentConversation?.type === 'group' ? 'Group Chat' : 'Individual Chat'}
              </p>
            </div>
          </div>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-2">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                id={message.id}
                content={message.content}
                userId={message.user_id}
                currentUserId={user.id}
                userName={message.profiles?.display_name || 'Unknown'}
                createdAt={message.created_at}
                onDelete={deleteMessage}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-border">
          <MessageInput onSend={sendMessage} disabled={loading} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Chats</h1>
          <p className="text-muted-foreground">Messages</p>
        </div>
        <Dialog open={showUserSearch} onOpenChange={setShowUserSearch}>
          <DialogTrigger asChild>
            <Button>
              <MessageCircle className="w-4 h-4 mr-2" />
              New Chat
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Start a Chat</DialogTitle>
            </DialogHeader>
            <UserSearch
              currentUserId={user.id}
              onStartChat={startIndividualChat}
            />
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Group Chat</CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            variant="outline"
            onClick={openGroupChat}
          >
            <Users className="w-5 h-5 mr-2" />
            Family Expenses Group
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Individual Chats</CardTitle>
        </CardHeader>
        <CardContent>
          {conversations.filter((c) => c.type === 'individual').length === 0 ? (
            <p className="text-center text-muted-foreground py-4">
              No individual chats yet. Start one using the button above.
            </p>
          ) : (
            <div className="space-y-2">
              {conversations
                .filter((c) => c.type === 'individual')
                .map((conversation) => (
                  <Button
                    key={conversation.id}
                    className="w-full justify-start"
                    variant="outline"
                    onClick={() => setSelectedConversation(conversation.id)}
                  >
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat
                  </Button>
                ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};