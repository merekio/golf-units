"use client";

export function StatCard({
  label,
  value,
  subtext,
  trend,
}: {
  label: string;
  value: string | number;
  subtext?: string;
  trend?: "up" | "down" | "neutral";
}) {
  const trendColor = {
    up: "text-emerald-600 dark:text-emerald-400",
    down: "text-red-600 dark:text-red-400",
    neutral: "text-slate-600 dark:text-slate-400",
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950">
      <p className="text-sm font-medium text-slate-600 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold text-slate-900 dark:text-slate-100">{value}</p>
      {subtext && <p className={`mt-1 text-xs ${trendColor[trend || "neutral"]}`}>{subtext}</p>}
    </div>
  );
}

export function RecentRoundsTable({
  rounds,
}: {
  rounds: Array<{
    date: string;
    course: string;
    players: number;
    units: number;
  }>;
}) {
  if (rounds.length === 0) {
    return (
      <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
        <p className="text-sm text-slate-500">No hay rondas registradas</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
          <tr>
            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">
              Fecha
            </th>
            <th className="px-4 py-3 text-left font-semibold text-slate-900 dark:text-slate-100">
              Campo
            </th>
            <th className="px-4 py-3 text-center font-semibold text-slate-900 dark:text-slate-100">
              Jugadores
            </th>
            <th className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-slate-100">
              Unidades
            </th>
          </tr>
        </thead>
        <tbody>
          {rounds.map((round, idx) => (
            <tr
              key={idx}
              className="border-t border-slate-200 hover:bg-slate-50 dark:border-slate-800 dark:hover:bg-slate-900"
            >
              <td className="px-4 py-3 text-slate-600 dark:text-slate-400">
                {new Date(round.date).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 font-medium text-slate-900 dark:text-slate-100">
                {round.course}
              </td>
              <td className="px-4 py-3 text-center text-slate-600 dark:text-slate-400">
                {round.players}
              </td>
              <td
                className={`px-4 py-3 text-right font-semibold ${
                  round.units >= 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-red-600 dark:text-red-400"
                }`}
              >
                {round.units > 0 ? "+" : ""}{round.units}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function StatsGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>;
}
