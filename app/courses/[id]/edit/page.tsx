import { getCourse } from "@/lib/actions/courses";
import EditCourseForm from "./EditCourseForm";

export default async function EditCoursePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  let course;
  let loadError = "";

  try {
    course = await getCourse(id);
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : "Error cargando el campo.";
  }

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Editar Campo</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Actualiza el nombre, ubicación, ratings y la información de los 18 hoyos.
          </p>
        </section>

        {loadError ? (
          <div className="rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
            {loadError}
          </div>
        ) : null}

        {course ? <EditCourseForm course={course} /> : null}
      </div>
    </main>
  );
}
