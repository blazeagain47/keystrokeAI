"use client";
import * as React from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine } from "recharts";

type Props = {
  chartData: ReadonlyArray<{ second: number; wpm: number }>;
  avg?: number;
  finishSec?: number;
  reducedMotion?: boolean;
  onFirstPaint?: () => void;
};

function ResultsChartImpl({ chartData, avg, finishSec, reducedMotion, onFirstPaint }: Props) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={chartData as any}>
        <defs>
          <linearGradient id="fireStroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#FF3D00" />
            <stop offset="50%" stopColor="#FF6A00" />
            <stop offset="100%" stopColor="#FFD36E" />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" opacity={0.18} />
        <XAxis dataKey="second" stroke="currentColor" opacity={0.7} />
        <YAxis stroke="currentColor" opacity={0.7} domain={[0, (max: number) => Math.max(80, Math.round(max * 1.1))]} />
        {typeof avg === "number" && <ReferenceLine y={avg} strokeDasharray="3 3" strokeOpacity={0.35} />}
        {typeof finishSec === "number" && <ReferenceLine x={finishSec} strokeOpacity={0.3} strokeDasharray="1 3" />}
        <Line
          type="monotone"
          dataKey="wpm"
          dot={false}
          stroke="url(#fireStroke)"
          strokeWidth={2.5}
          isAnimationActive={!reducedMotion}
          animationDuration={reducedMotion ? 0 : 700}
          onAnimationEnd={onFirstPaint}
        />
        <Line type="monotone" dataKey="wpm" dot={false} stroke="url(#fireStroke)" strokeOpacity={0.25} strokeWidth={7} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default React.memo(ResultsChartImpl);


