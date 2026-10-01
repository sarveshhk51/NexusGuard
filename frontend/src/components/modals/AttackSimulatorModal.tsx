import React, { useState } from 'react';
import { Flame, X, ShieldAlert, CheckCircle2, AlertOctagon, Terminal, ArrowRight, Send, Shuffle, Unlock, Trash2 } from 'lucide-react';
import { SecurityEvent } from '../../types/soc';
import { getApiUrl } from '../../utils/apiConfig';

interface AttackSimulatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onEventInjected?: (event: SecurityEvent) => void;
}

export const AttackSimulatorModal: React.FC<AttackSimulatorModalProps> = ({
  isOpen,
  onClose,
  onEventInjected
}) => {
  const [scenario, setScenario] = useState<string>('decoy_breach');
  const [attackerIp, setAttackerIp] = useState('185.220.101.88');
  const [attackerUser, setAttackerUser] = useState('apt29_operator');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unblockMessage, setUnblockMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRandomize = () => {
    const octet1 = [45, 185, 103, 194, 91, 198, 172][Math.floor(Math.random() * 7)];
    const octet2 = Math.floor(Math.random() * 250) + 1;
    const octet3 = Math.floor(Math.random() * 250) + 1;
    const octet4 = Math.floor(Math.random() * 250) + 1;
    const newIp = `${octet1}.${octet2}.${octet3}.${octet4}`;

    const handles = ['apt29_operator', 'infiltrator_007', 'cyber_crawler', 'dark_phantom', 'red_mimic', 'honey_breaker'];
    const newUser = handles[Math.floor(Math.random() * handles.length)];

    setAttackerIp(newIp);
    setAttackerUser(newUser);
    setResult(null);
    setUnblockMessage(null);
  };

  const handleRunAttack = async () => {
    setIsRunning(true);
    setResult(null);
    setError(null);
    setUnblockMessage(null);

    try {
      const res = await fetch(getApiUrl('/api/defense/simulate-attack'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scenario,
          attacker_ip: attackerIp,
          attacker_user: attackerUser,
          target_id: 1,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);

      if (onEventInjected && data.detection_engine?.triggered) {
        const injectedEvt: SecurityEvent = {
          id: data.event_id ? `evt-${data.event_id}` : `sim-${Date.now()}`,
          timestamp: new Date().toISOString(),
          relativeTime: 'Just now',
          sourceIp: data.attacker.source_ip,
          targetDatabase: 'production_crm (nexusguard_decoy)',
          eventType: data.detection_engine.rule_matched || 'DECOY_ACCESS',
          query: data.attacker.query,
          severity: data.detection_engine.severity || 'CRITICAL',
          isNew: true,
          detectionReason: data.detection_engine.reason,
          responseAction: 'Attacker IP Dynamically Contained',
          attackVector: scenario === 'decoy_breach' ? 'Honeytoken Credential Exfiltration' :
                        scenario === 'brute_force' ? 'Payment Vault Exfiltration' :
                        scenario === 'honeytoken_canary' ? 'API Canary Token Breach' :
                        'Schema Reconnaissance'
        };
        onEventInjected(injectedEvt);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with NexusGuard Deception Engine');
    } finally {
      setIsRunning(false);
    }
  };

  const handleUnblockThisIp = async () => {
    try {
      await fetch(getApiUrl(`/api/defense/unblock/${attackerIp}`), { method: 'POST' });
      setUnblockMessage(`IP ${attackerIp} successfully unblocked.`);
      if (result) {
        setResult((prev: any) => ({
          ...prev,
          subsequent_probe_blocked: false,
          active_defense: { ...prev.active_defense, ip_block_status: 'UNBLOCKED' }
        }));
      }
    } catch {
      setUnblockMessage(`Could not unblock IP (might not be actively blocked).`);
    }
  };

  const handleUnblockAll = async () => {
    try {
      const res = await fetch(getApiUrl('/api/defense/unblock-all'), { method: 'POST' });
      const data = await res.json();
      setUnblockMessage(`Firewall flushed: ${data.count || 0} IPs unblocked.`);
      if (result) {
        setResult((prev: any) => ({
          ...prev,
          subsequent_probe_blocked: false,
          active_defense: { ...prev.active_defense, ip_block_status: 'UNBLOCKED' }
        }));
      }
    } catch {
      setUnblockMessage(`Failed to flush firewall.`);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700 rounded-lg max-w-2xl w-full shadow-2xl overflow-hidden font-mono">
        {/* Header */}
        <div className="p-4 bg-slate-850 border-b border-slate-700 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-rose-500 animate-pulse" />
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              Live Attack & Cyber-Deception Simulator
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-750 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <p className="text-xs text-slate-300">
            Execute real-time attack scenarios in front of your evaluators. The system will simulate the threat query, evaluate detection rules, trigger active IP containment, and test subsequent lockout.
          </p>

          {/* Quick Profile Chips */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-bold mr-1">Quick Presets:</span>
            <button
              onClick={() => { setScenario('decoy_breach'); setAttackerIp('185.220.101.88'); setAttackerUser('apt29_operator'); }}
              className="px-2 py-0.5 rounded text-[10px] bg-rose-950/70 border border-rose-800 text-rose-300 hover:bg-rose-900 cursor-pointer"
            >
              🇷🇺 APT29 Honeytoken
            </button>
            <button
              onClick={() => { setScenario('brute_force'); setAttackerIp('45.154.255.77'); setAttackerUser('vault_exfil_bot'); }}
              className="px-2 py-0.5 rounded text-[10px] bg-amber-950/70 border border-amber-800 text-amber-300 hover:bg-amber-900 cursor-pointer"
            >
              🕷️ Payment Vault
            </button>
            <button
              onClick={() => { setScenario('reconnaissance'); setAttackerIp('198.51.100.42'); setAttackerUser('shodan_crawler'); }}
              className="px-2 py-0.5 rounded text-[10px] bg-blue-950/70 border border-blue-800 text-blue-300 hover:bg-blue-900 cursor-pointer"
            >
              🤖 Schema Scan
            </button>
            <button
              onClick={() => { setScenario('benign_query'); setAttackerIp('192.168.1.105'); setAttackerUser('customer_portal'); }}
              className="px-2 py-0.5 rounded text-[10px] bg-emerald-950/70 border border-emerald-800 text-emerald-300 hover:bg-emerald-900 cursor-pointer"
            >
              🟢 Benign Customer
            </button>
          </div>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                Attack Vector Scenario
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-hidden focus:border-rose-500 font-mono"
              >
                <option value="decoy_breach">Decoy Credential Breach (CRITICAL - Honeytoken)</option>
                <option value="brute_force">Payment Vault Exfiltration (CRITICAL - Card Vault)</option>
                <option value="honeytoken_canary">API Token Canary Probe (CRITICAL - Auth Seed)</option>
                <option value="reconnaissance">Schema Enumeration Recon (HIGH - Catalog Scan)</option>
                <option value="privilege_escalation">Shadow Admin Escalation (HIGH - Privileges)</option>
                <option value="benign_query">Normal Customer Query (BENIGN - Not Blocked)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-slate-400 font-semibold uppercase text-[10px]">
                  Attacker Source IP
                </label>
                <button
                  type="button"
                  onClick={handleRandomize}
                  className="text-[10px] text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-bold"
                >
                  <Shuffle className="w-2.5 h-2.5" />
                  <span>Random IP</span>
                </button>
              </div>
              <input
                type="text"
                value={attackerIp}
                onChange={(e) => setAttackerIp(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-hidden focus:border-rose-500 font-mono"
              />
            </div>
          </div>

          <div className="text-xs">
            <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
              Attacker Username
            </label>
            <input
              type="text"
              value={attackerUser}
              onChange={(e) => setAttackerUser(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-hidden focus:border-rose-500 font-mono"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleRunAttack}
              disabled={isRunning}
              className="flex-1 py-2.5 px-4 rounded bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
            >
              {isRunning ? (
                <span>Executing Attack & Interception...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Launch Attack & Trigger Active Defense</span>
                </>
              )}
            </button>

            <button
              onClick={handleUnblockThisIp}
              className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title="Unblock current IP address"
            >
              <Unlock className="w-3.5 h-3.5 text-slate-400" />
              <span>Unblock IP</span>
            </button>

            <button
              onClick={handleUnblockAll}
              className="px-3 py-2 rounded bg-rose-950/60 hover:bg-rose-900 text-rose-300 border border-rose-800 text-xs flex items-center justify-center gap-1.5 cursor-pointer"
              title="Flush entire firewall blocklist"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-400" />
              <span>Flush All</span>
            </button>
          </div>

          {unblockMessage && (
            <div className="p-2.5 rounded bg-blue-950/50 border border-blue-800 text-blue-300 text-xs font-mono">
              {unblockMessage}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 rounded bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Live Result Timeline */}
          {result && (
            <div className="p-4 rounded bg-slate-950 border border-slate-800 space-y-3 animate-in fade-in duration-300">
              <div className="flex items-center gap-2 text-xs font-bold">
                {result.detection_engine?.triggered ? (
                  <div className="flex items-center gap-2 text-rose-400">
                    <ShieldAlert className="w-4 h-4 text-rose-500" />
                    <span>Attack Successfully Intercepted & Threat Contained</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Legitimate Query Verified & Passed (Zero False Positive)</span>
                  </div>
                )}
              </div>

              <div className="space-y-2 text-[11px]">
                <div className="flex items-start gap-2">
                  <Terminal className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span className="text-slate-400">Query Executed:</span>
                  <code className="text-amber-300 break-all">{result.attacker?.query}</code>
                </div>

                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                  <span className="text-slate-400">Detection Rule:</span>
                  <span className={`font-bold uppercase ${result.detection_engine?.triggered ? 'text-rose-400' : 'text-emerald-400'}`}>
                    {result.detection_engine?.rule_matched || 'BENIGN_PASS'}
                  </span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">Severity:</span>
                  <span className="text-rose-400 font-bold">{result.detection_engine?.severity}</span>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-400">Active Defense:</span>
                  {result.detection_engine?.triggered ? (
                    <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                      IP {result.active_defense?.blocked_ip || attackerIp} CONTAINED
                    </span>
                  ) : (
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800 font-bold">
                      TRAFFIC ALLOWED (HTTP 200)
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-slate-400">Lockout Status:</span>
                  <span className="text-emerald-400 font-bold">
                    {result.subsequent_probe_blocked 
                      ? '403 Forbidden (Attacker Completely Locked Out)' 
                      : result.detection_engine?.triggered 
                      ? 'Firewall Block Active' 
                      : 'Not Blocked (Benign Customer)'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-850 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs cursor-pointer"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
