import { SeverityLevel } from '../types/soc';

export function getSeverityClasses(severity: SeverityLevel): {
  badge: string;
  dot: string;
  border: string;
  glow: string;
} {
  switch (severity) {
    case 'CRITICAL':
      return {
        badge: 'bg-red-950/70 text-red-400 border-red-700/80 hover:bg-red-900/80',
        dot: 'bg-red-500',
        border: 'border-l-red-500',
        glow: 'shadow-[0_0_12px_rgba(239,68,68,0.25)]'
      };
    case 'HIGH':
      return {
        badge: 'bg-orange-950/70 text-orange-400 border-orange-700/80 hover:bg-orange-900/80',
        dot: 'bg-orange-500',
        border: 'border-l-orange-500',
        glow: 'shadow-[0_0_12px_rgba(249,115,22,0.25)]'
      };
    case 'MEDIUM':
      return {
        badge: 'bg-yellow-950/70 text-yellow-400 border-yellow-700/80 hover:bg-yellow-900/80',
        dot: 'bg-yellow-500',
        border: 'border-l-yellow-500',
        glow: 'shadow-[0_0_12px_rgba(234,179,8,0.25)]'
      };
    case 'LOW':
    default:
      return {
        badge: 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750',
        dot: 'bg-slate-400',
        border: 'border-l-slate-600',
        glow: 'shadow-none'
      };
  }
}

export function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 1000));

  if (diffInSeconds < 5) return 'Just now';
  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  return `${Math.floor(diffInHours / 24)}d ago`;
}
