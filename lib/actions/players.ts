"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export type GuestPlayer = {
  id: string;
  name: string;
  handicap: number;
  isGuest: true;
};

export type AuthenticatedPlayer = {
  id: string;
  alias: string;
  hcp?: number;
  isGuest: false;
};

export type PlayerOption = GuestPlayer | AuthenticatedPlayer;

export type RegisteredPlayer = {
  id: string;
  alias: string;
  hcp: number;
};

type SupabaseClientLike = Awaited<ReturnType<typeof createSupabaseServerClient>>;

type PlayerRow = {
  id: string;
  alias?: string | null;
  hcp?: number | null;
  name?: string | null;
  handicap?: number | null;
};

function toError(error: unknown, fallbackMessage: string) {
  if (error instanceof Error) return error;

  if (
    error &&
    typeof error === "object" &&
    "message" in error &&
    typeof (error as { message?: unknown }).message === "string"
  ) {
    return new Error((error as { message: string }).message);
  }

  return new Error(fallbackMessage);
}

function isSchemaMismatchError(error: unknown) {
  if (!error || typeof error !== "object") return false;

  const code = (error as { code?: unknown }).code;
  const message = [
    (error as { message?: unknown }).message,
    (error as { details?: unknown }).details,
  ]
    .filter((value): value is string => typeof value === "string")
    .join(" ")
    .toLowerCase();

  return (
    code === "42703" ||
    code === "42P01" ||
    (message.includes("column") && message.includes("does not exist")) ||
    (message.includes("relation") && message.includes("does not exist")) ||
    message.includes("schema cache")
  );
}

async function requireSessionUser() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();
  if (error) throw toError(error, "No se pudo obtener la sesión");
  const user = data.user;
  if (!user) throw new Error("Usuario no autenticado");
  return { user, supabase };
}

async function listAuthenticatedPlayers(supabase: SupabaseClientLike): Promise<PlayerRow[]> {
  const attempts = [
    { select: "id, alias, hcp" },
    { select: "id, name, handicap" },
    { select: "id, alias" },
    { select: "id, name" },
    { select: "id" },
  ] as const;

  for (const attempt of attempts) {
    const { data, error } = await supabase.from("players").select(attempt.select);

    if (!error) {
      return (data ?? []) as unknown as PlayerRow[];
    }

    if (!isSchemaMismatchError(error)) {
      throw toError(error, "No se pudieron cargar los jugadores.");
    }
  }

  return [];
}

async function listGuestPlayers(supabase: SupabaseClientLike): Promise<PlayerRow[]> {
  const attempts = [
    { select: "id, name, handicap" },
    { select: "id, name" },
    { select: "id" },
  ] as const;

  for (const attempt of attempts) {
    const { data, error } = await supabase.from("guest_players").select(attempt.select);

    if (!error) {
      return (data ?? []) as unknown as PlayerRow[];
    }

    if (!isSchemaMismatchError(error)) {
      throw toError(error, "No se pudieron cargar los invitados.");
    }
  }

  return [];
}

export async function getPlayers(): Promise<PlayerOption[]> {
  const { supabase } = await requireSessionUser();
  const [authenticatedPlayers, guestPlayers] = await Promise.all([
    listAuthenticatedPlayers(supabase),
    listGuestPlayers(supabase),
  ]);

  return [
    ...authenticatedPlayers.map((player) => ({
      id: player.id,
      alias: player.alias ?? player.name ?? "Sin alias",
      hcp: player.hcp ?? player.handicap ?? 0,
      isGuest: false as const,
    })),
    ...guestPlayers.map((player) => ({
      id: player.id,
      name: player.name ?? "Invitado",
      handicap: player.handicap ?? 0,
      isGuest: true as const,
    })),
  ];
}

export async function listRegisteredPlayers(): Promise<RegisteredPlayer[]> {
  const { supabase } = await requireSessionUser();
  const players = await listAuthenticatedPlayers(supabase);

  return players.map((player) => ({
    id: player.id,
    alias: player.alias ?? player.name ?? "Sin alias",
    hcp: player.hcp ?? player.handicap ?? 0,
  }));
}

export async function createPlayer(input: {
  alias: string;
  hcp: number;
}): Promise<RegisteredPlayer> {
  const { supabase, user } = await requireSessionUser();

  const variants = [
    {
      payload: {
        owner_id: user.id,
        alias: input.alias.trim(),
        hcp: input.hcp,
      },
      select: "id, alias, hcp",
    },
    {
      payload: {
        owner_id: user.id,
        name: input.alias.trim(),
        handicap: input.hcp,
      },
      select: "id, name, handicap",
    },
    {
      payload: {
        alias: input.alias.trim(),
        hcp: input.hcp,
      },
      select: "id, alias, hcp",
    },
    {
      payload: {
        owner_id: user.id,
        alias: input.alias.trim(),
      },
      select: "*",
    },
  ] as const;

  for (const variant of variants) {
    const { data, error } = await supabase
      .from("players")
      .insert(variant.payload as Record<string, unknown>)
      .select(variant.select)
      .single();

    if (!error) {
      if (!data) throw new Error("No se pudo crear el jugador");
      const created = data as unknown as Record<string, unknown>;
      return {
        id: created.id as string,
        alias: (created.alias ?? created.name ?? input.alias.trim()) as string,
        hcp: (created.hcp ?? created.handicap ?? input.hcp) as number,
      };
    }

    if (!isSchemaMismatchError(error)) {
      throw toError(error, "No se pudo crear el jugador.");
    }
  }

  throw new Error("No se pudo crear el jugador con el esquema actual de la base de datos.");
}

export async function deletePlayer(playerId: string) {
  const { supabase } = await requireSessionUser();

  const { error } = await supabase.from("players").delete().eq("id", playerId);

  if (error) throw toError(error, "No se pudo eliminar el jugador.");
}

export async function createGuestPlayer(name: string, handicap: number) {
  const { supabase, user } = await requireSessionUser();

  const variants = [
    {
      payload: {
        created_by: user.id,
        name: name.trim(),
        handicap,
      },
      select: "id, name, handicap",
    },
    {
      payload: {
        owner_id: user.id,
        name: name.trim(),
        handicap,
      },
      select: "id, name, handicap",
    },
    {
      payload: {
        name: name.trim(),
        handicap,
      },
      select: "id, name, handicap",
    },
  ] as const;

  for (const variant of variants) {
    const { data, error } = await supabase
      .from("guest_players")
      .insert(variant.payload as Record<string, unknown>)
      .select(variant.select)
      .single();

    if (!error) {
      if (!data) throw new Error("No se pudo crear el invitado");
      const created = data as Record<string, unknown>;
      return {
        id: created.id as string,
        name: (created.name ?? name.trim()) as string,
        handicap: (created.handicap ?? 0) as number,
        isGuest: true,
      };
    }

    if (!isSchemaMismatchError(error)) {
      throw toError(error, "No se pudo crear el invitado.");
    }
  }

  throw new Error("No se pudo crear el invitado con el esquema actual de la base de datos.");
}

export async function deleteGuestPlayer(playerId: string) {
  const { supabase } = await requireSessionUser();

  const { error } = await supabase.from("guest_players").delete().eq("id", playerId);

  if (error) throw toError(error, "No se pudo eliminar el invitado.");
}
