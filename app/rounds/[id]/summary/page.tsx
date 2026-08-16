import Link from "next/link";
import { getRoundDetail } from "@/lib/actions/rounds";
import { buildSettlementSummary } from "@/lib/utils/settlement";
import { calculateRoundUnits, CourseHole, PlayerRoundData } from "@/lib/utils/unitCalculations";
import { applyAutomaticHoleEvents } from "@/lib/utils/holeEvents";

const currency = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
  maximumFractionDigits: 0,
});

function formatUnitConcept(concept: string) {
  const labels: Record<string, string> = {
    "birdie": "Birdie",
    "pierde birdie": "Birdie rival",
    "águila": "Águila",
    "pierde águila": "Águila rival",
    "banderas": "Banderas",
    "pierde banderas": "Banderas rival",
    "triputt": "Triputt",
    "gana triputt": "Triputt rival",
    "español": "Español",
    "gana español": "Español rival",
    "sandPar": "Sand/Par",
    "pierde sandPar": "Sand/Par rival",
    "holeOut": "Hole Out",
    "pierde holeOut": "Hole Out rival",
    "salidaGreen": "Salida de Green",
    "gana salidaGreen": "Salida de Green rival",
    "pinkis": "Pinkis",
    "gana pinkis": "Pinkis rival",
    "regulación": "Unidades por regulación",
    "hoyo": "Hoyo ganado o perdido",
  };

  return labels[concept] ?? concept;
}

export default async function RoundSummaryPage({
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
    loadError = err instanceof Error ? err.message : "Error cargando resumen";
  }

  if (loadError || !detail) {
    return (
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
          {loadError || "No se pudo cargar la ronda."}
        </div>
      </main>
    );
  }

  const { round, holeScores, roundPlayers, courseHoles } = detail;

  const playerDataMap: Record<string, PlayerRoundData> = {};
  roundPlayers.forEach((rp) => {
    const effectiveId = rp.player_id ?? rp.guest_player_id;
    if (!effectiveId) return;

    const name = rp.player_id ? rp.players?.alias ?? "Sin nombre" : rp.guest_players?.name ?? "Sin nombre";
    playerDataMap[effectiveId] = {
      playerId: effectiveId,
      alias: name,
      playingHcp: rp.playing_hcp ?? 0,
      holes: {},
    };
  });

  holeScores.forEach((hs) => {
    const effectiveId = hs.player_id ?? hs.guest_player_id;
    if (!effectiveId || !playerDataMap[effectiveId]) return;
    const par = courseHoles.find((hole) => hole.holeNumber === hs.hole_number)?.par ?? 4;

    playerDataMap[effectiveId].holes[hs.hole_number] = {
      strokes: hs.strokes,
      putts: hs.putts,
      events: applyAutomaticHoleEvents(par, hs.strokes, hs.putts, {
        eagle: hs.eagle ?? false,
        birdie: hs.birdie ?? false,
        banderas: hs.banderas_count ?? 0,
        regulation: hs.regulation_rank ?? 0,
        hoyo: 0,
        sandPar: hs.sand_par ?? false,
        holeOut: hs.hole_out ?? false,
        espanol: hs.spanish ?? false,
        triputt: hs.putts >= 3,
        pinkis: hs.pinkis ?? false,
        salidaGreen: hs.salida_green ?? false,
      }),
    };
  });

  const mappedCourseHoles: CourseHole[] = courseHoles.map((h) => ({
    holeNumber: h.holeNumber,
    par: h.par,
    handicap: h.handicap,
  }));

  const startingHole = round.starting_hole ?? 1;

  const results = calculateRoundUnits(
    Object.values(playerDataMap),
    mappedCourseHoles,
    round.holes_to_play,
    startingHole
  ).sort((a, b) => b.units - a.units);

  const settlement = buildSettlementSummary(results, Number(round.unit_value ?? 0));
  const playerUnitStats = results.map((result) => {
    let cumulativeUnits = 0;
    let unitsWon = 0;
    let unitsLost = 0;

    const breakdown = result.breakdown.map((hole) => {
      cumulativeUnits += hole.totalHoleUnits;
      if (hole.totalHoleUnits > 0) unitsWon += hole.totalHoleUnits;
      if (hole.totalHoleUnits < 0) unitsLost += Math.abs(hole.totalHoleUnits);

      return {
        ...hole,
        cumulativeUnits,
        unitsWon: Math.max(0, hole.totalHoleUnits),
        unitsLost: Math.abs(Math.min(0, hole.totalHoleUnits)),
      };
    });

    return {
      ...result,
      unitsWon,
      unitsLost,
      netUnits: unitsWon - unitsLost,
      breakdown,
    };
  });

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Resumen de Ronda</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {new Date(round.round_date + "T12:00:00").toLocaleDateString("es-MX", {
              weekday: "long",
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            {" · "}
            {round.holes_to_play} hoyos
            {" · "}
            Inicio en hoyo {startingHole}
          </p>
        </section>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mb-6 flex flex-col gap-3 rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/20 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">Liquidación económica</h2>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Cada unidad equivale a {currency.format(Number(round.unit_value ?? 0))}.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-2 text-sm font-semibold text-emerald-700 shadow-sm dark:bg-slate-900 dark:text-emerald-400">
              {results.length} jugadores
            </span>
          </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl bg-emerald-50 p-4 dark:bg-emerald-950/20">
              <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Cobros</p>
              <p className="mt-1 text-xl font-semibold text-emerald-700 dark:text-emerald-400">
                {currency.format(settlement.totalToReceive)}
              </p>
            </div>
            <div className="rounded-2xl bg-red-50 p-4 dark:bg-red-950/20">
              <p className="text-xs uppercase tracking-wide text-red-700 dark:text-red-300">Pagos</p>
              <p className="mt-1 text-xl font-semibold text-red-700 dark:text-red-400">
                {currency.format(settlement.totalToPay)}
              </p>
            </div>
            <div className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-900">
              <p className="text-xs uppercase tracking-wide text-slate-700 dark:text-slate-300">Estado</p>
              <p className="mt-1 text-sm font-semibold text-slate-900 dark:text-slate-100">
                {settlement.hasImbalance ? "Saldo pendiente" : "Bolsa balanceada ✓"}
              </p>
            </div>
            </div>

          <div className="space-y-3">
            {settlement.rows.map((row) => {
              const moneyLabel =
                row.direction === "receive"
                  ? `Recibe ${currency.format(row.amount)}`
                  : row.direction === "pay"
                    ? `Paga ${currency.format(Math.abs(row.amount))}`
                    : "Sin movimiento";

              const colorClass =
                row.direction === "receive"
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : row.direction === "pay"
                    ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                    : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300";

              return (
                <div
                  key={row.playerId}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50"
                >
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{row.alias}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Ganadas:{" "}
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        +{Math.max(0, row.units)}
                      </span>{" "}
                      · Perdidas:{" "}
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        -{Math.abs(Math.min(0, row.units))}
                      </span>
                    </p>
                  </div>
                  <span className={`rounded-full px-3 py-2 text-sm font-semibold ${colorClass}`}>
                    {moneyLabel}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <h2 className="mb-4 text-xl font-semibold text-slate-900 dark:text-slate-100">Ranking de Unidades</h2>
          <div className="space-y-3">
            {playerUnitStats.map((result, index) => (
              <div
                key={result.playerId}
                className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-sm font-bold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">{result.alias}</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400">
                      Ganadas: +{result.unitsWon} · Perdidas: -{result.unitsLost}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className={`text-2xl font-bold ${
                      result.units >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {result.units > 0 ? "+" : ""}
                    {result.units}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">netas</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {playerUnitStats.map((result) => (
            <div
              key={result.playerId}
              className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
            >
              <h3 className="mb-4 text-lg font-semibold text-slate-900 dark:text-slate-100">
                {result.alias}
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Ganadas</span>
                  <span className="text-sm font-medium">
                    +{result.unitsWon}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600 dark:text-slate-400">Perdidas</span>
                  <span className="text-sm font-medium">
                    -{result.unitsLost}
                  </span>
                </div>
                <div className="border-t border-slate-200 pt-3 dark:border-slate-700">
                  <div className="flex justify-between font-semibold">
                    <span className="text-slate-900 dark:text-slate-100">Neto</span>
                    <span>
                      {result.netUnits > 0 ? "+" : ""}
                      {result.netUnits}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg bg-emerald-50 p-3 dark:bg-emerald-950/20">
                  <p className="text-xs text-slate-600 dark:text-slate-400">Unidades</p>
                  <p
                    className={`text-2xl font-bold ${
                      result.units >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {result.units > 0 ? "+" : ""}
                    {result.units}
                  </p>
                </div>
              </div>
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Ver detalles por hoyo
                </summary>
                <div className="mt-3 space-y-2">
                  {result.breakdown.map((hole) => (
                    <div key={hole.hole} className="text-xs text-slate-600 dark:text-slate-400">
                      <div className="grid grid-cols-4 gap-2">
                        <span>Hoyo {hole.hole}</span>
                        <span className="text-emerald-600 dark:text-emerald-400">
                          Gan: +{hole.unitsWon}
                        </span>
                        <span className="text-red-600 dark:text-red-400">
                          Per: -{hole.unitsLost}
                        </span>
                        <span
                          className={
                            hole.totalHoleUnits > 0
                              ? "text-emerald-600 dark:text-emerald-400"
                              : hole.totalHoleUnits < 0
                                ? "text-red-600 dark:text-red-400"
                                : ""
                          }
                        >
                          Bal: {hole.totalHoleUnits > 0 ? "+" : ""}
                          {hole.totalHoleUnits} · Acum: {hole.cumulativeUnits > 0 ? "+" : ""}
                          {hole.cumulativeUnits}
                        </span>
                      </div>
                      {Object.entries(hole.unitsByEvent).length > 0 && (
                        <div className="ml-4 text-xs text-slate-500 dark:text-slate-500">
                          {Object.entries(hole.unitsByEvent).map(([event, units]) => (
                            <div key={event}>
                              {formatUnitConcept(event)}: {units > 0 ? "+" : ""}
                              {units}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </details>
            </div>
          ))}
        </div>

        <div className="flex gap-3">
          <Link
            href="/rounds"
            className="inline-flex rounded-full bg-slate-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            ← Volver a Rondas
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
