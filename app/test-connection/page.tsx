import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default async function TestConnection() {

  const { data, error } = await supabase
    .from("players")
    .select("*")
    .limit(1);

  return (
    <div>
      <h1>Conexión Supabase</h1>

      <pre>
        {JSON.stringify(
          { data, error },
          null,
          2
        )}
      </pre>
    </div>
  );
}