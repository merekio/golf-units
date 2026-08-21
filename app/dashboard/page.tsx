import Link from "next/link";
import { Suspense } from "react";
import { StatCard, RecentRoundsTable, StatsGrid } from "@/app/components/dashboard/StatComponents";
import { RoundHistoryChart, UnitsDistributionChart } from "@/app/components/dashboard/Charts";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getUserDashboardStats } from "@/lib/actions/stats";

async function DashboardContent() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const stats = await getUserDashboardStats(user.id);
  const roundCount = stats.totalRounds;
  const recentRounds =
    stats.recentRounds.map((round) => ({
      date: round.roundDate,
      course: round.courseName,
      players: round.playerCount,
      units: round.playerResults[0]?.units ?? 0,
    })) || [];

  return (
    <>
      {/* Quick Stats */}
      <StatsGrid>
        <StatCard
          label="Rondas Jugadas"
          value={roundCount}
          subtext={roundCount > 0 ? `${roundCount} en total` : "Crea tu primera ronda"}
          trend={roundCount > 0 ? "up" : "neutral"}
        />
        <StatCard
          label="Promedio Unidades"
          value={roundCount > 0 ? stats.avgUnitsPerRound.toFixed(1) : "—"}
          subtext="por ronda"
          trend="up"
        />
        <StatCard
          label="Campo Favorito"
          value={stats.topCourse || "—"}
          subtext={stats.topCourse ? `${stats.topCourseRounds} rondas` : "Sin rondas"}
        />
        <StatCard
          label="Porcentaje Victorias"
          value={roundCount > 0 ? `${Math.round(stats.winPercentage)}%` : "—"}
          subtext="rondas con líder positivo"
          trend="up"
        />
      </StatsGrid>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">Histórico de Unidades</h3>
          <div className="mt-4">
            <RoundHistoryChart
              data={recentRounds.map((r) => ({
                date: new Date(r.date).toLocaleDateString("es-MX", {
                  month: "short",
                  day: "numeric",
                }),
                units: r.units,
              }))}
            />
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950">
          <h3 className="font-semibold text-slate-900 dark:text-slate-100">
            Distribución de Unidades
          </h3>
          <div className="mt-4">
            <UnitsDistributionChart won={Math.max(0, stats.totalUnitsWon)} lost={Math.max(0, Math.abs(stats.totalUnitsLost))} />
          </div>
        </div>
      </div>

      {/* Recent Rounds */}
      <div>
        <h3 className="mb-4 font-semibold text-slate-900 dark:text-slate-100">Rondas Recientes</h3>
        <RecentRoundsTable rounds={recentRounds} />
      </div>
    </>
  );
}

export default function DashboardPage() {
  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-7xl space-y-6">
        {/* Header */}
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-slate-950/40">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
            Bienvenido
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100 sm:text-4xl">
            GUTi
          </h1>
          <p className="mt-3 max-w-2xl text-slate-600 dark:text-slate-400">
            Organiza tus rondas, campos y jugadores desde una interfaz móvil clara y fácil de usar.
          </p>
        </section>

        {/* Dashboard Content */}
        <Suspense
          fallback={
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-24 animate-pulse rounded-lg bg-slate-200 dark:bg-slate-800"
                  />
                ))}
              </div>
            </div>
          }
        >
          <DashboardContent />
        </Suspense>

        {/* Quick Actions */}
        <section className="grid gap-4 sm:grid-cols-3">
          <Link
            href="/players"
            className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-blue-500 dark:hover:bg-slate-900"
          >
            <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">Jugadores</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Administra jugadores
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Crea tu lista de jugadores para armar rondas más rápido.
            </p>
          </Link>

          <Link
            href="/courses"
            className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-emerald-300 hover:bg-emerald-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-emerald-500 dark:hover:bg-slate-900"
          >
            <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-300">Campos</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Ver todos los campos
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Consulta y administra tus canchas registradas.
            </p>
          </Link>

          <Link
            href="/rounds"
            className="group rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950 dark:hover:border-slate-600 dark:hover:bg-slate-900"
          >
            <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">Rondas</p>
            <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
              Revisa tus partidas
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Explora las rondas anteriores y agrega nuevas partidas.
            </p>
          </Link>
        </section>

        {/* Create New Round CTA */}
        <section className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-6 shadow-sm shadow-emerald-100 dark:border-emerald-500/30 dark:bg-emerald-950/20">
          <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100">Nueva ronda</h2>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Registra rápidamente una ronda nueva y comparte el pago de las unidades entre los
            jugadores.
          </p>
          <Link
            href="/rounds/new"
            className="mt-5 inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Crear ronda
          </Link>
        </section>
      </div>
    </main>
  );
}
