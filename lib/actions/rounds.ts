"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";
import { applyAutomaticHoleEvents } from "@/lib/utils/holeEvents";

export type HoleEventFlags = {
  eagle: boolean;
  birdie: boolean;
  banderas: number;
  regulation: number;
  hoyo: number;
  sandPar: boolean;
  holeOut: boolean;
  espanol: boolean;
  triputt: boolean;
  pinkis: boolean;
  salidaGreen: boolean;
};

export type HoleShotData = {
  strokes: number;
  putts: number;
  events: HoleEventFlags;
};

type RoundPlayerInput = {
  playerId: string;
  playingHcp: number;
  isGuest: boolean;
};

type CreateRoundInput = {
  courseId: string;
  roundDate: string;
  holesToPlay: number;
  startingHole: number;
  unitValue: number;
  players: RoundPlayerInput[];
};

export type RoundWithHoles = CreateRoundInput & {
  roundId: string;
  holes: Record<number, Record<string, HoleShotData>>;
};

export type RoundListItem = {
  id: string;
  course_id: string | null;
  round_date: string;
  holes_to_play: number;
  unit_value: number;
  created_at: string;
  courseName: string;
};

export async function getRounds(): Promise<RoundListItem[]> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("No autenticado");

  const { data, error } = await supabase
    .from("rounds")
    .select("id, course_id, round_date, holes_to_play, unit_value, created_at, courses(name)")
    .eq("owner_id", user.id)
    .order("round_date", { ascending: false });

  if (error) throw error;

  return (data ?? []).map((r) => ({
    id: r.id,
    course_id: r.course_id,
    round_date: r.round_date,
    holes_to_play: r.holes_to_play,
    unit_value: r.unit_value,
    created_at: r.created_at,
    courseName: firstRelationRow(r.courses)?.name ?? "Campo sin nombre",
  }));
}

export type RoundDetailData = {
  round: {
    id: string;
    course_id: string | null;
    round_date: string;
    holes_to_play: number;
    starting_hole: number | null;
    unit_value: number;
  };
  holeScores: Array<{
    hole_number: number;
    player_id: string | null;
    guest_player_id: string | null;
    strokes: number;
    putts: number;
    banderas_count: number | null;
    regulation_rank: number | null;
    birdie: boolean | null;
    eagle: boolean | null;
    sand_par: boolean | null;
    hole_out: boolean | null;
    pinkis: boolean | null;
    salida_green: boolean | null;
    spanish: boolean | null;
  }>;
  roundPlayers: Array<{
    player_id: string | null;
    guest_player_id: string | null;
    playing_hcp: number | null;
    players: { alias: string } | null;
    guest_players: { name: string } | null;
  }>;
  courseHoles: Array<{ holeNumber: number; par: number; handicap: number }>;
};

function firstRelationRow<T>(relation: T | T[] | null): T | null {
  if (!relation) return null;
  return Array.isArray(relation) ? relation[0] ?? null : relation;
}

export async function getRoundDetail(roundId: string): Promise<RoundDetailData> {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) throw new Error("No autenticado");

  const [roundResult, holeScoresResult, roundPlayersResult] = await Promise.all([
    supabase.from("rounds").select("id, course_id, round_date, holes_to_play, starting_hole, unit_value").eq("id", roundId).single(),
    supabase.from("hole_scores").select("hole_number, player_id, guest_player_id, strokes, putts, banderas_count, regulation_rank, birdie, eagle, sand_par, hole_out, pinkis, salida_green, spanish").eq("round_id", roundId),
    supabase.from("round_players").select("player_id, guest_player_id, playing_hcp, players(alias), guest_players(name)").eq("round_id", roundId),
  ]);

  if (roundResult.error) throw roundResult.error;
  if (holeScoresResult.error) throw holeScoresResult.error;
  if (roundPlayersResult.error) throw roundPlayersResult.error;

  const round = roundResult.data;

  // Get course holes
  let courseHoles: Array<{ holeNumber: number; par: number; handicap: number }> = [];
  if (round.course_id) {
    const { data: courseData } = await supabase
      .from("courses")
      .select("holes")
      .eq("id", round.course_id)
      .single();

    const holes = courseData?.holes as Array<{ holeNumber: number; par: number; handicap: number }> | null;
    courseHoles = holes ?? [];
  }

  return {
    round,
    holeScores: holeScoresResult.data ?? [],
    roundPlayers: (roundPlayersResult.data ?? []).map((rp) => ({
      player_id: rp.player_id,
      guest_player_id: rp.guest_player_id,
      playing_hcp: rp.playing_hcp,
      players: firstRelationRow(rp.players),
      guest_players: firstRelationRow(rp.guest_players),
    })),
    courseHoles,
  };
}

export async function createRound({
  courseId,
  roundDate,
  holesToPlay,
  startingHole,
  unitValue,
  players,
}: CreateRoundInput) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("No autenticado");

  const { data: round, error: roundError } = await supabase
    .from("rounds")
    .insert({
      owner_id: user.id,
      course_id: courseId,
      round_date: roundDate,
      holes_to_play: holesToPlay,
      starting_hole: startingHole,
      unit_value: unitValue,
    })
    .select()
    .single();

  if (roundError) throw roundError;

  const roundPlayers = players.map((p) => ({
    round_id: round.id,
    player_id: p.isGuest ? null : p.playerId,
    guest_player_id: p.isGuest ? p.playerId : null,
    playing_hcp: p.playingHcp,
  }));

  const { error: playersError } = await supabase
    .from("round_players")
    .insert(roundPlayers);

  if (playersError) throw playersError;

  return round;
}

export async function saveRoundHoles(
  roundId: string,
  holes: Record<number, Record<string, HoleShotData>>,
  playerGuestMap?: Record<string, boolean>,
  courseHoles?: Array<{ holeNumber: number; par: number; handicap: number }>
) {
  const supabase = await createSupabaseServerClient();
  const holeScoresData: Record<string, unknown>[] = [];
  const parByHole = new Map((courseHoles ?? []).map((hole) => [hole.holeNumber, hole.par]));

  Object.entries(holes).forEach(([holeNumber, playerData]) => {
    Object.entries(playerData).forEach(([playerId, shotData]) => {
      const isGuest = playerGuestMap?.[playerId] ?? false;
      const parsedHoleNumber = Number(holeNumber);
      const normalizedEvents = applyAutomaticHoleEvents(
        parByHole.get(parsedHoleNumber) ?? 4,
        shotData.strokes,
        shotData.putts,
        shotData.events
      );

      holeScoresData.push({
        round_id: roundId,
        hole_number: parsedHoleNumber,
        player_id: isGuest ? null : playerId,
        guest_player_id: isGuest ? playerId : null,
        strokes: shotData.strokes,
        putts: shotData.putts,
        banderas_count: normalizedEvents.banderas,
        regulation_rank: normalizedEvents.regulation || null,
        hit_green_regulation: normalizedEvents.regulation > 0,
        birdie: normalizedEvents.birdie,
        eagle: normalizedEvents.eagle,
        sand_par: normalizedEvents.sandPar,
        hole_out: normalizedEvents.holeOut,
        pinkis: normalizedEvents.pinkis,
        salida_green: normalizedEvents.salidaGreen,
        bunker_shot: false,
        spanish: normalizedEvents.espanol,
      });
    });
  });

  if (holeScoresData.length === 0) return;

  const { error } = await supabase.from("hole_scores").insert(holeScoresData);
  if (error) throw error;
}

export async function deleteRound(roundId: string) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError) throw authError;
  if (!user) throw new Error("No autenticado");

  const { error } = await supabase.from("rounds").delete().eq("id", roundId);

  if (error) throw error;
}
