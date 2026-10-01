import { Save } from 'lucide-react';

export const SettingsView: React.FC = () => {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
          Platform Configurations
        </h2>
        <p className="text-xs text-slate-400">
          Global cyber-deception engine rules, canary sensitivity thresholds, and defense response protocols.
        </p>
      </div>

      <div className="bg-slate-800 rounded-md border border-slate-700 p-4 space-y-4">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-slate-200 pb-2 border-b border-slate-700">
          Canary Trigger & Tarpit Parameters
        </h3>

        <div className="space-y-4 max-w-xl text-xs font-mono">
          <div>
            <label className="block text-slate-300 mb-1">Decoy Schema Namespace Prefix</label>
            <input
              type="text"
              readOnly
              value="nexusguard_decoy"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Automated proxy traps any SQL referencing this schema hierarchy.
            </span>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Deception Tarpit Delay (ms)</label>
            <input
              type="number"
              defaultValue={350}
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Artificially delays suspicious attacker probes to exhaust scanner concurrency.
            </span>
          </div>

          <div>
            <label className="block text-slate-300 mb-1">Real-time Webhook Notification Endpoint</label>
            <input
              type="text"
              defaultValue="https://siem-collector.internal/v1/cyber-deception"
              className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-1.5 text-slate-200"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              SIEM and SOAR alert ingestion endpoint. Credentials configured via secure HSM.
            </span>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => alert('Settings saved successfully.')}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
