import { SVGProps } from 'react';

interface FinanceLogoProps extends SVGProps<SVGSVGElement> {
  className?: string;
}

export const FinanceLogo = ({ className = "w-12 h-12", ...props }: FinanceLogoProps) => {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      {...props}
    >
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="hsl(var(--primary))" />
          <stop offset="100%" stopColor="hsl(var(--accent))" />
        </linearGradient>
      </defs>
      
      {/* Circular background */}
      <circle
        cx="32"
        cy="32"
        r="30"
        fill="url(#logoGradient)"
        className="drop-shadow-lg"
      />
      
      {/* Chart bars */}
      <rect x="16" y="36" width="4" height="16" fill="white" rx="2" />
      <rect x="22" y="28" width="4" height="24" fill="white" rx="2" />
      <rect x="28" y="32" width="4" height="20" fill="white" rx="2" />
      <rect x="34" y="20" width="4" height="32" fill="white" rx="2" />
      <rect x="40" y="24" width="4" height="28" fill="white" rx="2" />
      <rect x="46" y="18" width="4" height="34" fill="white" rx="2" />
      
      {/* Trending arrow */}
      <path
        d="M42 22 L48 16 L54 22 M48 16 L48 26"
        stroke="white"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
      
      {/* Dollar sign */}
      <circle cx="18" cy="18" r="8" fill="white" fillOpacity="0.9" />
      <path
        d="M18 12 L18 24 M15 15 C15 15 15 13 18 13 C21 13 21 15 21 15 C21 15 21 17 18 17 C15 17 15 19 15 19 C15 19 15 21 18 21 C21 21 21 19 21 19"
        stroke="url(#logoGradient)"
        strokeWidth="1.5"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
};