import { Database, CheckCircle2 } from 'lucide-react';
import { MONITORED_DATABASES_LIST } from '../../mock/socData';

export const TargetsView: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Monitored Target Clusters
          </h2>
          <p className="text-xs text-slate-400">
            PostgreSQL and MySQL database clusters registered in the NexusGuard deception mesh.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono px-2.5 py-1 rounded bg-slate-800 text-slate-300 border border-slate-700">
            2 Clusters Active
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {MONITORED_DATABASES_LIST.map((db) => {
          const isDecoy = db.environment === 'Decoy Cluster';

          return (
            <div
              key={db.id}
              className={`p-4 rounded-md border ${
                isDecoy ? 'bg-slate-800/90 border-blue-600/60' : 'bg-slate-800/90 border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                  <div className={`p-2 rounded ${isDecoy ? 'bg-blue-950 text-blue-400 border border-blue-700' : 'bg-slate-900 text-slate-300 border border-slate-750'}`}>
                    <Database className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-mono font-bold text-slate-100">{db.name}</h3>
                    <span className="text-[11px] font-mono text-slate-400">{db.engine}</span>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded border ${
                    db.status === 'INTERCEPTING'
                      ? 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80 animate-pulse'
                      : 'bg-blue-950/80 text-blue-400 border-blue-800/80'
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
                  <span className="text-slate-400">Cluster Host Mask:</span>
                  <span className="text-slate-300">{db.hostMask}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Decoy Tables Deployed:</span>
                  <span className="text-blue-400 font-semibold">{db.decoyTablesCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Honey Tokens Injected:</span>
                  <span className="text-amber-400 font-semibold">{db.honeyTokensCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Last Telemetry Intercept:</span>
                  <span className="text-slate-300">{db.lastIntercept}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between text-xs pt-3 border-t border-slate-750">
                <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Mesh Proxy Interceptor: Engaged</span>
                </div>
                <button
                  type="button"
                  className="px-2 py-1 text-xs font-mono bg-slate-900 hover:bg-slate-750 text-slate-200 rounded border border-slate-700"
                >
                  Inspect Topology
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
