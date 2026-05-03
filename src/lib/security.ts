/**
 * Security utilities for data protection and privacy
 */

// Data masking utilities
export const maskEmail = (email: string): string => {
  if (!email || !email.includes('@')) return '***@***.***';

  const [localPart, domain] = email.split('@');
  const [domainName, extension] = domain.split('.');

  const maskedLocal = localPart.length > 2
    ? localPart.substring(0, 2) + '*'.repeat(Math.max(localPart.length - 2, 3))
    : '**';

  const maskedDomain = domainName.length > 2
    ? domainName.substring(0, 1) + '*'.repeat(Math.max(domainName.length - 1, 3))
    : '***';

  return `${maskedLocal}@${maskedDomain}.${extension || '***'}`;
};

export const maskPhoneNumber = (phone: string): string => {
  if (!phone) return '+**-****-****';

  const cleaned = phone.replace(/[^\d+]/g, '');
  if (cleaned.length < 4) return '+**-****-****';

  const countryCode = cleaned.startsWith('+') ? cleaned.substring(0, 3) : '+**';
  const lastFour = cleaned.slice(-4);
  const middleMask = '*'.repeat(Math.max(cleaned.length - 7, 4));

  return `${countryCode}-${middleMask}-${lastFour}`;
};

export const maskName = (name: string): string => {
  if (!name) return '***';

  const words = name.trim().split(' ');
  return words.map(word => {
    if (word.length <= 2) return '*'.repeat(word.length);
    return word.substring(0, 1) + '*'.repeat(word.length - 1);
  }).join(' ');
};

// Security event logging — dev-only to avoid leaking event structure in production
export const logSecurityEvent = (event: string, details?: Record<string, any>) => {
  if (!import.meta.env.DEV) return;

  const logEntry = {
    timestamp: new Date().toISOString(),
    event,
    details: details || {},
  };
  // eslint-disable-next-line no-console
  console.log('[SECURITY]', logEntry);
};

// Access control utilities
export const hasDataAccess = (userRole: string = 'user'): boolean => {
  const allowedRoles = ['user', 'admin', 'moderator'];
  return allowedRoles.includes(userRole.toLowerCase());
};

export const sanitizeUserInput = (input: string): string => {
  if (!input) return '';

  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};
