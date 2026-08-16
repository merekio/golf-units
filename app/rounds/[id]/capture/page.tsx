import Link from "next/link";
import { getRoundDetail, HoleShotData } from "@/lib/actions/rounds";
import HoleCaptureForm from "@/app/components/rounds/HoleCaptureForm";

export default async function RoundCapturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: roundId } = await params;

  let detail: Awaited<ReturnType<typeof getRoundDetail>> | null = null;
  let loadError = "";

  try {
    detail = await getRoundDetail(roundId);
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : "Error cargando la ronda";
  }

  if (loadError || !detail || !detail.round.course_id) {
    return (
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl space-y-4">
          <div className="rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {loadError || "No se pudo cargar la ronda o su campo ya no existe."}
          </div>
          <Link
            href="/rounds"
            className="inline-flex rounded-full bg-slate-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            ← Volver a Rondas
          </Link>
        </div>
      </main>
    );
  }

  const { round, holeScores, roundPlayers } = detail;
  const courseId = detail.round.course_id;

  const players = roundPlayers
    .map((rp) => {
      const effectiveId = rp.player_id ?? rp.guest_player_id;
      if (!effectiveId) return null;

      return {
        id: effectiveId,
        alias: rp.player_id
          ? rp.players?.alias ?? "Sin nombre"
          : rp.guest_players?.name ?? "Sin nombre",
        isGuest: !rp.player_id,
        playingHcp: rp.playing_hcp ?? 0,
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null);

  const initialHoleData: Record<number, Record<string, HoleShotData>> = {};
  holeScores.forEach((hs) => {
    const effectiveId = hs.player_id ?? hs.guest_player_id;
    if (!effectiveId) return;

    if (!initialHoleData[hs.hole_number]) {
      initialHoleData[hs.hole_number] = {};
    }

    initialHoleData[hs.hole_number][effectiveId] = {
      strokes: hs.strokes,
      putts: hs.putts,
      events: {
        eagle: hs.eagle ?? false,
        birdie: hs.birdie ?? false,
        banderas: hs.banderas_count ?? 0,
        regulation: hs.regulation_rank ?? 0,
        hoyo: 0,
        otras: hs.otras_unidades ?? 0,
        sandPar: hs.sand_par ?? false,
        holeOut: hs.hole_out ?? false,
        espanol: hs.spanish ?? false,
        triputt: hs.putts >= 3,
        pinkis: hs.pinkis ?? false,
        salidaGreen: hs.salida_green ?? false,
      },
    };
  });

  return (
    <HoleCaptureForm
      roundId={round.id}
      courseId={courseId}
      holesToPlay={round.holes_to_play}
      startingHole={round.starting_hole ?? 1}
      players={players}
      unitValue={Number(round.unit_value ?? 0)}
      initialHoleData={initialHoleData}
    />
  );
}
