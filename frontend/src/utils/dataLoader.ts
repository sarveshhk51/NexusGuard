import rawEvents from '../data/mockEvents.json';
import {
  RawSecurityEvent,
  SecurityEvent,
  MetricCardData,
  AlertTimeSeriesPoint,
  DatabaseEventComparison
} from '../types/soc';
import { formatRelativeTime } from './formatters';

// Cast the imported JSON array to typed raw events
const typedRawEvents: RawSecurityEvent[] = rawEvents as RawSecurityEvent[];

// Map a single raw event to the UI-compatible SecurityEvent shape
function mapRawToSecurityEvent(raw: RawSecurityEvent): SecurityEvent {
  return {
    id: String(raw.id),
    timestamp: raw.timestamp,
    relativeTime: formatRelativeTime(raw.timestamp),
    sourceIp: raw.source_ip,
    targetDatabase: raw.database_name,
    eventType: raw.event_type,
    query: raw.query,
    severity: raw.severity,
    isNew: false,
    username: raw.username,
    schemaName: raw.schema_name,
    tableName: raw.table_name,
    detectionReason: raw.detection_reason,
    eventStatus: raw.status
  };
}

// All events mapped and sorted by timestamp descending (most recent first)
export const ALL_EVENTS: SecurityEvent[] = typedRawEvents
  .map(mapRawToSecurityEvent)
  .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

// ---------------------------------------------------------------------------
// Dynamic metric computation - no hardcoded values
// ---------------------------------------------------------------------------

export function computeActiveThreats(): number {
  return typedRawEvents.filter(
    (e) => e.status === 'INVESTIGATING' || e.status === 'NEW'
  ).length;
}

export function computeCriticalAlerts(): number {
  return typedRawEvents.filter((e) => e.severity === 'CRITICAL').length;
}

export function computeDecoyInteractions(): number {
  return typedRawEvents.filter(
    (e) => e.schema_name === 'nexusguard_decoy' || e.event_type === 'DECOY_ACCESS'
  ).length;
}

export function computeMonitoredDatabases(): number {
  const unique = new Set(typedRawEvents.map((e) => e.database_name));
  return unique.size;
}

export function computeMetricCards(): MetricCardData[] {
  const activeThreats = computeActiveThreats();
  const criticalAlerts = computeCriticalAlerts();
  const decoyInteractions = computeDecoyInteractions();
  const monitoredDbs = computeMonitoredDatabases();

  return [
    {
      id: 'active-threats',
      title: 'ACTIVE THREATS',
      value: activeThreats,
      delta: `${typedRawEvents.filter((e) => e.status === 'NEW').length} new, ${typedRawEvents.filter((e) => e.status === 'INVESTIGATING').length} investigating`,
      deltaType: 'increase' as const,
      description: 'Events with NEW or INVESTIGATING status',
      statusColor: '#ef4444'
    },
    {
      id: 'critical-alerts',
      title: 'CRITICAL ALERTS',
      value: criticalAlerts,
      delta: `${((criticalAlerts / typedRawEvents.length) * 100).toFixed(1)}% of total event volume`,
      deltaType: 'neutral' as const,
      description: 'Requires immediate SOC intervention',
      statusColor: '#ef4444'
    },
    {
      id: 'decoy-interactions',
      title: 'DECOY INTERACTIONS',
      value: decoyInteractions,
      delta: `Schema or event_type based detection`,
      deltaType: 'increase' as const,
      description: 'Queries touching nexusguard_decoy or DECOY_ACCESS type',
      statusColor: '#3b82f6'
    },
    {
      id: 'monitored-databases',
      title: 'MONITORED DATABASES',
      value: monitoredDbs,
      delta: `${[...new Set(typedRawEvents.map((e) => e.database_name))].join(', ')}`,
      deltaType: 'neutral' as const,
      description: 'Unique database engines under deception mesh',
      statusColor: '#10b981'
    }
  ];
}

// ---------------------------------------------------------------------------
// Alerts Over Time - aggregate by date from timestamp field
// ---------------------------------------------------------------------------

export function computeAlertsOverTime(): AlertTimeSeriesPoint[] {
  const buckets: Record<string, { critical: number; high: number; medium: number; low: number }> = {};

  for (const raw of typedRawEvents) {
    const dateKey = new Date(raw.timestamp).toISOString().slice(0, 10); // YYYY-MM-DD
    if (!buckets[dateKey]) {
      buckets[dateKey] = { critical: 0, high: 0, medium: 0, low: 0 };
    }
    const sev = raw.severity.toLowerCase() as 'critical' | 'high' | 'medium' | 'low';
    buckets[dateKey][sev] += 1;
  }

  // Sort by date ascending and format the label
  return Object.entries(buckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([dateKey, counts]) => {
      const d = new Date(dateKey + 'T00:00:00Z');
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      return {
        date: label,
        critical: counts.critical,
        high: counts.high,
        medium: counts.medium,
        low: counts.low,
        total: counts.critical + counts.high + counts.medium + counts.low
      };
    });
}

// ---------------------------------------------------------------------------
// Events by Database - group by database_name, split nexusguard_decoy vs rest
// ---------------------------------------------------------------------------

export function computeDatabaseComparison(): DatabaseEventComparison[] {
  const groups: Record<string, { decoy: number; normal: number }> = {};

  for (const raw of typedRawEvents) {
    const db = raw.database_name;
    if (!groups[db]) {
      groups[db] = { decoy: 0, normal: 0 };
    }
    if (raw.schema_name === 'nexusguard_decoy') {
      groups[db].decoy += 1;
    } else {
      groups[db].normal += 1;
    }
  }

  return Object.entries(groups).map(([db, counts]) => ({
    database: db,
    eventsCount: counts.decoy + counts.normal,
    decoyAlerts: counts.decoy,
    normalTraffic: counts.normal
  }));
}
