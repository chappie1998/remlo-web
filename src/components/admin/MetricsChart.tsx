"use client";

import { useMemo } from 'react';

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface MetricsChartProps {
  data: ChartData[];
  type: 'bar' | 'pie';
  title?: string;
  height?: number;
}

export function MetricsChart({ data, type, title, height = 200 }: MetricsChartProps) {
  const maxValue = useMemo(() => Math.max(...data.map(d => d.value)), [data]);
  
  if (type === 'bar') {
    return (
      <div className="w-full">
        {title && <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>}
        <div className="space-y-3" style={{ height }}>
          {data.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <div className="w-20 text-sm text-gray-400 truncate">
                {item.label}
              </div>
              <div className="flex-1 bg-gray-800 rounded-full h-6 relative overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${maxValue > 0 ? (item.value / maxValue) * 100 : 0}%`,
                    backgroundColor: item.color || '#10B981',
                  }}
                />
                <div className="absolute inset-0 flex items-center justify-center text-xs font-medium text-white">
                  {item.value.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (type === 'pie') {
    const total = data.reduce((sum, item) => sum + item.value, 0);
    let cumulativePercentage = 0;

    return (
      <div className="w-full">
        {title && <h3 className="text-lg font-semibold mb-4 text-white">{title}</h3>}
        <div className="flex items-center justify-center" style={{ height }}>
          <div className="relative">
            <svg width="160" height="160" className="transform -rotate-90">
              <circle
                cx="80"
                cy="80"
                r="70"
                fill="none"
                stroke="#374151"
                strokeWidth="8"
              />
              {data.map((item, index) => {
                const percentage = total > 0 ? (item.value / total) * 100 : 0;
                const strokeDasharray = `${percentage * 4.4} 440`;
                const strokeDashoffset = -cumulativePercentage * 4.4;
                cumulativePercentage += percentage;

                return (
                  <circle
                    key={index}
                    cx="80"
                    cy="80"
                    r="70"
                    fill="none"
                    stroke={item.color || `hsl(${index * 60}, 70%, 50%)`}
                    strokeWidth="8"
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-500"
                  />
                );
              })}
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{total.toLocaleString()}</div>
                <div className="text-xs text-gray-400">Total</div>
              </div>
            </div>
          </div>
          <div className="ml-6 space-y-2">
            {data.map((item, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color || `hsl(${index * 60}, 70%, 50%)` }}
                />
                <span className="text-sm text-gray-300">{item.label}</span>
                <span className="text-sm font-medium text-white">
                  {item.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return null;
} 