import React, { useState, useEffect } from 'react';
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
import { LiveAttackArenaView } from './components/views/LiveAttackArenaView';
import { AttackSimulatorModal } from './components/modals/AttackSimulatorModal';
import { useSimulatedWebSocket } from './hooks/useSimulatedWebSocket';
import { 
  INITIAL_METRICS, 
  ALERTS_OVER_TIME, 
  DATABASE_COMPARISON_DATA 
} from './mock/socData';
import { NavigationTab, SecurityEvent } from './types/soc';
import { getApiUrl } from './utils/apiConfig';

export const App: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [metrics, setMetrics] = useState(INITIAL_METRICS);
  const [isAttackModalOpen, setIsAttackModalOpen] = useState(false);

  // Live metrics polling from backend
  const loadMetrics = async () => {
    try {
      const res = await fetch(getApiUrl('/api/events/metrics'));
      if (!res.ok) return;
      const data = await res.json();
      if (data) {
        setMetrics(prev => [
          {
            id: 'active-threats',
            title: 'ACTIVE THREATS',
            value: data.active_threats_count ?? prev[0].value,
            delta: `${data.total_events || 0} total events logged`,
            deltaType: 'increase',
            description: 'Distinct IP entities probing canary assets',
            statusColor: '#ef4444'
          },
          {
            id: 'critical-alerts',
            title: 'CRITICAL ALERTS',
            value: data.critical_count ?? prev[1].value,
            delta: 'Requires immediate SOC intervention',
            deltaType: 'neutral',
            description: 'Deception triggers and schema scans',
            statusColor: '#ef4444'
          },
          {
            id: 'decoy-interactions',
            title: 'DECOY INTERACTIONS',
            value: data.decoy_interactions_count ?? prev[2].value,
            delta: 'Synthetic surface traps tripped',
            deltaType: 'increase',
            description: 'Total queries directed to synthetic surfaces',
            statusColor: '#3b82f6'
          },
          {
            id: 'monitored-databases',
            title: 'MONITORED DATABASES',
            value: 1,
            delta: '100% deception mesh coverage',
            deltaType: 'neutral',
            description: 'Active database deception nodes',
            statusColor: '#10b981'
          }
        ]);
      }
    } catch {
      // Keep previous metrics if offline
    }
  };

  useEffect(() => {
    loadMetrics();
    const interval = setInterval(loadMetrics, 8000);
    return () => clearInterval(interval);
  }, []);

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
    loadMetrics();
  };

  const handleSimulatedAttackInjected = (attackEvent: SecurityEvent) => {
    injectEvent(attackEvent);
    loadMetrics();
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
      case 'attack-demo':
        return <LiveAttackArenaView onAttackSimulated={handleSimulatedAttackInjected} />;
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
          onSimulateClick={() => setIsAttackModalOpen(true)}
          isStreaming={!isPaused}
        />

        {/* Scrollable View Container */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-6 bg-slate-900">
          <div className="max-w-7xl mx-auto space-y-6">
            {renderContent()}
          </div>
        </main>
      </div>

      {/* Live Attack Simulator Modal for Presentation / Teacher */}
      <AttackSimulatorModal
        isOpen={isAttackModalOpen}
        onClose={() => setIsAttackModalOpen(false)}
        onEventInjected={handleSimulatedAttackInjected}
      />
    </div>
  );
};

export default App;
