import React, { useState } from 'react';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { DashboardView } from './components/views/DashboardView';
import { TargetsView } from './components/views/TargetsView';
import { SchemaIntelligenceView } from './components/views/SchemaIntelligenceView';
import { DeceptionView } from './components/views/DeceptionView';
import { AlertsView } from './components/views/AlertsView';
import { EventsView } from './components/views/EventsView';
import { MonitoringView } from './components/views/MonitoringView';
import { UsersView } from './components/views/UsersView';
import { SettingsView } from './components/views/SettingsView';
import { useSimulatedWebSocket } from './hooks/useSimulatedWebSocket';
import { 
  INITIAL_METRICS, 
  ALERTS_OVER_TIME, 
  DATABASE_COMPARISON_DATA 
} from './mock/socData';
import { NavigationTab } from './types/soc';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [metrics] = useState(INITIAL_METRICS);

  const {
    events,
    rawEvents,
    isPaused,
    connectionStatus,
    filterSeverity,
    searchQuery,
    togglePause,
    clearEvents,
    injectEvent,
    setFilterSeverity,
    setSearchQuery
  } = useSimulatedWebSocket();

  const handleSelectMetric = (metricId: string) => {
    if (metricId === 'critical-alerts') {
      setCurrentTab('alerts');
    } else if (metricId === 'decoy-interactions') {
      setCurrentTab('deception');
    } else if (metricId === 'monitored-databases') {
      setCurrentTab('targets');
    } else if (metricId === 'active-threats') {
      setFilterSeverity('CRITICAL');
      setCurrentTab('dashboard');
    }
  };

  const handleRefresh = () => {
    injectEvent();
  };

  const renderContent = () => {
    switch (currentTab) {
      case 'dashboard':
        return (
          <DashboardView
            metrics={metrics}
            alertsData={ALERTS_OVER_TIME}
            databaseComparisonData={DATABASE_COMPARISON_DATA}
            events={events}
            isPaused={isPaused}
            connectionStatus={connectionStatus}
            filterSeverity={filterSeverity}
            searchQuery={searchQuery}
            onTogglePause={togglePause}
            onClearEvents={clearEvents}
            onInjectEvent={injectEvent}
            onSetFilterSeverity={setFilterSeverity}
            onSetSearchQuery={setSearchQuery}
            onSelectMetric={handleSelectMetric}
          />
        );
      case 'targets':
        return <TargetsView />;
      case 'schema-intelligence':
        return <SchemaIntelligenceView />;
      case 'deception':
        return <DeceptionView />;
      case 'alerts':
        return <AlertsView />;
      case 'events':
        return <EventsView events={rawEvents} />;
      case 'monitoring':
        return <MonitoringView />;
      case 'users':
        return <UsersView />;
      case 'settings':
        return <SettingsView />;
      default:
        return null;
    }
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* Persistent Sidebar */}
      <Sidebar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        unresolvedAlertCount={1}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Safe Operational Metrics Header */}
        <Header
          currentTab={currentTab}
          onRefresh={handleRefresh}
          isStreaming={!isPaused}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-slate-900">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
