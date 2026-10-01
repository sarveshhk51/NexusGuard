import React, { useState, useEffect } from 'react';
import { SeverityBadge } from '../common/SeverityBadge';
import { RefreshCw, ShieldOff, CheckCircle2 } from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';

interface AlertRecord {
  id: string;
  event_id: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  status: string;
  created_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
}

interface LinkedEvent {
  id: string;
  source_ip: string;
  query: string;
  database_name: string;
  schema_name: string;
  table_name: string;
  detection_reason: string;
  event_type: string;
}

export const AlertsView: React.FC = () => {
  const [alerts, setAlerts] = useState<(AlertRecord & { event?: LinkedEvent })[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ id: string; msg: string } | null>(null);

  const fetchAlerts = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/alerts?page=1&page_size=50'));
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.items)) {
        // For each alert, also fetch its linked event for source_ip and query
        const enriched = await Promise.all(
          data.items.map(async (alert: AlertRecord) => {
            try {
              const evtRes = await fetch(getApiUrl(`/api/events/${alert.event_id}`));
              if (evtRes.ok) {
                const evt = await evtRes.json();
                return { ...alert, event: evt };
              }
            } catch {}
            return alert;
          })
        );
        setAlerts(enriched);
      }
    } catch {
      // fallback
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlerts();
  }, []);

  const handleIsolateIP = async (alertId: string, ip: string) => {
    setActionInProgress(alertId + '-isolate');
    try {
      const res = await fetch(getApiUrl('/api/defense/block'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ip_address: ip,
          reason: `Manual isolation from alert ${alertId}`,
          severity: 'CRITICAL',
        }),
      });
      if (res.ok) {
        setFeedback({ id: alertId, msg: `IP ${ip} contained in blocklist` });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {}
    setActionInProgress(null);
  };

  const handleAcknowledge = async (alertId: string) => {
    setActionInProgress(alertId + '-ack');
    try {
      const res = await fetch(getApiUrl(`/api/alerts/${alertId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'INVESTIGATING' }),
      });
      if (res.ok) {
        setAlerts(prev =>
          prev.map(a =>
            a.id === alertId ? { ...a, status: 'INVESTIGATING', acknowledged_at: new Date().toISOString() } : a
          )
        );
        setFeedback({ id: alertId, msg: 'Alert acknowledged → INVESTIGATING' });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {}
    setActionInProgress(null);
  };

  const handleResolve = async (alertId: string) => {
    setActionInProgress(alertId + '-resolve');
    try {
      const res = await fetch(getApiUrl(`/api/alerts/${alertId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'RESOLVED' }),
      });
      if (res.ok) {
        setAlerts(prev =>
          prev.map(a =>
            a.id === alertId ? { ...a, status: 'RESOLVED', resolved_at: new Date().toISOString() } : a
          )
        );
        setFeedback({ id: alertId, msg: 'Alert resolved ✓' });
        setTimeout(() => setFeedback(null), 4000);
      }
    } catch {}
    setActionInProgress(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'NEW': return 'bg-rose-950/80 text-rose-400 border-rose-800/80';
      case 'INVESTIGATING': return 'bg-amber-950/80 text-amber-400 border-amber-800/80';
      case 'RESOLVED': return 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80';
      case 'FALSE_POSITIVE': return 'bg-slate-900 text-slate-400 border-slate-700';
      default: return 'bg-slate-900 text-slate-400 border-slate-700';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Incident & Threat Alerts
          </h2>
          <p className="text-xs text-slate-400">
            Real-time triage queue — alerts auto-escalated from HIGH/CRITICAL security events detected by the deception engine.
          </p>
        </div>
        <button
          onClick={fetchAlerts}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {loading && alerts.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-slate-400 animate-pulse">
          Loading alerts from NexusGuard Detection Engine...
        </div>
      ) : alerts.length === 0 ? (
        <div className="py-12 text-center">
          <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mx-auto mb-3" />
          <p className="text-xs font-mono text-slate-300 font-semibold">No Active Alerts</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Run an attack via the Live Attack Arena to generate real alerts from the detection engine.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map((alt) => (
            <div
              key={alt.id}
              className={`bg-slate-800 rounded-md p-4 border ${
                alt.severity === 'CRITICAL' ? 'border-red-600/70' : 'border-slate-700'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <SeverityBadge severity={alt.severity} />
                  <span className="font-mono font-bold text-xs text-slate-100">
                    Alert {alt.id.substring(0, 8)}
                  </span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase border ${getStatusColor(alt.status)}`}>
                    {alt.status}
                  </span>
                </div>
                <span className="font-mono text-xs text-slate-400">
                  {new Date(alt.created_at).toLocaleString()}
                </span>
              </div>

              {alt.event && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded border border-slate-750 mb-3">
                  <div>
                    <span className="text-slate-400">Threat Origin IP: </span>
                    <span className="text-blue-400 font-semibold">{alt.event.source_ip}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Deception Asset: </span>
                    <span className="text-slate-200">{alt.event.schema_name}.{alt.event.table_name}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Rule: </span>
                    <span className="text-amber-400 font-semibold">{alt.event.event_type}</span>
                  </div>
                </div>
              )}

              {alt.event && (
                <div className="text-xs font-mono mb-3">
                  <span className="text-slate-400">Detection Reason: </span>
                  <span className="text-slate-200">{alt.event.detection_reason}</span>
                </div>
              )}

              {alt.event?.query && (
                <div className="px-2.5 py-1.5 rounded bg-slate-900 border border-slate-750 text-[11px] font-mono text-amber-300/90 mb-3 break-all">
                  <code>{alt.event.query}</code>
                </div>
              )}

              {feedback?.id === alt.id && (
                <div className="mb-2 px-2.5 py-1.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-[11px] font-mono text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {feedback.msg}
                </div>
              )}

              <div className="flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-750 text-xs font-mono">
                {alt.event && alt.status !== 'RESOLVED' && (
                  <button
                    onClick={() => handleIsolateIP(alt.id, alt.event!.source_ip)}
                    disabled={actionInProgress === alt.id + '-isolate'}
                    className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/80 transition-colors disabled:opacity-50"
                  >
                    <ShieldOff className="w-3 h-3 inline mr-1" />
                    {actionInProgress === alt.id + '-isolate' ? 'Blocking...' : 'Isolate Threat IP'}
                  </button>
                )}
                {alt.status === 'NEW' && (
                  <button
                    onClick={() => handleAcknowledge(alt.id)}
                    disabled={actionInProgress === alt.id + '-ack'}
                    className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors disabled:opacity-50"
                  >
                    {actionInProgress === alt.id + '-ack' ? 'Acknowledging...' : 'Acknowledge'}
                  </button>
                )}
                {alt.status === 'INVESTIGATING' && (
                  <button
                    onClick={() => handleResolve(alt.id)}
                    disabled={actionInProgress === alt.id + '-resolve'}
                    className="px-2.5 py-1 rounded bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border border-emerald-700/80 transition-colors disabled:opacity-50"
                  >
                    {actionInProgress === alt.id + '-resolve' ? 'Resolving...' : 'Mark Resolved'}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
