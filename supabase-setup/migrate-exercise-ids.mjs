/**
 * Rewrites stale exerciseId values inside workout_sessions.exercises to the ids
 * the exercise library uses today, matching on the exercise name the session
 * recorded.
 *
 * Dry run by default — prints what it would change and writes nothing.
 * Pass --apply to actually write. A full backup of every affected session is
 * written to disk before the first update either way.
 *
 * Usage:
 *   node supabase-setup/migrate-exercise-ids.mjs            # dry run
 *   node supabase-setup/migrate-exercise-ids.mjs --apply    # write
 *
 * The plan is recomputed live on every run; the JSON from analyze-exercise-ids
 * is not trusted, so a stale file can never drive an update.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const APPLY = process.argv.includes("--apply");

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
  console.log(APPLY ? "MIGRERING — endringer VIL bli skrevet.\n" : "TØRRKJØRING — ingenting skrives.\n");
  console.log("Logg inn med LIFT-brukeren din.\n");
  if (!EMAIL) EMAIL = await ask("E-post:   ");
  if (!PASSWORD) PASSWORD = await ask("Passord:  ", { hidden: true });
  console.log();
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
  .select("id, name, exercise_variants ( id, name )");
if (exError) {
  console.error("Kunne ikke laste øvelser:", exError.message);
  process.exit(1);
}

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

const allSessions = [];
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
  allSessions.push(...(data ?? []));
  if (!data || data.length < PAGE) break;
}

// --- Build the rewrite plan -------------------------------------------------

const pending = []; // { session, nextExercises, changes: [{ from, to, name }] }
const unresolved = new Map();
let okCount = 0;

for (const session of allSessions) {
  const list = Array.isArray(session.exercises) ? session.exercises : [];
  const changes = [];

  // Rebuild the array, touching only exerciseId so every other field — sets,
  // names, order, ids — comes through byte-identical.
  const nextExercises = list.map((ex) => {
    const numId = Number(ex?.exerciseId);
    if (Number.isFinite(numId) && validIds.has(numId)) {
      okCount += 1;
      return ex;
    }

    const nameKey = norm(ex?.name);
    const match = nameCollisions.has(nameKey) ? null : byName.get(nameKey);

    if (!match) {
      const key = `${String(ex?.exerciseId)}|${nameKey}`;
      const rec = unresolved.get(key) ?? {
        oldId: ex?.exerciseId,
        name: ex?.name,
        reason: nameCollisions.has(nameKey) ? "flertydig navn" : "ingen treff på navn",
        count: 0,
      };
      rec.count += 1;
      unresolved.set(key, rec);
      return ex;
    }

    changes.push({ from: ex.exerciseId, to: match.id, name: ex.name });
    return { ...ex, exerciseId: match.id };
  });

  if (changes.length > 0) pending.push({ session, nextExercises, changes });
}

// --- Safety: prove nothing but exerciseId moved -----------------------------

/** Serialises an exercise with exerciseId blanked, so everything else must match. */
const withoutId = (ex) => JSON.stringify({ ...ex, exerciseId: null });

const violations = [];
for (const p of pending) {
  const before = Array.isArray(p.session.exercises) ? p.session.exercises : [];
  const after = p.nextExercises;

  if (before.length !== after.length) {
    violations.push(`${p.session.id}: antall øvelser endret (${before.length} → ${after.length})`);
    continue;
  }
  for (let i = 0; i < before.length; i += 1) {
    if (withoutId(before[i]) !== withoutId(after[i])) {
      violations.push(`${p.session.id}: øvelse ${i} endret mer enn exerciseId`);
    }
    const changed = before[i]?.exerciseId !== after[i]?.exerciseId;
    if (changed && !validIds.has(Number(after[i]?.exerciseId))) {
      violations.push(`${p.session.id}: øvelse ${i} skulle fått en ID som ikke finnes (${after[i]?.exerciseId})`);
    }
  }
}

if (violations.length > 0) {
  console.error("AVBRUTT — omskrivingen ville endret mer enn exerciseId:\n");
  for (const v of violations.slice(0, 20)) console.error(`  ${v}`);
  if (violations.length > 20) console.error(`  … og ${violations.length - 20} til`);
  console.error("\nIngenting er skrevet.");
  await supabase.auth.signOut({ scope: "local" });
  process.exit(1);
}

// --- Report -----------------------------------------------------------------

const line = (n = 60) => console.log("─".repeat(n));

const mappings = new Map();
let entryCount = 0;
for (const p of pending) {
  for (const c of p.changes) {
    entryCount += 1;
    const key = `${c.from}|${c.to}`;
    const rec = mappings.get(key) ?? { from: c.from, to: c.to, name: c.name, count: 0 };
    rec.count += 1;
    mappings.set(key, rec);
  }
}

console.log(`Økter totalt              ${allSessions.length}`);
console.log(`Oppføringer med gyldig ID ${okCount}`);
console.log(`Oppføringer som endres    ${entryCount}`);
console.log(`Økter som endres          ${pending.length}`);
console.log(`Kan ikke løses            ${[...unresolved.values()].reduce((s, r) => s + r.count, 0)}\n`);

if (mappings.size > 0) {
  line();
  console.log("GAMMEL ID → NY ID");
  line();
  for (const m of [...mappings.values()].sort((a, b) => b.count - a.count)) {
    console.log(`  ${String(m.from).padStart(5)} → ${String(m.to).padStart(5)}  ${String(m.count).padStart(3)}×  ${m.name}`);
  }
  console.log();
}

if (unresolved.size > 0) {
  line();
  console.log("BLIR STÅENDE UENDRET");
  line();
  for (const r of [...unresolved.values()].sort((a, b) => b.count - a.count)) {
    console.log(`  ID ${String(r.oldId)} — "${r.name ?? ""}" (${r.reason}), ${r.count}×`);
  }
  console.log();
}

if (pending.length === 0) {
  console.log("Ingenting å migrere.");
  await supabase.auth.signOut({ scope: "local" });
  process.exit(0);
}

// --- Backup -----------------------------------------------------------------

const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const backupPath = resolve(here, `backup-workout-sessions-${stamp}.json`);
writeFileSync(
  backupPath,
  JSON.stringify({ userId, takenAt: new Date().toISOString(), sessions: pending.map((p) => p.session) }, null, 2),
  "utf8",
);
console.log(`Backup av de ${pending.length} berørte øktene:\n  ${backupPath}\n`);

if (!APPLY) {
  line();
  console.log("TØRRKJØRING — ingenting er endret.");
  console.log("Kjør med --apply for å skrive endringene.");
  line();
  await supabase.auth.signOut({ scope: "local" });
  process.exit(0);
}

// --- Apply ------------------------------------------------------------------

const confirm = process.stdin.isTTY ? await ask(`Skriv ${entryCount} endringer til ${pending.length} økter? Skriv JA for å bekrefte: `) : "JA";
if (confirm !== "JA") {
  console.log("Avbrutt. Ingenting er endret.");
  await supabase.auth.signOut({ scope: "local" });
  process.exit(0);
}
console.log();

let done = 0;
const failed = [];

for (const p of pending) {
  // Bumping updated_at matters: the app syncs sessions by `updated_at > lastSync`,
  // so without it the migrated rows would never reach the cached client.
  const { error } = await supabase
    .from("workout_sessions")
    .update({ exercises: p.nextExercises, updated_at: new Date().toISOString() })
    .eq("id", p.session.id);

  if (error) {
    failed.push({ id: p.session.id, message: error.message });
    console.log(`  FEIL  ${p.session.id}  ${error.message}`);
  } else {
    done += 1;
    if (done % 20 === 0 || done === pending.length) console.log(`  ${done}/${pending.length} økter oppdatert`);
  }
}

console.log();

// --- Verify -----------------------------------------------------------------

console.log("Verifiserer mot databasen…");

const verifySessions = [];
for (let from = 0; ; from += PAGE) {
  const { data, error } = await supabase
    .from("workout_sessions")
    .select("id, exercises")
    .eq("user_id", userId)
    .order("date", { ascending: true })
    .range(from, from + PAGE - 1);
  if (error) {
    console.error("Kunne ikke verifisere:", error.message);
    break;
  }
  verifySessions.push(...(data ?? []));
  if (!data || data.length < PAGE) break;
}

let stillStale = 0;
for (const s of verifySessions) {
  for (const ex of Array.isArray(s.exercises) ? s.exercises : []) {
    const numId = Number(ex?.exerciseId);
    if (Number.isFinite(numId) && validIds.has(numId)) continue;
    const nameKey = norm(ex?.name);
    if (!nameCollisions.has(nameKey) && byName.get(nameKey)) stillStale += 1;
  }
}

line();
console.log(`Oppdaterte økter    ${done}`);
console.log(`Feilet              ${failed.length}`);
console.log(`Gjenstående som burde vært rettet: ${stillStale}`);
line();

if (failed.length > 0) {
  console.log("\nDisse feilet:");
  for (const f of failed) console.log(`  ${f.id}  ${f.message}`);
}

if (stillStale === 0 && failed.length === 0) {
  console.log("\nFerdig. Åpne appen og dra ned for å synkronisere, eller logg ut og inn.");
} else {
  console.log(`\nBackup ligger i:\n  ${backupPath}`);
}

// Local scope only: the default global sign-out revokes every refresh token
// for this user, which would log the browser session out too.
await supabase.auth.signOut({ scope: "local" });
