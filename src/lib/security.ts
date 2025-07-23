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
  
  // Remove all non-digit characters except +
  const cleaned = phone.replace(/[^\d+]/g, '');
  
  if (cleaned.length < 4) return '+**-****-****';
  
  // Show country code and last 4 digits
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

// Simple client-side obfuscation (note: not true encryption for security-sensitive data)
export const obfuscateData = (data: string, key: string = 'app-security-key'): string => {
  if (!data) return '';
  
  let result = '';
  for (let i = 0; i < data.length; i++) {
    const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
    result += String.fromCharCode(charCode);
  }
  return btoa(result); // Base64 encode for safe storage
};

export const deobfuscateData = (obfuscatedData: string, key: string = 'app-security-key'): string => {
  if (!obfuscatedData) return '';
  
  try {
    const decoded = atob(obfuscatedData);
    let result = '';
    for (let i = 0; i < decoded.length; i++) {
      const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return result;
  } catch {
    return '';
  }
};

// Security event logging
export const logSecurityEvent = (event: string, details?: Record<string, any>) => {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    event,
    details: details || {},
    userAgent: navigator.userAgent,
    url: window.location.href
  };
  
  // In production, this should be sent to a secure logging service
  console.log('[SECURITY]', logEntry);
};

// Access control utilities
export const hasDataAccess = (userRole: string = 'user'): boolean => {
  const allowedRoles = ['user', 'admin', 'moderator'];
  return allowedRoles.includes(userRole.toLowerCase());
};

export const sanitizeUserInput = (input: string): string => {
  if (!input) return '';
  
  // Remove potentially dangerous characters and scripts
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
};