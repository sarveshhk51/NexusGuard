import { Key } from 'lucide-react';
import { DECOY_ASSETS_LIST } from '../../mock/socData';
import { SeverityBadge } from '../common/SeverityBadge';

export const DeceptionView: React.FC = () => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Canary & Honey Asset Management
          </h2>
          <p className="text-xs text-slate-400">
            Deployed cyber-deception objects, tripwires, and synthetic traps across database topologies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors">
            <Key className="w-3.5 h-3.5" />
            <span>Deploy New Decoy Asset</span>
          </button>
        </div>
      </div>

      <div className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-850 text-slate-400 uppercase tracking-wider border-b border-slate-700">
            <tr>
              <th className="p-3">Asset Identifier</th>
              <th className="p-3">Parent Schema</th>
              <th className="p-3">Asset Type</th>
              <th className="p-3">Risk Rating</th>
              <th className="p-3 text-center">Interactions Tripped</th>
              <th className="p-3">State</th>
              <th className="p-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-750 text-slate-200">
            {DECOY_ASSETS_LIST.map((asset) => (
              <tr key={asset.id} className="hover:bg-slate-750/30 transition-colors">
                <td className="p-3 font-semibold text-slate-100">
                  {asset.assetName}
                </td>
                <td className="p-3 text-slate-400">
                  {asset.parentSchema}
                </td>
                <td className="p-3 text-slate-300">
                  {asset.type}
                </td>
                <td className="p-3">
                  <SeverityBadge severity={asset.riskRating} size="sm" />
                </td>
                <td className="p-3 text-center">
                  <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-750 text-blue-400 font-bold">
                    {asset.triggeredCount}
                  </span>
                </td>
                <td className="p-3">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                    asset.status === 'TRIPPED'
                      ? 'bg-red-950/80 text-red-400 border-red-800/80'
                      : 'bg-emerald-950/80 text-emerald-400 border-emerald-800/80'
                  }`}>
                    {asset.status}
                  </span>
                </td>
                <td className="p-3 text-right">
                  <button className="px-2 py-1 text-[11px] bg-slate-900 hover:bg-slate-750 border border-slate-700 rounded text-slate-300">
                    Audit Logs
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
