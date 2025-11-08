import { 
  Home, 
  PiggyBank, 
  CreditCard, 
  TrendingUp, 
  BarChart3, 
  Target,
  Settings,
  Wallet,
  MessageSquare,
  Calendar,
  FileText,
  StickyNote,
  Shield
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface NavigationItem {
  id: string;
  label: string;
  icon: React.ElementType;
  path: string;
}

const navigationItems: NavigationItem[] = [
  { id: 'home', label: 'Home', icon: Home, path: '/' },
  { id: 'income', label: 'Income', icon: Wallet, path: '/income' },
  { id: 'expenses', label: 'Expenses', icon: CreditCard, path: '/expenses' },
  { id: 'savings', label: 'Savings', icon: PiggyBank, path: '/savings' },
  { id: 'investments', label: 'Investment', icon: TrendingUp, path: '/investments' },
  { id: 'message', label: 'Message', icon: MessageSquare, path: '/message' },
  { id: 'calendar', label: 'Calendar', icon: Calendar, path: '/calendar' },
  { id: 'budget', label: 'Budget', icon: Target, path: '/budget' },
  { id: 'reports', label: 'Reports', icon: BarChart3, path: '/reports' },
  { id: 'notes', label: 'Notes', icon: StickyNote, path: '/notes' },
  { id: 'security', label: 'Security', icon: Shield, path: '/security' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border shadow-elevated z-50">
      {/* Desktop: All items visible, Mobile: Horizontal scroll */}
      <div className="relative px-2 py-3 max-w-7xl mx-auto overflow-x-auto scrollbar-hide">
        <div className="flex items-center justify-around md:justify-center gap-1 md:gap-2 min-w-max md:min-w-0">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300",
                  "min-w-[55px] min-h-[55px] relative overflow-hidden flex-shrink-0",
                  isActive 
                    ? "bg-gradient-primary text-primary-foreground shadow-glow scale-110" 
                    : "text-muted-foreground hover:text-foreground hover:bg-secondary/50 hover:scale-105"
                )}
              >
                {isActive && (
                  <div className="absolute inset-0 bg-gradient-primary opacity-20 animate-pulse" />
                )}
                <Icon className={cn(
                  "w-5 h-5 mb-1 transition-all duration-300", 
                  isActive && "drop-shadow-sm animate-bounce"
                )} />
                <span className={cn(
                  "text-xs font-medium transition-all duration-300",
                  isActive ? "font-bold" : "font-normal"
                )}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-primary-foreground rounded-full" />
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};