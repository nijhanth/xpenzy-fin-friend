import { useId, type SVGProps } from 'react';

interface FinanceLogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

/** Xpenzy's coin and upward chart mark, shared across the app's branded surfaces. */
export const FinanceLogo = ({ className = 'w-12 h-12', ...props }: FinanceLogoProps) => {
  const gradientId = `xpenzy-logo-gradient-${useId().replace(/:/g, '')}`;

  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Xpenzy finance logo"
      {...props}
    >
      <defs>
        <linearGradient id={gradientId} x1="5" y1="4" x2="59" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#10B981" />
          <stop offset="1" stopColor="#047857" />
        </linearGradient>
      </defs>

      <rect x="3" y="3" width="58" height="58" rx="19" fill={`url(#${gradientId})`} />
      <path d="M14 49.5H50" stroke="white" strokeOpacity=".32" strokeWidth="2" strokeLinecap="round" />

      {/* Coin */}
      <circle cx="21" cy="21" r="9" fill="white" fillOpacity=".16" stroke="white" strokeWidth="2.5" />
      <path d="M18.1 17.5H23.8M18.1 20.5H23.8M19.5 17.5L23.4 24.5" stroke="white" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />

      {/* Rising portfolio line */}
      <path d="M14.5 43.5L25.5 33L33 38L48.5 22.5" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M39.5 22.5H48.5V31.5" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="14.5" cy="43.5" r="2" fill="white" />
    </svg>
  );
};
