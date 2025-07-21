import { useState } from 'react';
import { 
  Home, 
  PiggyBank, 
  CreditCard, 
  TrendingUp, 
  BarChart3, 
  Target,
  Settings,
  Plus,
  Wallet,
  Users,
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
  { id: 'group', label: 'Group', icon: Users, path: '/group' },
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
  // Group items into pages for better mobile navigation
  const itemsPerPage = 5;
  const [currentPage, setCurrentPage] = useState(0);
  const totalPages = Math.ceil(navigationItems.length / itemsPerPage);
  
  const currentItems = navigationItems.slice(
    currentPage * itemsPerPage,
    (currentPage + 1) * itemsPerPage
  );

  const nextPage = () => {
    setCurrentPage((prev) => (prev + 1) % totalPages);
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-lg border-t border-border shadow-elevated z-50">
      <div className="relative px-2 py-3 max-w-md mx-auto">
        {/* Navigation Items */}
        <div className="flex items-center justify-around">
          {currentItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={cn(
                  "flex flex-col items-center justify-center p-2 rounded-2xl transition-all duration-300",
                  "min-w-[55px] min-h-[55px] relative overflow-hidden",
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
        
        {/* Page Indicators */}
        {totalPages > 1 && (
          <div className="flex justify-center mt-2 gap-1">
            {Array.from({ length: totalPages }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrentPage(i)}
                className={cn(
                  "w-2 h-2 rounded-full transition-all duration-200",
                  i === currentPage 
                    ? "bg-primary scale-125" 
                    : "bg-muted hover:bg-muted-foreground/50"
                )}
              />
            ))}
          </div>
        )}
      </div>
      
      {/* Floating Add Button */}
      <button 
        onClick={nextPage}
        className="absolute -top-6 right-6 bg-gradient-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-glow hover:scale-110 transition-all duration-200 group"
      >
        <Plus className="w-6 h-6 group-hover:rotate-45 transition-transform duration-300" />
      </button>
    </div>
  );
};