import { useState, useEffect, useCallback, useRef } from 'react';
import { SecurityEvent, SeverityLevel } from '../types/soc';
import { INITIAL_LIVE_EVENTS } from '../mock/socData';
import { formatRelativeTime } from '../utils/formatters';
import { WS_BASE_URL } from '../utils/apiConfig';

const SIMULATED_ATTACK_POOL: Array<Omit<SecurityEvent, 'id' | 'timestamp' | 'relativeTime' | 'isNew'>> = [
  {
    sourceIp: '10.0.0.42',
    targetDatabase: 'PostgreSQL 16',
    eventType: 'DECOY_ACCESS',
    query: 'SELECT * FROM nexusguard_decoy.customers',
    severity: 'CRITICAL',
    attackVector: 'Lateral Movement - Honeypot Table Scan',
    responseAction: 'Session Isolated & Host Quarantined'
  },
  {
    sourceIp: '192.168.10.88',
    targetDatabase: 'nexusguard_decoy',
    eventType: 'CANARY_TOKEN_TRIGGERED',
    query: 'SELECT secret_seed, auth_token FROM nexusguard_decoy.api_credential_canaries WHERE active = 1',
    severity: 'HIGH',
    attackVector: 'Credential Extraction Probe',
    responseAction: 'IP Throttled & SIEM Flagged'
  },
  {
    sourceIp: '172.16.4.15',
    targetDatabase: 'PostgreSQL 16',
    eventType: 'UNAUTHORIZED_SCHEMA_PROBE',
    query: 'SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN (\'pg_catalog\', \'information_schema\')',
    severity: 'MEDIUM',
    attackVector: 'Reconnaissance / Schema Enumeration',
    responseAction: 'Decoy Schema Injected into Result'
  },
  {
    sourceIp: '10.0.4.19',
    targetDatabase: 'nexusguard_decoy',
    eventType: 'HONEY_CREDENTIAL_USE',
    query: 'UPDATE nexusguard_decoy.shadow_administrators SET privileges = \'ALL\' WHERE username = \'sys_backup\'',
    severity: 'HIGH',
    attackVector: 'Privilege Escalation Simulation',
    responseAction: 'Silent Null-Op Response Returned'
  },
  {
    sourceIp: '10.0.8.99',
    targetDatabase: 'PostgreSQL 16',
    eventType: 'DECOY_ACCESS',
    query: 'SELECT username, password_salt_canary FROM nexusguard_decoy.auth_canary_vault LIMIT 50',
    severity: 'CRITICAL',
    attackVector: 'Credential Vault Dump Attempt',
    responseAction: 'Deception Trap Tripped & Alert Dispatched'
  },
  {
    sourceIp: '192.168.12.102',
    targetDatabase: 'nexusguard_decoy',
    eventType: 'SYNTHETIC_PROCEDURE_EXEC',
    query: 'CALL nexusguard_decoy.sp_export_customer_pii(\'full_export\')',
    severity: 'CRITICAL',
    attackVector: 'Exfiltration Procedure Infiltration',
    responseAction: 'Synthetic Watermarked Payload Returned'
  },
  {
    sourceIp: '172.16.12.44',
    targetDatabase: 'PostgreSQL 16',
    eventType: 'DECOY_TABLE_SCAN',
    query: 'SELECT COUNT(*) FROM nexusguard_decoy.financial_ledger_canary',
    severity: 'MEDIUM',
    attackVector: 'Decoy Reconnaissance',
    responseAction: 'Decoy Counter Incremented'
  },
  {
    sourceIp: '10.0.2.14',
    targetDatabase: 'nexusguard_decoy',
    eventType: 'ANOMALOUS_QUERY_SYNTAX',
    query: 'SELECT * FROM nexusguard_decoy.v_export_transactions WHERE 1=1 AND ASCII(SUBSTRING((SELECT current_user),1,1)) > 64',
    severity: 'HIGH',
    attackVector: 'Blind SQL Injection Canary Exploit',
    responseAction: 'Tarpit Delay Activated'
  },
  {
    sourceIp: '192.168.1.155',
    targetDatabase: 'PostgreSQL 16',
    eventType: 'SCHEMA_INTELLIGENCE_DRIFT',
    query: 'DESCRIBE nexusguard_decoy.api_credential_canaries',
    severity: 'LOW',
    attackVector: 'Automated Vulnerability Scanner Detection',
    responseAction: 'Logged for Behavioral Baseline'
  }
];

export function useSimulatedWebSocket() {
  const [events, setEvents] = useState<SecurityEvent[]>(INITIAL_LIVE_EVENTS);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [connectionStatus, setConnectionStatus] = useState<'CONNECTED' | 'RECONNECTING' | 'PAUSED'>('CONNECTED');
  const [filterSeverity, setFilterSeverity] = useState<SeverityLevel | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [stats, setStats] = useState({
    receivedCount: INITIAL_LIVE_EVENTS.length,
    criticalCount: INITIAL_LIVE_EVENTS.filter(e => e.severity === 'CRITICAL').length,
    highCount: INITIAL_LIVE_EVENTS.filter(e => e.severity === 'HIGH').length
  });

  const nextIdRef = useRef(9042);
  const poolIndexRef = useRef(0);

  // Function to inject an event
  const injectEvent = useCallback((eventTemplate?: Omit<SecurityEvent, 'id' | 'timestamp' | 'relativeTime' | 'isNew'>) => {
    const template = eventTemplate || SIMULATED_ATTACK_POOL[poolIndexRef.current % SIMULATED_ATTACK_POOL.length];
    poolIndexRef.current += 1;

    const newEvent: SecurityEvent = {
      ...template,
      id: `evt-${nextIdRef.current++}`,
      timestamp: new Date().toISOString(),
      relativeTime: 'Just now',
      isNew: true
    };

    setEvents(prev => [newEvent, ...prev.slice(0, 49)]); // Keep last 50 events
    setStats(prev => ({
      receivedCount: prev.receivedCount + 1,
      criticalCount: prev.criticalCount + (newEvent.severity === 'CRITICAL' ? 1 : 0),
      highCount: prev.highCount + (newEvent.severity === 'HIGH' ? 1 : 0)
    }));

    // Clear isNew flag after animation duration
    setTimeout(() => {
      setEvents(currentEvents =>
        currentEvents.map(evt => evt.id === newEvent.id ? { ...evt, isNew: false } : evt)
      );
    }, 2800);
  }, []);

  // Live WebSocket listener with simulation ticker fallback
  useEffect(() => {
    if (isPaused) {
      setConnectionStatus('PAUSED');
      return;
    }

    let ws: WebSocket | null = null;
    let fallbackTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let isLiveWsActive = false;

    // 1. Attempt connection to real backend WebSocket
    try {
      const liveWsUrl = WS_BASE_URL.replace(/\/ws\/?$/, '') + '/ws/events';
      ws = new WebSocket(liveWsUrl);

      ws.onopen = () => {
        isLiveWsActive = true;
        setConnectionStatus('CONNECTED');
      };

      ws.onmessage = (msgEvent) => {
        try {
          const parsed = JSON.parse(msgEvent.data);
          if (parsed.type === 'security_event' && parsed.event) {
            const e = parsed.event;
            injectEvent({
              sourceIp: e.source_ip || '198.51.100.42',
              targetDatabase: `${e.database_name || 'production'} (${e.schema_name || 'decoy'})`,
              eventType: e.event_type || 'DECOY_ACCESS',
              query: e.query || 'SELECT * FROM nexusguard_decoy.admin_credentials',
              severity: e.severity || 'CRITICAL',
              detectionReason: e.detection_reason || 'Interception rule triggered',
              responseAction: e.severity === 'CRITICAL' ? 'Attacker IP Dynamically Contained' : 'Telemetry Logged',
              attackVector: e.event_type === 'DECOY_ACCESS' ? 'Decoy Infiltration Probe' : 'Database Reconnaissance',
            });
          }
        } catch {
          // ignore malformed payloads
        }
      };

      ws.onerror = () => {
        isLiveWsActive = false;
      };

      ws.onclose = () => {
        isLiveWsActive = false;
      };
    } catch {
      isLiveWsActive = false;
    }

    // 2. Simulation ticker (runs when not actively receiving live WS messages)
    setConnectionStatus('CONNECTED');

    const scheduleNextEvent = () => {
      const delay = Math.floor(Math.random() * 4000) + 4000;
      fallbackTimeoutId = setTimeout(() => {
        if (!isLiveWsActive) {
          injectEvent();
        }
        scheduleNextEvent();
      }, delay);
    };

    scheduleNextEvent();

    return () => {
      if (fallbackTimeoutId) clearTimeout(fallbackTimeoutId);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onerror = null;
        ws.onclose = null;
        ws.close();
      }
    };
  }, [isPaused, injectEvent]);

  // Periodic ticker to refresh relative timestamps
  useEffect(() => {
    const timer = setInterval(() => {
      setEvents(currentEvents =>
        currentEvents.map(e => ({
          ...e,
          relativeTime: formatRelativeTime(e.timestamp)
        }))
      );
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const togglePause = useCallback(() => {
    setIsPaused(prev => !prev);
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  // Filtered view
  const filteredEvents = events.filter(e => {
    const matchesSeverity = filterSeverity === 'ALL' || e.severity === filterSeverity;
    const matchesSearch = searchQuery === '' || 
      e.sourceIp.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.eventType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.query.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.targetDatabase.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSeverity && matchesSearch;
  });

  return {
    events: filteredEvents,
    rawEvents: events,
    isPaused,
    connectionStatus,
    filterSeverity,
    searchQuery,
    stats,
    togglePause,
    clearEvents,
    injectEvent,
    setFilterSeverity,
    setSearchQuery
  };
}
