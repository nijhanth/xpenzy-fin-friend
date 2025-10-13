import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDistanceToNow } from 'date-fns';

interface ChatMessageProps {
  id: string;
  content: string;
  userId: string;
  currentUserId: string;
  userName: string;
  createdAt: string;
  onDelete: (messageId: string) => void;
}

export const ChatMessage = ({ 
  id, 
  content, 
  userId, 
  currentUserId, 
  userName, 
  createdAt,
  onDelete 
}: ChatMessageProps) => {
  const isOwnMessage = userId === currentUserId;

  return (
    <div className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[70%] ${isOwnMessage ? 'items-end' : 'items-start'} flex flex-col`}>
        {!isOwnMessage && (
          <span className="text-xs text-muted-foreground mb-1">{userName}</span>
        )}
        <div 
          className={`rounded-lg px-4 py-2 ${
            isOwnMessage 
              ? 'bg-primary text-primary-foreground' 
              : 'bg-secondary text-secondary-foreground'
          }`}
        >
          <p className="break-words">{content}</p>
          <div className="flex items-center justify-between gap-2 mt-1">
            <span className="text-xs opacity-70">
              {formatDistanceToNow(new Date(createdAt), { addSuffix: true })}
            </span>
            {isOwnMessage && (
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 opacity-70 hover:opacity-100"
                onClick={() => onDelete(id)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
