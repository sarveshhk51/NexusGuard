import { ArrowRight } from 'lucide-react';

export const SchemaIntelligenceView: React.FC = () => {
  const schemaMappings = [
    {
      prodTable: 'public.customers',
      decoyTable: 'nexusguard_decoy.customers',
      shadowColumns: ['id', 'email_canary', 'phone_obfuscated', 'vault_hash'],
      strategy: 'Synthetic Shadow Table with Canary Foreign Keys',
      tripSensitivity: 'Immediate CRITICAL Alert on full table scan'
    },
    {
      prodTable: 'auth.user_credentials',
      decoyTable: 'nexusguard_decoy.api_credential_canaries',
      shadowColumns: ['secret_seed', 'auth_token', 'revocation_marker'],
      strategy: 'Canary Honey-Token Injection',
      tripSensitivity: 'HIGH Alert on any SELECT query'
    },
    {
      prodTable: 'finance.general_ledger',
      decoyTable: 'nexusguard_decoy.financial_ledger_canary',
      shadowColumns: ['ledger_id', 'entry_amount', 'audit_checksum'],
      strategy: 'Trap Table with Watermarked Mock Numbers',
      tripSensitivity: 'MEDIUM Alert on exploratory querying'
    },
    {
      prodTable: 'admin.privileged_accounts',
      decoyTable: 'nexusguard_decoy.shadow_administrators',
      shadowColumns: ['username', 'privileges', 'last_simulated_login'],
      strategy: 'Honey Administrator Account Trap',
      tripSensitivity: 'CRITICAL Alert on privilege modification'
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Schema Intelligence & Decoy Mapping
          </h2>
          <p className="text-xs text-slate-400">
            Automated schema mimicry mapping production catalog structures to cyber-deception traps.
          </p>
        </div>
      </div>

      <div className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
        <div className="p-3 bg-slate-850 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-200 uppercase">
            Active Schema Deception Mappings
          </span>
          <span className="text-[11px] font-mono text-emerald-400">
            Synchronization Status: 100% In Sync
          </span>
        </div>

        <div className="divide-y divide-slate-750">
          {schemaMappings.map((mapping, idx) => (
            <div key={idx} className="p-4 hover:bg-slate-750/30 transition-colors">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 font-mono text-xs">
                  <span className="px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300 font-semibold">
                    {mapping.prodTable}
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-blue-400" />
                  <span className="px-2 py-1 rounded bg-blue-950/70 border border-blue-700/80 text-blue-300 font-semibold">
                    {mapping.decoyTable}
                  </span>
                </div>

                <span className="text-[11px] font-mono text-slate-400 bg-slate-900 px-2 py-0.5 rounded border border-slate-750">
                  {mapping.strategy}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-xs font-mono">
                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-750/70">
                  <span className="text-slate-400 block mb-1">Synthesized Canary Columns:</span>
                  <div className="flex flex-wrap gap-1.5">
                    {mapping.shadowColumns.map((col) => (
                      <span key={col} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[11px]">
                        {col}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-900/60 p-2.5 rounded border border-slate-750/70">
                  <span className="text-slate-400 block mb-1">Trip Trigger Protocol:</span>
                  <span className="text-red-400 font-semibold text-[11px]">
                    {mapping.tripSensitivity}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
