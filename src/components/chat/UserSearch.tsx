import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, MessageCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface UserSearchProps {
  currentUserId: string;
  onStartChat: (userId: string, userName: string) => void;
}

interface Profile {
  user_id: string;
  display_name: string;
}

export const UserSearch = ({ currentUserId, onStartChat }: UserSearchProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [users, setUsers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setUsers([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      // Use secure RPC function that only returns display_name (not email)
      const { data, error } = await supabase
        .rpc('search_users_by_name', {
          search_query: searchQuery,
          current_user_id: currentUserId
        });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to search users',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search users by name..."
          className="pl-10"
        />
      </div>

      {users.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {users.map((user) => (
            <div
              key={user.user_id}
              className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-secondary/50 transition-colors"
            >
              <span className="font-medium">{user.display_name || 'Unknown User'}</span>
              <Button
                size="sm"
                onClick={() => onStartChat(user.user_id, user.display_name || 'Unknown User')}
              >
                <MessageCircle className="h-4 w-4 mr-2" />
                Chat
              </Button>
            </div>
          ))}
        </div>
      )}

      {searchQuery && users.length === 0 && !loading && (
        <p className="text-center text-muted-foreground">No users found</p>
      )}
    </div>
  );
};
