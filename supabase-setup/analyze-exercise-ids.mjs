/**
 * Read-only diagnostic: how many logged sessions reference exercise ids that no
 * longer exist in the exercise library, and how many of those can be recovered
 * by matching on the exercise name the session recorded.
 *
 * Writes nothing. Produces exercise-id-migration-plan.json next to this file,
 * which the migration step consumes.
 *
 * Usage:
 *   node supabase-setup/analyze-exercise-ids.mjs
 *
 * Prompts for your login. Set LIFT_EMAIL / LIFT_PASSWORD instead if you need to
 * run it non-interactively — but prefer the prompt, so the password stays out of
 * your shell history.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));

// --- Config -----------------------------------------------------------------

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
  console.error("Mangler VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (.env.local eller miljøvariabler).");
  process.exit(1);
}

/**
 * Reads one line from the terminal.
 *
 * Uses raw mode rather than readline: readline pauses stdin on close, so a
 * second prompt would never receive input. `hidden` echoes asterisks instead of
 * the characters — visible feedback matters, otherwise a silent prompt looks
 * like the script has hung.
 */
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
      // Arrow keys and friends arrive as an escape sequence; without this the
      // printable tail ("[A") would be typed into the answer.
      if (chunk.startsWith("\u001b")) return;

      for (const char of chunk) {
        if (char === "\r" || char === "\n") return finish(value.trim());

        if (char === "\u0003") {
          // Ctrl+C
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

        // Ignore control characters (arrow keys arrive as escape sequences).
        if (char < " ") continue;

        value += char;
        process.stdout.write(hidden ? "*" : char);
      }
    };

    stdin.on("data", onData);
  });

// Row Level Security means the anon key alone sees nothing — we have to sign in
// as you to read your own sessions.
let EMAIL = process.env.LIFT_EMAIL;
let PASSWORD = process.env.LIFT_PASSWORD;

if (!EMAIL || !PASSWORD) {
  if (!process.stdin.isTTY) {
    console.error("Ingen terminal å spørre i. Sett LIFT_EMAIL og LIFT_PASSWORD som miljøvariabler.");
    process.exit(1);
  }
  console.log("Logg inn med LIFT-brukeren din (passordet vises ikke og lagres ingen steder).\n");
  if (!EMAIL) EMAIL = await ask("E-post:   ");
  if (!PASSWORD) PASSWORD = await ask("Passord:  ", { hidden: true });
  console.log();
}

if (!EMAIL || !PASSWORD) {
  console.error("Trenger både e-post og passord.");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const norm = (s) => String(s ?? "").trim().toLowerCase();

// --- Load -------------------------------------------------------------------

const { data: auth, error: authError } = await supabase.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });
if (authError) {
  console.error("Innlogging feilet:", authError.message);
  process.exit(1);
}
const userId = auth.user.id;
console.log(`Innlogget som ${auth.user.email}\n`);

const { data: exercises, error: exError } = await supabase
  .from("exercises")
  .select("id, name, category, exercise_variants ( id, name )");
if (exError) {
  console.error("Kunne ikke laste øvelser:", exError.message);
  process.exit(1);
}

/** Every valid id in the library, plus name → id (flagging ambiguous names). */
const validIds = new Set();
const byName = new Map();
const nameCollisions = new Set();

const indexName = (name, id, label) => {
  const key = norm(name);
  if (!key) return;
  if (byName.has(key) && byName.get(key).id !== id) {
    nameCollisions.add(key);
    return;
  }
  byName.set(key, { id, label });
};

for (const ex of exercises ?? []) {
  validIds.add(Number(ex.id));
  indexName(ex.name, Number(ex.id), ex.name);
  for (const v of ex.exercise_variants ?? []) {
    validIds.add(Number(v.id));
    indexName(v.name, Number(v.id), `${ex.name} → ${v.name}`);
  }
}

// Sessions can exceed the default 1000-row cap, so page through them.
const sessions = [];
const PAGE = 500;
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, date, template_name, exercises")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error("Kunne ikke laste økter:", error.message);
    process.exit(1);
  }
  sessions.push(...(data ?? []));
  if (!data || data.length < PAGE) break;
}

// --- Classify ---------------------------------------------------------------

const stats = { ok: 0, fixable: 0, orphan: 0, ambiguous: 0 };
const fixableByPair = new Map(); // "oldId|name" → { oldId, name, newId, label, occurrences, sets }
const orphans = new Map(); // "oldId|name" → { oldId, name, occurrences, sets }
const plan = []; // one entry per session needing a rewrite

const countSets = (ex) => (Array.isArray(ex.sets) ? ex.sets.length : 0);

for (const session of sessions) {
  const list = Array.isArray(session.exercises) ? session.exercises : [];
  const rewrites = [];

  list.forEach((ex, idx) => {
    const rawId = ex?.exerciseId;
    const numId = Number(rawId);
    const key = `${String(rawId)}|${norm(ex?.name)}`;

    if (Number.isFinite(numId) && validIds.has(numId)) {
      stats.ok += 1;
      return;
    }

    const nameKey = norm(ex?.name);
    if (nameCollisions.has(nameKey)) {
      stats.ambiguous += 1;
      const rec = orphans.get(key) ?? { oldId: rawId, name: ex?.name, occurrences: 0, sets: 0, reason: "flertydig navn" };
      rec.occurrences += 1;
      rec.sets += countSets(ex);
      orphans.set(key, rec);
      return;
    }

    const match = byName.get(nameKey);
    if (match) {
      stats.fixable += 1;
      const rec = fixableByPair.get(key) ?? { oldId: rawId, name: ex?.name, newId: match.id, label: match.label, occurrences: 0, sets: 0 };
      rec.occurrences += 1;
      rec.sets += countSets(ex);
      fixableByPair.set(key, rec);
      rewrites.push({ index: idx, from: rawId, to: match.id, name: ex?.name });
      return;
    }

    stats.orphan += 1;
    const rec = orphans.get(key) ?? { oldId: rawId, name: ex?.name, occurrences: 0, sets: 0, reason: "ingen treff på navn" };
    rec.occurrences += 1;
    rec.sets += countSets(ex);
    orphans.set(key, rec);
  });

  if (rewrites.length > 0) {
    plan.push({ sessionId: session.id, date: session.date, templateName: session.template_name, rewrites });
  }
}

// --- Report -----------------------------------------------------------------

const line = (n = 74) => console.log("─".repeat(n));

console.log(`Økter: ${sessions.length}`);
console.log(`Øvelser i biblioteket: ${validIds.size} (inkl. varianter)\n`);

line();
console.log("ØVELSESOPPFØRINGER I ØKTER");
line();
console.log(`  Gyldig ID i dag           ${stats.ok}`);
console.log(`  Kan rettes via navn       ${stats.fixable}`);
console.log(`  Flertydig navn            ${stats.ambiguous}`);
console.log(`  Ingen treff               ${stats.orphan}`);
console.log(`  Økter som må skrives om   ${plan.length}\n`);

if (fixableByPair.size > 0) {
  line();
  console.log("KAN RETTES  (gammel ID → ny ID)");
  line();
  for (const r of [...fixableByPair.values()].sort((a, b) => b.occurrences - a.occurrences)) {
    console.log(`  ${String(r.oldId).padEnd(28)} → ${String(r.newId).padEnd(6)} ${r.label}`);
    console.log(`  ${"".padEnd(28)}   ${r.occurrences} forekomst(er), ${r.sets} sett\n`);
  }
}

if (orphans.size > 0) {
  line();
  console.log("KREVER MANUELL AVGJØRELSE");
  line();
  for (const r of [...orphans.values()].sort((a, b) => b.occurrences - a.occurrences)) {
    console.log(`  ID: ${String(r.oldId)}`);
    console.log(`  Navn i økta: "${r.name ?? ""}"  (${r.reason})`);
    console.log(`  ${r.occurrences} forekomst(er), ${r.sets} sett\n`);
  }
}

if (nameCollisions.size > 0) {
  line();
  console.log(`ADVARSEL: ${nameCollisions.size} øvelsesnavn finnes flere ganger i biblioteket.`);
  console.log("Disse kan ikke matches trygt på navn: " + [...nameCollisions].join(", "));
  line();
  console.log();
}

const planPath = resolve(here, "exercise-id-migration-plan.json");
writeFileSync(planPath, JSON.stringify({ generatedFor: userId, sessions: plan }, null, 2), "utf8");
console.log(`Migreringsplan skrevet til:\n  ${planPath}`);
console.log("\nIngenting er endret i databasen.");

// Local scope only: the default global sign-out revokes every refresh token
// for this user, which would log the browser session out too.
await supabase.auth.signOut({ scope: "local" });
