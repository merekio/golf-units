"use server";

import { createSupabaseServerClient } from "@/lib/supabase-server";

export type HoleDefinition = {
 holeNumber: number;
 par: number;
 handicap: number;
};

export type CourseRecord = {
 id: string;
 name: string;
 country?: string | null;
 state?: string | null;
 city?: string | null;
 slope_rating?: number | null;
 course_rating?: number | null;
 active?: boolean;
 holes?: HoleDefinition[] | null;
 created_at?: string;
};

type SupabaseClientLike = Awaited<ReturnType<typeof createSupabaseServerClient>>;

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
   message.includes("column") && message.includes("does not exist") ||
   message.includes("relation") && message.includes("does not exist") ||
   message.includes("schema cache")
 );
}

function normalizeCourse(course: Record<string, unknown>): CourseRecord {
 return {
   id: String(course.id ?? ""),
   name: String(course.name ?? ""),
   country: typeof course.country === "string" ? course.country : null,
   state: typeof course.state === "string" ? course.state : null,
   city: typeof course.city === "string" ? course.city : null,
   slope_rating:
     typeof course.slope_rating === "number"
       ? course.slope_rating
       : typeof course.slope_rating === "string"
         ? Number(course.slope_rating)
         : null,
   course_rating:
     typeof course.course_rating === "number"
       ? course.course_rating
       : typeof course.course_rating === "string"
         ? Number(course.course_rating)
         : null,
   active: typeof course.active === "boolean" ? course.active : true,
   holes: Array.isArray(course.holes) ? (course.holes as HoleDefinition[]) : undefined,
   created_at: typeof course.created_at === "string" ? course.created_at : undefined,
 };
}

async function requireSessionUser() {
 const supabase = await createSupabaseServerClient();
 const { data, error } = await supabase.auth.getUser();

 if (error) throw toError(error, "No se pudo obtener la sesión.");

 const user = data.user;
 if (!user) throw new Error("Debes iniciar sesión para gestionar campos.");

 return { user, supabase };
}

async function fetchCoursesWithFallback(supabase: SupabaseClientLike): Promise<Record<string, unknown>[]> {
 const attempts = [
   {
     select: "id, name, country, state, city, slope_rating, course_rating, active, holes, created_at",
   },
   {
     select: "id, name, country, state, city, slope_rating, course_rating, active, created_at",
   },
   {
     select: "id, name, country, state, city, slope_rating, course_rating, created_at",
   },
 ] as const;

 for (const attempt of attempts) {
   const { data, error } = await supabase.from("courses").select(attempt.select).order("name");

   if (!error) {
     const rows = (data ?? []) as unknown as Record<string, unknown>[];
     return rows.filter((course) => (course as { active?: boolean }).active !== false);
   }

   if (!isSchemaMismatchError(error)) {
     throw toError(error, "No se pudieron cargar los campos.");
   }
 }

 return [];
}

export async function getCourses(): Promise<CourseRecord[]> {
 const { supabase } = await requireSessionUser();
 const data = await fetchCoursesWithFallback(supabase);

 return data.map(normalizeCourse);
}

export async function getCourse(courseId: string): Promise<CourseRecord> {
 const { supabase } = await requireSessionUser();

 const attempts = [
   "id, name, country, state, city, slope_rating, course_rating, active, holes, created_at",
   "id, name, country, state, city, slope_rating, course_rating, active, created_at",
   "id, name, country, state, city, slope_rating, course_rating, created_at",
 ] as const;

 for (const select of attempts) {
   const { data, error } = await supabase
     .from("courses")
     .select(select)
     .eq("id", courseId)
     .maybeSingle();

   if (!error) {
     if (!data) throw new Error("No se encontró el campo.");
     return normalizeCourse(data as unknown as Record<string, unknown>);
   }

   if (!isSchemaMismatchError(error)) {
     throw toError(error, "No se pudo cargar el campo.");
   }
 }

 throw new Error("No se pudo cargar el campo con el esquema actual de la base de datos.");
}

export async function createCourse(input: {
 name: string;
 country?: string;
 state?: string;
 city?: string;
 slope_rating?: number;
 course_rating?: number;
 holes: HoleDefinition[];
}): Promise<CourseRecord> {
 const { user, supabase } = await requireSessionUser();

 const variants = [
   {
     payload: {
       owner_id: user.id,
       name: input.name,
       country: input.country || null,
       state: input.state || null,
       city: input.city || null,
       slope_rating: input.slope_rating ?? null,
       course_rating: input.course_rating ?? null,
       holes: input.holes,
       active: true,
     },
     select: "id, name, country, state, city, slope_rating, course_rating, active, holes, created_at",
   },
   {
     payload: {
       name: input.name,
       country: input.country || null,
       state: input.state || null,
       city: input.city || null,
       slope_rating: input.slope_rating ?? null,
       course_rating: input.course_rating ?? null,
       holes: input.holes,
       active: true,
     },
     select: "id, name, country, state, city, slope_rating, course_rating, active, holes, created_at",
   },
   {
     payload: {
       owner_id: user.id,
       name: input.name,
       country: input.country || null,
       state: input.state || null,
       city: input.city || null,
       slope_rating: input.slope_rating ?? null,
       course_rating: input.course_rating ?? null,
       active: true,
     },
     select: "id, name, country, state, city, slope_rating, course_rating, active, created_at",
   },
   {
     payload: {
       name: input.name,
       country: input.country || null,
       state: input.state || null,
       city: input.city || null,
       slope_rating: input.slope_rating ?? null,
       course_rating: input.course_rating ?? null,
       active: true,
     },
     select: "id, name, country, state, city, slope_rating, course_rating, active, created_at",
   },
   {
     payload: {
       owner_id: user.id,
       name: input.name,
       country: input.country || null,
       state: input.state || null,
       city: input.city || null,
       slope_rating: input.slope_rating ?? null,
       course_rating: input.course_rating ?? null,
     },
     select: "id, name, country, state, city, slope_rating, course_rating, created_at",
   },
   {
     payload: {
       name: input.name,
       country: input.country || null,
       state: input.state || null,
       city: input.city || null,
       slope_rating: input.slope_rating ?? null,
       course_rating: input.course_rating ?? null,
     },
     select: "id, name, country, state, city, slope_rating, course_rating, created_at",
   },
 ] as const;

 for (const variant of variants) {
   const { data, error } = await supabase
     .from("courses")
     .insert(variant.payload)
     .select(variant.select)
     .single();

   if (!error) {
     if (!data) throw new Error("No se pudo crear el campo");
     return normalizeCourse(data as unknown as Record<string, unknown>);
   }

   if (!isSchemaMismatchError(error)) {
     throw toError(error, "No se pudo crear el campo.");
   }
 }

 throw new Error("No se pudo crear el campo con el esquema actual de la base de datos.");
}

export async function updateCourse(
  courseId: string,
  input: {
    name: string;
    country?: string;
    state?: string;
    city?: string;
    slope_rating?: number;
    course_rating?: number;
    holes: HoleDefinition[];
  }
): Promise<CourseRecord> {
  const { supabase } = await requireSessionUser();

  const variants = [
    {
      payload: {
        name: input.name,
        country: input.country || null,
        state: input.state || null,
        city: input.city || null,
        slope_rating: input.slope_rating ?? null,
        course_rating: input.course_rating ?? null,
        holes: input.holes,
      },
      select: "id, name, country, state, city, slope_rating, course_rating, active, holes, created_at",
    },
    {
      payload: {
        name: input.name,
        country: input.country || null,
        state: input.state || null,
        city: input.city || null,
        slope_rating: input.slope_rating ?? null,
        course_rating: input.course_rating ?? null,
      },
      select: "id, name, country, state, city, slope_rating, course_rating, active, created_at",
    },
    {
      payload: {
        name: input.name,
        country: input.country || null,
        state: input.state || null,
        city: input.city || null,
        slope_rating: input.slope_rating ?? null,
        course_rating: input.course_rating ?? null,
      },
      select: "id, name, country, state, city, slope_rating, course_rating, created_at",
    },
  ] as const;

  for (const variant of variants) {
    const { data, error } = await supabase
      .from("courses")
      .update(variant.payload)
      .eq("id", courseId)
      .select(variant.select)
      .maybeSingle();

    if (!error) {
      if (!data) throw new Error("No se pudo actualizar el campo.");
      return normalizeCourse(data as unknown as Record<string, unknown>);
    }

    if (!isSchemaMismatchError(error)) {
      throw toError(error, "No se pudo actualizar el campo.");
    }
  }

  throw new Error("No se pudo actualizar el campo con el esquema actual de la base de datos.");
}

export async function deleteCourse(courseId: string) {
 const { supabase } = await requireSessionUser();

 const { error } = await supabase.from("courses").delete().eq("id", courseId);

 if (error) {
   throw toError(error, "No se pudo eliminar el campo.");
 }
}
