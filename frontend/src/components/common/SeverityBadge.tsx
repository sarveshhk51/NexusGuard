import React from 'react';
import { SeverityLevel } from '../../types/soc';

interface SeverityBadgeProps {
  severity: SeverityLevel;
  size?: 'sm' | 'md' | 'lg';
  showDot?: boolean;
}

export const SeverityBadge: React.FC<SeverityBadgeProps> = ({ 
  severity, 
  size = 'md',
  showDot = true 
}) => {
  const getStyles = () => {
    switch (severity) {
      case 'CRITICAL':
        return {
          wrapper: 'bg-red-950/60 text-red-400 border border-red-800/80 shadow-[0_0_8px_rgba(239,68,68,0.2)]',
          dot: 'bg-red-500 shadow-[0_0_6px_#ef4444]',
          label: 'CRITICAL'
        };
      case 'HIGH':
        return {
          wrapper: 'bg-orange-950/60 text-orange-400 border border-orange-800/80 shadow-[0_0_8px_rgba(249,115,22,0.2)]',
          dot: 'bg-orange-500 shadow-[0_0_6px_#f97316]',
          label: 'HIGH'
        };
      case 'MEDIUM':
        return {
          wrapper: 'bg-yellow-950/60 text-yellow-400 border border-yellow-800/80 shadow-[0_0_8px_rgba(234,179,8,0.2)]',
          dot: 'bg-yellow-500 shadow-[0_0_6px_#eab308]',
          label: 'MEDIUM'
        };
      case 'LOW':
      default:
        return {
          wrapper: 'bg-slate-800/90 text-slate-300 border border-slate-700',
          dot: 'bg-slate-400',
          label: 'LOW'
        };
    }
  };

  const { wrapper, dot, label } = getStyles();

  const sizeStyles = {
    sm: 'text-[10px] px-1.5 py-0.5 font-semibold tracking-wider',
    md: 'text-xs px-2.5 py-1 font-semibold tracking-wider',
    lg: 'text-sm px-3 py-1.5 font-semibold tracking-wide'
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-sm uppercase font-mono ${sizeStyles} ${wrapper}`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${dot}`} />}
      {label}
    </span>
  );
};
