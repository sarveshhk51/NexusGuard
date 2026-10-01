import React, { useState } from 'react';
import { 
  Terminal, 
  Flame, 
  ShieldAlert, 
  CheckCircle2, 
  Send, 
  Unlock, 
  Radio, 
  Zap,
  Server,
  Shuffle,
  Trash2
} from 'lucide-react';
import { getApiUrl } from '../../utils/apiConfig';
import { SecurityEvent } from '../../types/soc';

interface LiveAttackArenaViewProps {
  onAttackSimulated?: (event: SecurityEvent) => void;
}

interface ThreatPersona {
  name: string;
  ip: string;
  user: string;
  scenario: 'decoy_breach' | 'reconnaissance' | 'brute_force' | 'honeytoken_canary' | 'privilege_escalation' | 'benign_query';
  desc: string;
}

const PERSONA_PRESETS: ThreatPersona[] = [
  {
    name: '🇷🇺 APT29 Infiltrator',
    ip: '185.220.101.88',
    user: 'apt29_operator',
    scenario: 'decoy_breach',
    desc: 'Targeting honeytoken admin credentials'
  },
  {
    name: '🤖 Shodan Recon Bot',
    ip: '198.51.100.42',
    user: 'shodan_recon_bot',
    scenario: 'reconnaissance',
    desc: 'Crawling schema metadata'
  },
  {
    name: '🕷️ Hive Ransomware',
    ip: '45.154.255.77',
    user: 'vault_exfil_bot',
    scenario: 'brute_force',
    desc: 'Attempting mass payment vault exfiltration'
  },
  {
    name: '🔑 API Token Thief',
    ip: '103.152.18.34',
    user: 'token_hunter',
    scenario: 'honeytoken_canary',
    desc: 'Extracting synthetic API auth seeds'
  },
  {
    name: '🧑‍💻 Rogue Insider',
    ip: '10.0.4.15',
    user: 'sys_admin_rogue',
    scenario: 'privilege_escalation',
    desc: 'Modifying shadow administrator privileges'
  },
  {
    name: '🟢 Normal Customer',
    ip: '192.168.1.105',
    user: 'store_customer',
    scenario: 'benign_query',
    desc: 'Legitimate shop customer (BENIGN - Not blocked)'
  }
];

export const LiveAttackArenaView: React.FC<LiveAttackArenaViewProps> = ({ onAttackSimulated }) => {
  const [scenario, setScenario] = useState<string>('decoy_breach');
  const [attackerIp, setAttackerIp] = useState('185.220.101.88');
  const [attackerUser, setAttackerUser] = useState('apt29_operator');
  const [customQuery, setCustomQuery] = useState("SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE '1'='1' --");
  const [terminalLogs, setTerminalLogs] = useState<string[]>([
    `[${new Date().toLocaleTimeString()}] [INIT] Attacker terminal online. Target port: 3306 / 5432.`,
    `[${new Date().toLocaleTimeString()}] [READY] Select a threat actor profile or roll a random one to execute live attacks.`
  ]);
  const [isExecuting, setIsExecuting] = useState(false);
  const [activeStage, setActiveStage] = useState<number>(0);
  const [pipelineState, setPipelineState] = useState<{
    intercepted: boolean;
    ruleMatched: string | null;
    severity: string | null;
    ipBlocked: boolean;
    isBenign: boolean;
    webhookSent: boolean;
    lockoutConfirmed: boolean;
  }>({
    intercepted: false,
    ruleMatched: null,
    severity: null,
    ipBlocked: false,
    isBenign: false,
    webhookSent: false,
    lockoutConfirmed: false
  });

  const getQueryForScenario = (scen: string): string => {
    switch (scen) {
      case 'reconnaissance':
        return "SELECT table_name, table_schema FROM information_schema.tables WHERE table_schema NOT IN ('sys', 'information_schema');";
      case 'brute_force':
        return "SELECT card_number, cvv_hash, exp_date FROM nexusguard_decoy.payment_vault LIMIT 50;";
      case 'honeytoken_canary':
        return "SELECT secret_seed, auth_token FROM nexusguard_decoy.api_credential_canaries WHERE active = 1;";
      case 'privilege_escalation':
        return "UPDATE nexusguard_decoy.shadow_administrators SET privileges = 'ALL' WHERE username = 'sys_backup';";
      case 'benign_query':
        return "SELECT customer_id, company_name, email FROM customers WHERE is_active = 1 LIMIT 5;";
      default:
        return "SELECT username, password_hash FROM nexusguard_decoy.admin_credentials WHERE '1'='1' --";
    }
  };

  const selectPersona = (p: ThreatPersona) => {
    setAttackerIp(p.ip);
    setAttackerUser(p.user);
    setScenario(p.scenario);
    setCustomQuery(getQueryForScenario(p.scenario));
    const now = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [
      ...prev,
      `[${now}] [PROFILE] Switched to ${p.name} (IP: ${p.ip}, User: ${p.user})`
    ]);
  };

  const handleRandomizeActor = () => {
    const octet1 = [45, 185, 103, 194, 91, 198, 172][Math.floor(Math.random() * 7)];
    const octet2 = Math.floor(Math.random() * 250) + 1;
    const octet3 = Math.floor(Math.random() * 250) + 1;
    const octet4 = Math.floor(Math.random() * 250) + 1;
    const newIp = `${octet1}.${octet2}.${octet3}.${octet4}`;

    const handles = [
      'dark_phantom', 'infiltrator_x', 'shadow_scan', 'fin8_bot',
      'red_mimic', 'ghost_proxy', 'cyber_crawler', 'zero_day_recon',
      'honey_breaker', 'priv_escalator'
    ];
    const newUser = handles[Math.floor(Math.random() * handles.length)];

    const attackScenarios = ['decoy_breach', 'brute_force', 'honeytoken_canary', 'reconnaissance', 'privilege_escalation'];
    const newScen = attackScenarios[Math.floor(Math.random() * attackScenarios.length)];

    setAttackerIp(newIp);
    setAttackerUser(newUser);
    setScenario(newScen);
    setCustomQuery(getQueryForScenario(newScen));

    const now = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [
      ...prev,
      `[${now}] [SHUFFLE] Generated fresh threat actor: ${newUser}@${newIp} (${newScen.toUpperCase()})`
    ]);
  };

  const handleLaunchAttack = async () => {
    setIsExecuting(true);
    setActiveStage(1);
    const timeStr = new Date().toLocaleTimeString();
    const query = customQuery;

    // Reset pipeline visual
    setPipelineState({
      intercepted: false,
      ruleMatched: null,
      severity: null,
      ipBlocked: false,
      isBenign: false,
      webhookSent: false,
      lockoutConfirmed: false
    });

    setTerminalLogs(prev => [
      ...prev,
      `\n[${timeStr}] > [ATTACK] Sending payload from ${attackerUser}@${attackerIp}:`,
      `  ${query}`,
      `[*] Connecting to target database gateway...`
    ]);

    try {
      // Stage 1 animation delay
      await new Promise(r => setTimeout(r, 250));
      setPipelineState(prev => ({ ...prev, intercepted: true }));
      setActiveStage(2);

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
      const isTriggered = data.detection_engine?.triggered;

      await new Promise(r => setTimeout(r, 300));

      if (isTriggered) {
        // Stage 2: Threat Detection
        setPipelineState(prev => ({
          ...prev,
          ruleMatched: data.detection_engine.rule_matched,
          severity: data.detection_engine.severity,
          isBenign: false
        }));
        setActiveStage(3);

        setTerminalLogs(prev => [
          ...prev,
          `[!] ALERT: Query intercepted by NexusGuard Deception Engine!`,
          `[!] Detection Rule Matched: ${data.detection_engine.rule_matched} (${data.detection_engine.severity})`,
          `[!] Reason: ${data.detection_engine.reason}`
        ]);

        await new Promise(r => setTimeout(r, 300));

        // Stage 3: Dynamic Containment
        setPipelineState(prev => ({ ...prev, ipBlocked: true }));
        setActiveStage(4);

        setTerminalLogs(prev => [
          ...prev,
          `[!] Automated Containment: Attacker IP ${attackerIp} dynamically inserted into firewall blocklist table.`
        ]);

        await new Promise(r => setTimeout(r, 300));

        // Stage 4: Outbound Dispatch
        setPipelineState(prev => ({ ...prev, webhookSent: true }));
        setActiveStage(5);

        setTerminalLogs(prev => [
          ...prev,
          `[!] Outbound Mitigation Request: Dispatched forensic HTTP POST to SIEM / Discord / Slack webhook (Status: Delivered).`
        ]);

        await new Promise(r => setTimeout(r, 300));

        // Stage 5: Lockout Verification
        setPipelineState(prev => ({ ...prev, lockoutConfirmed: true }));

        setTerminalLogs(prev => [
          ...prev,
          `[+] LOCKOUT CONFIRMED: Gateway firewall dropped subsequent packets from ${attackerIp}. Attacker eliminated.`
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
            attackVector: scenario === 'reconnaissance' ? 'Schema Reconnaissance' : 'Honeytoken Decoy Breach'
          });
        }
      } else {
        // BENIGN CASE: Legitimate query allowed!
        setPipelineState({
          intercepted: true,
          ruleMatched: 'BENIGN_PASS',
          severity: 'BENIGN',
          ipBlocked: false,
          isBenign: true,
          webhookSent: false,
          lockoutConfirmed: false
        });
        setActiveStage(5);

        setTerminalLogs(prev => [
          ...prev,
          `[OK] QUERY VERIFIED: Legitimate application query on production_crm.`,
          `[OK] No deceptive assets accessed. Zero risk detected.`,
          `[OK] HTTP 200 OK — Traffic passed transparently without blocking.`
        ]);
      }
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[ERROR] Failed to execute attack: ${err.message}`]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleTestLockout = async () => {
    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [
      ...prev,
      `\n[${timeStr}] > [RETRY] Threat actor ${attackerIp} attempting subsequent query:`,
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
          `[CONTAINED] The attacker IP (${attackerIp}) is banned in nexusguard_blocked_ips. All subsequent packets dropped.`
        ]);
      } else {
        setTerminalLogs(prev => [...prev, `[RESPONSE] Status ${res.status} OK (IP is not currently blocked)`]);
      }
    } catch (err: any) {
      setTerminalLogs(prev => [...prev, `[DROPPED] Connection severed: ${err.message}`]);
    }
  };

  const handleResetCurrentIp = async () => {
    try {
      await fetch(getApiUrl(`/api/defense/unblock/${attackerIp}`), { method: 'POST' });
    } catch {}

    setPipelineState({
      intercepted: false,
      ruleMatched: null,
      severity: null,
      ipBlocked: false,
      isBenign: false,
      webhookSent: false,
      lockoutConfirmed: false
    });
    setActiveStage(0);

    const timeStr = new Date().toLocaleTimeString();
    setTerminalLogs(prev => [
      ...prev,
      `[${timeStr}] [UNBLOCK] IP ${attackerIp} removed from firewall blocklist. Ready for next test.`
    ]);
  };

  const handleUnblockAll = async () => {
    try {
      const res = await fetch(getApiUrl('/api/defense/unblock-all'), { method: 'POST' });
      const data = await res.json();
      const count = data.count || 0;
      const timeStr = new Date().toLocaleTimeString();
      setTerminalLogs(prev => [
        ...prev,
        `[${timeStr}] [FLUSH] Firewall blocklist completely cleared (${count} IPs unblocked). All traffic restored.`
      ]);
    } catch {
      setTerminalLogs(prev => [...prev, `[ERROR] Failed to flush firewall.`]);
    }

    setPipelineState({
      intercepted: false,
      ruleMatched: null,
      severity: null,
      ipBlocked: false,
      isBenign: false,
      webhookSent: false,
      lockoutConfirmed: false
    });
    setActiveStage(0);
  };

  return (
    <div className="space-y-5 font-mono">
      {/* Top Banner with Controls */}
      <div className="bg-slate-850 p-4 rounded-lg border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
            <h2 className="text-base font-bold text-slate-100 uppercase tracking-wider">
              Live Cyber-Attack & Active Deception Arena
            </h2>
          </div>
          <p className="text-xs text-slate-400">
            Real-time attack simulator proving decoy interception, dynamic IP containment, SIEM dispatch, and subsequent 403 lockout.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleRandomizeActor}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700 rounded transition-all cursor-pointer font-bold shadow-md"
            title="Generate a completely new random IP and threat actor handle"
          >
            <Shuffle className="w-3.5 h-3.5 text-purple-300" />
            <span>🎲 New Random Attacker</span>
          </button>

          <button
            onClick={handleResetCurrentIp}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 rounded transition-colors cursor-pointer"
            title="Unblock current attacker IP"
          >
            <Unlock className="w-3.5 h-3.5 text-slate-400" />
            <span>Unblock {attackerIp}</span>
          </button>

          <button
            onClick={handleUnblockAll}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 rounded transition-colors cursor-pointer"
            title="Clear all active IP blocks from firewall table"
          >
            <Trash2 className="w-3.5 h-3.5 text-rose-400" />
            <span>Flush Firewall (Unblock All)</span>
          </button>
        </div>
      </div>

      {/* Threat Actor Presets Quick Picker */}
      <div className="bg-slate-900/90 p-3 rounded-lg border border-slate-800">
        <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-2">
          Select Attacker Profile Preset:
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          {PERSONA_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => selectPersona(p)}
              className={`p-2 rounded border text-left transition-all cursor-pointer ${
                attackerIp === p.ip
                  ? 'bg-rose-950/80 border-rose-500 text-rose-200 shadow-md font-bold'
                  : 'bg-slate-800/50 border-slate-700/60 text-slate-300 hover:bg-slate-800'
              }`}
            >
              <div className="font-bold truncate text-[11px]">{p.name}</div>
              <div className="text-[10px] text-amber-300/90 truncate">{p.ip}</div>
            </button>
          ))}
        </div>
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
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Attacker Source IP</span>
                    <button
                      onClick={handleRandomizeActor}
                      className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Shuffle className="w-2.5 h-2.5" />
                      <span>Randomize</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={attackerIp}
                    onChange={(e) => setAttackerIp(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:border-rose-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Attacker Username</span>
                  <input
                    type="text"
                    value={attackerUser}
                    onChange={(e) => setAttackerUser(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 font-mono focus:border-rose-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">
                  SQL Payload (Target Asset: {scenario.includes('decoy') || scenario.includes('force') ? 'nexusguard_decoy' : 'production_crm'})
                </span>
                <textarea
                  rows={2}
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  className="w-full bg-slate-950 p-2 rounded border border-slate-700 text-[11px] text-amber-300 font-mono resize-none focus:border-rose-500 focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  onClick={handleLaunchAttack}
                  disabled={isExecuting}
                  className="flex-1 py-2 px-3 rounded bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/60 transition-all cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isExecuting ? 'Interception In Progress...' : 'Execute Attack Payload'}</span>
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
            <div className="flex-1 bg-black p-3 rounded border border-slate-800 text-slate-300 text-[11px] font-mono min-h-[180px] max-h-[250px] overflow-y-auto space-y-1">
              {terminalLogs.map((log, i) => (
                <div key={i} className="leading-relaxed">
                  {log.includes('403') || log.includes('ALERT') ? (
                    <span className="text-rose-400 font-bold">{log}</span>
                  ) : log.includes('ATTACK') || log.includes('SELECT') || log.includes('UPDATE') ? (
                    <span className="text-amber-300">{log}</span>
                  ) : log.includes('OK') || log.includes('UNBLOCK') || log.includes('CONFIRMED') || log.includes('FLUSH') ? (
                    <span className="text-emerald-400 font-bold">{log}</span>
                  ) : log.includes('SHUFFLE') || log.includes('PROFILE') ? (
                    <span className="text-purple-300">{log}</span>
                  ) : (
                    <span className="text-slate-400">{log}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Side: NexusGuard Active Defense Engine */}
        <div className="bg-slate-900 border border-blue-900/60 rounded-lg overflow-hidden shadow-2xl flex flex-col">
          <div className="p-3 bg-blue-950/40 border-b border-blue-900/60 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-300 uppercase tracking-wider">
                NexusGuard Deception & Active Defense
              </span>
            </div>
            <span className={`text-[10px] px-2 py-0.5 rounded border font-bold ${
              activeStage > 0 && activeStage < 5 
                ? 'bg-amber-900/80 text-amber-200 border-amber-600 animate-pulse' 
                : 'bg-blue-900/80 text-blue-200 border-blue-700/60'
            }`}>
              {activeStage > 0 && activeStage < 5 ? `EVALUATING STAGE ${activeStage}/5` : 'PROTECTION ACTIVE'}
            </span>
          </div>

          <div className="p-4 space-y-3 flex-1 flex flex-col justify-between text-xs">
            {/* Stage 1 */}
            <div className={`p-3 rounded border transition-all ${
              pipelineState.intercepted
                ? 'bg-blue-950/40 border-blue-500 shadow-md shadow-blue-950/40'
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
                NexusGuard telemetry hooks capture raw SQL query, source IP ({attackerIp}), username ({attackerUser}), and target schema before execution.
              </p>
            </div>

            {/* Stage 2 */}
            <div className={`p-3 rounded border transition-all ${
              pipelineState.ruleMatched
                ? pipelineState.isBenign
                  ? 'bg-emerald-950/30 border-emerald-500 shadow-md shadow-emerald-950/50'
                  : 'bg-rose-950/30 border-rose-500 shadow-md shadow-rose-950/50'
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-rose-400" />
                  Stage 2: Threat Detection & Decoy Tripwire
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pipelineState.ruleMatched
                    ? pipelineState.isBenign
                      ? 'bg-emerald-900 text-emerald-200 border border-emerald-700'
                      : 'bg-rose-900 text-rose-200 border border-rose-700'
                    : 'bg-slate-800 text-slate-400'
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
                : pipelineState.isBenign
                ? 'bg-emerald-950/40 border-emerald-600 shadow-md'
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  Stage 3: Automated Active Containment (IP Blocking)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pipelineState.ipBlocked 
                    ? 'bg-rose-600 text-white animate-pulse' 
                    : pipelineState.isBenign 
                    ? 'bg-emerald-800 text-emerald-200' 
                    : 'bg-slate-800 text-slate-400'
                }`}>
                  {pipelineState.ipBlocked 
                    ? `IP ${attackerIp} CONTAINED` 
                    : pipelineState.isBenign 
                    ? 'NO CONTAINMENT (ALLOW)' 
                    : 'STANDBY'}
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
                : pipelineState.isBenign
                ? 'bg-emerald-950/40 border-emerald-500 shadow-md'
                : 'bg-slate-950/60 border-slate-800 opacity-60'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  Stage 5: Threat Elimination (403 Lockout)
                </span>
                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                  pipelineState.lockoutConfirmed 
                    ? 'bg-emerald-900 text-emerald-200' 
                    : pipelineState.isBenign 
                    ? 'ACCESS GRANTED (200 OK)' 
                    : 'PENDING'
                }`}>
                  {pipelineState.lockoutConfirmed ? 'LOCKOUT VERIFIED' : pipelineState.isBenign ? 'BENIGN PASS' : 'PENDING'}
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {pipelineState.isBenign 
                  ? 'Normal application requests are allowed without restriction.' 
                  : <>Middleware rejects all subsequent traffic from <code className="text-slate-300">{attackerIp}</code> with <strong className="text-emerald-400">HTTP 403 Forbidden</strong>. Threat actor is completely locked out.</>}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
