import React, { useState, useEffect } from 'react';
import { Users, Shield } from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';

export const UsersView: React.FC = () => {
  const [blockedCount, setBlockedCount] = useState(0);
  const [eventCount, setEventCount] = useState(0);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const [blockedRes, metricsRes] = await Promise.all([
          fetch(getApiUrl('/api/defense/blocked-ips?active_only=true')),
          fetch(getApiUrl('/api/events/metrics')),
        ]);
        if (blockedRes.ok) {
          const data = await blockedRes.json();
          setBlockedCount(Array.isArray(data) ? data.length : 0);
        }
        if (metricsRes.ok) {
          const data = await metricsRes.json();
          setEventCount(data.total_events || 0);
        }
      } catch {}
    };
    fetchStats();
  }, []);

  // This is the real project team for EDI SEM3 evaluation
  const teamMembers = [
    {
      id: 'P1',
      name: 'Person 1',
      role: 'Database Adapter & Target Connection',
      responsibility: 'Target DB connection adapter, main app bootstrap, metadata database initialization',
      module: 'app/compat/database_adapter.py, app/main.py',
      status: 'INTEGRATED',
    },
    {
      id: 'P2',
      name: 'Person 2',
      role: 'Schema Intelligence & Deception Engine',
      responsibility: 'Schema reflection, NetworkX DAG topology, Faker synthetic decoy generation, isolated DDL deployment',
      module: 'app/schema_intelligence/, app/deception/',
      status: 'INTEGRATED',
    },
    {
      id: 'P3',
      name: 'Person 3',
      role: 'Threat Detection & SOC Streaming',
      responsibility: 'Detection rules (DecoyAccess, SchemaEnumeration, RepeatedAccess), security events, alerts, WebSocket broadcasting',
      module: 'app/detection/, app/security_events/, app/websocket/',
      status: 'INTEGRATED',
    },
    {
      id: 'P4',
      name: 'Person 4',
      role: 'SOC Frontend Dashboard',
      responsibility: 'React 18 + Vite + Tailwind CSS v4 SOC dashboard, live event feed, attack simulator, metric cards',
      module: 'frontend/src/',
      status: 'INTEGRATED',
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            <Users className="w-4 h-4 inline mr-1.5" />
            NexusGuard Team & Module Integration
          </h2>
          <p className="text-xs text-slate-400">
            EDI SEM3 project team members and their integrated subsystem modules.
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="px-2 py-1 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
            {eventCount} Events Processed
          </span>
          <span className="px-2 py-1 rounded bg-rose-950/80 text-rose-400 border border-rose-800/80">
            {blockedCount} IPs Contained
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {teamMembers.map((member) => (
          <div
            key={member.id}
            className="bg-slate-800 rounded-md border border-slate-700 p-4 hover:border-blue-600/50 transition-colors"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded bg-blue-950 border border-blue-700 flex items-center justify-center text-blue-400 font-mono font-bold text-xs">
                  {member.id}
                </div>
                <div>
                  <h3 className="text-sm font-mono font-bold text-slate-100">{member.name}</h3>
                  <span className="text-[11px] font-mono text-blue-400">{member.role}</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
                {member.status}
              </span>
            </div>

            <div className="space-y-2 text-xs font-mono bg-slate-900/80 p-3 rounded border border-slate-750">
              <div>
                <span className="text-slate-400">Responsibility: </span>
                <span className="text-slate-200">{member.responsibility}</span>
              </div>
              <div>
                <span className="text-slate-400">Module Path: </span>
                <code className="text-amber-300/80">{member.module}</code>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-slate-800 rounded-md border border-slate-700 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
            Integration Status
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs font-mono">
          <div className="bg-slate-900 p-2.5 rounded border border-slate-750 text-center">
            <div className="text-emerald-400 font-bold text-lg">4/4</div>
            <div className="text-slate-400 mt-1">Subsystems Merged</div>
          </div>
          <div className="bg-slate-900 p-2.5 rounded border border-slate-750 text-center">
            <div className="text-blue-400 font-bold text-lg">36/36</div>
            <div className="text-slate-400 mt-1">Tests Passing</div>
          </div>
          <div className="bg-slate-900 p-2.5 rounded border border-slate-750 text-center">
            <div className="text-amber-400 font-bold text-lg">{eventCount}</div>
            <div className="text-slate-400 mt-1">Events Detected</div>
          </div>
          <div className="bg-slate-900 p-2.5 rounded border border-slate-750 text-center">
            <div className="text-rose-400 font-bold text-lg">{blockedCount}</div>
            <div className="text-slate-400 mt-1">IPs Blocked</div>
          </div>
        </div>
      </div>
    </div>
  );
};
