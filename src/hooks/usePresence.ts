import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface PresenceState {
  [key: string]: {
    user_id: string;
    online_at: string;
  }[];
}

export const usePresence = (userId: string | undefined, conversationId: string | null) => {
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !conversationId) return;

    const channelName = `presence-${conversationId}`;
    const channel = supabase.channel(channelName);

    channel
      .on('presence', { event: 'sync' }, () => {
        const state: PresenceState = channel.presenceState();
        const online = new Set<string>();
        
        Object.values(state).forEach((presences) => {
          presences.forEach((presence) => {
            online.add(presence.user_id);
          });
        });
        
        setOnlineUsers(online);
      })
      .on('presence', { event: 'join' }, ({ newPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          newPresences.forEach((presence: any) => {
            if (presence.user_id) {
              next.add(presence.user_id);
            }
          });
          return next;
        });
      })
      .on('presence', { event: 'leave' }, ({ leftPresences }) => {
        setOnlineUsers((prev) => {
          const next = new Set(prev);
          leftPresences.forEach((presence: any) => {
            if (presence.user_id) {
              next.delete(presence.user_id);
            }
          });
          return next;
        });
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: userId,
            online_at: new Date().toISOString(),
          });
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, conversationId]);

  const isUserOnline = useCallback(
    (checkUserId: string) => onlineUsers.has(checkUserId),
    [onlineUsers]
  );

  return { onlineUsers, isUserOnline };
};
