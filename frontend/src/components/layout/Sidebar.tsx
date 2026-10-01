import React from 'react';
import { 
  ShieldAlert, 
  LayoutDashboard, 
  Database, 
  Binary, 
  Layers, 
  AlertTriangle, 
  Activity, 
  Cpu, 
  Users, 
  Settings, 
  LogOut,
  ChevronRight,
  Radio
} from 'lucide-react';
import { NavigationTab } from '../../types/soc';

interface SidebarProps {
  currentTab: NavigationTab;
  onSelectTab: (tab: NavigationTab) => void;
  unresolvedAlertCount?: number;
}

interface NavItem {
  id: NavigationTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: string | number;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  currentTab, 
  onSelectTab,
  unresolvedAlertCount = 1 
}) => {
  const navItems: NavItem[] = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'targets', label: 'Targets', icon: Database, badge: '2' },
    { id: 'schema-intelligence', label: 'Schema Intelligence', icon: Binary },
    { id: 'deception', label: 'Deception', icon: Layers, badge: '142' },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: unresolvedAlertCount },
    { id: 'events', label: 'Events', icon: Activity },
    { id: 'monitoring', label: 'Monitoring', icon: Cpu },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <aside className="w-64 bg-slate-950 border-r border-slate-800 flex flex-col h-screen shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-800 flex items-center gap-3">
        <div className="w-9 h-9 rounded bg-blue-950/80 border border-blue-600/50 flex items-center justify-center text-blue-400 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
          <ShieldAlert className="w-5 h-5 text-blue-400" />
        </div>
        <div className="flex flex-col">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-wider text-base text-slate-100 font-mono">NEXUSGUARD</span>
            <span className="text-[10px] uppercase font-mono px-1 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-700/60">SOC</span>
          </div>
          <span className="text-[11px] text-slate-400 font-mono tracking-tight">Cyber-Deception Engine</span>
        </div>
      </div>

      {/* Real-time mesh telemetry indicator */}
      <div className="mx-3 my-2.5 px-3 py-2 bg-slate-900/90 rounded border border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span className="text-[11px] font-mono text-slate-300">Decoy Mesh Status</span>
        </div>
        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/80">
          ARMED
        </span>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        <div className="px-2 pb-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400">
          Core Operations
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          const isAlert = item.id === 'alerts' && unresolvedAlertCount > 0;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded text-xs font-medium transition-colors ${
                isActive
                  ? 'bg-blue-600/15 text-blue-400 border border-blue-500/40 font-semibold'
                  : 'text-slate-300 hover:text-slate-100 hover:bg-slate-900 border border-transparent'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-blue-400' : 'text-slate-400'}`} />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {item.badge !== undefined && (
                  <span
                    className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full border ${
                      isAlert
                        ? 'bg-red-950/80 text-red-400 border-red-800/80'
                        : isActive
                        ? 'bg-blue-900/60 text-blue-300 border-blue-700/60'
                        : 'bg-slate-850 text-slate-400 border-slate-750'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
                {isActive && <ChevronRight className="w-3 h-3 text-blue-400" />}
              </div>
            </button>
          );
        })}
      </nav>

      {/* User Profile & Session Footer */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/90">
        <div className="flex items-center justify-between gap-2 p-2 rounded bg-slate-900 border border-slate-800">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-mono font-bold text-slate-300 shrink-0">
              AD
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-medium text-slate-200 truncate">Admin</span>
              <span className="text-[10px] text-slate-400 font-mono truncate">Security Analyst</span>
            </div>
          </div>
          <button 
            type="button"
            title="Log Out"
            onClick={() => alert('Logout action triggered - session cleared.')}
            className="p-1.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
