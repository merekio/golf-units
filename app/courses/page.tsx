import Link from "next/link";
import { getCourses } from "@/lib/actions/courses";
import DeleteCourseButton from "@/app/components/DeleteCourseButton";

export default async function CoursesPage() {
  let courses: Awaited<ReturnType<typeof getCourses>> = [];
  let loadError = "";

  try {
    courses = (await getCourses()) ?? [];
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : "Error cargando campos";
  }

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex flex-col gap-4 rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm shadow-slate-200/40 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80 dark:shadow-slate-950/40 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Campos</h1>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              Encuentra y administra los campos disponibles para tus rondas.
            </p>
          </div>
          <Link
            href="/courses/new"
            className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700"
          >
            Nuevo campo
          </Link>
        </div>

        {loadError ? (
          <div className="rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {loadError}
          </div>
        ) : null}

        <div className="grid gap-4">
          {courses.length ? (
            courses.map((course) => (
              <div
                key={course.id}
                className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-300">
                      Campo
                    </p>
                    <h2 className="mt-3 text-xl font-semibold text-slate-900 dark:text-slate-100">
                      {course.name}
                    </h2>
                    {course.city || course.state || course.country ? (
                      <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
                        {[course.city, course.state, course.country].filter(Boolean).join(", ")}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap gap-3">
                      {course.holes ? (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          {course.holes.length} hoyos
                        </span>
                      ) : null}
                      {course.course_rating ? (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          CR: {course.course_rating}
                        </span>
                      ) : null}
                      {course.slope_rating ? (
                        <span className="text-sm text-slate-500 dark:text-slate-400">
                          Slope: {course.slope_rating}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 sm:flex-col sm:items-end">
                    <Link
                      href={`/courses/${course.id}/edit`}
                      className="inline-flex items-center justify-center rounded-full border border-emerald-300 px-4 py-2 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 dark:border-emerald-800/50 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
                    >
                      Editar
                    </Link>
                    <DeleteCourseButton courseId={course.id} courseName={course.name} />
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="rounded-[1.75rem] border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
              No hay campos registrados todavía.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
