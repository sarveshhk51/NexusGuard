import React from 'react';
import { SeverityBadge } from '../common/SeverityBadge';

export const AlertsView: React.FC = () => {
  const alerts = [
    {
      id: 'ALT-1092',
      title: 'Decoy Table Credential Exfiltration Attempt',
      timestamp: '2026-09-27 11:28:12 UTC',
      sourceIp: '10.0.0.42',
      target: 'PostgreSQL 16 (nexusguard_decoy.customers)',
      severity: 'CRITICAL' as const,
      status: 'UNDER_INVESTIGATION',
      remediation: 'Host quarantine recommended'
    },
    {
      id: 'ALT-1091',
      title: 'Canary Honey-Token Extracted via Blind SQL Injection',
      timestamp: '2026-09-27 11:27:45 UTC',
      sourceIp: '192.168.10.88',
      target: 'nexusguard_decoy.api_credential_canaries',
      severity: 'HIGH' as const,
      status: 'MITIGATED',
      remediation: 'Token marked burned, egress blocked'
    },
    {
      id: 'ALT-1090',
      title: 'Catalog Reconnaissance / Deception Schema Probe',
      timestamp: '2026-09-27 11:25:30 UTC',
      sourceIp: '172.16.4.15',
      target: 'PostgreSQL 16 information_schema',
      severity: 'MEDIUM' as const,
      status: 'MONITORING',
      remediation: 'Synthetic tables fed into scanner output'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Incident & Threat Alerts
          </h2>
          <p className="text-xs text-slate-400">
            Real-time telemetry triage queue for high-priority deception tripwire events.
          </p>
        </div>
      </div>

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
                <span className="font-mono font-bold text-xs text-slate-100">{alt.id}: {alt.title}</span>
              </div>
              <span className="font-mono text-xs text-slate-400">{alt.timestamp}</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs font-mono bg-slate-900/80 p-2.5 rounded border border-slate-750 mb-3">
              <div>
                <span className="text-slate-400">Threat Origin IP: </span>
                <span className="text-blue-400 font-semibold">{alt.sourceIp}</span>
              </div>
              <div>
                <span className="text-slate-400">Deception Asset: </span>
                <span className="text-slate-200">{alt.target}</span>
              </div>
              <div>
                <span className="text-slate-400">Triage State: </span>
                <span className="text-amber-400 font-semibold">{alt.status}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-750 text-xs font-mono">
              <span className="text-slate-400">
                Recommended Action: <span className="text-slate-200">{alt.remediation}</span>
              </span>

              <div className="flex items-center gap-2">
                <button className="px-2.5 py-1 rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-700/80 transition-colors">
                  Isolate Threat IP
                </button>
                <button className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-750 text-slate-300 border border-slate-700 transition-colors">
                  Acknowledge
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
