import { useState } from 'react';
import { AppLayout } from '@/components/layout/AppLayout';
import { Home } from './Home';
import { Income } from './Income';
import { Expenses } from './Expenses';
import { Budget } from './Budget';
import { Savings } from './Savings';
import { Investments } from './Investments';
import { Group } from './Group';
import { Calendar } from './Calendar';
import { Reports } from './Reports';
import { Notes } from './Notes';
import { Security } from './Security';
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
      case 'group':
        return <Group />;
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
