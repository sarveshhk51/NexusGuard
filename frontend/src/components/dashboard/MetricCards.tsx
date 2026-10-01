import React from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  Layers, 
  Database,
  Shield
} from 'lucide-react';
import { MetricCardData } from '../../types/soc';

interface MetricCardsProps {
  metrics: MetricCardData[];
  onSelectMetric?: (metricId: string) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ 
  metrics,
  onSelectMetric 
}) => {
  const getIcon = (id: string) => {
    switch (id) {
      case 'active-threats':
        return <ShieldAlert className="w-5 h-5 text-red-400" />;
      case 'critical-alerts':
        return <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />;
      case 'decoy-interactions':
        return <Layers className="w-5 h-5 text-blue-400" />;
      case 'monitored-databases':
        return <Database className="w-5 h-5 text-emerald-400" />;
      default:
        return <Shield className="w-5 h-5 text-slate-400" />;
    }
  };

  const getBorderTopColor = (id: string) => {
    switch (id) {
      case 'active-threats':
        return 'border-t-2 border-t-red-500/80';
      case 'critical-alerts':
        return 'border-t-2 border-t-red-600 shadow-[0_-2px_10px_rgba(239,68,68,0.15)]';
      case 'decoy-interactions':
        return 'border-t-2 border-t-blue-500/80';
      case 'monitored-databases':
        return 'border-t-2 border-t-emerald-500/80';
      default:
        return 'border-t-2 border-t-slate-700';
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <div
          key={metric.id}
          onClick={() => onSelectMetric?.(metric.id)}
          className={`bg-slate-800 rounded-md p-4 border border-slate-700 transition-all cursor-pointer hover:border-slate-600 ${getBorderTopColor(
            metric.id
          )}`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono font-semibold tracking-wider text-slate-400">
              {metric.title}
            </span>
            <div className="w-8 h-8 rounded bg-slate-900 border border-slate-700/80 flex items-center justify-center">
              {getIcon(metric.id)}
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-bold font-mono text-slate-100 tracking-tight">
              {metric.value}
            </span>
            {metric.id === 'critical-alerts' && (
              <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-red-950/90 text-red-400 border border-red-800/80">
                ACTION REQUIRED
              </span>
            )}
          </div>

          <div className="mt-3 flex items-center justify-between text-xs border-t border-slate-750 pt-2.5">
            <span className="text-slate-400 text-[11px] truncate" title={metric.description}>
              {metric.description}
            </span>
            {metric.delta && (
              <span className="font-mono text-[10px] text-slate-300 shrink-0 ml-1">
                {metric.delta}
              </span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};
