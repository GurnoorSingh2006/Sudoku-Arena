"use client";

import React from "react";

interface TimelinePoint {
  time: number; // in minutes (can be decimal)
  percentage: number; // 0 to 100
}

interface RaceTimelineProps {
  data: Record<string, TimelinePoint[]>;
  title?: string;
}

export default function RaceTimeline({ data, title = "Solve Progress Timeline" }: RaceTimelineProps) {
  const usernames = Object.keys(data);
  if (usernames.length === 0) return null;

  // Find max time to scale X-axis
  let maxTime = 1;
  usernames.forEach((user) => {
    const points = data[user] || [];
    points.forEach((pt) => {
      if (pt.time > maxTime) maxTime = pt.time;
    });
  });

  // SVG dimensions
  const width = 500;
  const height = 240;
  const paddingLeft = 40;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  // Colors for up to 5 players, fallback to slate
  const colors = [
    "#4f46e5", // Indigo
    "#9333ea", // Purple
    "#ec4899", // Pink
    "#10b981", // Emerald
    "#f59e0b", // Amber
  ];

  const getPlayerColor = (index: number) => colors[index % colors.length];

  return (
    <div className="w-full bg-slate-50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-slate-800/40 rounded-2xl p-4 sm:p-5 mt-6">
      <h4 className="text-xs font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4 text-center sm:text-left">
        {title}
      </h4>

      <div className="relative w-full aspect-[2/1] sm:aspect-auto sm:h-[240px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-full overflow-visible"
        >
          {/* Horizontal Grid lines & labels */}
          {[0, 25, 50, 75, 100].map((pct) => {
            const y = paddingTop + chartHeight - (pct / 100) * chartHeight;
            return (
              <g key={pct} className="opacity-40 dark:opacity-20">
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={width - paddingRight}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-slate-400"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  className="fill-slate-500 font-bold"
                >
                  {pct}%
                </text>
              </g>
            );
          })}

          {/* Vertical Grid lines & labels */}
          {Array.from({ length: Math.min(6, Math.ceil(maxTime)) + 1 }).map((_, idx, arr) => {
            const timeVal = (idx / (arr.length - 1)) * maxTime;
            const x = paddingLeft + (timeVal / maxTime) * chartWidth;
            return (
              <g key={idx} className="opacity-40 dark:opacity-20">
                <line
                  x1={x}
                  y1={paddingTop}
                  x2={x}
                  y2={paddingTop + chartHeight}
                  stroke="currentColor"
                  strokeWidth="1"
                  strokeDasharray="4 4"
                  className="text-slate-400"
                />
                <text
                  x={x}
                  y={paddingTop + chartHeight + 16}
                  textAnchor="middle"
                  fontSize="10"
                  className="fill-slate-500 font-bold"
                >
                  {timeVal.toFixed(timeVal >= 10 ? 0 : 1)}m
                </text>
              </g>
            );
          })}

          {/* Bottom X-axis label */}
          <text
            x={paddingLeft + chartWidth / 2}
            y={height - 6}
            textAnchor="middle"
            fontSize="10"
            className="fill-slate-400 font-black uppercase tracking-wider"
          >
            Time Elapsed
          </text>

          {/* Draw lines for each player */}
          {usernames.map((user, uIdx) => {
            const points = [...(data[user] || [])].sort((a, b) => a.time - b.time);
            if (points.length === 0) return null;

            // Generate path string
            const pathPoints = points.map((pt) => {
              const x = paddingLeft + (pt.time / maxTime) * chartWidth;
              const y = paddingTop + chartHeight - (pt.percentage / 100) * chartHeight;
              return `${x},${y}`;
            });

            const pathD = `M ${pathPoints.join(" L ")}`;

            return (
              <g key={user}>
                {/* Glow under the line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={getPlayerColor(uIdx)}
                  strokeWidth="6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="opacity-15 blur-[2px]"
                />
                {/* Main line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={getPlayerColor(uIdx)}
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Data points markers */}
                {points.map((pt, pIdx) => {
                  const x = paddingLeft + (pt.time / maxTime) * chartWidth;
                  const y = paddingTop + chartHeight - (pt.percentage / 100) * chartHeight;
                  return (
                    <circle
                      key={pIdx}
                      cx={x}
                      cy={y}
                      r="3.5"
                      fill={getPlayerColor(uIdx)}
                      className="stroke-white dark:stroke-slate-900 stroke-2"
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 pt-2 border-t border-slate-200/50 dark:border-slate-800/40">
        {usernames.map((user, idx) => (
          <div key={user} className="flex items-center gap-1.5 text-xs font-bold">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: getPlayerColor(idx) }}
            />
            <span className="text-slate-600 dark:text-slate-300">{user}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
