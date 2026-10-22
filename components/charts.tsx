"use client";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { sampleSeries } from "@/lib/sample-data";
export function PerformanceChart({ factor = 1 }: { factor?: number }) {
  const data = sampleSeries.map((p) => ({
    ...p,
    social: Math.round(p.social * factor),
    email: Math.round(p.email * factor),
    organic: Math.round(p.organic * factor),
  }));
  return (
    <div
      className="chart"
      role="img"
      aria-label="Sample reach over time across social, email and organic search"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 10, left: -24, bottom: 0 }}
        >
          <defs>
            <linearGradient id="social-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#8a63d2" stopOpacity={0.16} />
              <stop offset="100%" stopColor="#8a63d2" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="#efedf3"
            strokeDasharray="4 4"
          />
          <XAxis
            dataKey="day"
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9895a4", fontSize: 11 }}
            dy={8}
          />
          <YAxis
            tickFormatter={(n) => `${n / 1000}k`}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "#9895a4", fontSize: 11 }}
          />
          <Tooltip
            contentStyle={{
              borderRadius: 12,
              border: "1px solid #ece9f2",
              fontSize: 12,
            }}
          />
          <Area
            name="Social media"
            dataKey="social"
            type="monotone"
            stroke="#8860cf"
            strokeWidth={2.8}
            fill="url(#social-fill)"
          />
          <Area
            name="Email"
            dataKey="email"
            type="monotone"
            stroke="#d3a364"
            strokeWidth={2}
            fill="transparent"
          />
          <Area
            name="Organic search"
            dataKey="organic"
            type="monotone"
            stroke="#8eaba7"
            strokeWidth={2}
            fill="transparent"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
