import { BottomNavigation } from './BottomNavigation';
import { FloatingAIAssistant } from '@/components/ui/floating-ai-assistant';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AppLayout = ({ children, className, activeTab, onTabChange }: AppLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
      {/* Main Content */}
      <main className={cn(
        "pb-20 min-h-screen",
        className
      )}>
        {children}
      </main>
      
      {/* Bottom Navigation */}
      <BottomNavigation 
        activeTab={activeTab} 
        onTabChange={onTabChange} 
      />
      
    </div>
  );
};