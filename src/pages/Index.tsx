import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { AppLayout } from '@/components/layout/AppLayout';
import { Auth } from './Auth';
import { Home } from './Home';
import { Income } from './Income';
import { Expenses } from './Expenses';
import { Budget } from './Budget';
import { Savings } from './Savings';
import { Investments } from './Investments';
import { Message } from './Message';
import { Calendar } from './Calendar';
import { Reports } from './Reports';
import { Notes } from './Notes';
import { Security } from './Security';
import { Settings } from './Settings';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState('home');
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && !user) {
      // Redirect to auth page if not authenticated
      window.location.href = '/auth';
    }
  }, [user, loading]);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show auth page if not authenticated
  if (!user) {
    return <Auth onAuthSuccess={() => window.location.reload()} />;
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return <Home />;
      case 'income':
        return <Income />;
      case 'expenses':
        return <Expenses />;
      case 'savings':
        return <Savings />;
      case 'investments':
        return <Investments />;
      case 'message':
        return <Message />;
      case 'calendar':
        return <Calendar />;
      case 'budget':
        return <Budget />;
      case 'reports':
        return <Reports />;
      case 'notes':
        return <Notes />;
      case 'security':
        return <Security />;
      case 'settings':
        return <Settings />;
      default:
        return <Home />;
    }
  };

  return (
    <AppLayout activeTab={currentScreen} onTabChange={setCurrentScreen}>
      {renderScreen()}
    </AppLayout>
  );
};

export default Index;
