import React, { useState } from 'react';
import { Flame, X, ShieldAlert, CheckCircle2, AlertOctagon, Terminal, ArrowRight, Send } from 'lucide-react';
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
  const [scenario, setScenario] = useState<'decoy_breach' | 'reconnaissance' | 'brute_force'>('decoy_breach');
  const [attackerIp, setAttackerIp] = useState('198.51.100.42');
  const [attackerUser, setAttackerUser] = useState('infiltrator_007');
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunAttack = async () => {
    setIsRunning(true);
    setResult(null);
    setError(null);

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
          attackVector: scenario === 'decoy_breach' ? 'Honeytoken Credential Exfiltration' : 'Schema Reconnaissance'
        };
        onEventInjected(injectedEvt);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to communicate with NexusGuard Deception Engine');
    } finally {
      setIsRunning(false);
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
            className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-750 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          <p className="text-xs text-slate-300">
            Use this panel to execute real-time attack scenarios in front of your evaluators. The system will simulate the threat query, evaluate detection rules, trigger active IP containment, and test subsequent lockout.
          </p>

          {/* Form */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                Attack Vector Scenario
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-hidden focus:border-rose-500"
              >
                <option value="decoy_breach">Decoy Credential Breach (CRITICAL)</option>
                <option value="reconnaissance">Schema Enumeration Recon (MEDIUM)</option>
                <option value="brute_force">Vault Exfiltration Attempt (HIGH)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 font-semibold mb-1 uppercase text-[10px]">
                Simulated Attacker Source IP
              </label>
              <input
                type="text"
                value={attackerIp}
                onChange={(e) => setAttackerIp(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-hidden focus:border-rose-500"
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
              className="w-full bg-slate-800 border border-slate-700 rounded px-2.5 py-1.5 text-slate-200 focus:outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Execution Button */}
          <button
            onClick={handleRunAttack}
            disabled={isRunning}
            className="w-full py-2.5 px-4 rounded bg-rose-600 hover:bg-rose-500 disabled:bg-rose-900 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 transition-all cursor-pointer"
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
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                <CheckCircle2 className="w-4 h-4" />
                <span>Attack Successfully Intercepted & Contained</span>
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
                  <span className="text-rose-400 font-bold uppercase">{result.detection_engine?.rule_matched}</span>
                  <span className="text-slate-500">|</span>
                  <span className="text-slate-400">Severity:</span>
                  <span className="text-rose-400 font-bold">{result.detection_engine?.severity}</span>
                </div>

                <div className="flex items-center gap-2">
                  <ArrowRight className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span className="text-slate-400">Automated Mitigation:</span>
                  <span className="px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800 font-bold">
                    IP {result.active_defense?.blocked_ip} BLOCKED
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span className="text-slate-400">Subsequent Query Lockout:</span>
                  <span className="text-emerald-400 font-bold">
                    {result.subsequent_probe_blocked ? '403 Forbidden (Attacker Locked Out)' : 'Pending'}
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
            className="px-3 py-1.5 rounded bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs"
          >
            Close Simulator
          </button>
        </div>
      </div>
    </div>
  );
};
