import Link from "next/link";
import { getRounds } from "@/lib/actions/rounds";
import DeleteRoundButton from "@/app/components/DeleteRoundButton";

export default async function RoundsPage() {
  let rounds: Awaited<ReturnType<typeof getRounds>> = [];
  let loadError = "";

  try {
    rounds = await getRounds();
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : "Error cargando rondas";
  }

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-slate-950/40">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Rondas</h1>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Revisa las rondas que hayas registrado y crea nuevas partidas.
              </p>
            </div>
            <Link
              href="/rounds/new"
              className="inline-flex whitespace-nowrap rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
            >
              + Nueva ronda
            </Link>
          </div>
        </section>

        {loadError ? (
          <div className="rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {loadError}
          </div>
        ) : null}

        <section className="grid gap-4">
          {rounds.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-900">
              <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                Aún no hay rondas
              </p>
              <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
                Registra tu primera ronda
              </h2>
              <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                Agrega una nueva ronda para comenzar a llevar el control de tus partidas y unidades.
              </p>
              <Link
                href="/rounds/new"
                className="mt-5 inline-flex rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Crear primera ronda
              </Link>
            </div>
          ) : (
            rounds.map((round) => (
              <div
                key={round.id}
                className="flex flex-col gap-4 rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950 sm:flex-row sm:items-center sm:justify-between"
              >
                <Link
                  href={`/rounds/${round.id}/summary`}
                  className="block flex-1"
                >
                  <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                    {new Date(round.round_date + "T12:00:00").toLocaleDateString("es-MX", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                  <h3 className="mt-2 text-lg font-semibold text-slate-900 dark:text-slate-100">
                    {round.courseName}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    {round.holes_to_play} hoyos · Valor unidad: ${round.unit_value}
                  </p>
                  <span className="mt-3 inline-flex text-sm font-medium text-slate-400 dark:text-slate-500">
                    Ver →
                  </span>
                </Link>
                <DeleteRoundButton
                  roundId={round.id}
                  roundDate={new Date(round.round_date + "T12:00:00").toLocaleDateString("es-MX", {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                />
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
