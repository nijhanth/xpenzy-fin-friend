import { BottomNavigation } from './BottomNavigation';
import { FloatingAIAssistant } from '@/components/ui/floating-ai-assistant';
import { cn } from '@/lib/utils';

interface AppLayoutProps {
  children: React.ReactNode;
  className?: string;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const AppLayout = ({ children, className, activeTab, onTabChange }: AppLayoutProps) => (
  <div className="min-h-screen bg-background relative font-xpenzy">
    <main className={cn('pt-[env(safe-area-inset-top)] pb-24 min-h-screen', className)}>{children}</main>
    <BottomNavigation activeTab={activeTab} onTabChange={onTabChange} />
    <FloatingAIAssistant />
  </div>
);
