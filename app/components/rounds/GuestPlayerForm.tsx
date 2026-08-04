"use client";

import { useState } from "react";
import { createGuestPlayer, deleteGuestPlayer } from "@/lib/actions/players";

type GuestPlayer = {
  id: string;
  name: string;
  handicap: number;
};

export default function GuestPlayerForm({
  guests,
  onGuestAdded,
  onGuestDeleted,
}: {
  guests: GuestPlayer[];
  onGuestAdded: (player: GuestPlayer) => void;
  onGuestDeleted: (playerId: string) => void;
}) {
  const [newName, setNewName] = useState("");
  const [newHandicap, setNewHandicap] = useState(0);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState("");

  const handleAddGuest = async () => {
    setError("");

    if (!newName.trim()) {
      setError("El nombre del jugador es requerido");
      return;
    }

    if (newHandicap < -36 || newHandicap > 54) {
      setError("Handicap debe estar entre -36 y 54");
      return;
    }

    setIsAdding(true);
    try {
      const player = await createGuestPlayer(newName.trim(), newHandicap);
      onGuestAdded(player);
      setNewName("");
      setNewHandicap(0);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al agregar jugador";
      setError(message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleDeleteGuest = async (playerId: string) => {
    if (!confirm("¿Estás seguro de eliminar este jugador invitado?")) {
      return;
    }

    try {
      await deleteGuestPlayer(playerId);
      onGuestDeleted(playerId);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error al eliminar jugador";
      setError(message);
    }
  };

  return (
    <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-950/80 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
      <h3 className="font-semibold text-slate-900 dark:text-slate-100">Agregar Jugador Invitado</h3>

      <div className="space-y-3">
        {error && (
          <div className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 dark:bg-red-900/30 dark:text-red-400">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Nombre del Jugador
          </label>
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="ej: Juan García"
            className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            disabled={isAdding}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300">
            Handicap
          </label>
          <input
            type="number"
            value={newHandicap}
            onChange={(e) => setNewHandicap(Number(e.target.value))}
            min="-36"
            max="54"
            className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
            disabled={isAdding}
          />
        </div>

        <button
          onClick={handleAddGuest}
          disabled={isAdding}
          className="w-full rounded-full bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50 dark:bg-emerald-700 dark:hover:bg-emerald-800"
        >
          {isAdding ? "Agregando..." : "Agregar Invitado"}
        </button>
      </div>

      {guests.length > 0 && (
        <div className="mt-4 space-y-2 border-t border-slate-800 pt-4">
          <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            Jugadores Invitados ({guests.length})
          </h4>
          <div className="space-y-1">
            {guests.map((guest) => (
              <div
                key={guest.id}
                className="flex items-center justify-between rounded-xl bg-slate-900 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {guest.name}
                  </p>
                  <p className="text-xs text-slate-600 dark:text-slate-400">HCP: {guest.handicap}</p>
                </div>
                <button
                  onClick={() => handleDeleteGuest(guest.id)}
                  className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                >
                  Eliminar
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
