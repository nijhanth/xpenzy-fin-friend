import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'income' | 'expense' | 'savings' | 'default';
  className?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

const variantStyles = {
  income: 'bg-gradient-income border-income/20',
  expense: 'bg-gradient-expense border-expense/20', 
  savings: 'bg-savings/10 border-savings/20',
  default: 'bg-gradient-card border-border',
};

const iconStyles = {
  income: 'text-income',
  expense: 'text-expense',
  savings: 'text-savings',
  default: 'text-primary',
};

export const StatCard = ({ 
  title, 
  value, 
  subtitle, 
  icon: Icon, 
  variant = 'default',
  className,
  trend 
}: StatCardProps) => {
  return (
    <div className={cn(
      "rounded-xl p-4 border backdrop-blur-sm shadow-card animate-fade-in",
      "transition-all duration-200 hover:shadow-elevated hover:scale-[1.02]",
      variantStyles[variant],
      className
    )}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Icon className={cn("w-5 h-5", iconStyles[variant])} />
            <p className="text-sm font-medium text-foreground/80">{title}</p>
          </div>
          
          <p className="text-2xl font-bold text-foreground mb-1">{value}</p>
          
          {subtitle && (
            <p className="text-xs text-foreground/60">{subtitle}</p>
          )}
          
          {trend && (
            <div className={cn(
              "text-xs font-medium mt-2 flex items-center gap-1",
              trend.isPositive ? "text-success" : "text-destructive"
            )}>
              <span>{trend.isPositive ? '↗' : '↘'}</span>
              <span>{trend.value}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};