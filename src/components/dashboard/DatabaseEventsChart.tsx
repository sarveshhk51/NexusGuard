import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { DatabaseEventComparison } from '../../types/soc';

interface DatabaseEventsChartProps {
  data: DatabaseEventComparison[];
}

export const DatabaseEventsChart: React.FC<DatabaseEventsChartProps> = ({ data }) => {
  return (
    <div className="bg-slate-800 rounded-md p-4 border border-slate-700 flex flex-col h-full">
      <div className="flex items-center justify-between pb-3 border-b border-slate-700/80 mb-3">
        <div>
          <h3 className="text-xs font-mono font-semibold tracking-wider text-slate-200 uppercase">
            Events by Database
          </h3>
          <p className="text-[11px] text-slate-400">
            Comparative activity: Production DB vs nexusguard_decoy
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] font-mono">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-500" />
            <span className="text-slate-300">Baseline Traffic</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-red-500" />
            <span className="text-slate-300">Decoy Interceptions</span>
          </div>
        </div>
      </div>

      <div className="w-full h-64 sm:h-72">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} opacity={0.5} />
            <XAxis 
              dataKey="database" 
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#334155' }}
            />
            <YAxis 
              stroke="#64748b"
              tick={{ fill: '#94a3b8', fontSize: 11, fontFamily: 'monospace' }}
              tickLine={{ stroke: '#334155' }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-slate-900 border border-slate-700 p-2.5 rounded shadow-xl text-xs font-mono">
                      <p className="text-slate-200 font-semibold mb-1.5 border-b border-slate-800 pb-1">
                        Database: {label}
                      </p>
                      {payload.map((entry, index) => (
                        <div key={`tooltip-${index}`} className="flex items-center justify-between gap-4 py-0.5">
                          <span className="text-slate-400" style={{ color: entry.color }}>
                            {entry.name}:
                          </span>
                          <span className="font-semibold text-slate-100">
                            {Number(entry.value).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar 
              dataKey="normalTraffic" 
              name="Baseline Traffic" 
              fill="#3b82f6" 
              radius={[2, 2, 0, 0]}
              maxBarSize={45}
            />
            <Bar 
              dataKey="decoyAlerts" 
              name="Decoy Interceptions" 
              fill="#ef4444" 
              radius={[2, 2, 0, 0]}
              maxBarSize={45}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
