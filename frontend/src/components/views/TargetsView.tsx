import React, { useState, useEffect } from 'react';
import { Database, CheckCircle2, RefreshCw, Activity } from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';

interface TargetInfo {
  id: string;
  name: string;
  environment: string;
  engine: string;
  hostMask: string;
  status: string;
  tables: string[];
  tableCount: number;
  lastIntercept: string;
}

export const TargetsView: React.FC = () => {
  const [targets, setTargets] = useState<TargetInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState<string | null>(null);
  const [topology, setTopology] = useState<any>(null);

  const fetchTargets = async () => {
    setLoading(true);
    try {
      // Reflect schema from target 1 (demo DB)
      let schemaRes = await fetch(getApiUrl('/api/targets/1/schema'));
      if (schemaRes.status === 404) {
        // No snapshot yet — trigger reflection first
        await fetch(getApiUrl('/api/targets/1/reflect'), { method: 'POST' });
        schemaRes = await fetch(getApiUrl('/api/targets/1/schema'));
      }
      let tables: string[] = [];
      if (schemaRes.ok) {
        const data = await schemaRes.json();
        tables = (data.tables || []).map((t: any) => t.name || t);
      }

      // Get events metrics for last intercept info
      let lastIntercept = 'No events yet';
      try {
        const evtRes = await fetch(getApiUrl('/api/events?page=1&page_size=1'));
        if (evtRes.ok) {
          const evtData = await evtRes.json();
          if (evtData.items && evtData.items.length > 0) {
            const ts = new Date(evtData.items[0].timestamp);
            const ago = Math.floor((Date.now() - ts.getTime()) / 60000);
            lastIntercept = ago < 1 ? 'Just now' : ago < 60 ? `${ago} min ago` : `${Math.floor(ago / 60)}h ago`;
          }
        }
      } catch {}

      // Build target cards from live data
      const target1: TargetInfo = {
        id: 'target-1',
        name: 'Target Demo Database',
        environment: 'Production + Decoy Mesh',
        engine: 'SQLite (local) / MySQL (cloud)',
        hostMask: 'target_demo.db (local dev)',
        status: tables.length > 0 ? 'ONLINE' : 'CONNECTING',
        tables,
        tableCount: tables.length,
        lastIntercept,
      };

      setTargets([target1]);
    } catch {
      setTargets([{
        id: 'target-1',
        name: 'Target Demo Database',
        environment: 'Production + Decoy Mesh',
        engine: 'SQLite / MySQL',
        hostMask: 'target_demo.db',
        status: 'OFFLINE',
        tables: [],
        tableCount: 0,
        lastIntercept: 'Backend unavailable',
      }]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, []);

  const handleInspectTopology = async (targetId: string) => {
    if (inspecting === targetId) {
      setInspecting(null);
      setTopology(null);
      return;
    }
    setInspecting(targetId);
    try {
      const res = await fetch(getApiUrl('/api/targets/1/graph'));
      if (res.ok) {
        const data = await res.json();
        setTopology(data);
      } else {
        setTopology({ error: `API returned ${res.status}` });
      }
    } catch (err: any) {
      setTopology({ error: err.message });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Monitored Target Clusters
          </h2>
          <p className="text-xs text-slate-400">
            Database targets registered in the NexusGuard deception mesh — reflected live from the backend.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchTargets}
            className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            {targets.length} Cluster{targets.length !== 1 ? 's' : ''} Active
          </span>
        </div>
      </div>

      {loading && targets.length === 0 ? (
        <div className="py-12 text-center text-xs font-mono text-slate-400 animate-pulse">
          Reflecting target database schema...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {targets.map((db) => (
            <div
              key={db.id}
              className="p-4 rounded-md border bg-slate-800/90 border-blue-600/60"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded bg-blue-950 text-blue-400 border border-blue-700">
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-slate-100">{db.name}</h3>
                    <span className="text-[11px] font-mono text-slate-400">{db.engine}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                    db.status === 'ONLINE'
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 animate-pulse'
                      : db.status === 'OFFLINE'
                      ? 'bg-rose-950/80 text-rose-400 border-rose-800/80'
                      : 'bg-amber-950/80 text-amber-400 border-amber-800/80'
                  }`}
                >
                  {db.status}
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono bg-slate-900/80 p-3 rounded border border-slate-750">
                <div className="flex justify-between">
                  <span className="text-slate-400">Environment:</span>
                  <span className="text-slate-200 font-semibold">{db.environment}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Connection:</span>
                  <span className="text-slate-300">{db.hostMask}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Tables Reflected:</span>
                  <span className="text-blue-400 font-semibold">{db.tableCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Intercept:</span>
                  <span className="text-slate-300">{db.lastIntercept}</span>
                </div>
                {db.tables.length > 0 && (
                  <div className="pt-2 border-t border-slate-750">
                    <span className="text-slate-400 block mb-1.5">Reflected Tables:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {db.tables.map((t) => (
                        <span key={t} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-750">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Deception Mesh: {db.status === 'ONLINE' ? 'Engaged' : 'Pending'}</span>
                </div>
                <button
                  type="button"
                  onClick={() => handleInspectTopology(db.id)}
                  className="flex items-center gap-1 px-2 py-1 text-xs font-mono bg-slate-900 hover:bg-slate-750 text-slate-200 rounded border border-slate-700 transition-colors"
                >
                  <Activity className="w-3 h-3" />
                  <span>{inspecting === db.id ? 'Hide Topology' : 'Inspect Topology'}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Topology Viewer */}
      {topology && !topology.error && (
        <div className="bg-slate-850 rounded-md border border-slate-700 p-4 space-y-3 animate-in fade-in duration-200">
          <h3 className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
            Schema Dependency Graph (NetworkX DAG)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h4 className="text-[11px] font-mono text-slate-400 mb-2">Nodes ({topology.nodes?.length || 0})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {(topology.nodes || []).map((node: any, i: number) => (
                  <div key={i} className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-750 text-slate-200">
                    {node.data?.label || node.id || JSON.stringify(node)}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[11px] font-mono text-slate-400 mb-2">Edges ({topology.edges?.length || 0})</h4>
              <div className="max-h-48 overflow-y-auto space-y-1">
                {(topology.edges || []).map((edge: any, i: number) => (
                  <div key={i} className="text-[11px] font-mono px-2 py-1 rounded bg-slate-900 border border-slate-750 text-blue-300">
                    {edge.source || edge.from} → {edge.target || edge.to}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {topology?.error && (
        <div className="p-3 rounded bg-amber-950/50 border border-amber-800 text-amber-300 text-xs font-mono">
          Topology API: {topology.error}
        </div>
      )}
    </div>
  );
};
