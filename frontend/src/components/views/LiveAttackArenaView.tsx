import React, { useState } from 'react';
import { 
  Terminal, 
  Flame, 
  ShieldAlert, 
  ShieldCheck, 
  CheckCircle2, 
  Send, 
  Unlock, 
  Radio, 
  Zap,
  Server
} from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';
import { SecurityEvent } from '../../types/soc';

interface LiveAttackArenaViewProps {
  onAttackSimulated?: (event: SecurityEvent) => void;
}

export const LiveAttackArenaView: React.FC<LiveAttackArenaViewProps> = ({ onAttackSimulated }) => {
  const [scenario, setScenario] = useState<'decoy_breach' | 'reconnaissance' | 'brute_force'>('decoy_breach');
  const [attackerIp, setAttackerIp] = useState('198.51.100.42');
  const [attackerUser, setAttackerUser] = useState('sqli_infiltrator');
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    '[INIT] Attacker terminal online. Target port: 3306 / 5432.',
    '[RECON] Establishing unauthenticated database session...'
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [pipelineState, setPipelineState] = useState<{
    intercepted: boolean;
    ruleMatched: string | null;
    severity: string | null;
    ipBlocked: boolean;
    webhookSent: boolean;
    lockoutConfirmed: boolean;
  }>({
    intercepted: false,
    ruleMatched: null,
    severity: null,
    ipBlocked: false,
    webhookSent: false,
    lockoutConfirmed: false
  });

  const getQueryForScenario = (scen: string) => {
    if (scen === 'reconnaissance') {
      return "SELECT table_name FROM information_schema.tables WHERE table_schema NOT IN ('sys', 'information_schema');";
    }
    if (scen === 'brute_force') {
      return "SELECT card_number, cvv_hash, exp_date FROM nexusguard_decoy.payment_vault LIMIT 50;";
    }
    return "SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE '1'='1' --";
  };

  const handleLaunchAttack = async () => {
    setIsExecuting(true);
    const query = getQueryForScenario(scenario);

    setTerminalLogs(prev => [
      ...prev,
      `\n> [ATTACK] Sending payload from ${attackerIp}:`,
      `  ${query}`,
      `[*] Waiting for database response...`
    ]);

    try {
      const res = await fetch(getApiUrl('/api/defense/simulate-attack'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          attacker_ip: attackerIp,
          attacker_user: attackerUser,
          target_id: 1,
          custom_query: query
        }),
      });

      const data = await res.json();

      if (data.detection_engine?.triggered) {
        setPipelineState({
          intercepted: true,
          ruleMatched: data.detection_engine.rule_matched,
          severity: data.detection_engine.severity,
          ipBlocked: true,
          webhookSent: true,
          lockoutConfirmed: data.subsequent_probe_blocked
        });

        setTerminalLogs(prev => [
          ...prev,
          `[!] ALERT: Query intercepted by NexusGuard Deception Engine!`,
          `[!] Detection Rule Matched: ${data.detection_engine.rule_matched} (${data.detection_engine.severity})`,
          `[!] Automated Containment: Attacker IP ${attackerIp} dynamically added to firewall blocklist.`,
          `[!] Outbound Mitigation Request: Dispatched to Security SIEM / Webhook.`
        ]);

        if (onAttackSimulated) {
          onAttackSimulated({
            id: data.event_id ? `evt-${data.event_id}` : `arena-${Date.now()}`,
            timestamp: new Date().toISOString(),
            relativeTime: 'Just now',
            sourceIp: attackerIp,
            targetDatabase: 'production_crm (nexusguard_decoy)',
            eventType: data.detection_engine.rule_matched || 'DECOY_ACCESS',
            query: query,
            severity: data.detection_engine.severity || 'CRITICAL',
            isNew: true,
            detectionReason: data.detection_engine.reason,
            responseAction: 'Attacker IP Dynamically Contained',
            attackVector: scenario === 'decoy_breach' ? 'Honeytoken Credential Theft' : 'Schema Reconnaissance'
          });
        }
      }
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[ERROR] Failed to execute: ${err.message}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTestLockout = async () => {
    setTerminalLogs(prev => [
      ...prev,
      `\n> [RETRY] Attacker ${attackerIp} attempting subsequent query:`,
      `  SELECT * FROM customers LIMIT 1;`,
      `[*] Connecting to database...`
    ]);

    try {
      const res = await fetch(getApiUrl('/api/targets/1/schema'), {
        headers: { 'X-Forwarded-For': attackerIp }
      });

      if (res.status === 403) {
        setTerminalLogs(prev => [
          ...prev,
          `\x1b[31m[403 FORBIDDEN - ACCESS DENIED]\x1b[0m Connection terminated by NexusGuard Active Defense.`,
          `[CONTAINED] The attacker IP (${attackerIp}) is banned. All subsequent packets are dropped.`
        ]);
      } else {
        setTerminalLogs(prev => [...prev, `[RESPONSE] Status ${res.status} OK`]);
      }
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[DROPPED] Connection severed: ${err.message}`]);
    }
  };

  const handleReset = async () => {
    try {
      await fetch(getApiUrl(`/api/defense/unblock/${attackerIp}`), { method: 'POST' });
    } catch {}

    setPipelineState({
      intercepted: false,
      ruleMatched: null,
      severity: null,
      ipBlocked: false,
      webhookSent: false,
      lockoutConfirmed: false
    });

    setTerminalLogs([
      '[RESET] Simulation state reset.',
      `[UNBLOCK] IP ${attackerIp} unblocked from firewall. Ready for next test.`
    ]);
  };

  return (
    <div className="space-y-5 font-mono">
      {/* Top Banner */}
      <div className="bg-slate-850 p-4 rounded-lg border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Live Cyber-Attack & Active Deception Arena
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Side-by-side demonstration showing the attacker entering the database, tripping the honeytoken decoy, and being eliminated by the defense engine.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded transition-colors self-start md:self-auto cursor-pointer"
        >
          <Unlock className="w-3.5 h-3.5 text-slate-400" />
          <span>Reset Simulation / Unblock IP</span>
        </button>
      </div>

      {/* Arena Split-Screen */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left Side: Attacker Console */}
        <div className="bg-slate-950 border border-rose-900/60 rounded-lg overflow-hidden shadow-2xl flex flex-col">
          <div className="p-3 bg-rose-950/40 border-b border-rose-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-rose-400" />
              <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
                Attacker Terminal (Threat Actor)
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-rose-900/80 text-rose-200 border border-rose-700/60 animate-pulse">
              LIVE CONSOLE
            </span>
          </div>

          <div className="p-4 space-y-4 flex-1 flex flex-col">
            {/* Controls */}
            <div className="space-y-3 bg-slate-900/80 p-3 rounded border border-slate-800 text-xs">
              <div>
                <label className="block text-slate-400 text-[10px] uppercase font-bold mb-1">
                  1. Select Attack Objective
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    onClick={() => setScenario('reconnaissance')}
                    className={`p-2 rounded border text-[11px] text-left transition-all ${
                      scenario === 'reconnaissance'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Phase 1: Recon (Schema Scan)
                  </button>
                  <button
                    onClick={() => setScenario('decoy_breach')}
                    className={`p-2 rounded border text-[11px] text-left transition-all ${
                      scenario === 'decoy_breach'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Phase 2: Decoy Credential Theft
                  </button>
                  <button
                    onClick={() => setScenario('brute_force')}
                    className={`p-2 rounded border text-[11px] text-left transition-all ${
                      scenario === 'brute_force'
                        ? 'bg-rose-950/80 border-rose-500 text-rose-200 font-bold'
                        : 'bg-slate-800/60 border-slate-700 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    Phase 3: Vault Exfiltration
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Attacker IP</span>
                  <input
                    type="text"
                    value={attackerIp}
                    onChange={(e) => setAttackerIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Attacker User</span>
                  <input
                    type="text"
                    value={attackerUser}
                    onChange={(e) => setAttackerUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2 py-1 text-slate-200"
                  />
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Target Asset</span>
                  <span className="text-rose-400 font-bold block py-1 truncate">
                    {scenario === 'decoy_breach' ? 'nexusguard_decoy.admin_credentials' : 'production_crm'}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase mb-0.5">Payload Preview</span>
                <code className="block bg-slate-950 p-2 rounded border border-slate-800 text-[11px] text-amber-300 break-all">
                  {getQueryForScenario(scenario)}
                </code>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleLaunchAttack}
                  disabled={isExecuting}
                  className="flex-1 py-2 px-3 rounded bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/60 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Attack Payload</span>
                </button>

                <button
                  onClick={handleTestLockout}
                  className="py-2 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  title="Test if attacker is blocked on next request"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-400" />
                  <span>Verify Lockout (Retry)</span>
                </button>
              </div>
            </div>

            {/* Terminal Screen Output */}
            <div className="flex-1 bg-black p-3 rounded border border-slate-800 text-slate-300 text-[11px] font-mono min-h-[160px] max-h-[220px] overflow-y-auto space-y-1">
              {terminalLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log.includes('403') || log.includes('ALERT') ? (
                    <span className="text-rose-400 font-bold">{log}</span>
                  ) : log.includes('ATTACK') || log.includes('SELECT') ? (
                    <span className="text-amber-300">{log}</span>
                  ) : log.includes('RESET') || log.includes('UNBLOCK') ? (
                    <span className="text-emerald-400">{log}</span>
                  ) : (
                    <span className="text-slate-400">{log}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: NexusGuard Defense Engine Pipeline */}
        <div className="bg-slate-900 border border-blue-900/60 rounded-lg overflow-hidden shadow-2xl flex flex-col">
          <div className="p-3 bg-blue-950/40 border-b border-blue-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                NexusGuard Deception & Active Defense
              </span>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-blue-900/80 text-blue-200 border border-blue-700/60">
              PROTECTION ACTIVE
            </span>
          </div>

          <div className="p-4 space-y-3.5 flex-1 flex flex-col justify-between text-xs">
            {/* Stage 1 */}
            <div className={`p-3 rounded border transition-all ${
              pipelineState.intercepted
                ? 'bg-slate-800/90 border-blue-500 shadow-md shadow-blue-950/50'
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-400" />
                  Stage 1: Inbound Query Interception
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pipelineState.intercepted ? 'bg-blue-900 text-blue-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {pipelineState.intercepted ? 'INTERCEPTED' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                NexusGuard telemetry hooks capture raw SQL query, source IP, username, and target schema before execution.
              </p>
            </div>

            {/* Stage 2 */}
            <div className={`p-3 rounded border transition-all ${
              pipelineState.ruleMatched
                ? 'bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950/50'
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-400" />
                  Stage 2: Threat Detection & Decoy Tripwire
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pipelineState.ruleMatched ? 'bg-rose-900 text-rose-200 border border-rose-700' : 'bg-slate-800 text-slate-400'
                }`}>
                  {pipelineState.ruleMatched ? `${pipelineState.ruleMatched} (${pipelineState.severity})` : 'STANDBY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Evaluates query against detection rules. Queries touching <code className="text-amber-300">nexusguard_decoy</code> trip immediate CRITICAL priority escalation.
              </p>
            </div>

            {/* Stage 3 */}
            <div className={`p-3 rounded border transition-all ${
              pipelineState.ipBlocked
                ? 'bg-rose-950/40 border-rose-600 shadow-md shadow-rose-950/60'
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Stage 3: Automated Active Containment (IP Blocking)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pipelineState.ipBlocked ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 text-slate-400'
                }`}>
                  {pipelineState.ipBlocked ? `IP ${attackerIp} CONTAINED` : 'STANDBY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Attacker IP is dynamically inserted into the firewall blocklist table (<code className="text-slate-300">nexusguard_blocked_ips</code>).
              </p>
            </div>

            {/* Stage 4 */}
            <div className={`p-3 rounded border transition-all ${
              pipelineState.webhookSent
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-950/40'
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  Stage 4: Outbound Request Dispatch ("Sends Requests")
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pipelineState.webhookSent ? 'bg-blue-900 text-blue-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {pipelineState.webhookSent ? 'DELIVERED (HTTP 200)' : 'STANDBY'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Dispatches an outbound HTTP POST notification payload to external SIEM / Slack / Telegram webhooks with forensic fingerprint.
              </p>
            </div>

            {/* Stage 5 */}
            <div className={`p-3 rounded border transition-all ${
              pipelineState.lockoutConfirmed
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md shadow-emerald-950/50'
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Stage 5: Threat Elimination (403 Lockout)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pipelineState.lockoutConfirmed ? 'bg-emerald-900 text-emerald-200' : 'bg-slate-800 text-slate-400'
                }`}>
                  {pipelineState.lockoutConfirmed ? 'LOCKOUT VERIFIED' : 'PENDING'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Middleware rejects all subsequent traffic from <code className="text-slate-300">{attackerIp}</code> with <strong className="text-emerald-400">HTTP 403 Forbidden</strong>. Threat actor is completely locked out.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
