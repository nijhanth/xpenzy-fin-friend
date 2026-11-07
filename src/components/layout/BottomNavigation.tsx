import { useState } from 'react';
import {
  Home, List, Target, BarChart3, MoreHorizontal, Wallet, PiggyBank, TrendingUp,
  MessageSquare, Calendar, StickyNote, Shield, Settings, LayoutGrid,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';

const mainItems = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'expenses', label: 'Transactions', icon: List },
  { id: 'budget', label: 'Budgets', icon: Target },
  { id: 'reports', label: 'Insights', icon: BarChart3 },
];

const moreItems = [
  { id: 'income', label: 'Income', icon: Wallet },
  { id: 'savings', label: 'Savings', icon: PiggyBank },
  { id: 'investments', label: 'Investments', icon: TrendingUp },
  { id: 'home', label: 'Detailed overview', icon: LayoutGrid },
  { id: 'calendar', label: 'Calendar', icon: Calendar },
  { id: 'notes', label: 'Notes', icon: StickyNote },
  { id: 'message', label: 'Messages', icon: MessageSquare },
  { id: 'security', label: 'Security', icon: Shield },
  { id: 'settings', label: 'Settings', icon: Settings },
];

interface Props {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const BottomNavigation = ({ activeTab, onTabChange }: Props) => {
  const [moreOpen, setMoreOpen] = useState(false);
  const inMore = moreItems.some((i) => i.id === activeTab);

  const NavBtn = ({ id, label, icon: Icon, active, onClick }: any) => (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex flex-col items-center justify-center gap-1 flex-1 py-2 rounded-xl text-xs transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active ? 'text-primary font-semibold' : 'text-muted-foreground hover:text-foreground'
      )}
    >
      <Icon className="w-5 h-5" aria-hidden />
      <span>{label}</span>
    </button>
  );

  return (
    <>
      <nav aria-label="Main" className="fixed bottom-0 inset-x-0 z-50 bg-card/95 backdrop-blur border-t border-border">
        <div className="max-w-2xl mx-auto flex items-center px-2 pb-[env(safe-area-inset-bottom)]">
          {mainItems.map((i) => (
            <NavBtn key={i.id} {...i} active={activeTab === i.id} onClick={() => onTabChange(i.id)} />
          ))}
          <NavBtn id="more" label="More" icon={MoreHorizontal} active={inMore} onClick={() => setMoreOpen(true)} />
        </div>
      </nav>

      <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader><SheetTitle>More</SheetTitle></SheetHeader>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-2 py-4">
            {moreItems.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { onTabChange(id); setMoreOpen(false); }}
                className={cn(
                  'flex flex-col items-center gap-2 p-3 rounded-xl text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  activeTab === id ? 'bg-secondary text-primary font-medium' : 'hover:bg-muted'
                )}
              >
                <Icon className="w-5 h-5" aria-hidden />
                {label}
              </button>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
};
