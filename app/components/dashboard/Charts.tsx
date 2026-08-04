"use client";

import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export function RoundHistoryChart({ data }: { data: Array<{ date: string; units: number }> }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 py-12">
        <p className="text-slate-500">No hay datos de rondas</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="date" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Line type="monotone" dataKey="units" stroke="#10b981" strokeWidth={2} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function UnitsDistributionChart({ won, lost }: { won: number; lost: number }) {
  const data = [
    { name: "Ganadas", value: Math.max(won, 0) },
    { name: "Perdidas", value: Math.max(lost, 0) },
  ];

  if (won === 0 && lost === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 py-32">
        <p className="text-slate-500">Sin datos</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          <Cell fill="#10b981" />
          <Cell fill="#ef4444" />
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function HolePerformanceChart({
  data,
}: {
  data: Array<{ hole: number; avgStrokes: number; par: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 py-12">
        <p className="text-slate-500">Sin datos de hoyos</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="hole" />
        <YAxis />
        <Tooltip />
        <Legend />
        <Bar dataKey="avgStrokes" fill="#3b82f6" name="Promedio de golpes" />
        <Bar dataKey="par" fill="#6b7280" name="Par" />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function PlayerComparisonChart({
  data,
}: {
  data: Array<{ player: string; units: number }>;
}) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-dashed border-slate-300 py-12">
        <p className="text-slate-500">Sin datos de jugadores</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis type="number" />
        <YAxis dataKey="player" type="category" width={100} />
        <Tooltip />
        <Bar dataKey="units" fill="#10b981" />
      </BarChart>
    </ResponsiveContainer>
  );
}
