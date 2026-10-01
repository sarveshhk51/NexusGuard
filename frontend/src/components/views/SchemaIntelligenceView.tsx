import React, { useState, useEffect } from 'react';
import { ArrowRight, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';

interface SchemaMapping {
  prodTable: string;
  decoyTable: string;
  columns: string[];
  strategy: string;
  tripSensitivity: string;
}

export const SchemaIntelligenceView: React.FC = () => {
  const [mappings, setMappings] = useState<SchemaMapping[]>([]);
  const [loading, setLoading] = useState(true);
  const [snapshotInfo, setSnapshotInfo] = useState<string>('');

  const fetchSchemaIntelligence = async () => {
    setLoading(true);
    try {
      // Reflect schema from target DB (auto-trigger reflection if none exists)
      let schemaRes = await fetch(getApiUrl('/api/targets/1/schema'));
      if (schemaRes.status === 404) {
        await fetch(getApiUrl('/api/targets/1/reflect'), { method: 'POST' });
        schemaRes = await fetch(getApiUrl('/api/targets/1/schema'));
      }
      if (!schemaRes.ok) throw new Error('Schema reflection failed');
      const schemaData = await schemaRes.json();

      const tables = schemaData.tables || [];
      setSnapshotInfo(`${tables.length} tables reflected from target database`);

      // Build schema intelligence mappings from reflected tables
      const built: SchemaMapping[] = tables.map((tbl: any) => {
        const tableName = tbl.name || tbl;
        const columns = (tbl.columns || []).map((c: any) => c.name || c);

        // Determine deception strategy based on table name
        let strategy = 'Synthetic Shadow Table with Canary Columns';
        let trip = 'MEDIUM Alert on exploratory querying';
        const lower = tableName.toLowerCase();

        if (lower.includes('customer') || lower.includes('user')) {
          strategy = 'Canary PII Shadow Table with Watermarked Fields';
          trip = 'Immediate CRITICAL Alert on full table scan';
        } else if (lower.includes('order') || lower.includes('payment') || lower.includes('transaction')) {
          strategy = 'Honey Token Financial Ledger Trap';
          trip = 'HIGH Alert on aggregate or export queries';
        } else if (lower.includes('employee') || lower.includes('admin')) {
          strategy = 'Honey Administrator Account Trap';
          trip = 'CRITICAL Alert on privilege modification';
        } else if (lower.includes('product') || lower.includes('item')) {
          strategy = 'Canary Inventory / Price Table';
          trip = 'MEDIUM Alert on bulk SELECT queries';
        }

        return {
          prodTable: `public.${tableName}`,
          decoyTable: `nexusguard_decoy.${tableName}`,
          columns: columns.length > 0 ? columns : ['id', 'data_canary'],
          strategy,
          tripSensitivity: trip,
        };
      });

      setMappings(built.length > 0 ? built : getFallbackMappings());
    } catch {
      setMappings(getFallbackMappings());
      setSnapshotInfo('Using cached schema intelligence (backend offline)');
    } finally {
      setLoading(false);
    }
  };

  const getFallbackMappings = (): SchemaMapping[] => [
    {
      prodTable: 'public.customers',
      decoyTable: 'nexusguard_decoy.customers',
      columns: ['id', 'name', 'email', 'phone'],
      strategy: 'Synthetic Shadow Table with Canary Foreign Keys',
      tripSensitivity: 'Immediate CRITICAL Alert on full table scan',
    },
    {
      prodTable: 'public.products',
      decoyTable: 'nexusguard_decoy.products',
      columns: ['id', 'name', 'price', 'stock', 'sku'],
      strategy: 'Canary Inventory Table',
      tripSensitivity: 'MEDIUM Alert on bulk data access',
    },
    {
      prodTable: 'public.orders',
      decoyTable: 'nexusguard_decoy.orders',
      columns: ['id', 'customer_id', 'status', 'total'],
      strategy: 'Honey Token Financial Ledger Trap',
      tripSensitivity: 'HIGH Alert on aggregate or export queries',
    },
    {
      prodTable: 'public.employees',
      decoyTable: 'nexusguard_decoy.employees',
      columns: ['employee_id', 'first_name', 'last_name', 'email', 'salary'],
      strategy: 'Honey Administrator Account Trap',
      tripSensitivity: 'CRITICAL Alert on privilege modification',
    },
  ];

  useEffect(() => {
    fetchSchemaIntelligence();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
            Schema Intelligence & Decoy Mapping
          </h2>
          <p className="text-xs text-slate-400">
            Automated schema mimicry mapping production catalog structures to cyber-deception traps — reflected live.
          </p>
        </div>
        <button
          onClick={fetchSchemaIntelligence}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-mono bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Re-Reflect</span>
        </button>
      </div>

      <div className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
        <div className="p-3 bg-slate-850 border-b border-slate-700 flex items-center justify-between">
          <span className="text-xs font-mono font-semibold text-slate-200 uppercase">
            Active Schema Deception Mappings
          </span>
          <span className="text-[11px] font-mono text-emerald-400">
            {snapshotInfo || 'Synchronizing...'}
          </span>
        </div>

        {loading ? (
          <div className="py-12 text-center text-xs font-mono text-slate-400 animate-pulse">
            Reflecting target schema and building deception mappings...
          </div>
        ) : (
          <div className="divide-y divide-slate-750">
            {mappings.map((mapping, idx) => (
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
                    <span className="text-slate-400 block mb-1">Reflected Columns:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {mapping.columns.map((col) => (
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
        )}
      </div>
    </div>
  );
};
