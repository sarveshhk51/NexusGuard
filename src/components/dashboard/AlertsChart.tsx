import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { AlertTimeSeriesPoint } from '../../types/soc';

interface AlertsChartProps {
  data: AlertTimeSeriesPoint[];
}

export const AlertsChart: React.FC<AlertsChartProps> = ({ data }) => {
  return (
    <div className="bg-slate-800 rounded-md p-4 border border-slate-700 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3">
        <div>
          <h3 className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase">
            Alerts Over Time
          </h3>
          <p className="text-[11px] text-slate-400">
            Intrusion alert volume categorized by severity (Last 7 Days)
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            <span className="text-slate-300">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
            <span className="text-slate-300">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
            <span className="text-slate-300">Medium</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-400" />
            <span className="text-slate-300">Low</span>
          </div>
        </div>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorCritical" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorHigh" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f97316" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorMedium" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#eab308" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#eab308" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="colorLow" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.8} />
                <stop offset="95%" stopColor="#94a3b8" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="date" 
              stroke="#64748b" 
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis 
              stroke="#64748b" 
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#334155' }}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-xl text-xs font-mono">
                      <p className="text-slate-300 font-semibold mb-1.5 border-b border-slate-800 pb-1">
                        Date: {label}
                      </p>
                      {payload.map((entry, index) => (
                        <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 py-0.5">
                          <span className="capitalize text-slate-400" style={{ color: entry.color }}>
                            {entry.name}:
                          </span>
                          <span className="font-semibold text-slate-200">
                            {entry.value}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />

            <Area
              type="monotone"
              dataKey="critical"
              name="Critical"
              stackId="1"
              stroke="#ef4444"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCritical)"
            />
            <Area
              type="monotone"
              dataKey="high"
              name="High"
              stackId="1"
              stroke="#f97316"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorHigh)"
            />
            <Area
              type="monotone"
              dataKey="medium"
              name="Medium"
              stackId="1"
              stroke="#eab308"
              strokeWidth={1.5}
              fillOpacity={1}
              fill="url(#colorMedium)"
            />
            <Area
              type="monotone"
              dataKey="low"
              name="Low"
              stackId="1"
              stroke="#94a3b8"
              strokeWidth={1}
              fillOpacity={1}
              fill="url(#colorLow)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
