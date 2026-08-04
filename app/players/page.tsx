"use client";

import { useEffect, useState } from "react";
import { createPlayer, deletePlayer, listRegisteredPlayers, type RegisteredPlayer } from "@/lib/actions/players";

export default function PlayersPage() {
  const [players, setPlayers] = useState<RegisteredPlayer[]>([]);
  const [alias, setAlias] = useState("");
  const [hcp, setHcp] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadPlayers() {
      try {
        const data = await listRegisteredPlayers();
        setPlayers(data);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error cargando jugadores";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadPlayers();
  }, []);

  const handleCreate = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!alias.trim()) {
      setError("Ingresa el alias del jugador.");
      return;
    }

    if (hcp < -36 || hcp > 54) {
      setError("El HCP debe estar entre -36 y 54.");
      return;
    }

    try {
      setIsSaving(true);
      const created = await createPlayer({ alias, hcp });
      setPlayers((current) => [...current, created].sort((a, b) => a.alias.localeCompare(b.alias)));
      setAlias("");
      setHcp(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error creando jugador";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (playerId: string) => {
    const confirmed = window.confirm("¿Eliminar este jugador?");
    if (!confirmed) return;

    setError("");

    try {
      await deletePlayer(playerId);
      setPlayers((current) => current.filter((player) => player.id !== playerId));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error eliminando jugador";
      setError(message);
    }
  };

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-slate-950/40">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Jugadores</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Crea y administra tus jugadores registrados para usarlos en las rondas.
          </p>
        </section>

        {error ? (
          <div className="rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <form
          className="grid gap-4 rounded-[2rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 sm:grid-cols-[1fr_140px_auto]"
          onSubmit={handleCreate}
        >
          <input
            value={alias}
            onChange={(event) => setAlias(event.target.value)}
            placeholder="Alias del jugador"
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          />
          <input
            type="number"
            min={-36}
            max={54}
            value={hcp}
            onChange={(event) => setHcp(Number(event.target.value))}
            placeholder="HCP"
            className="rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
          />
          <button
            type="submit"
            disabled={isSaving}
            className="rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "Guardando..." : "Agregar"}
          </button>
        </form>

        <section className="grid gap-3">
          {isLoading ? (
            <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">
              Cargando jugadores...
            </div>
          ) : players.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-5 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
              No hay jugadores registrados todavía.
            </div>
          ) : (
            players.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{player.alias}</p>
                  <p className="text-sm text-slate-600 dark:text-slate-400">HCP: {player.hcp}</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(player.id)}
                  className="rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30"
                >
                  Eliminar
                </button>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
