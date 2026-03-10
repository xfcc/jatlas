'use client';

import { ComposedChart, ResponsiveContainer, XAxis, YAxis, Tooltip, Legend, CartesianGrid, Bar, Line } from 'recharts';

interface LogChartProps {
  data: {
    name: string;
    '资产入库': number;
    '资产出库': number;
    '收录扩张': number;
  }[];
}

export function LogChart({ data }: LogChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-8 h-80 flex flex-col justify-center items-center border-dashed">
        <div className="text-zinc-500 mb-3 font-medium">暂无系统流水记录</div>
        <div className="text-sm text-zinc-600">当有新的资产变更时，这里会展示最近 6 个月的流水趋势</div>
      </div>
    )
  }

  return (
    <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-8 h-80 relative">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
          <XAxis
            dataKey="name"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}月`}
          />
          <YAxis
            yAxisId="left"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            stroke="#888888"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `${value}`}
          />
          <Tooltip
            cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
            contentStyle={{
              background: '#18181b',
              border: '1px solid #3f3f46',
              borderRadius: '0.5rem',
            }}
            labelStyle={{
              color: '#f4f4f5',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '0.8rem', color: '#a1a1aa' }} />
          <Bar yAxisId="left" dataKey="资产入库" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar yAxisId="left" dataKey="资产出库" fill="#f43f5e" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="收录扩张" stroke="#d4d4d8" strokeWidth={3} />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
