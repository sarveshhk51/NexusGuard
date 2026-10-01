import React, { useState, useEffect } from 'react';
import { ShieldAlert, Unlock, CheckCircle, RefreshCw } from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';

interface BlockedIPRecord {
  id: number;
  ip_address: string;
  reason: string;
  severity: string;
  query_snippet?: string;
  is_active: boolean;
  blocked_at: string;
}

export const BlockedIPsCard: React.FC = () => {
  const [blockedIPs, setBlockedIPs] = useState<BlockedIPRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [unblockingIp, setUnblockingIp] = useState<string | null>(null);

  const fetchBlockedIPs = async () => {
    try {
      setLoading(true);
      const res = await fetch(getApiUrl('/api/defense/blocked-ips?active_only=true'));
      if (res.ok) {
        const data = await res.json();
        setBlockedIPs(data);
      }
    } catch {
      // If backend offline or mock mode
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlockedIPs();
    const interval = setInterval(fetchBlockedIPs, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleUnblock = async (ip: string) => {
    try {
      setUnblockingIp(ip);
      const res = await fetch(getApiUrl(`/api/defense/unblock/${ip}`), { method: 'POST' });
      if (res.ok) {
        setBlockedIPs(prev => prev.filter(item => item.ip_address !== ip));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setUnblockingIp(null);
    }
  };

  return (
    <div className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden shadow-lg">
      <div className="p-3.5 bg-slate-850 border-b border-slate-700 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400" />
          <span className="text-xs font-mono font-bold text-slate-100 uppercase tracking-wider">
            Active Containment & IP Blocklist
          </span>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
            {blockedIPs.length} Active Blocks
          </span>
        </div>
        <button
          onClick={fetchBlockedIPs}
          title="Refresh Blocklist"
          className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <div className="p-4">
        {blockedIPs.length === 0 ? (
          <div className="py-6 flex flex-col items-center justify-center text-center text-slate-400">
            <CheckCircle className="w-8 h-8 text-emerald-400/60 mb-2" />
            <p className="text-xs font-mono font-semibold text-slate-300">No Malicious IPs Currently Contained</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
              When an attacker touches a decoy schema or attempts unauthorized enumeration, their IP address will be instantly contained here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-750">
            {blockedIPs.map((record) => (
              <div key={record.id} className="py-3 flex items-start justify-between gap-3">
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-rose-400">
                      {record.ip_address}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono uppercase bg-rose-950/80 text-rose-300 border border-rose-800/40">
                      {record.severity}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Blocked: {new Date(record.blocked_at).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 font-mono truncate">
                    {record.reason}
                  </p>
                  {record.query_snippet && (
                    <div className="mt-1 px-2 py-1 rounded bg-slate-900 border border-slate-750 text-[11px] font-mono text-amber-300/90 truncate max-w-xl">
                      <code>{record.query_snippet}</code>
                    </div>
                  )}
                </div>

                <button
                  onClick={() => handleUnblock(record.ip_address)}
                  disabled={unblockingIp === record.ip_address}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs font-mono rounded bg-slate-700 hover:bg-slate-600 text-slate-200 transition-colors shrink-0"
                >
                  <Unlock className="w-3 h-3 text-slate-300" />
                  <span>{unblockingIp === record.ip_address ? 'Unblocking...' : 'Unblock'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
