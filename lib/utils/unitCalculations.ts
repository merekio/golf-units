import { HoleEventFlags, HoleShotData } from "../actions/rounds";
import { applyAutomaticHoleEvents } from "./holeEvents";

export type CourseHole = {
  holeNumber: number;
  par: number;
  handicap: number;
};

export type PlayerRoundData = {
  playerId: string;
  alias: string;
  playingHcp: number;
  holes: Record<number, HoleShotData>;
};

export type UnitCalculationResult = {
  playerId: string;
  alias: string;
  frontStrokes: number;
  frontPutts: number;
  backStrokes: number;
  backPutts: number;
  totalStrokes: number;
  totalPutts: number;
  units: number;
  breakdown: {
    hole: number;
    strokes: number;
    putts: number;
    par: number;
    score: string;
    unitsByEvent: Record<string, number>;
    totalHoleUnits: number;
  }[];
};

type UnitsByHoleAndPlayer = Record<number, Record<string, number>>;

// Secuencia de hoyos en orden de juego. Una ronda puede iniciar en el hoyo 1 o
// en el 10; al iniciar en el 10 con 18 hoyos se juega 10-18 y continúa 1-9.
export function getPlaySequence(startingHole: number, holesToPlay: number): number[] {
  return Array.from(
    { length: holesToPlay },
    (_, i) => ((startingHole - 1 + i) % 18) + 1
  );
}

export function calculateRoundUnits(
  players: PlayerRoundData[],
  courseHoles: CourseHole[],
  holesToPlay: number,
  startingHole: number = 1
): UnitCalculationResult[] {
  const numPlayers = players.length;
  const playSequence = getPlaySequence(startingHole, holesToPlay);

  // Accumulators per player
  const totalUnitsByPlayer: Record<string, number> = {};
  const breakdownByPlayer: Record<string, UnitCalculationResult["breakdown"]> = {};
  const frontStrokes: Record<string, number> = {};
  const frontPutts: Record<string, number> = {};
  const backStrokes: Record<string, number> = {};
  const backPutts: Record<string, number> = {};

  players.forEach((p) => {
    totalUnitsByPlayer[p.playerId] = 0;
    breakdownByPlayer[p.playerId] = [];
    frontStrokes[p.playerId] = 0;
    frontPutts[p.playerId] = 0;
    backStrokes[p.playerId] = 0;
    backPutts[p.playerId] = 0;
  });

  for (const holeNum of playSequence) {
    const courseHole = courseHoles.find((h) => h.holeNumber === holeNum);
    if (!courseHole) continue;

    const par = courseHole.par;

    // Gather events for all players on this hole
    const holeInfo: Record<
      string,
      {
        strokes: number;
        putts: number;
        scoreStr: string;
        events: HoleEventFlags;
      }
    > = {};

    players.forEach((p) => {
      const shot = p.holes[holeNum];
      if (!shot) return;

      const { strokes, putts } = shot;
      const events = applyAutomaticHoleEvents(par, strokes, putts, shot.events);
      const score = strokes - par;
      const scoreStr =
        score <= -2
          ? "Águila"
          : score === -1
            ? "Birdie"
            : score === 0
              ? "Par"
              : score === 1
                ? "Bogey"
                : `+${score}`;

      holeInfo[p.playerId] = { strokes, putts, scoreStr, events };

      if (holeNum <= 9) {
        frontStrokes[p.playerId] += strokes;
        frontPutts[p.playerId] += putts;
      } else {
        backStrokes[p.playerId] += strokes;
        backPutts[p.playerId] += putts;
      }
    });

    // Initialize per-player unit maps for this hole
    const holeUnitsByEvent: Record<string, Record<string, number>> = {};
    players.forEach((p) => {
      holeUnitsByEvent[p.playerId] = {};
    });

    // --- Zero-sum events (transfers between players) ---

    // Banderas: cada jugador captura una cantidad manual por hoyo.
    // Se compara por pares; quien tenga mas banderas en el hoyo gana la diferencia.
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const pA = players[i];
        const pB = players[j];
        const infoA = holeInfo[pA.playerId];
        const infoB = holeInfo[pB.playerId];
        if (!infoA || !infoB) continue;

        const banderasA = Math.max(0, infoA.events.banderas ?? 0);
        const banderasB = Math.max(0, infoB.events.banderas ?? 0);
        if (banderasA === banderasB) continue;

        if (banderasA > banderasB) {
          const diff = banderasA - banderasB;
          holeUnitsByEvent[pA.playerId]["banderas"] =
            (holeUnitsByEvent[pA.playerId]["banderas"] ?? 0) + diff;
          holeUnitsByEvent[pB.playerId]["pierde banderas"] =
            (holeUnitsByEvent[pB.playerId]["pierde banderas"] ?? 0) - diff;
        } else {
          const diff = banderasB - banderasA;
          holeUnitsByEvent[pB.playerId]["banderas"] =
            (holeUnitsByEvent[pB.playerId]["banderas"] ?? 0) + diff;
          holeUnitsByEvent[pA.playerId]["pierde banderas"] =
            (holeUnitsByEvent[pA.playerId]["pierde banderas"] ?? 0) - diff;
        }
      }
    }

    // Birdie: el que pega birdie gana 1 unidad de cada otro jugador
    players.forEach((p) => {
      const info = holeInfo[p.playerId];
      if (!info?.events.birdie) return;

      const gain = numPlayers - 1;
      holeUnitsByEvent[p.playerId]["birdie"] = (holeUnitsByEvent[p.playerId]["birdie"] ?? 0) + gain;

      players.forEach((other) => {
        if (other.playerId === p.playerId) return;
        holeUnitsByEvent[other.playerId]["pierde birdie"] =
          (holeUnitsByEvent[other.playerId]["pierde birdie"] ?? 0) - 1;
      });
    });

    // Águila: el que pega águila gana 5 unidades de cada otro jugador
    players.forEach((p) => {
      const info = holeInfo[p.playerId];
      if (!info?.events.eagle) return;

      const gain = (numPlayers - 1) * 5;
      holeUnitsByEvent[p.playerId]["águila"] = (holeUnitsByEvent[p.playerId]["águila"] ?? 0) + gain;

      players.forEach((other) => {
        if (other.playerId === p.playerId) return;
        holeUnitsByEvent[other.playerId]["pierde águila"] =
          (holeUnitsByEvent[other.playerId]["pierde águila"] ?? 0) - 5;
      });
    });

    // Triputt: el que hace triputt pierde 1 unidad a cada otro jugador
    players.forEach((p) => {
      const info = holeInfo[p.playerId];
      if (!info?.events.triputt) return;

      const lose = numPlayers - 1;
      holeUnitsByEvent[p.playerId]["triputt"] = (holeUnitsByEvent[p.playerId]["triputt"] ?? 0) - lose;

      players.forEach((other) => {
        if (other.playerId === p.playerId) return;
        holeUnitsByEvent[other.playerId]["gana triputt"] =
          (holeUnitsByEvent[other.playerId]["gana triputt"] ?? 0) + 1;
      });
    });

    // Español: el que hace español pierde 1 unidad a cada otro jugador
    players.forEach((p) => {
      const info = holeInfo[p.playerId];
      if (!info?.events.espanol) return;

      const lose = numPlayers - 1;
      holeUnitsByEvent[p.playerId]["español"] = (holeUnitsByEvent[p.playerId]["español"] ?? 0) - lose;

      players.forEach((other) => {
        if (other.playerId === p.playerId) return;
        holeUnitsByEvent[other.playerId]["gana español"] =
          (holeUnitsByEvent[other.playerId]["gana español"] ?? 0) + 1;
      });
    });

    // --- Zero-sum individual events ---

    // Sand/Par y Hole Out: el que los marca gana 1 unidad de cada otro jugador
    players.forEach((p) => {
      const info = holeInfo[p.playerId];
      if (!info) return;
      const { events } = info;

      if (events.sandPar) {
        holeUnitsByEvent[p.playerId]["sandPar"] = (holeUnitsByEvent[p.playerId]["sandPar"] ?? 0) + (numPlayers - 1);
        players.forEach((other) => {
          if (other.playerId === p.playerId) return;
          holeUnitsByEvent[other.playerId]["pierde sandPar"] =
            (holeUnitsByEvent[other.playerId]["pierde sandPar"] ?? 0) - 1;
        });
      }

      if (events.holeOut) {
        holeUnitsByEvent[p.playerId]["holeOut"] = (holeUnitsByEvent[p.playerId]["holeOut"] ?? 0) + (numPlayers - 1);
        players.forEach((other) => {
          if (other.playerId === p.playerId) return;
          holeUnitsByEvent[other.playerId]["pierde holeOut"] =
            (holeUnitsByEvent[other.playerId]["pierde holeOut"] ?? 0) - 1;
        });
      }

      // Salida de Green y Pinkis: el que los marca pierde 1 unidad a cada otro jugador
      if (events.salidaGreen) {
        holeUnitsByEvent[p.playerId]["salidaGreen"] = (holeUnitsByEvent[p.playerId]["salidaGreen"] ?? 0) - (numPlayers - 1);
        players.forEach((other) => {
          if (other.playerId === p.playerId) return;
          holeUnitsByEvent[other.playerId]["gana salidaGreen"] =
            (holeUnitsByEvent[other.playerId]["gana salidaGreen"] ?? 0) + 1;
        });
      }

      if (events.pinkis) {
        holeUnitsByEvent[p.playerId]["pinkis"] = (holeUnitsByEvent[p.playerId]["pinkis"] ?? 0) - (numPlayers - 1);
        players.forEach((other) => {
          if (other.playerId === p.playerId) return;
          holeUnitsByEvent[other.playerId]["gana pinkis"] =
            (holeUnitsByEvent[other.playerId]["gana pinkis"] ?? 0) + 1;
        });
      }

      // Otras unidades: captura libre por jugador (positiva o negativa).
      // La UI valida que la suma del hoyo entre todos los jugadores sea 0.
      const otras = events.otras ?? 0;
      if (otras !== 0) {
        holeUnitsByEvent[p.playerId]["otras"] =
          (holeUnitsByEvent[p.playerId]["otras"] ?? 0) + otras;
      }
    });

    // Commit this hole's data to each player's breakdown
    players.forEach((p) => {
      const info = holeInfo[p.playerId];
      if (!info) return;

      const unitsByEvent = holeUnitsByEvent[p.playerId];
      // Remove zero-value entries
      Object.keys(unitsByEvent).forEach((key) => {
        if (unitsByEvent[key] === 0) delete unitsByEvent[key];
      });

      const totalHoleUnits = Object.values(unitsByEvent).reduce((sum, v) => sum + v, 0);
      totalUnitsByPlayer[p.playerId] += totalHoleUnits;

      breakdownByPlayer[p.playerId].push({
        hole: holeNum,
        strokes: info.strokes,
        putts: info.putts,
        par,
        score: info.scoreStr,
        unitsByEvent,
        totalHoleUnits,
      });
    });
  }

  const regulationByHole = calculateRegulationByHole(players, courseHoles, playSequence);
  const hoyoByHole = calculateHoyoByHole(players, courseHoles, playSequence);

  for (const holeNum of playSequence) {
    players.forEach((player) => {
      const breakdown = breakdownByPlayer[player.playerId].find((item) => item.hole === holeNum);
      if (!breakdown) return;

      const regulationUnits = regulationByHole[holeNum]?.[player.playerId] ?? 0;
      if (regulationUnits !== 0) {
        breakdown.unitsByEvent["regulación"] = regulationUnits;
        breakdown.totalHoleUnits += regulationUnits;
        totalUnitsByPlayer[player.playerId] += regulationUnits;
      }

      const hoyoUnits = hoyoByHole[holeNum]?.[player.playerId] ?? 0;
      if (hoyoUnits !== 0) {
        breakdown.unitsByEvent["hoyo"] = hoyoUnits;
        breakdown.totalHoleUnits += hoyoUnits;
        totalUnitsByPlayer[player.playerId] += hoyoUnits;
      }
    });
  }

  // Build results array
  const results: UnitCalculationResult[] = players.map((p) => ({
    playerId: p.playerId,
    alias: p.alias,
    frontStrokes: frontStrokes[p.playerId],
    frontPutts: frontPutts[p.playerId],
    backStrokes: backStrokes[p.playerId],
    backPutts: backPutts[p.playerId],
    totalStrokes: frontStrokes[p.playerId] + backStrokes[p.playerId],
    totalPutts: frontPutts[p.playerId] + backPutts[p.playerId],
    units: totalUnitsByPlayer[p.playerId],
    breakdown: breakdownByPlayer[p.playerId],
  }));

  return results;
}

// Regulación: ranking manual de "quién queda más cerca de la bandera" en cada hoyo.
// La posición (1 = más cerca) se captura a mano por hoyo/jugador (events.regulation).
// Regulación 1 gana las unidades de todos los demás jugadores (numPlayers - 1).
// Regulación 2 gana las unidades de los jugadores por debajo de él, menos lo que
// pierde frente a regulación 1. Y así sucesivamente en cascada hasta el último lugar.
function createUnitsByHoleAndPlayer(
  players: PlayerRoundData[],
  holeNumbers: number[]
): UnitsByHoleAndPlayer {
  const result: UnitsByHoleAndPlayer = {};

  holeNumbers.forEach((holeNum) => {
    result[holeNum] = {};
    players.forEach((player) => {
      result[holeNum][player.playerId] = 0;
    });
  });

  return result;
}

function calculateRegulationByHole(
  players: PlayerRoundData[],
  courseHoles: CourseHole[],
  holeNumbers: number[]
): UnitsByHoleAndPlayer {
  const regulationByHole = createUnitsByHoleAndPlayer(players, holeNumbers);
  const numPlayers = players.length;

  for (const holeNum of holeNumbers) {
    const courseHole = courseHoles.find((h) => h.holeNumber === holeNum);
    if (!courseHole) continue;

    const ranks = players
      .map((p) => {
        const shot = p.holes[holeNum];
        if (!shot || shot.strokes <= 0) return { playerId: p.playerId, rank: 0 };
        const rank = shot?.events?.regulation ?? 0;
        return { playerId: p.playerId, rank };
      })
      .filter((item) => item.rank > 0);

    // Solo se aplica la regulación si el hoyo tiene un ranking completo y válido
    // (cada jugador de la ronda con una posición distinta entre 1 y numPlayers).
    const uniqueRanks = new Set(ranks.map((r) => r.rank));
    if (ranks.length !== numPlayers || uniqueRanks.size !== numPlayers) continue;

    ranks.forEach(({ playerId, rank }) => {
      const unitsWon = Math.max(0, numPlayers - rank);
      const unitsLost = Math.max(0, rank - 1);
      regulationByHole[holeNum][playerId] = unitsWon - unitsLost;
    });
  }

  return regulationByHole;
}

// Devuelve cuántos golpes de ventaja recibe un jugador en un hoyo dado el índice
// de dificultad del hoyo (1 = más difícil) y la diferencia de handicaps.
// Si la diferencia supera 18, los hoyos más difíciles reciben 2 golpes de ventaja.
function getStrokesOnHole(holeHandicap: number, strokesDiff: number): number {
  if (strokesDiff <= 0) return 0;
  const base = Math.floor(strokesDiff / 18);
  const remainder = strokesDiff % 18;
  return base + (holeHandicap <= remainder ? 1 : 0);
}

// Hoyo: comparación por pares con handicap ajustado.
// Por cada par (A vs B) y cada hoyo: se calcula el score neto de cada jugador
// (strokes - golpes de ventaja recibidos según diferencia de hcp).
// Ganador del hoyo: +1 unidad del otro. Empate: 0. Perdedor: -1.
function calculateHoyoByHole(
  players: PlayerRoundData[],
  courseHoles: CourseHole[],
  holeNumbers: number[]
): UnitsByHoleAndPlayer {
  const hoyoByHole = createUnitsByHoleAndPlayer(players, holeNumbers);

  for (const holeNum of holeNumbers) {
    const courseHole = courseHoles.find((h) => h.holeNumber === holeNum);
    if (!courseHole) continue;

    const holeHandicap = courseHole.handicap;

    // Comparación de cada par de jugadores
    for (let i = 0; i < players.length; i++) {
      for (let j = i + 1; j < players.length; j++) {
        const pA = players[i];
        const pB = players[j];

        const shotA = pA.holes[holeNum];
        const shotB = pB.holes[holeNum];
        if (!shotA || !shotB || shotA.strokes <= 0 || shotB.strokes <= 0) continue;

        const hcpDiff = pB.playingHcp - pA.playingHcp;
        // El jugador con más handicap recibe los golpes de ventaja
        const strokesForA = hcpDiff < 0 ? getStrokesOnHole(holeHandicap, -hcpDiff) : 0;
        const strokesForB = hcpDiff > 0 ? getStrokesOnHole(holeHandicap, hcpDiff) : 0;

        const netA = shotA.strokes - strokesForA;
        const netB = shotB.strokes - strokesForB;

        if (netA < netB) {
          hoyoByHole[holeNum][pA.playerId] += 1;
          hoyoByHole[holeNum][pB.playerId] -= 1;
        } else if (netB < netA) {
          hoyoByHole[holeNum][pB.playerId] += 1;
          hoyoByHole[holeNum][pA.playerId] -= 1;
        }
        // Empate: no se mueven unidades
      }
    }
  }

  return hoyoByHole;
}
