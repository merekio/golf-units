"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteRound } from "@/lib/actions/rounds";

type DeleteRoundButtonProps = {
  roundId: string;
  roundDate: string;
};

export default function DeleteRoundButton({ roundId, roundDate }: DeleteRoundButtonProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    const confirmed = window.confirm(`¿Eliminar la ronda del ${roundDate}?`);
    if (!confirmed) return;

    try {
      setIsDeleting(true);
      await deleteRound(roundId);
      router.refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "No se pudo eliminar la ronda.";
      window.alert(message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={isDeleting}
      className="inline-flex items-center justify-center rounded-full border border-red-300 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30 dark:disabled:bg-slate-900 dark:disabled:text-slate-600"
    >
      {isDeleting ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
