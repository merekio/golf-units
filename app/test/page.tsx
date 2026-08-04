import { supabase } from "@/lib/supabase";

export default async function TestPage() {

  const { data, error } =
    await supabase
      .from("players")
      .select("*")
      .limit(1);

  return (
    <main className="p-10">

      <h1 className="text-2xl font-bold">
        Prueba Supabase
      </h1>

      <pre>
        {JSON.stringify(
          {
            data,
            error
          },
          null,
          2
        )}
      </pre>

    </main>
  );
}