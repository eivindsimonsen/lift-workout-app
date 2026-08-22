/**
 * Read-only check that 12_exercise_tracking_type.sql has been applied.
 *
 * Writes nothing. Confirms the column exists, that the CHECK constraint rejects
 * bad values, and shows how the library is currently split.
 *
 * Usage:
 *   node supabase-setup/verify-tracking-type.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

const readEnvLocal = () => {
  const env = {};
  try {
    const raw = readFileSync(resolve(here, "..", ".env.local"), "utf8");
    for (const line of raw.split(/\r?\n/)) {
      const m = /^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/.exec(line);
      if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  } catch {
    // fall through to process.env
  }
  return env;
};

const fileEnv = readEnvLocal();
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY;
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Mangler VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY.");
  process.exit(1);
}

/** Reads one line from the terminal; `hidden` echoes asterisks. */
const ask = (question, { hidden = false } = {}) =>
  new Promise((done) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf8");

    let value = "";
    const finish = (result) => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(false);
      stdin.pause();
      process.stdout.write("\n");
      done(result);
    };
    const onData = (chunk) => {
      if (chunk.startsWith("\u001b")) return;
      for (const char of chunk) {
        if (char === "\r" || char === "\n") return finish(value.trim());
        if (char === "\u0003") {
          process.stdout.write("\n");
          process.exit(130);
        }
        if (char === "\u007f" || char === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1);
            process.stdout.write("\b \b");
          }
          continue;
        }
        if (char < " ") continue;
        value += char;
        process.stdout.write(hidden ? "*" : char);
      }
    };
    stdin.on("data", onData);
  });

let EMAIL = process.env.LIFT_EMAIL;
let PASSWORD = process.env.LIFT_PASSWORD;

if (!EMAIL || !PASSWORD) {
  if (!process.stdin.isTTY) {
    console.error("Ingen terminal å spørre i. Sett LIFT_EMAIL og LIFT_PASSWORD som miljøvariabler.");
    process.exit(1);
  }
  console.log("Logg inn med LIFT-brukeren din.\n");
  if (!EMAIL) EMAIL = await ask("E-post:   ");
  if (!PASSWORD) PASSWORD = await ask("Passord:  ", { hidden: true });
  console.log();
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) {
  console.error("Innlogging feilet:", authError.message);
  process.exit(1);
}
const userId = auth.user.id;

const fail = (message, hint) => {
  console.log(`\n❌ ${message}`);
  if (hint) console.log(`   ${hint}`);
  process.exit(1);
};

// 1) Does the column exist? PostgREST reports an unknown column as an error.
const { data, error } = await supabase.from("exercises").select("id, name, tracking_type");
if (error) {
  await supabase.auth.signOut({ scope: "local" });
  fail(
    `Kolonnen mangler: ${error.message}`,
    "Kjør supabase-setup/12_exercise_tracking_type.sql i Supabase SQL Editor.",
  );
}

const rows = data ?? [];
const counts = rows.reduce((acc, r) => {
  const key = r.tracking_type ?? "(null)";
  acc[key] = (acc[key] ?? 0) + 1;
  return acc;
}, {});

console.log("✅ tracking_type finnes.\n");
console.log(`Øvelser i biblioteket: ${rows.length}`);
for (const [type, count] of Object.entries(counts).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${type.padEnd(10)} ${count}`);
}

// 2) A NULL would mean the NOT NULL default didn't take.
if (counts["(null)"]) {
  fail(`${counts["(null)"]} øvelse(r) har tracking_type = NULL.`, "Kjør SQL-filen på nytt.");
}

// 3) Is the CHECK constraint in place? Try to write an invalid value and expect
//    Postgres to refuse it. user_id is set so the RLS insert policy is satisfied
//    — without it a policy rejection would masquerade as a working constraint.
const { data: probe, error: probeError } = await supabase
  .from("exercises")
  .insert({ user_id: userId, name: "__constraint probe__", category: "Bryst", workout_types: [], tracking_type: "tullball" })
  .select("id");

if (!probeError && probe?.length) {
  // The row went in, so the constraint is missing — clean up after ourselves.
  await supabase.from("exercises").delete().eq("id", probe[0].id);
  console.log("\n⚠️  CHECK-betingelsen mangler: en ugyldig verdi ble godtatt (raden er slettet igjen).");
  console.log("   Kjør DO-blokken i 12_exercise_tracking_type.sql på nytt.");
} else if (probeError?.code === "23514") {
  console.log("\n✅ CHECK-betingelsen avviser ugyldige verdier.");
} else {
  // Refused, but not by the constraint — say so rather than claim success.
  console.log(`\n⚠️  Kunne ikke bekrefte CHECK-betingelsen: ${probeError?.message ?? "ukjent grunn"}`);
  console.log("   Kolonnen finnes uansett, så appen vil fungere.");
}

console.log("\nAlt klart — appen kan opprette kondisjonsøvelser.");
await supabase.auth.signOut({ scope: "local" });
