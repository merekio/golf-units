"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, Suspense, useEffect } from "react";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const errorParam = searchParams.get("error");
  const descriptionParam = searchParams.get("description");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(
    descriptionParam || errorParam || ""
  );

  useEffect(() => {
    // Si llega un hash con access_token (implicit flow), procesarlo
    const hash = window.location.hash;
    if (hash && hash.includes("access_token")) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get("access_token");
      const refreshToken = params.get("refresh_token");
      if (accessToken && refreshToken) {
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          .then(({ error }) => {
            if (!error) router.replace("/dashboard");
          });
        return;
      }
    }

    // Verificar sesión existente al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.replace("/dashboard");
    });

    // Escuchar cambios de estado auth
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) router.replace("/dashboard");
    });
    return () => listener.subscription.unsubscribe();
  }, [router]);

  const loginGoogle = async () => {
    try {
      setLoading(true);
      setError("");

      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) {
        setError(authError.message || "Error al iniciar sesión con Google");
        console.error("Auth error:", authError);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error desconocido al iniciar sesión";
      setError(message);
      console.error("Login error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 dark:bg-slate-950">
      <div className="w-full max-w-md rounded-[2rem] border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/50 dark:border-slate-800 dark:bg-slate-950 dark:shadow-slate-950/40">
        <div className="mb-6 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-700 dark:text-emerald-300">Golf Units</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-900 dark:text-slate-100">Bienvenido</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">Inicia sesión con Google para gestionar tus rondas y campos.</p>
        </div>

        {error && (
          <div className="mb-4 rounded-lg bg-red-100 px-4 py-3 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-300">
            <p className="font-medium">Error de autenticación</p>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        )}

        <button
          onClick={loginGoogle}
          disabled={loading}
          className="w-full rounded-full bg-emerald-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-400"
        >
          {loading ? "Conectando..." : "Entrar con Google"}
        </button>

        <p className="mt-4 text-center text-xs text-slate-500 dark:text-slate-400">
          Esta app requiere autenticación con Google. Asegúrate de tener una cuenta de Google.
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 dark:bg-slate-950">
        <div className="text-slate-600 dark:text-slate-400">Cargando...</div>
      </main>
    }>
      <LoginContent />
    </Suspense>
  );
}
