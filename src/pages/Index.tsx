import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Home } from './Home';
import { Income } from './Income';
import { Expenses } from './Expenses';
import { Savings } from './Savings';
import { Investments } from './Investments';
import { Settings } from './Settings';

const Index = () => {
  const [currentScreen, setCurrentScreen] = useState('home');

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
