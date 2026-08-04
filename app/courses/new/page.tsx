"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCourse, HoleDefinition } from "@/lib/actions/courses";

const initialHoles: HoleDefinition[] = Array.from({ length: 18 }, (_, index) => ({
  holeNumber: index + 1,
  par: 4,
  handicap: index + 1,
}));

export default function NewCoursePage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("México");
  const [state, setState] = useState("");
  const [city, setCity] = useState("");
  const [slopeRating, setSlopeRating] = useState<string>("");
  const [courseRating, setCourseRating] = useState<string>("");
  const [holes, setHoles] = useState<HoleDefinition[]>(initialHoles);
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const updateHole = (index: number, field: keyof HoleDefinition, value: number) => {
    setHoles((current) =>
      current.map((hole, holeIndex) =>
        holeIndex === index ? { ...hole, [field]: value } : hole
      )
    );
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Ingresa el nombre del campo.");
      return;
    }

    if (holes.length !== 18) {
      setError("El campo debe contener exactamente 18 hoyos.");
      return;
    }

    const handicapValues = holes.map((hole) => hole.handicap);
    const uniqueHandicapValues = new Set(handicapValues);

    if (uniqueHandicapValues.size !== 18) {
      setError("Cada hoyo debe tener una ventaja única entre 1 y 18.");
      return;
    }

    if (holes.some((hole) => hole.par < 3 || hole.par > 5)) {
      setError("El par de cada hoyo debe ser 3, 4 o 5.");
      return;
    }

    if (holes.some((hole) => hole.handicap < 1 || hole.handicap > 18)) {
      setError("La ventaja de cada hoyo debe estar entre 1 y 18.");
      return;
    }

    try {
      setIsSaving(true);
      await createCourse({
        name: name.trim(),
        country: country.trim() || undefined,
        state: state.trim() || undefined,
        city: city.trim() || undefined,
        slope_rating: slopeRating ? Number(slopeRating) : undefined,
        course_rating: courseRating ? Number(courseRating) : undefined,
        holes,
      });
      window.alert("Campo creado correctamente");
      router.push("/courses");
      router.refresh();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Ocurrió un error al crear el campo.";
      setError(message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="flex-1 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <section className="rounded-[2rem] border border-slate-200 bg-white/90 p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80">
          <h1 className="text-3xl font-semibold text-slate-900 dark:text-slate-100">Nuevo Campo</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            Registra un campo con la información completa de los 18 hoyos.
          </p>
        </section>

        <form
          className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-950/80"
          onSubmit={handleSubmit}
        >
          {error ? (
            <div className="rounded-md bg-red-100 px-4 py-3 text-red-800 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          ) : null}

          {/* Nombre */}
          <div>
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Nombre del campo <span className="text-red-500">*</span>
              </span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                placeholder="Ej. Club de Golf Altozano"
              />
            </label>
          </div>

          {/* Ubicación */}
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">País</span>
              <input
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                placeholder="México"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Estado</span>
              <input
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                placeholder="Michoacán"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">Ciudad</span>
              <input
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                placeholder="Morelia"
              />
            </label>
          </div>

          {/* Ratings */}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Course Rating
              </span>
              <input
                type="number"
                min={60}
                max={80}
                step={0.1}
                value={courseRating}
                onChange={(e) => setCourseRating(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                placeholder="72.4"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">
                Slope Rating
              </span>
              <input
                type="number"
                min={55}
                max={155}
                value={slopeRating}
                onChange={(e) => setSlopeRating(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-700 bg-slate-950 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition focus:border-emerald-500 focus:bg-slate-900 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                placeholder="128"
              />
            </label>
          </div>

          {/* Hoyos */}
          <div className="overflow-x-auto rounded-3xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-950/80">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
                  Configuración de los hoyos
                </h2>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Completa los 18 hoyos con par y ventaja única del 1 al 18.
                </p>
              </div>
              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                18 hoyos obligatorios
              </div>
            </div>

            <table className="min-w-full border-collapse text-left text-sm text-slate-700 dark:text-slate-200">
              <thead>
                <tr>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium dark:border-slate-700">Hoyo</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium dark:border-slate-700">Par</th>
                  <th className="border-b border-slate-200 px-3 py-2 font-medium dark:border-slate-700">Ventaja (HCP)</th>
                </tr>
              </thead>
              <tbody>
                {holes.map((hole, index) => (
                  <tr
                    key={hole.holeNumber}
                    className="border-b border-slate-200 last:border-b-0 dark:border-slate-800"
                  >
                    <td className="px-3 py-3 font-medium text-slate-900 dark:text-slate-100">
                      {hole.holeNumber}
                    </td>
                    <td className="px-3 py-3">
                      <select
                        value={hole.par}
                        onChange={(e) => updateHole(index, "par", Number(e.target.value))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      >
                        <option value={3}>3</option>
                        <option value={4}>4</option>
                        <option value={5}>5</option>
                      </select>
                    </td>
                    <td className="px-3 py-3">
                      <input
                        type="number"
                        min={1}
                        max={18}
                        value={hole.handicap}
                        onChange={(e) => updateHole(index, "handicap", Number(e.target.value))}
                        className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-3 py-2 text-white outline-none focus:border-emerald-500 dark:border-slate-600 dark:bg-slate-950 dark:text-white"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            type="submit"
            disabled={isSaving}
            className="inline-flex w-full items-center justify-center rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
          >
            {isSaving ? "Guardando campo..." : "Guardar campo"}
          </button>
        </form>
      </div>
    </main>
  );
}
