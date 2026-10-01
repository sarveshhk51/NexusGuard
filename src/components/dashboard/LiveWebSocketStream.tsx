import React, { useState } from 'react';
import { 
  Play, 
  Pause, 
  Trash2, 
  Filter, 
  Search, 
  PlusCircle, 
  Database, 
  Terminal, 
  Globe, 
  Copy, 
  Check, 
  ShieldAlert,
  ArrowDownCircle
} from 'lucide-react';
import { SecurityEvent, SeverityLevel } from '../../types/soc';
import { SeverityBadge } from '../common/SeverityBadge';
import { EmptyState } from '../common/EmptyState';

interface LiveWebSocketStreamProps {
  events: SecurityEvent[];
  isPaused: boolean;
  connectionStatus: 'CONNECTED' | 'RECONNECTING' | 'PAUSED';
  filterSeverity: SeverityLevel | 'ALL';
  searchQuery: string;
  onTogglePause: () => void;
  onClearEvents: () => void;
  onInjectEvent: () => void;
  onSetFilterSeverity: (severity: SeverityLevel | 'ALL') => void;
  onSetSearchQuery: (query: string) => void;
}

export const LiveWebSocketStream: React.FC<LiveWebSocketStreamProps> = ({
  events,
  isPaused,
  connectionStatus,
  filterSeverity,
  searchQuery,
  onTogglePause,
  onClearEvents,
  onInjectEvent,
  onSetFilterSeverity,
  onSetSearchQuery
}) => {
  const [copiedQueryId, setCopiedQueryId] = useState<string | null>(null);

  const handleCopyQuery = (id: string, query: string) => {
    navigator.clipboard.writeText(query);
    setCopiedQueryId(id);
    setTimeout(() => setCopiedQueryId(null), 2000);
  };

  return (
    <div className="bg-slate-800 rounded-md border border-slate-700 flex flex-col h-full shadow-lg">
      {/* Stream Console Header */}
      <div className="p-3.5 border-b border-slate-700/80 bg-slate-850 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isPaused ? 'bg-amber-400' : 'bg-emerald-400'
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isPaused ? 'bg-amber-500' : 'bg-emerald-500'
              }`} />
            </span>
            <h3 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-100">
              Live WebSocket Stream
            </h3>
          </div>

          <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-900 border border-slate-750 text-slate-300">
            wss://nexusguard-decoy.internal/feed
          </span>

          <span className={`text-[10px] font-mono uppercase px-1.5 py-0.5 rounded font-semibold border ${
            isPaused 
              ? 'bg-amber-950/80 text-amber-400 border-amber-800/80' 
              : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
          }`}>
            {connectionStatus}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={onInjectEvent}
            title="Inject simulated intrusion event"
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded transition-colors"
          >
            <PlusCircle className="w-3.5 h-3.5 text-blue-400" />
            <span>Simulate Probe</span>
          </button>

          <button
            onClick={onTogglePause}
            title={isPaused ? "Resume event stream" : "Pause event stream"}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-mono border rounded transition-colors ${
              isPaused 
                ? 'bg-emerald-950/70 text-emerald-400 border-emerald-700/80 hover:bg-emerald-900/80'
                : 'bg-amber-950/70 text-amber-400 border-amber-700/80 hover:bg-amber-900/80'
            }`}
          >
            {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            <span>{isPaused ? 'Resume' : 'Pause'}</span>
          </button>

          <button
            onClick={onClearEvents}
            title="Clear stream feed"
            className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-900 rounded border border-slate-750 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="px-3.5 py-2 border-b border-slate-750 bg-slate-900/60 flex flex-wrap items-center justify-between gap-3">
        {/* Severity Filter Tabs */}
        <div className="flex items-center gap-1 text-[11px] font-mono">
          <span className="text-slate-400 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-slate-400" />
            Severity:
          </span>
          {(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map((sev) => (
            <button
              key={sev}
              onClick={() => onSetFilterSeverity(sev)}
              className={`px-2 py-0.5 rounded transition-colors uppercase ${
                filterSeverity === sev
                  ? 'bg-blue-600 text-white font-semibold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-750 border border-slate-700'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search IP, query, or event..."
            value={searchQuery}
            onChange={(e) => onSetSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded pl-8 pr-3 py-1 text-xs font-mono text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
        </div>
      </div>

      {/* Events Stream Feed Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-750 max-h-[580px] p-2 space-y-2">
        {events.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title="No events matching criteria"
            description="The stream is either paused, cleared, or current severity filters excluded all incoming intrusions."
            actionText="Resume Stream or Reset Filter"
            onAction={() => {
              if (isPaused) onTogglePause();
              onSetFilterSeverity('ALL');
              onSetSearchQuery('');
            }}
          />
        ) : (
          events.map((evt) => {
            const isCritical = evt.severity === 'CRITICAL';

            return (
              <div
                key={evt.id}
                className={`p-3 rounded-md transition-all border ${
                  evt.isNew ? 'animate-event-pulse border-blue-500/80 bg-blue-950/20' : 'border-slate-700/80 bg-slate-850 hover:bg-slate-800'
                } ${isCritical && !evt.isNew ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-slate-600'}`}
              >
                {/* Row Header: Severity, Event Type, Timestamp */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <SeverityBadge severity={evt.severity} size="sm" />
                    <span className="text-xs font-mono font-bold text-slate-200">
                      {evt.eventType}
                    </span>
                    {evt.isNew && (
                      <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-blue-500 text-white font-semibold animate-pulse">
                        NEW
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <span className="text-slate-300 font-semibold">{evt.relativeTime}</span>
                    <span className="text-slate-600">|</span>
                    <span className="text-[11px] text-slate-500">{evt.timestamp}</span>
                  </div>
                </div>

                {/* Sub-header: Source IP and Target Database */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono mb-2.5 pb-2 border-b border-slate-750/70">
                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-400">Source IP:</span>
                    <span className="font-semibold text-blue-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-750">
                      {evt.sourceIp}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 text-slate-300">
                    <Database className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="text-slate-400">Target Database:</span>
                    <span className="font-semibold text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-750">
                      {evt.targetDatabase}
                    </span>
                  </div>
                </div>

                {/* Query Body Block */}
                <div className="relative group">
                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 mb-1">
                    <div className="flex items-center gap-1">
                      <Terminal className="w-3 h-3 text-slate-400" />
                      <span>Interception Query Payload:</span>
                    </div>
                    <button
                      onClick={() => handleCopyQuery(evt.id, evt.query)}
                      title="Copy SQL Query"
                      className="opacity-80 hover:opacity-100 flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-200 transition-opacity"
                    >
                      {copiedQueryId === evt.id ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Copy SQL</span>
                        </>
                      )}
                    </button>
                  </div>

                  <pre className="p-2.5 rounded bg-slate-950 border border-slate-750 text-xs font-mono text-slate-200 overflow-x-auto selection:bg-blue-700/50">
                    <code>{evt.query}</code>
                  </pre>
                </div>

                {/* Response Action and Vector Footer */}
                {evt.responseAction && (
                  <div className="mt-2.5 flex flex-wrap items-center justify-between text-[11px] font-mono text-slate-400 pt-1.5 border-t border-slate-800">
                    <span className="text-slate-400">
                      Attack Vector: <span className="text-slate-300">{evt.attackVector}</span>
                    </span>
                    <span className="text-emerald-400 font-semibold">
                      Automated Defense: {evt.responseAction}
                    </span>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Stream Footer Telemetry */}
      <div className="p-2.5 bg-slate-900 border-t border-slate-750 text-[11px] font-mono text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ArrowDownCircle className="w-3.5 h-3.5 text-blue-400" />
          <span>Active Buffer: {events.length} events</span>
        </div>
        <span className="text-slate-500">Auto-refresh: 3.5s interval</span>
      </div>
    </div>
  );
};
