"use client";

import { useEffect, useState } from "react";

import { getCourses } from "@/lib/actions/courses";
import { getPlayers, type PlayerOption } from "@/lib/actions/players";
import { createRound } from "@/lib/actions/rounds";
import HoleCaptureForm from "./HoleCaptureForm";
import GuestPlayerForm from "./GuestPlayerForm";
import Link from "next/link";

type Course = { id: string; name: string };

type SelectedPlayer = {
  playerId: string;
  name: string;
  playingHcp: number;
  isGuest: boolean;
};

type RoundMode = "nine" | "eighteen" | "cut";

type GuestPlayer = {
  id: string;
  name: string;
  handicap: number;
};

export default function RoundForm() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [guestPlayers, setGuestPlayers] = useState<GuestPlayer[]>([]);
  const [courseId, setCourseId] = useState("");
  const [roundDate, setRoundDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [roundMode, setRoundMode] = useState<RoundMode>("eighteen");
  const [holesToPlay, setHolesToPlay] = useState(18);
  const [unitValue, setUnitValue] = useState(20);
  const [selectedPlayers, setSelectedPlayers] = useState<SelectedPlayer[]>([]);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [roundId, setRoundId] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const loadedCourses = await getCourses();
        setCourses(loadedCourses || []);
        if (loadedCourses?.length) {
          setCourseId(loadedCourses[0].id);
        }

        const loadedPlayers = await getPlayers();
        const authenticated = loadedPlayers.filter((p) => !p.isGuest);
        const guests = loadedPlayers
          .filter((p) => p.isGuest)
          .map((p) => ({
            id: p.id,
            name: p.name,
            handicap: p.handicap,
          }));

        setPlayers(authenticated);
        setGuestPlayers(guests);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error cargando datos";
        setError(message);
      }
    }

    loadData();
  }, []);

  const togglePlayer = (player: PlayerOption) => {
    setSelectedPlayers((current) => {
      const exists = current.find((item) => item.playerId === player.id);
      if (exists) {
        return current.filter((item) => item.playerId !== player.id);
      }

      if (current.length >= 6) {
        setError("El grupo máximo es de 6 jugadores.");
        return current;
      }

      const name = player.isGuest ? player.name : player.alias;
      const hcp = player.isGuest ? player.handicap : (player.hcp ?? 0);

      return [
        ...current,
        {
          playerId: player.id,
          name,
          playingHcp: hcp,
          isGuest: player.isGuest,
        },
      ];
    });
  };

  const toggleGuestPlayer = (guest: GuestPlayer) => {
    setSelectedPlayers((current) => {
      const exists = current.find((item) => item.playerId === guest.id);
      if (exists) {
        return current.filter((item) => item.playerId !== guest.id);
      }

      if (current.length >= 6) {
        setError("El grupo máximo es de 6 jugadores.");
        return current;
      }

      return [
        ...current,
        {
          playerId: guest.id,
          name: guest.name,
          playingHcp: guest.handicap,
          isGuest: true,
        },
      ];
    });
  };

  const updatePlayerHcp = (playerId: string, playingHcp: number) => {
    setSelectedPlayers((current) =>
      current.map((item) =>
        item.playerId === playerId ? { ...item, playingHcp } : item
      )
    );
  };

  const selectedPlayerIds = selectedPlayers.map((player) => player.playerId);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!courseId) {
      setError("Seleccione un campo");
      return;
    }

    if (selectedPlayers.length < 2) {
      setError("Seleccione al menos 2 jugadores.");
      return;
    }

    if (selectedPlayers.length > 6) {
      setError("El grupo máximo es de 6 jugadores.");
      return;
    }

    try {
      setIsSaving(true);
      const round = await createRound({
        courseId,
        roundDate,
        holesToPlay,
        unitValue,
        players: selectedPlayers.map((p) => ({
          playerId: p.playerId,
          playingHcp: p.playingHcp,
          isGuest: p.isGuest,
        })),
      });
      setRoundId(round.id);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error guardando la ronda";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (roundId) {
    return (
      <HoleCaptureForm
        roundId={roundId}
        courseId={courseId}
        holesToPlay={holesToPlay}
        players={selectedPlayers.map((p) => ({
          id: p.playerId,
          alias: p.name,
          isGuest: p.isGuest,
          playingHcp: p.playingHcp,
        }))}
        unitValue={unitValue}
      />
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="mb-6 text-2xl font-bold text-slate-900 dark:text-slate-100">Nueva Ronda</h1>

      <form className="space-y-6" onSubmit={handleSubmit}>
        {error ? (
          <div className="rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Campo</span>
            <select
              value={courseId}
              onChange={(event) => setCourseId(event.target.value)}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            >
              {courses.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Fecha</span>
            <input
              type="date"
              value={roundDate}
              onChange={(event) => setRoundDate(event.target.value)}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Modalidad</span>
            <select
              value={roundMode}
              onChange={(event) => {
                const mode = event.target.value as RoundMode;
                setRoundMode(mode);
                setHolesToPlay(mode === "nine" ? 9 : 18);
              }}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            >
              <option value="nine">9 hoyos</option>
              <option value="eighteen">18 hoyos</option>
              <option value="cut">Corte / vuelta</option>
            </select>
          </label>
          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Holes a jugar</span>
            <input
              type="number"
              min={9}
              max={18}
              value={holesToPlay}
              readOnly
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Valor unidad</span>
            <input
              type="number"
              min={0}
              value={unitValue}
              onChange={(event) => setUnitValue(Number(event.target.value))}
              className="mt-1 block w-full rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            />
          </label>
        </div>

        {courses.length === 0 ? (
          <div className="rounded-md border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-800/40 dark:bg-amber-950/20 dark:text-amber-200">
            No tienes campos registrados.{" "}
            <Link href="/courses/new" className="font-semibold underline">
              Crea un campo primero
            </Link>
            .
          </div>
        ) : null}

        {/* Guest Player Form */}
        <GuestPlayerForm
          guests={guestPlayers}
          onGuestAdded={(newGuest) => {
            setGuestPlayers((current) => [...current, newGuest]);
          }}
          onGuestDeleted={(guestId) => {
            setGuestPlayers((current) => current.filter((g) => g.id !== guestId));
          }}
        />

        {/* Authenticated Players */}
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-950/80 p-4 shadow-sm dark:border-slate-800">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
              Jugadores Registrados
            </h2>
            <p className="text-sm text-slate-600 dark:text-slate-400">
              Seleccionados: {selectedPlayers.length} / 6
            </p>
          </div>
          {players.length === 0 ? (
            <p className="text-sm text-slate-600 dark:text-slate-400">
              No hay jugadores registrados.
            </p>
          ) : (
            <div className="space-y-3">
              {players.map((player) => {
                if (player.isGuest) return null;
                const selected = selectedPlayerIds.includes(player.id);
                return (
                  <div
                    key={player.id}
                    className="flex flex-col gap-3 rounded-xl border border-slate-700 bg-slate-950 p-4"
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => togglePlayer(player)}
                        className="h-4 w-4"
                      />
                      <span className="font-medium text-slate-100">{player.alias}</span>
                    </label>
                    {selected ? (
                      <label className="grid gap-2 sm:grid-cols-[1fr_120px] sm:items-center">
                        <span className="text-sm text-slate-300">HCP para la ronda</span>
                        <input
                          type="number"
                          value={
                            selectedPlayers.find((item) => item.playerId === player.id)
                              ?.playingHcp ?? 0
                          }
                          onChange={(event) =>
                            updatePlayerHcp(player.id, Number(event.target.value))
                          }
                          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Guest Players Selection */}
        {guestPlayers.length > 0 && (
          <section className="space-y-4 rounded-2xl border border-blue-800/30 bg-slate-950/80 p-4 shadow-sm dark:border-blue-800/30 dark:bg-blue-950/20">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-lg font-semibold text-slate-100">Jugadores Invitados</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                {guestPlayers.length} disponibles
              </p>
            </div>
            <div className="space-y-3">
              {guestPlayers.map((guest) => {
                const selected = selectedPlayerIds.includes(guest.id);
                return (
                  <div
                    key={guest.id}
                    className="flex flex-col gap-3 rounded-xl border border-blue-800/40 bg-slate-950 p-4"
                  >
                    <label className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggleGuestPlayer(guest)}
                        className="h-4 w-4"
                      />
                      <span className="font-medium text-slate-100">{guest.name}</span>
                      <span className="text-xs text-slate-400">
                        (HCP: {guest.handicap})
                      </span>
                    </label>
                    {selected ? (
                      <label className="grid gap-2 sm:grid-cols-[1fr_120px] sm:items-center">
                        <span className="text-sm text-slate-300">
                          HCP para la ronda
                        </span>
                        <input
                          type="number"
                          value={
                            selectedPlayers.find((item) => item.playerId === guest.id)
                              ?.playingHcp ?? guest.handicap
                          }
                          onChange={(event) =>
                            updatePlayerHcp(guest.id, Number(event.target.value))
                          }
                          className="rounded border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                        />
                      </label>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        <button
          type="submit"
          disabled={isSaving || courses.length === 0}
          className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-2 text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {isSaving ? "Guardando..." : "Guardar ronda"}
        </button>
      </form>
    </main>
  );
}
