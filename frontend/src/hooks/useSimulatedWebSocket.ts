import { useState, useEffect, useCallback, useRef } from 'react';
import { SecurityEvent, SeverityLevel } from '../types/soc';
import { INITIAL_LIVE_EVENTS } from '../mock/socData';
import { formatRelativeTime } from '../utils/formatters';
import { WS_BASE_URL, getApiUrl } from '../utils/apiConfig';

function getRandomProceduralEvent(): Omit<SecurityEvent, 'id' | 'timestamp' | 'relativeTime' | 'isNew'> {
  const ipPrefixes = ['185.220.101', '194.26.29', '45.154.255', '89.248.165', '103.145.12', '198.51.100', '192.168.10'];
  const chosenPrefix = ipPrefixes[Math.floor(Math.random() * ipPrefixes.length)];
  const ip = `${chosenPrefix}.${Math.floor(Math.random() * 240) + 10}`;

  const scenarios = [
    {
      eventType: 'DECOY_ACCESS',
      severity: 'CRITICAL' as SeverityLevel,
      targetDatabase: 'target_demo (nexusguard_decoy)',
      query: `SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE '1'='1' --`,
      attackVector: 'Lateral Movement - Decoy Admin Credential Probe',
      responseAction: 'Attacker IP Dynamically Contained (Banned)',
      detectionReason: 'Direct honeypot access: Attempted administrative credential exfiltration'
    },
    {
      eventType: 'DECOY_ACCESS',
      severity: 'CRITICAL' as SeverityLevel,
      targetDatabase: 'target_demo (nexusguard_decoy)',
      query: `SELECT card_number, cvv_hash, exp_date FROM nexusguard_decoy.payment_vault LIMIT ${Math.floor(Math.random() * 50) + 10}`,
      attackVector: 'Exfiltration Probe - Decoy Financial Records',
      responseAction: 'Attacker IP Dynamically Contained (Banned)',
      detectionReason: 'Decoy credit card vault queried'
    },
    {
      eventType: 'CANARY_TOKEN_TRIGGERED',
      severity: 'HIGH' as SeverityLevel,
      targetDatabase: 'target_demo (nexusguard_decoy)',
      query: `SELECT secret_seed, auth_token FROM nexusguard_decoy.api_credential_canaries WHERE active = 1`,
      attackVector: 'Canary Token Tripped',
      responseAction: 'IP Throttled & SIEM Flagged',
      detectionReason: 'Synthetic API key canary accessed'
    },
    {
      eventType: 'SCHEMA_ENUMERATION',
      severity: 'MEDIUM' as SeverityLevel,
      targetDatabase: 'target_demo (information_schema)',
      query: `SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('sys', 'pg_catalog')`,
      attackVector: 'Reconnaissance / Metadata Scraping',
      responseAction: 'Decoy Schema Injected into Result',
      detectionReason: 'Automated schema enumeration reconnaissance scan'
    },
    {
      eventType: 'DECOY_ACCESS',
      severity: 'HIGH' as SeverityLevel,
      targetDatabase: 'target_demo (nexusguard_decoy)',
      query: `UPDATE nexusguard_decoy.shadow_administrators SET privileges = 'ALL' WHERE username = 'sys_backup'`,
      attackVector: 'Privilege Escalation Simulation',
      responseAction: 'Silent Null-Op Response Returned',
      detectionReason: 'Modification attempt on shadow administrator decoy'
    },
    {
      eventType: 'DECOY_ACCESS',
      severity: 'CRITICAL' as SeverityLevel,
      targetDatabase: 'target_demo (nexusguard_decoy)',
      query: `SELECT username, password_salt_canary FROM nexusguard_decoy.auth_canary_vault LIMIT 100`,
      attackVector: 'Credential Vault Dump Attempt',
      responseAction: 'Deception Trap Tripped & Alert Dispatched',
      detectionReason: 'Direct access to auth canary vault'
    }
  ];

  const chosen = scenarios[Math.floor(Math.random() * scenarios.length)];
  return {
    sourceIp: ip,
    targetDatabase: chosen.targetDatabase,
    eventType: chosen.eventType,
    query: chosen.query,
    severity: chosen.severity,
    attackVector: chosen.attackVector,
    responseAction: chosen.responseAction,
    detectionReason: chosen.detectionReason
  };
}

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

  // Fetch real events from database on mount
  useEffect(() => {
    let isMounted = true;
    const fetchRealEvents = async () => {
      try {
        const response = await fetch(getApiUrl('/api/events?page=1&page_size=50'));
        if (!response.ok) return;
        const data = await response.json();
        if (data && Array.isArray(data.items) && data.items.length > 0 && isMounted) {
          const mapped: SecurityEvent[] = data.items.map((item: any) => ({
            id: `evt-${item.id}`,
            timestamp: item.timestamp,
            relativeTime: formatRelativeTime(item.timestamp),
            sourceIp: item.source_ip,
            targetDatabase: `${item.database_name || 'target_demo'} (${item.schema_name || 'decoy'})`,
            eventType: item.event_type,
            query: item.query,
            severity: item.severity,
            detectionReason: item.detection_reason,
            attackVector: item.detection_reason,
            responseAction: item.severity === 'CRITICAL' ? 'Attacker IP Dynamically Contained' : 'Session Flagged & Logged',
            isNew: false
          }));
          setEvents(mapped);
          setStats({
            receivedCount: mapped.length,
            criticalCount: mapped.filter(e => e.severity === 'CRITICAL').length,
            highCount: mapped.filter(e => e.severity === 'HIGH').length
          });
        }
      } catch {
        // Fall back to initial events if backend is temporarily unreachable
      }
    };

    fetchRealEvents();
    return () => {
      isMounted = false;
    };
  }, []);

  // Function to inject an event
  const injectEvent = useCallback((eventTemplate?: Omit<SecurityEvent, 'id' | 'timestamp' | 'relativeTime' | 'isNew'>) => {
    const template = eventTemplate || getRandomProceduralEvent();

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
