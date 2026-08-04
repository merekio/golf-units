"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useState } from "react";

const navItems = [
  { href: "/dashboard", label: "Inicio" },
  { href: "/players", label: "Jugadores" },
  { href: "/courses", label: "Campos" },
  { href: "/rounds", label: "Rondas" },
  { href: "/rounds/new", label: "Nueva ronda" },
];

export default function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const hideNav = pathname.startsWith("/login") || pathname.startsWith("/auth");

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      await supabase.auth.signOut();
      router.push("/login");
    } catch (error) {
      console.error("Error cerrando sesión:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-sm dark:border-slate-800 dark:bg-slate-950/95">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-600 text-lg font-semibold text-white shadow">G</span>
          <div>
            <p className="text-base font-semibold text-slate-900 dark:text-slate-100">Golf Units</p>
            <p className="text-sm text-slate-500 dark:text-slate-400">Tu app de golf móvil</p>
          </div>
        </div>

        {!hideNav ? (
          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full border px-4 py-2 text-sm font-medium transition ${isActive ? "border-emerald-600 bg-emerald-600 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900"}`}
                >
                  {item.label}
                </Link>
              );
            })}
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="ml-2 rounded-full border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 dark:border-red-800/50 dark:bg-red-950/20 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              {isLoggingOut ? "Cerrando..." : "Cerrar sesión"}
            </button>
          </nav>
        ) : null}
      </div>
    </header>
  );
}
