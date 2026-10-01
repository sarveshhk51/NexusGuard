import React from 'react';
import { MetricCards } from '../dashboard/MetricCards';
import { AlertsChart } from '../dashboard/AlertsChart';
import { DatabaseEventsChart } from '../dashboard/DatabaseEventsChart';
import { LiveWebSocketStream } from '../dashboard/LiveWebSocketStream';
import { BlockedIPsCard } from '../dashboard/BlockedIPsCard';
import { MetricCardData, AlertTimeSeriesPoint, DatabaseEventComparison, SecurityEvent, SeverityLevel } from '../../types/soc';

interface DashboardViewProps {
  metrics: MetricCardData[];
  alertsData: AlertTimeSeriesPoint[];
  databaseComparisonData: DatabaseEventComparison[];
  events: SecurityEvent[];
  isPaused: boolean;
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'PAUSED';
  filterSeverity: SeverityLevel | 'ALL';
  searchQuery: string;
  onTogglePause: () => void;
  onClearEvents: () => void;
  onInjectEvent: () => void;
  onSetFilterSeverity: (sev: SeverityLevel | 'ALL') => void;
  onSetSearchQuery: (query: string) => void;
  onSelectMetric: (metricId: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  alertsData,
  databaseComparisonData,
  events,
  isPaused,
  connectionStatus,
  filterSeverity,
  searchQuery,
  onTogglePause,
  onClearEvents,
  onInjectEvent,
  onSetFilterSeverity,
  onSetSearchQuery,
  onSelectMetric
}) => {
  return (
    <div className="space-y-5">
      {/* Top Metric Cards */}
      <section>
        <MetricCards metrics={metrics} onSelectMetric={onSelectMetric} />
      </section>

      {/* Visual Analytics Row: Area Chart + Bar Chart */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="min-w-0">
          <AlertsChart data={alertsData} />
        </div>
        <div className="min-w-0">
          <DatabaseEventsChart data={databaseComparisonData} />
        </div>
      </section>

      {/* Live WebSocket Event Stream Component */}
      <section className="min-w-0">
        <LiveWebSocketStream
          events={events}
          isPaused={isPaused}
          connectionStatus={connectionStatus}
          filterSeverity={filterSeverity}
          searchQuery={searchQuery}
          onTogglePause={onTogglePause}
          onClearEvents={onClearEvents}
          onInjectEvent={onInjectEvent}
          onSetFilterSeverity={onSetFilterSeverity}
          onSetSearchQuery={onSetSearchQuery}
        />
      </section>

      {/* Active Containment: Dynamic Blocked IPs */}
      <section className="min-w-0">
        <BlockedIPsCard />
      </section>
    </div>
  );
};
