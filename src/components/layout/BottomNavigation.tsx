import { useState } from 'react';
import { 
  Home, 
  PiggyBank, 
  CreditCard, 
  TrendingUp, 
  BarChart3, 
  Target,
  Settings,
  Plus
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
  { id: 'expenses', label: 'Expenses', icon: CreditCard, path: '/expenses' },
  { id: 'budget', label: 'Budget', icon: Target, path: '/budget' },
  { id: 'savings', label: 'Savings', icon: PiggyBank, path: '/savings' },
  { id: 'settings', label: 'Settings', icon: Settings, path: '/settings' },
];

interface BottomNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: BottomNavigationProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border shadow-elevated z-50">
      <div className="flex items-center justify-around px-2 py-2 max-w-md mx-auto">
        {navigationItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={cn(
                "flex flex-col items-center justify-center p-2 rounded-xl transition-all duration-200",
                "min-w-[60px] min-h-[60px]",
                isActive 
                  ? "bg-primary text-primary-foreground shadow-glow" 
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary"
              )}
            >
              <Icon className={cn("w-5 h-5 mb-1", isActive && "drop-shadow-sm")} />
              <span className={cn(
                "text-xs font-medium transition-all duration-200",
                isActive ? "scale-105" : "scale-100"
              )}>
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
      
      {/* Floating Add Button */}
      <button className="absolute -top-6 right-6 bg-gradient-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center shadow-glow hover:scale-110 transition-transform duration-200">
        <Plus className="w-6 h-6" />
      </button>
    </div>
  );
};