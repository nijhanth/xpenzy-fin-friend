import React, { createContext, useContext, useState, useEffect } from 'react';
import { logSecurityEvent } from '@/lib/security';

interface PrivacyPreferences {
  showFullEmail: boolean;
  showFullPhone: boolean;
  showFullName: boolean;
  allowDataCollection: boolean;
  securityMode: 'strict' | 'balanced' | 'minimal';
}

interface PrivacyContextType {
  preferences: PrivacyPreferences;
  updatePreferences: (updates: Partial<PrivacyPreferences>) => void;
  hasConsent: (dataType: keyof PrivacyPreferences) => boolean;
  requestConsent: (dataType: keyof PrivacyPreferences) => Promise<boolean>;
  isInitialized: boolean;
}

const defaultPreferences: PrivacyPreferences = {
  showFullEmail: false,
  showFullPhone: false,
  showFullName: true,
  allowDataCollection: false,
  securityMode: 'strict'
};

const PrivacyContext = createContext<PrivacyContextType | undefined>(undefined);

export const usePrivacy = () => {
  const context = useContext(PrivacyContext);
  if (context === undefined) {
    throw new Error('usePrivacy must be used within a PrivacyProvider');
  }
  return context;
};

export const PrivacyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preferences, setPreferences] = useState<PrivacyPreferences>(defaultPreferences);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Load preferences from secure storage
    const loadPreferences = () => {
      try {
        const stored = localStorage.getItem('privacy-preferences');
        if (stored) {
          const parsed = JSON.parse(stored);
          setPreferences({ ...defaultPreferences, ...parsed });
          logSecurityEvent('privacy_preferences_loaded');
        }
      } catch (error) {
        logSecurityEvent('privacy_preferences_load_error', { error: error.message });
      } finally {
        setIsInitialized(true);
      }
    };

    loadPreferences();
  }, []);

  const updatePreferences = (updates: Partial<PrivacyPreferences>) => {
    const newPreferences = { ...preferences, ...updates };
    setPreferences(newPreferences);
    
    try {
      localStorage.setItem('privacy-preferences', JSON.stringify(newPreferences));
      logSecurityEvent('privacy_preferences_updated', { updates });
    } catch (error) {
      logSecurityEvent('privacy_preferences_save_error', { error: error.message });
    }
  };

  const hasConsent = (dataType: keyof PrivacyPreferences): boolean => {
    return preferences[dataType] === true;
  };

  const requestConsent = async (dataType: keyof PrivacyPreferences): Promise<boolean> => {
    return new Promise((resolve) => {
      const message = getConsentMessage(dataType);
      const userConsent = window.confirm(message);
      
      if (userConsent) {
        updatePreferences({ [dataType]: true });
        logSecurityEvent('consent_granted', { dataType });
      } else {
        logSecurityEvent('consent_denied', { dataType });
      }
      
      resolve(userConsent);
    });
  };

  const getConsentMessage = (dataType: keyof PrivacyPreferences): string => {
    const messages = {
      showFullEmail: 'Would you like to display your full email address? This will make it visible in the interface.',
      showFullPhone: 'Would you like to display your full phone number? This will make it visible in the interface.',
      showFullName: 'Would you like to display your full name? This will make it visible in the interface.',
      allowDataCollection: 'Would you like to allow anonymous usage data collection to improve the app?',
      securityMode: 'Would you like to change your security settings?'
    };
    
    return messages[dataType] || 'Would you like to proceed with this action?';
  };

  const value = {
    preferences,
    updatePreferences,
    hasConsent,
    requestConsent,
    isInitialized
  };

  return (
    <PrivacyContext.Provider value={value}>
      {children}
    </PrivacyContext.Provider>
  );
};