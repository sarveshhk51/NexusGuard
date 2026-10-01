import {
  SecurityEvent,
  MetricCardData,
  AlertTimeSeriesPoint,
  DatabaseEventComparison,
  MonitoredDatabase,
  DecoyAsset,
  SystemStatus
} from '../types/soc';

import rawMockEvents from '../data/mockEvents.json';

// Helper to format timestamps into clean relative strings
function getRelativeTime(timestamp: string): string {
  const diffMs = Date.now() - new Date(timestamp).getTime();
  const diffMins = Math.floor(Math.abs(diffMs) / (1000 * 60));
  if (diffMins < 60) return `${diffMins || 2}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// 1. Map all 200 Mockaroo items to the dashboard's SecurityEvent interface
export const INITIAL_LIVE_EVENTS: SecurityEvent[] = (rawMockEvents as any[]).map((item) => {
  let responseAction = 'Active Honeypot Trap Triggered';
  if (item.status === 'INVESTIGATING') responseAction = 'Session Flagged for SOC Review';
  else if (item.status === 'RESOLVED') responseAction = 'Host Isolated & Remediated';
  else if (item.status === 'FALSE_POSITIVE') responseAction = 'Whitelisted / Benign Indicator';

  return {
    id: `evt-${item.id}`,
    timestamp: item.timestamp,
    relativeTime: getRelativeTime(item.timestamp),
    sourceIp: item.source_ip,
    targetDatabase: item.database_name,
    eventType: item.event_type,
    query: item.query,
    severity: item.severity,
    attackVector: item.detection_reason,
    responseAction
  };
});

// Calculate live numbers directly from your 200 events
const criticalCount = rawMockEvents.filter(e => e.severity === 'CRITICAL').length;
const decoyCount = rawMockEvents.filter(e => e.schema_name === 'nexusguard_decoy' || e.event_type === 'DECOY_ACCESS').length;
const distinctThreatIps = new Set(rawMockEvents.filter(e => e.status === 'INVESTIGATING' || e.status === 'NEW').map(e => e.source_ip)).size;

// 2. Metrics dynamically populated from the Mockaroo dataset
export const INITIAL_METRICS: MetricCardData[] = [
  {
    id: 'active-threats',
    title: 'ACTIVE THREATS',
    value: distinctThreatIps,
    delta: '+3 in last 24h',
    deltaType: 'increase',
    description: 'Distinct IP entities probing canary assets',
    statusColor: '#ef4444'
  },
  {
    id: 'critical-alerts',
    title: 'CRITICAL ALERTS',
    value: criticalCount,
    delta: 'Requires immediate SOC intervention',
    deltaType: 'neutral',
    description: 'Deception triggers and schema scans',
    statusColor: '#ef4444'
  },
  {
    id: 'decoy-interactions',
    title: 'DECOY INTERACTIONS',
    value: decoyCount,
    delta: '+34% vs previous window',
    deltaType: 'increase',
    description: 'Total queries directed to synthetic surfaces',
    statusColor: '#3b82f6'
  },
  {
    id: 'monitored-databases',
    title: 'MONITORED DATABASES',
    value: 2,
    delta: '100% deception mesh coverage',
    deltaType: 'neutral',
    description: 'PostgreSQL 16 & MySQL 8 targets',
    statusColor: '#10b981'
  }
];

// 3. Chart data for alerts over time
export const ALERTS_OVER_TIME: AlertTimeSeriesPoint[] = [
  { date: 'Sep 23', critical: 4, high: 6, medium: 8, low: 12, total: 30 },
  { date: 'Sep 24', critical: 3, high: 7, medium: 11, low: 14, total: 35 },
  { date: 'Sep 25', critical: 6, high: 9, medium: 10, low: 16, total: 41 },
  { date: 'Sep 26', critical: 5, high: 8, medium: 12, low: 13, total: 38 },
  { date: 'Sep 27', critical: 7, high: 11, medium: 9, low: 15, total: 42 },
  { date: 'Sep 28', critical: 6, high: 12, medium: 14, low: 18, total: 50 },
  { date: 'Sep 29', critical: criticalCount > 10 ? 8 : criticalCount, high: 14, medium: 15, low: 20, total: 57 }
];

// 4. Comparison data between production and decoy schemas
export const DATABASE_COMPARISON_DATA: DatabaseEventComparison[] = [
  {
    database: 'Production DB',
    eventsCount: 8420,
    decoyAlerts: 0,
    normalTraffic: 8420
  },
  {
    database: 'nexusguard_decoy',
    eventsCount: decoyCount,
    decoyAlerts: decoyCount,
    normalTraffic: 0
  }
];

export const MONITORED_DATABASES_LIST: MonitoredDatabase[] = [
  {
    id: 'db-prod-01',
    name: 'Production DB',
    environment: 'Production',
    engine: 'PostgreSQL 16.2 Enterprise',
    hostMask: 'pg-prod-cluster-01.internal',
    status: 'ONLINE',
    decoyTablesCount: 14,
    honeyTokensCount: 38,
    lastIntercept: '2 minutes ago'
  },
  {
    id: 'db-decoy-01',
    name: 'nexusguard_decoy',
    environment: 'Decoy Cluster',
    engine: 'PostgreSQL 16.2 Deception Mesh',
    hostMask: 'decoy-mesh-node-04.nexusguard.sec',
    status: 'INTERCEPTING',
    decoyTablesCount: 26,
    honeyTokensCount: 112,
    lastIntercept: '2 seconds ago'
  }
];

export const DECOY_ASSETS_LIST: DecoyAsset[] = [
  {
    id: 'ast-01',
    assetName: 'nexusguard_decoy.customers',
    parentSchema: 'nexusguard_decoy',
    type: 'Canary Table',
    riskRating: 'CRITICAL',
    triggeredCount: 47,
    status: 'TRIPPED'
  },
  {
    id: 'ast-02',
    assetName: 'nexusguard_decoy.payments',
    parentSchema: 'nexusguard_decoy',
    type: 'Honey Token',
    riskRating: 'HIGH',
    triggeredCount: 31,
    status: 'TRIPPED'
  },
  {
    id: 'ast-03',
    assetName: 'nexusguard_decoy.orders',
    parentSchema: 'nexusguard_decoy',
    type: 'Canary Table',
    riskRating: 'MEDIUM',
    triggeredCount: 19,
    status: 'ACTIVE'
  },
  {
    id: 'ast-04',
    assetName: 'nexusguard_decoy.employees',
    parentSchema: 'nexusguard_decoy',
    type: 'Canary Table',
    riskRating: 'HIGH',
    triggeredCount: 22,
    status: 'TRIPPED'
  }
];

export const SYSTEM_STATUS_DATA: SystemStatus = {
  apiStatus: 'Online',
  metadataDbStatus: 'Connected',
  wssStatus: 'Active',
  version: '1.0.4',
  nodeRegion: 'us-east-cluster-primary',
  uptimeHours: 342.8
};
