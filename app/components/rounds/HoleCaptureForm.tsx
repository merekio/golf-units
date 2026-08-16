"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { saveRoundHoles, HoleShotData, HoleEventFlags } from "@/lib/actions/rounds";
import { getCourses, CourseRecord } from "@/lib/actions/courses";
import { applyAutomaticHoleEvents, AUTO_EVENT_KEYS } from "@/lib/utils/holeEvents";
import { calculateRoundUnits, getPlaySequence, CourseHole, PlayerRoundData } from "@/lib/utils/unitCalculations";

type Course = CourseRecord;
type Player = { id: string; alias: string; isGuest: boolean; playingHcp: number };

interface HoleCaptureFormProps {
  roundId: string;
  courseId: string;
  holesToPlay: number;
  startingHole: number;
  players: Player[];
  unitValue: number;
}

const defaultEvents: HoleEventFlags = {
  eagle: false,
  birdie: false,
  banderas: 0,
  regulation: 0,
  hoyo: 0,
  otras: 0,
  sandPar: false,
  holeOut: false,
  espanol: false,
  triputt: false,
  pinkis: false,
  salidaGreen: false,
};

const defaultShot: HoleShotData = {
  strokes: 0,
  putts: 0,
  events: defaultEvents,
};

function withAutomaticEvents(shot: HoleShotData, par: number): HoleShotData {
  return {
    ...shot,
    events: applyAutomaticHoleEvents(par, shot.strokes, shot.putts, shot.events),
  };
}

function isAutoEventKey(key: keyof HoleEventFlags) {
  return AUTO_EVENT_KEYS.includes(key as (typeof AUTO_EVENT_KEYS)[number]);
}

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
    "otras": "Otras unidades",
  };

  return labels[concept] ?? concept;
}

export default function HoleCaptureForm({
  roundId,
  courseId,
  holesToPlay,
  startingHole,
  players,
}: HoleCaptureFormProps) {
  const router = useRouter();
  const playSequence = useMemo(
    () => getPlaySequence(startingHole, holesToPlay),
    [startingHole, holesToPlay]
  );
  const [course, setCourse] = useState<Course | null>(null);
  const [currentHoleIndex, setCurrentHoleIndex] = useState(0);
  const [holeData, setHoleData] = useState<Record<number, Record<string, HoleShotData>>>({});
  const [otrasInput, setOtrasInput] = useState<Record<string, string>>({});
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const currentHole = playSequence[currentHoleIndex] ?? playSequence[0] ?? 1;

  useEffect(() => {
    async function loadCourse() {
      try {
        const courses = await getCourses();
        const found = courses?.find((c) => c.id === courseId);
        setCourse(found || null);

        const initialData: Record<number, Record<string, HoleShotData>> = {};
        for (const h of playSequence) {
          initialData[h] = {};
          players.forEach((p) => {
            initialData[h][p.id] = { ...defaultShot };
          });
        }
        setHoleData(initialData);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : "Error cargando datos";
        setError(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadCourse();
  }, [courseId, playSequence, players]);

  const updatePlayerShot = (
    holeNum: number,
    playerId: string,
    field: "strokes" | "putts",
    value: number
  ) => {
    setHoleData((prev) => {
      const currentShot = prev[holeNum][playerId];
      const nextShot = {
        ...currentShot,
        [field]: value,
      };

      return {
        ...prev,
        [holeNum]: {
          ...prev[holeNum],
          [playerId]: withAutomaticEvents(nextShot, getHolePar(holeNum)),
        },
      };
    });
  };

  const updatePlayerRegulation = (holeNum: number, playerId: string, rank: number) => {
    setHoleData((prev) => ({
      ...prev,
      [holeNum]: {
        ...prev[holeNum],
        [playerId]: {
          ...prev[holeNum][playerId],
          events: {
            ...prev[holeNum][playerId].events,
            regulation: rank,
          },
        },
      },
    }));
  };

  const togglePlayerEvent = (
    holeNum: number,
    playerId: string,
    eventKey: keyof HoleEventFlags,
    value: boolean | number
  ) => {
    if (isAutoEventKey(eventKey)) {
      return;
    }

    setHoleData((prev) => ({
      ...prev,
      [holeNum]: {
        ...prev[holeNum],
        [playerId]: {
          ...prev[holeNum][playerId],
          events: {
            ...prev[holeNum][playerId].events,
            [eventKey]: value,
          },
        },
      },
    }));
  };

  // Captura libre de "Otras unidades": permite escribir el signo y dígitos, y
  // guarda el número parseado; "" o "-" a medio escribir valen 0.
  const updatePlayerOtras = (holeNum: number, playerId: string, raw: string) => {
    if (!/^-?\d*$/.test(raw)) return;

    setOtrasInput((prev) => ({ ...prev, [`${holeNum}:${playerId}`]: raw }));
    const parsed = raw === "" || raw === "-" ? 0 : Number(raw);
    togglePlayerEvent(holeNum, playerId, "otras", parsed);
  };

  const getOtrasBalance = (holeNum: number) =>
    players.reduce(
      (sum, player) => sum + (holeData[holeNum]?.[player.id]?.events.otras ?? 0),
      0
    );

  const getHolePar = (holeNum: number): number => {
    return course?.holes?.find((h) => h.holeNumber === holeNum)?.par || 4;
  };

  const roundUnitResults = useMemo(() => {
    if (!course?.holes?.length) {
      return [];
    }

    const mappedCourseHoles: CourseHole[] = course.holes.map((h) => ({
      holeNumber: h.holeNumber,
      par: h.par,
      handicap: h.handicap,
    }));

    const playerRoundData: PlayerRoundData[] = players.map((player) => {
      const holes: Record<number, HoleShotData> = {};
      for (const holeNum of playSequence) {
        const shot = holeData[holeNum]?.[player.id];
        if (shot) {
          holes[holeNum] = withAutomaticEvents(shot, getHolePar(holeNum));
        }
      }
      return {
        playerId: player.id,
        alias: player.alias,
        playingHcp: player.playingHcp,
        holes,
      };
    });

    return calculateRoundUnits(playerRoundData, mappedCourseHoles, holesToPlay, startingHole);
  }, [course?.holes, holeData, holesToPlay, playSequence, players, startingHole]);

  const capturedHoles = useMemo(() => {
    const captured: number[] = [];

    for (const holeNum of playSequence) {
      const isCaptured = players.every((player) => {
        const shot = holeData[holeNum]?.[player.id];
        return Boolean(shot && shot.strokes > 0);
      });

      if (isCaptured) {
        captured.push(holeNum);
      }
    }

    return captured;
  }, [holeData, playSequence, players]);

  const capturedHoleUnitResults = useMemo(() => {
    if (!course?.holes?.length) {
      return [];
    }

    const mappedCourseHoles: CourseHole[] = course.holes.map((h) => ({
      holeNumber: h.holeNumber,
      par: h.par,
      handicap: h.handicap,
    }));

    const capturedHoleSet = new Set(capturedHoles);
    const playerRoundData: PlayerRoundData[] = players.map((player) => {
      const holes: Record<number, HoleShotData> = {};
      for (const holeNum of playSequence) {
        if (!capturedHoleSet.has(holeNum)) continue;

        const shot = holeData[holeNum]?.[player.id];
        if (shot) {
          holes[holeNum] = withAutomaticEvents(shot, getHolePar(holeNum));
        }
      }
      return {
        playerId: player.id,
        alias: player.alias,
        playingHcp: player.playingHcp,
        holes,
      };
    });

    return calculateRoundUnits(playerRoundData, mappedCourseHoles, holesToPlay, startingHole);
  }, [capturedHoles, course?.holes, holeData, holesToPlay, playSequence, players, startingHole]);

  const unitTotals = useMemo(() => {
    const won = capturedHoleUnitResults.reduce((sum, result) => sum + Math.max(0, result.units), 0);
    const lost = capturedHoleUnitResults.reduce((sum, result) => sum + Math.abs(Math.min(0, result.units)), 0);
    return {
      won,
      lost,
      balance: won - lost,
    };
  }, [capturedHoleUnitResults]);

  const playerBalances = useMemo(() => {
    return players.map((player) => {
      const result = capturedHoleUnitResults.find((r) => r.playerId === player.id);
      return {
        playerId: player.id,
        alias: player.alias,
        units: result?.units ?? 0,
      };
    });
  }, [capturedHoleUnitResults, players]);

  const currentHoleBreakdownByPlayer = useMemo(() => {
    return Object.fromEntries(
      roundUnitResults.map((result) => [
        result.playerId,
        result.breakdown.find((hole) => hole.hole === currentHole) ?? null,
      ])
    ) as Record<string, (typeof roundUnitResults)[number]["breakdown"][number] | null>;
  }, [currentHole, roundUnitResults]);

  const handleSubmit = async () => {
    setError("");

    // Validación 1: Verificar que todos los hoyos tienen datos
    for (const h of playSequence) {
      if (!holeData[h]) {
        setError(`No hay datos para el hoyo ${h}.`);
        return;
      }

      // Validación 2: Verificar que todos los jugadores tienen datos en cada hoyo
      for (const player of players) {
        const shot = holeData[h][player.id];
        if (!shot || shot.strokes === 0) {
          setError(`${player.alias} no tiene golpes registrados en el hoyo ${h}.`);
          return;
        }
      }
    }

    // Validación 3: Verificar que putts no sean negativos
    for (const holeNum of Object.keys(holeData)) {
      for (const playerId of Object.keys(holeData[Number(holeNum)])) {
        const shot = holeData[Number(holeNum)][playerId];
        if (shot.putts < 0) {
          setError(`Los putts no pueden ser negativos. Revisa el hoyo ${holeNum}.`);
          return;
        }
      }
    }

    // Validación 4: Si se captura regulación en un hoyo, debe estar completa y sin repetir.
    for (const h of playSequence) {
      const ranks = players.map((p) => holeData[h][p.id]?.events.regulation ?? 0);
      const hasAnyRank = ranks.some((r) => r > 0);
      if (!hasAnyRank) continue;

      const uniqueRanks = new Set(ranks.filter((r) => r > 0));
      if (uniqueRanks.size !== players.length || ranks.some((r) => r < 1 || r > players.length)) {
        setError(
          `En el hoyo ${h} la Regulación debe asignarse sin repetir, con una posición del 1 al ${players.length} para cada jugador.`
        );
        return;
      }
    }

    // Validación 5: Las "Otras unidades" de cada hoyo deben sumar 0 entre todos
    // los jugadores (lo que unos pierden lo ganan los demás).
    for (const h of playSequence) {
      const otrasSum = getOtrasBalance(h);
      if (otrasSum !== 0) {
        setError(
          `Las Otras unidades del hoyo ${h} suman ${otrasSum > 0 ? "+" : ""}${otrasSum}; deben sumar 0 entre todos los jugadores.`
        );
        return;
      }
    }

    try {
      setIsSaving(true);
      const playerGuestMap = players.reduce((map, player) => ({
        ...map,
        [player.id]: player.isGuest,
      }), {} as Record<string, boolean>);
      const normalizedHoleData = Object.fromEntries(
        Object.entries(holeData).map(([holeNum, playerData]) => [
          Number(holeNum),
          Object.fromEntries(
            Object.entries(playerData).map(([playerId, shot]) => [
              playerId,
              withAutomaticEvents(shot, getHolePar(Number(holeNum))),
            ])
          ),
        ])
      ) as Record<number, Record<string, HoleShotData>>;

      await saveRoundHoles(roundId, normalizedHoleData, playerGuestMap, course?.holes ?? []);
      router.push(`/rounds/${roundId}/summary`);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error guardando hoyos";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <main className="flex-1 px-4 py-6 sm:px-6">
        <div className="mx-auto max-w-5xl">
          <div className="text-center text-slate-600">Cargando curso...</div>
        </div>
      </main>
    );
  }

  const par = getHolePar(currentHole);
  const currentHoleOtrasBalance = getOtrasBalance(currentHole);

  const goToNextHole = () => {
    if (currentHoleOtrasBalance !== 0) {
      setError(
        `Las Otras unidades del hoyo ${currentHole} suman ${currentHoleOtrasBalance > 0 ? "+" : ""}${currentHoleOtrasBalance}; deben sumar 0 entre todos los jugadores para pasar de hoyo.`
      );
      return;
    }
    setError("");
    setCurrentHoleIndex(currentHoleIndex + 1);
  };

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">
            Captura de Hoyo a Hoyo
          </h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Registra golpes, putts y eventos para cada jugador en cada hoyo.
          </p>
        </section>

        {error ? (
          <div className="rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {error}
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <h2 className="mb-1 text-lg font-semibold text-slate-900 dark:text-slate-100">
            Saldo por jugador
          </h2>
          <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">
            Unidades acumuladas de los hoyos capturados.
          </p>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {playerBalances.map((balance) => (
              <div
                key={balance.playerId}
                className={`rounded-2xl border p-4 ${
                  balance.units > 0
                    ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/20"
                    : balance.units < 0
                      ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"
                      : "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-950/50"
                }`}
              >
                <p className="truncate text-sm font-medium text-slate-700 dark:text-slate-300">
                  {balance.alias}
                </p>
                <p
                  className={`text-2xl font-bold ${
                    balance.units > 0
                      ? "text-emerald-600 dark:text-emerald-400"
                      : balance.units < 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-900 dark:text-slate-100"
                  }`}
                >
                  {balance.units > 0 ? "+" : ""}
                  {balance.units}
                </p>
              </div>
            ))}
          </div>
        </section>

        <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <div className="mb-6 flex flex-col items-center justify-between gap-4 sm:flex-row">
            <div>
              <p className="text-sm text-slate-600 dark:text-slate-400">
                Hoyo actual ({currentHoleIndex + 1} de {holesToPlay})
              </p>
              <h2 className="text-4xl font-bold text-emerald-600 dark:text-emerald-400">
                {currentHole}
              </h2>
            </div>
            <div className="text-center">
              <p className="text-sm text-slate-600 dark:text-slate-400">Par</p>
              <p className="text-3xl font-bold text-slate-900 dark:text-slate-100">{par}</p>
            </div>
          </div>

          <div className="grid gap-4">
            {players.map((player) => {
              const shot = withAutomaticEvents(
                holeData[currentHole]?.[player.id] || defaultShot,
                par
              );
              const holeBreakdown = currentHoleBreakdownByPlayer[player.id];
              const conceptEntries = Object.entries(holeBreakdown?.unitsByEvent ?? {});
              const positiveEntries = conceptEntries.filter(([, units]) => units > 0);
              const negativeEntries = conceptEntries.filter(([, units]) => units < 0);
              const wonUnits = positiveEntries.reduce((sum, [, units]) => sum + units, 0);
              const lostUnits = negativeEntries.reduce((sum, [, units]) => sum + Math.abs(units), 0);
              const playerBalance =
                playerBalances.find((b) => b.playerId === player.id)?.units ?? 0;

              return (
                <div
                  key={player.id}
                  className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50"
                >
                  <div className="mb-4 flex items-center justify-between gap-3">
                    <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                      {player.alias}
                    </h3>
                    <span
                      className={`rounded-full px-3 py-1 text-sm font-semibold ${
                        playerBalance > 0
                          ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : playerBalance < 0
                            ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            : "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                      }`}
                    >
                      Saldo: {playerBalance > 0 ? "+" : ""}
                      {playerBalance}
                    </span>
                  </div>

                  <div className="mb-4 grid gap-3 sm:grid-cols-2">
                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Golpes
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={shot.strokes === 0 ? "" : shot.strokes}
                        onChange={(e) =>
                          updatePlayerShot(
                            currentHole,
                            player.id,
                            "strokes",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </label>

                    <label className="block">
                      <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                        Putts
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        min={0}
                        value={shot.putts === 0 ? "" : shot.putts}
                        onChange={(e) =>
                          updatePlayerShot(
                            currentHole,
                            player.id,
                            "putts",
                            e.target.value === "" ? 0 : Number(e.target.value)
                          )
                        }
                        className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      />
                    </label>
                  </div>

                  <label className="mb-4 block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Regulación (posición más cerca de la bandera)
                    </span>
                    <select
                      value={shot.events.regulation}
                      onChange={(e) =>
                        updatePlayerRegulation(currentHole, player.id, Number(e.target.value))
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                    >
                      <option value={0}>Sin asignar</option>
                      {players.map((_, idx) => (
                        <option key={idx + 1} value={idx + 1}>
                          {idx + 1}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="mb-4 block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Banderas capturadas
                    </span>
                    <input
                      type="number"
                      inputMode="numeric"
                      min={0}
                      value={shot.events.banderas === 0 ? "" : shot.events.banderas}
                      onChange={(e) =>
                        togglePlayerEvent(
                          currentHole,
                          player.id,
                          "banderas",
                          e.target.value === "" ? 0 : Number(e.target.value)
                        )
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                      placeholder="0"
                    />
                  </label>

                  <label className="mb-4 block">
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Otras unidades (+/-)
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={
                        otrasInput[`${currentHole}:${player.id}`] ??
                        (shot.events.otras === 0 ? "" : String(shot.events.otras))
                      }
                      onChange={(e) =>
                        updatePlayerOtras(currentHole, player.id, e.target.value)
                      }
                      className="mt-1 w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white placeholder:text-slate-400 outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      placeholder="0"
                    />
                    <span className="mt-1 block text-xs text-slate-500 dark:text-slate-400">
                      Positivas si gana, negativas si pierde. La suma entre jugadores debe ser 0.
                    </span>
                  </label>

                  <fieldset className="space-y-2 border-t border-slate-300 pt-3 dark:border-slate-700">
                    <legend className="text-sm font-medium text-slate-700 dark:text-slate-200">
                      Eventos
                    </legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { key: "eagle" as const, label: "Águila (-2)" },
                        { key: "birdie" as const, label: "Birdie (-1)" },
                        { key: "sandPar" as const, label: "Sand/Par" },
                        { key: "holeOut" as const, label: "Hole Out" },
                        { key: "espanol" as const, label: "Español" },
                        { key: "triputt" as const, label: "Triputt" },
                        { key: "pinkis" as const, label: "Pinkis" },
                        { key: "salidaGreen" as const, label: "Salida de Green" },
                      ].map(({ key, label }) => (
                        <label key={key} className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={shot.events[key] as boolean}
                            onChange={(e) =>
                              togglePlayerEvent(
                                currentHole,
                                player.id,
                                key,
                                e.target.checked
                              )
                            }
                            disabled={isAutoEventKey(key)}
                            className="h-4 w-4"
                          />
                          <span className="text-sm text-slate-700 dark:text-slate-300">
                            {label}
                            {isAutoEventKey(key) ? " (auto)" : ""}
                          </span>
                        </label>
                      ))}
                    </div>
                  </fieldset>

                  <div className="mt-4 rounded-2xl border border-slate-200 bg-white/70 p-4 dark:border-slate-700 dark:bg-slate-900/40">
                    <div className="mb-3 flex items-center justify-between gap-3">
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        Desglose de unidades del hoyo {currentHole}
                      </h4>
                      <span
                        className={`text-sm font-semibold ${
                          (holeBreakdown?.totalHoleUnits ?? 0) >= 0
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-red-600 dark:text-red-400"
                        }`}
                      >
                        Balance: {(holeBreakdown?.totalHoleUnits ?? 0) > 0 ? "+" : ""}
                        {holeBreakdown?.totalHoleUnits ?? 0}
                      </span>
                    </div>

                    <div className="mb-3 grid gap-2 sm:grid-cols-3">
                      <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
                        <p className="text-xs text-emerald-700 dark:text-emerald-300">Ganadas</p>
                        <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400">+{wonUnits}</p>
                      </div>
                      <div className="rounded-xl bg-red-50 p-3 dark:bg-red-950/20">
                        <p className="text-xs text-red-700 dark:text-red-300">Perdidas</p>
                        <p className="text-lg font-bold text-red-600 dark:text-red-400">-{lostUnits}</p>
                      </div>
                      <div className="rounded-xl bg-slate-100 p-3 dark:bg-slate-800">
                        <p className="text-xs text-slate-700 dark:text-slate-300">Conceptos</p>
                        <p className="text-lg font-bold text-slate-900 dark:text-slate-100">{conceptEntries.length}</p>
                      </div>
                    </div>

                    {conceptEntries.length === 0 ? (
                      <p className="text-sm text-slate-500 dark:text-slate-400">
                        Captura golpes, putts, regulación o eventos para ver el desglose de unidades.
                      </p>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                            Unidades positivas
                          </p>
                          {positiveEntries.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sin unidades ganadas.</p>
                          ) : (
                            positiveEntries.map(([concept, units]) => (
                              <div
                                key={concept}
                                className="flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-sm dark:bg-emerald-950/20"
                              >
                                <span className="text-slate-700 dark:text-slate-200">
                                  {formatUnitConcept(concept)}
                                </span>
                                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                  +{units}
                                </span>
                              </div>
                            ))
                          )}
                        </div>

                        <div className="space-y-2">
                          <p className="text-xs font-semibold uppercase tracking-wide text-red-700 dark:text-red-300">
                            Unidades negativas
                          </p>
                          {negativeEntries.length === 0 ? (
                            <p className="text-sm text-slate-500 dark:text-slate-400">Sin unidades perdidas.</p>
                          ) : (
                            negativeEntries.map(([concept, units]) => (
                              <div
                                key={concept}
                                className="flex items-center justify-between rounded-xl bg-red-50 px-3 py-2 text-sm dark:bg-red-950/20"
                              >
                                <span className="text-slate-700 dark:text-slate-200">
                                  {formatUnitConcept(concept)}
                                </span>
                                <span className="font-semibold text-red-600 dark:text-red-400">
                                  {units}
                                </span>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {currentHoleOtrasBalance !== 0 ? (
            <div className="mt-6 rounded-md bg-amber-100 px-4 py-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              Las Otras unidades del hoyo {currentHole} suman{" "}
              {currentHoleOtrasBalance > 0 ? "+" : ""}
              {currentHoleOtrasBalance}. Deben sumar 0 entre todos los jugadores para
              poder pasar de hoyo.
            </div>
          ) : null}

          <div className="mt-6 flex gap-3">
            <button
              type="button"
              disabled={currentHoleIndex === 0}
              onClick={() => setCurrentHoleIndex(Math.max(0, currentHoleIndex - 1))}
              className="inline-flex rounded-full bg-slate-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:bg-slate-400"
            >
              ← Anterior
            </button>

            <div className="flex-1" />

            {currentHoleIndex < playSequence.length - 1 ? (
              <button
                type="button"
                onClick={goToNextHole}
                className="inline-flex rounded-full bg-emerald-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-emerald-700"
              >
                Siguiente →
              </button>
            ) : (
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSubmit}
                className="inline-flex rounded-full bg-blue-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-400"
              >
                {isSaving ? "Guardando..." : "Finalizar ronda"}
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Hoyos capturados</h3>
            <p className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {capturedHoles.length}/{holesToPlay}
            </p>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              {capturedHoles.length > 0 ? `Hoyos: ${capturedHoles.join(", ")}` : "Aún no hay hoyos capturados"}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
            <h3 className="mb-2 font-semibold text-emerald-600 dark:text-emerald-400">Total unidades ganadas</h3>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">+{unitTotals.won}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
            <h3 className="mb-2 font-semibold text-red-600 dark:text-red-400">Total unidades perdidas</h3>
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">-{unitTotals.lost}</p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/50">
            <h3 className="mb-2 font-semibold text-slate-900 dark:text-slate-100">Balance general</h3>
            <p
              className={`text-2xl font-bold ${
                unitTotals.balance >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
              }`}
            >
              {unitTotals.balance > 0 ? "+" : ""}
              {unitTotals.balance}
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
