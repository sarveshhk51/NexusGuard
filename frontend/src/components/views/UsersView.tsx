

export const UsersView: React.FC = () => {
  const users = [
    {
      id: 'USR-01',
      username: 'analyst_lead',
      role: 'Lead SOC Analyst',
      accessTier: 'Tier 3 (Full Incident Commander)',
      mfaStatus: 'ENFORCED',
      lastSession: '12 minutes ago'
    },
    {
      id: 'USR-02',
      username: 'sec_engineer_04',
      role: 'Cyber-Deception Engineer',
      accessTier: 'Tier 2 (Decoy Deployment)',
      mfaStatus: 'ENFORCED',
      lastSession: '1 hour ago'
    },
    {
      id: 'USR-03',
      username: 'audit_operator',
      role: 'Compliance Auditor',
      accessTier: 'Tier 1 (Read-Only Telemetry)',
      mfaStatus: 'ENFORCED',
      lastSession: '3 days ago'
    }
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-sm font-mono font-bold uppercase tracking-wider text-slate-100">
          Security Team & Role Governance
        </h2>
        <p className="text-xs text-slate-400">
          Authorized security operations personnel with access to deception tripwire triggers.
        </p>
      </div>

      <div className="bg-slate-800 rounded-md border border-slate-700 overflow-hidden">
        <table className="w-full text-left text-xs font-mono">
          <thead className="bg-slate-850 text-slate-400 uppercase tracking-wider border-b border-slate-700">
            <tr>
              <th className="p-3">User Handle</th>
              <th className="p-3">Designation</th>
              <th className="p-3">Access Tier</th>
              <th className="p-3">Hardware MFA</th>
              <th className="p-3">Last Active Session</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-750 text-slate-200">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-slate-750/30 transition-colors">
                <td className="p-3 font-semibold text-blue-400">{u.username}</td>
                <td className="p-3 text-slate-300">{u.role}</td>
                <td className="p-3 text-slate-400">{u.accessTier}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80 text-[10px] font-bold">
                    {u.mfaStatus}
                  </span>
                </td>
                <td className="p-3 text-slate-400">{u.lastSession}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
