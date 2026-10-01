export type SeverityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type EventStatus = 'NEW' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';

export type EventType = 'DECOY_ACCESS' | 'SCHEMA_ENUMERATION' | 'SUSPICIOUS_QUERY' | 'REPEATED_ACCESS';

// Raw interface matching the JSON dataset schema exactly
export interface RawSecurityEvent {
  id: number;
  timestamp: string; // ISO 8601 UTC
  target_id: number;
  severity: SeverityLevel;
  event_type: EventType;
  source_ip: string;
  username: string;
  database_name: string;
  schema_name: string;
  table_name: string;
  query: string;
  detection_reason: string;
  status: EventStatus;
}

// UI-compatible interface consumed by all dashboard components
export interface SecurityEvent {
  id: string;
  timestamp: string;
  relativeTime: string;
  sourceIp: string;
  targetDatabase: string;
  eventType: string;
  query: string;
  severity: SeverityLevel;
  isNew?: boolean;
  username?: string;
  schemaName?: string;
  tableName?: string;
  detectionReason?: string;
  eventStatus?: EventStatus;
  responseAction?: string;
  attackVector?: string;
}

export interface MetricCardData {
  id: string;
  title: string;
  value: number | string;
  delta?: string;
  deltaType?: 'increase' | 'decrease' | 'neutral';
  description?: string;
  statusColor?: string;
}

export interface AlertTimeSeriesPoint {
  date: string;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total: number;
}

export interface DatabaseEventComparison {
  database: string;
  eventsCount: number;
  decoyAlerts: number;
  normalTraffic: number;
}

export interface MonitoredDatabase {
  id: string;
  name: string;
  environment: 'Production' | 'Decoy Cluster';
  engine: string;
  hostMask: string;
  status: 'ONLINE' | 'INTERCEPTING' | 'STANDBY';
  decoyTablesCount: number;
  honeyTokensCount: number;
  lastIntercept: string;
}

export interface DecoyAsset {
  id: string;
  assetName: string;
  parentSchema: string;
  type: 'Canary Table' | 'Honey Token' | 'Fake View' | 'Synthetic Procedure';
  riskRating: SeverityLevel;
  triggeredCount: number;
  status: 'ACTIVE' | 'TRIPPED' | 'DISARMED';
}

export interface SystemStatus {
  apiStatus: string;
  metadataDbStatus: string;
  wssStatus: string;
  version: string;
  nodeRegion: string;
  uptimeHours: number;
}

export type NavigationTab = 
  | 'dashboard'
  | 'attack-demo'
  | 'targets'
  | 'schema-intelligence'
  | 'deception'
  | 'alerts'
  | 'events'
  | 'monitoring'
  | 'users'
  | 'settings';
