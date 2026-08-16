import { createSupabaseServerClient } from "@/lib/supabase-server";
import { getCourses, HoleDefinition } from "@/lib/actions/courses";
import { calculateRoundUnits, CourseHole, PlayerRoundData } from "@/lib/utils/unitCalculations";
import { applyAutomaticHoleEvents } from "@/lib/utils/holeEvents";

function firstRelationRow<T>(relation: T | T[] | null): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export type PlayerStats = {
  playerId: string;
  playerName: string;
  totalRounds: number;
  totalUnits: number;
  avgUnitsPerRound: number;
  bestRound: number;
  worstRound: number;
  winPercentage: number;
};

export type RoundSummary = {
  roundId: string;
  courseId: string;
  courseName: string;
  roundDate: string;
  playerCount: number;
  holesToPlay: number;
  playerResults: Array<{
    playerId: string;
    playerName: string;
    units: number;
    totalStrokes: number;
  }>;
};

export type DashboardStats = {
  totalRounds: number;
  totalUnitsWon: number;
  totalUnitsLost: number;
  netUnits: number;
  winPercentage: number;
  avgUnitsPerRound: number;
  favoriteOpponent: string | null;
  favoriteOpponentWins: number;
  topCourse: string | null;
  topCourseRounds: number;
  recentRounds: RoundSummary[];
};

export async function getUserDashboardStats(
  userId: string
): Promise<DashboardStats> {
  try {
    const supabase = await createSupabaseServerClient();

    const [coursesData, roundsResult] = await Promise.all([
      getCourses(),
      supabase
        .from("rounds")
        .select("id, course_id, round_date, holes_to_play, starting_hole")
        .eq("owner_id", userId)
        .order("round_date", { ascending: false }),
    ]);

    if (roundsResult.error) throw roundsResult.error;

    const courses = coursesData ?? [];
    const userRounds = roundsResult.data ?? [];

    if (!userRounds.length) {
      return {
        totalRounds: 0,
        totalUnitsWon: 0,
        totalUnitsLost: 0,
        netUnits: 0,
        winPercentage: 0,
        avgUnitsPerRound: 0,
        favoriteOpponent: null,
        favoriteOpponentWins: 0,
        topCourse: null,
        topCourseRounds: 0,
        recentRounds: [],
      };
    }

    const courseCounts: Record<string, number> = {};
    const recentRounds: RoundSummary[] = [];
    let totalUnitsWon = 0;
    let totalUnitsLost = 0;
    let roundsWithWinner = 0;

    const roundsWithDetails = await Promise.all(
      userRounds.map(async (round) => {
        const [roundPlayersResult, holeScoresResult] = await Promise.all([
          supabase
            .from("round_players")
            .select("*, players(alias), guest_players(name)")
            .eq("round_id", round.id),
          supabase.from("hole_scores").select("*").eq("round_id", round.id),
        ]);

        if (roundPlayersResult.error) throw roundPlayersResult.error;
        if (holeScoresResult.error) throw holeScoresResult.error;

        const roundPlayers = roundPlayersResult.data ?? [];
        const holeScores = holeScoresResult.data ?? [];

        const playerDataMap: Record<string, PlayerRoundData> = {};

        roundPlayers.forEach((rp) => {
          const effectiveId = rp.player_id ?? rp.guest_player_id;
          if (!effectiveId) return;

          const playerRow = firstRelationRow(rp.players as { alias: string } | { alias: string }[] | null);
          const guestRow = firstRelationRow(rp.guest_players as { name: string } | { name: string }[] | null);
          const name = rp.player_id ? playerRow?.alias ?? "Sin nombre" : guestRow?.name ?? "Sin nombre";

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
          const par = (courses.find((item) => item.id === round.course_id)?.holes as HoleDefinition[] | undefined)
            ?.find((hole) => hole.holeNumber === hs.hole_number)?.par ?? 4;

          playerDataMap[effectiveId].holes[hs.hole_number] = {
            strokes: hs.strokes,
            putts: hs.putts,
            events: applyAutomaticHoleEvents(par, hs.strokes, hs.putts, {
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
            }),
          };
        });

        const course = courses.find((item) => item.id === round.course_id);
        const courseName = course?.name ?? "Sin campo";
        const courseHoles: CourseHole[] = (course?.holes as HoleDefinition[] | undefined ?? []).map((h) => ({
          holeNumber: h.holeNumber,
          par: h.par,
          handicap: h.handicap,
        }));

        const calculatedResults = calculateRoundUnits(
          Object.values(playerDataMap),
          courseHoles,
          round.holes_to_play,
          round.starting_hole ?? 1
        );

        const topResult = calculatedResults.reduce((best, current) => {
          return current.units > best.units ? current : best;
        }, calculatedResults[0] ?? { units: 0 });

        const bottomResult = calculatedResults.reduce((worst, current) => {
          return current.units < worst.units ? current : worst;
        }, calculatedResults[0] ?? { units: 0 });

        if (calculatedResults.length > 0) {
          courseCounts[courseName] = (courseCounts[courseName] || 0) + 1;
        }

        if (topResult.units > 0) {
          roundsWithWinner += 1;
        }

        totalUnitsWon += topResult.units;
        totalUnitsLost += bottomResult.units;

        return {
          round,
          calculatedResults,
          courseName,
          playerCount: calculatedResults.length,
          topResult,
        };
      })
    );

    roundsWithDetails.forEach(({ round, calculatedResults, courseName, playerCount }) => {
      recentRounds.push({
        roundId: round.id,
        courseId: round.course_id,
        courseName,
        roundDate: round.round_date,
        playerCount,
        holesToPlay: round.holes_to_play,
        playerResults: calculatedResults.map((result) => ({
          playerId: result.playerId,
          playerName: result.alias,
          units: result.units,
          totalStrokes: result.totalStrokes,
        })),
      });
    });

    const topCourse = Object.entries(courseCounts).sort((a, b) => b[1] - a[1])[0];

    return {
      totalRounds: userRounds.length,
      totalUnitsWon,
      totalUnitsLost,
      netUnits: totalUnitsWon + totalUnitsLost,
      winPercentage: userRounds.length > 0 ? (roundsWithWinner / userRounds.length) * 100 : 0,
      avgUnitsPerRound: userRounds.length > 0 ? totalUnitsWon / userRounds.length : 0,
      favoriteOpponent: null,
      favoriteOpponentWins: 0,
      topCourse: topCourse?.[0] || null,
      topCourseRounds: topCourse?.[1] || 0,
      recentRounds: recentRounds.slice(0, 5),
    };
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return {
      totalRounds: 0,
      totalUnitsWon: 0,
      totalUnitsLost: 0,
      netUnits: 0,
      winPercentage: 0,
      avgUnitsPerRound: 0,
      favoriteOpponent: null,
      favoriteOpponentWins: 0,
      topCourse: null,
      topCourseRounds: 0,
      recentRounds: [],
    };
  }
}

export async function getPlayerStats(playerId: string): Promise<PlayerStats | null> {
  try {
    const supabase = await createSupabaseServerClient();

    const { data: player, error: playerError } = await supabase
      .from("players")
      .select("*")
      .eq("id", playerId)
      .single();

    if (playerError) throw playerError;

    const { data: rounds, error: roundsError } = await supabase
      .from("round_players")
      .select(
        `
        round_id,
        rounds (
          id,
          unit_value
        )
      `
      )
      .eq("player_id", playerId);


    if (!rounds || rounds.length === 0) {
      return {
        playerId,
        playerName: player.name,
        totalRounds: 0,
        totalUnits: 0,
        avgUnitsPerRound: 0,
        bestRound: 0,
        worstRound: 0,
        winPercentage: 0,
      };
    }

    return {
      playerId,
      playerName: player.name,
      totalRounds: rounds.length,
      totalUnits: 0,
      avgUnitsPerRound: 0,
      bestRound: 0,
      worstRound: 0,
      winPercentage: 0,
    };
  } catch (error) {
    console.error("Error fetching player stats:", error);
    return null;
  }
}
