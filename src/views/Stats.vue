<script setup lang="ts">
  // ---------------------------------------------------------------------------
  // Imports
  // ---------------------------------------------------------------------------
  import { computed, ref, watch } from "vue";
  import { useHybridData } from "@/composables/useHybridData";
  import type { WorkoutSession } from "@/types/workout";
  import { isCardioExercise, isSetCounted, setReps, setVolume, formatDuration, formatDistance, formatPace } from "@/composables/useSetMetrics";
  import { STRENGTH_MUSCLE_GROUP_NAMES, MUSCLE_GROUP_COLORS } from "@/composables/useTrainingGoals";
  import { averageEffort, cardioRecords, cardioWeeks, collectCardioActivities, formatTotalTime, type CardioActivity } from "@/composables/useCardioActivities";
  import CardioWeeklyChart from "@/components/CardioWeeklyChart.vue";

  // ---------------------------------------------------------------------------
  // Period
  // ---------------------------------------------------------------------------

  const workoutData = useHybridData();
  const isLoading = computed(() => workoutData.isLoading.value);

  const selectedYear = ref<string | number>(new Date().getFullYear());

  const availableYears = computed(() => {
    const years = new Set<number>();
    workoutData.completedSessions.value.forEach((session) => years.add(new Date(session.date).getFullYear()));
    years.add(new Date().getFullYear());
    return [...years].sort((a, b) => b - a);
  });

  const filteredSessions = computed(() => {
    if (selectedYear.value === "all") return workoutData.completedSessions.value;
    const year = Number(selectedYear.value);
    return workoutData.completedSessions.value.filter((s) => new Date(s.date).getFullYear() === year);
  });

  const periodLabel = computed(() => (selectedYear.value === "all" ? "Hele perioden" : String(selectedYear.value)));

  // ---------------------------------------------------------------------------
  // Formatting
  // ---------------------------------------------------------------------------

  const formatNumber = (num: number): string => new Intl.NumberFormat("no-NO").format(Math.round(num));
  const formatDecimal = (num: number): string => num.toLocaleString("no-NO", { maximumFractionDigits: 1 });

  const formatDate = (date: Date): string => new Intl.DateTimeFormat("no-NO", { day: "numeric", month: "short", year: "numeric" }).format(new Date(date));

  const formatEffortAverage = (effort: number | null): string | null => (effort === null ? null : formatDecimal(effort));

  // ---------------------------------------------------------------------------
  // Overview — every session, whatever kind
  // ---------------------------------------------------------------------------

  const totalMinutes = computed(() => filteredSessions.value.reduce((sum, s) => sum + (s.duration || 0), 0));

  /** Sessions per week between the first and the last session of the period. */
  const sessionsPerWeek = computed(() => {
    const sessions = filteredSessions.value;
    if (sessions.length < 2) return sessions.length;
    const times = sessions.map((s) => new Date(s.date).getTime());
    const weeks = Math.max(1, Math.ceil((Math.max(...times) - Math.min(...times)) / (7 * 86_400_000)));
    return sessions.length / weeks;
  });

  const overviewStats = computed(() => {
    const count = filteredSessions.value.length;
    return [
      { label: "Økter", value: formatNumber(count) },
      { label: "Total tid", value: formatTotalTime(totalMinutes.value * 60) },
      { label: "Snitt per økt", value: count > 0 ? formatTotalTime((totalMinutes.value / count) * 60) : "–" },
      { label: "Økter per uke", value: count > 0 ? formatDecimal(Math.round(sessionsPerWeek.value * 10) / 10) : "–" },
    ];
  });

  /** Share of sessions per workout type. */
  const workoutTypeShares = computed(() => {
    const counts = new Map<string, number>();
    filteredSessions.value.forEach((s) => counts.set(s.workoutType, (counts.get(s.workoutType) ?? 0) + 1));
    const total = filteredSessions.value.length || 1;
    return [...counts.entries()]
      .map(([id, count]) => ({ id, name: workoutData.getWorkoutType(id), color: workoutData.getWorkoutTypeColor(id), count, pct: Math.round((count / total) * 100) }))
      .sort((a, b) => b.count - a.count);
  });

  // ---------------------------------------------------------------------------
  // Calendar
  // ---------------------------------------------------------------------------

  const currentMonth = ref(new Date());

  const monthLabel = computed(() => new Intl.DateTimeFormat("no-NO", { month: "long", year: "numeric" }).format(currentMonth.value));

  const canGoPrev = computed(() => selectedYear.value === "all" || currentMonth.value.getMonth() > 0);

  const canGoNext = computed(() => {
    const next = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1);
    if (selectedYear.value !== "all" && next.getFullYear() !== Number(selectedYear.value)) return false;
    return next <= new Date();
  });

  const changeMonth = (delta: number) => {
    if ((delta < 0 && !canGoPrev.value) || (delta > 0 && !canGoNext.value)) return;
    currentMonth.value = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + delta, 1);
  };

  // A past year opens on December, so the end of that year shows first.
  watch(selectedYear, (year) => {
    const now = new Date();
    if (year === "all" || Number(year) === now.getFullYear()) currentMonth.value = now;
    else currentMonth.value = new Date(Number(year), 11, 1);
  });

  const WEEKDAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];

  const hasStrengthWork = (session: WorkoutSession): boolean =>
    session.exercises.some((ex) => !isCardioExercise(ex) && ex.sets.some((set) => isSetCounted(ex, set)));

  /**
   * What each day held. A day with any strength work counts as a strength day;
   * a day with only cardio gets the cardio colour.
   */
  const dayKinds = computed(() => {
    const kinds = new Map<number, "strength" | "cardio">();
    workoutData.completedSessions.value.forEach((session) => {
      const d = new Date(session.date);
      const key = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
      const kind = hasStrengthWork(session) ? "strength" : "cardio";
      if (kinds.get(key) !== "strength") kinds.set(key, kind);
    });
    return kinds;
  });

  type CalendarDay = { key: string; date: Date; inMonth: boolean; kind: "strength" | "cardio" | null; isToday: boolean };

  const calendarWeeks = computed(() => {
    const first = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth(), 1);
    const last = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 0);
    const start = new Date(first);
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7));
    const end = new Date(last);
    end.setDate(last.getDate() + (6 - ((last.getDay() + 6) % 7)));

    const today = new Date();
    const todayKey = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();

    const weeks: CalendarDay[][] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const week: CalendarDay[] = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
        week.push({
          key: `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`,
          date,
          inMonth: date.getMonth() === currentMonth.value.getMonth(),
          kind: dayKinds.value.get(date.getTime()) ?? null,
          isToday: date.getTime() === todayKey,
        });
        cursor.setDate(cursor.getDate() + 1);
      }
      weeks.push(week);
    }
    return weeks;
  });

  /** Training and rest days in the month shown — up to today, for the current month. */
  const monthSummary = computed(() => {
    const today = new Date();
    let training = 0;
    let rest = 0;
    calendarWeeks.value.flat().forEach((day) => {
      if (!day.inMonth || day.date > today) return;
      if (day.kind) training += 1;
      else rest += 1;
    });
    return { training, rest };
  });

  // ---------------------------------------------------------------------------
  // Strength
  // ---------------------------------------------------------------------------

  const strengthTotals = computed(() => {
    let sets = 0;
    let reps = 0;
    let volume = 0;
    let sessions = 0;
    filteredSessions.value.forEach((session) => {
      let had = false;
      session.exercises.forEach((ex) => {
        if (isCardioExercise(ex)) return;
        ex.sets.forEach((set) => {
          if (!isSetCounted(ex, set)) return;
          had = true;
          sets += 1;
          reps += setReps(ex, set);
          volume += setVolume(ex, set);
        });
      });
      if (had) sessions += 1;
    });
    return { sets, reps, volume, sessions };
  });

  const hasStrength = computed(() => strengthTotals.value.sets > 0);

  const strengthStats = computed(() => {
    const t = strengthTotals.value;
    return [
      { label: "Volum", value: formatNumber(t.volume), unit: "kg" },
      { label: "Sett", value: formatNumber(t.sets), unit: "" },
      { label: "Reps", value: formatNumber(t.reps), unit: "" },
      { label: "Snitt per økt", value: t.sessions > 0 ? formatNumber(t.volume / t.sessions) : "–", unit: t.sessions > 0 ? "kg" : "" },
    ];
  });

  /** Share of the period's volume per strength muscle group — untrained groups stay in at 0 %. */
  const muscleGroups = computed(() => {
    const byGroup = new Map<string, number>(STRENGTH_MUSCLE_GROUP_NAMES.map((name) => [name, 0]));
    filteredSessions.value.forEach((session) =>
      session.exercises.forEach((ex) => {
        if (isCardioExercise(ex)) return;
        const group = workoutData.exerciseIndex.value.get(Number(ex.exerciseId))?.category;
        if (!group || !byGroup.has(group)) return;
        const volume = ex.sets.reduce((sum, set) => (isSetCounted(ex, set) ? sum + setVolume(ex, set) : sum), 0);
        byGroup.set(group, (byGroup.get(group) ?? 0) + volume);
      }),
    );
    const total = [...byGroup.values()].reduce((sum, v) => sum + v, 0) || 1;
    return [...byGroup.entries()]
      .map(([name, volume]) => ({ name, color: MUSCLE_GROUP_COLORS[name] ?? "#6b7280", volume, pct: Math.round((volume / total) * 100) }))
      .sort((a, b) => b.volume - a.volume || a.name.localeCompare(b.name, "no"));
  });

  /** Share of reps in each range, strength sets only. */
  const repRanges = computed(() => {
    const reps = { strength: 0, hypertrophy: 0, endurance: 0 };
    filteredSessions.value.forEach((session) =>
      session.exercises.forEach((ex) => {
        if (isCardioExercise(ex)) return;
        ex.sets.forEach((set) => {
          if (!isSetCounted(ex, set)) return;
          const r = Number(set.reps) || 0;
          if (r <= 5) reps.strength += r;
          else if (r <= 12) reps.hypertrophy += r;
          else reps.endurance += r;
        });
      }),
    );
    const total = reps.strength + reps.hypertrophy + reps.endurance || 1;
    const pct = (n: number) => Math.round((n / total) * 100);
    return { strength: pct(reps.strength), hypertrophy: pct(reps.hypertrophy), endurance: pct(reps.endurance) };
  });

  const VOLUME_MILESTONES = [5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];

  const volumeMilestone = computed(() => {
    const current = Math.max(0, Math.round(strengthTotals.value.volume));
    const top = VOLUME_MILESTONES[VOLUME_MILESTONES.length - 1];
    const next = VOLUME_MILESTONES.find((t) => current < t) ?? top;
    const isMax = current >= top;
    return { current, next, isMax, pct: isMax ? 100 : Math.min(100, Math.round((current / next) * 100)) };
  });

  // ---------------------------------------------------------------------------
  // Cardio
  // ---------------------------------------------------------------------------

  /** Cardio totals for the period, set by set — the achievements read these. */
  const cardioStats = computed(() => {
    let seconds = 0;
    let metres = 0;
    let sets = 0;
    let longestDistance = 0;
    let longestDuration = 0;
    /** Fastest pace in seconds per km — lower is better. */
    let bestPaceSecPerKm = Infinity;
    const sessionIds = new Set<string>();

    filteredSessions.value.forEach((session) => {
      session.exercises.forEach((exercise) => {
        if (!isCardioExercise(exercise)) return;
        exercise.sets.forEach((set) => {
          if (!isSetCounted(exercise, set)) return;
          const duration = Number(set.duration) || 0;
          const distance = Number(set.distance) || 0;
          seconds += duration;
          metres += distance;
          sets += 1;
          longestDistance = Math.max(longestDistance, distance);
          longestDuration = Math.max(longestDuration, duration);
          // Only drags long enough for pace to mean anything.
          if (distance >= 1000 && duration > 0) bestPaceSecPerKm = Math.min(bestPaceSecPerKm, (duration / distance) * 1000);
          sessionIds.add(session.id);
        });
      });
    });

    return { hasData: sets > 0, seconds, metres, sets, sessions: sessionIds.size, longestDistance, longestDuration, bestPaceSecPerKm, pace: formatPace(seconds, metres) };
  });

  /** Cardio as activities — one per cardio exercise per session — for the period. */
  const cardioActivities = computed(() => collectCardioActivities(filteredSessions.value));

  /** The chart ends this week, or with the last week of a past year being viewed. */
  const cardioChartEnd = computed(() => {
    if (selectedYear.value === "all") return new Date();
    const year = Number(selectedYear.value);
    return year < new Date().getFullYear() ? new Date(year, 11, 31) : new Date();
  });

  const cardioWeeklyStats = computed(() => cardioWeeks(cardioActivities.value, cardioChartEnd.value, 12));

  const cardioOverview = computed(() => {
    const stats = [
      { label: "Total tid", value: formatTotalTime(cardioStats.value.seconds) },
      { label: "Aktiviteter", value: formatNumber(cardioActivities.value.length) },
    ];
    if (cardioStats.value.metres > 0) stats.push({ label: "Distanse", value: formatDistance(cardioStats.value.metres) });
    const effort = formatEffortAverage(averageEffort(cardioActivities.value));
    if (effort) stats.push({ label: "Snitt anstrengelse", value: `${effort}/10` });
    return stats;
  });

  /** Time per activity type, biggest first — where the cardio actually went. */
  const cardioByActivity = computed(() => {
    const groups = new Map<number, { exerciseId: number; name: string; seconds: number; metres: number; activities: CardioActivity[] }>();
    cardioActivities.value.forEach((activity) => {
      const group = groups.get(activity.exerciseId) ?? {
        exerciseId: activity.exerciseId,
        // Current library name if the exercise still exists, else what was logged.
        name: workoutData.exerciseIndex.value.get(activity.exerciseId)?.name ?? activity.name,
        seconds: 0,
        metres: 0,
        activities: [],
      };
      group.seconds += activity.seconds;
      group.metres += activity.metres;
      group.activities.push(activity);
      groups.set(activity.exerciseId, group);
    });

    const rows = [...groups.values()].sort((a, b) => b.seconds - a.seconds);
    const longest = Math.max(1, ...rows.map((r) => r.seconds));
    return rows.map((row) => ({
      exerciseId: row.exerciseId,
      name: row.name,
      seconds: row.seconds,
      metres: row.metres,
      count: row.activities.length,
      effort: formatEffortAverage(averageEffort(row.activities)),
      share: Math.max(2, Math.round((row.seconds / longest) * 100)),
    }));
  });

  const cardioRecordTiles = computed(() => {
    const records = cardioRecords(cardioActivities.value);
    const tiles: Array<{ label: string; value: string; detail: string }> = [];
    if (records.longest) tiles.push({ label: "Lengste aktivitet", value: formatDuration(records.longest.seconds), detail: `${records.longest.name} · ${formatDate(records.longest.date)}` });
    if (records.farthest) tiles.push({ label: "Lengste distanse", value: formatDistance(records.farthest.metres), detail: `${records.farthest.name} · ${formatDate(records.farthest.date)}` });
    if (records.bestWeek) tiles.push({ label: "Beste uke", value: formatTotalTime(records.bestWeek.seconds), detail: `Uke ${records.bestWeek.weekNumber}` });
    return tiles;
  });

  // ---------------------------------------------------------------------------
  // Achievements
  // ---------------------------------------------------------------------------

  type Achievement = { id: string; icon: string; title: string; description: string; earned: boolean };

  const achievements = computed<Achievement[]>(() => {
    const sessions = filteredSessions.value;
    const totalSessions = sessions.length;
    const { sets: totalSets, reps: totalReps, volume: totalVolume } = strengthTotals.value;

    const uniqueExerciseIds = new Set<number>();
    sessions.forEach((s) => s.exercises.forEach((e) => uniqueExerciseIds.add(e.exerciseId)));

    const oneRmExercises = new Set<number>();
    sessions.forEach((s) =>
      s.exercises.forEach((e) =>
        e.sets.forEach((set) => {
          if (set.isCompleted && set.weight && set.reps === 1) oneRmExercises.add(e.exerciseId);
        }),
      ),
    );

    let morningCount = 0;
    let nightCount = 0;
    sessions.forEach((s) => {
      const h = new Date(s.date).getHours();
      if (h >= 5 && h < 9) morningCount++;
      if (h >= 20 && h <= 23) nightCount++;
    });

    const trainedMonths = new Set<string>();
    sessions.forEach((s) => {
      const d = new Date(s.date);
      trainedMonths.add(`${d.getFullYear()}-${d.getMonth()}`);
    });

    const trained = muscleGroups.value.filter((g) => g.volume > 0);
    const topShare = trained.reduce((m, g) => Math.max(m, g.pct), 0);
    const groupsAbove15 = trained.filter((g) => g.pct >= 15).length;
    const ranges = repRanges.value;

    const all: Achievement[] = [
      { id: "first-workout", icon: "🎬", title: "Første økt", description: "Du fullførte din første økt!", earned: totalSessions >= 1 },
      { id: "workouts-10", icon: "🔟", title: "10 økter", description: "To-sifret antall økter!", earned: totalSessions >= 10 },
      { id: "workouts-50", icon: "🏅", title: "50 økter", description: "Solid mengde arbeid!", earned: totalSessions >= 50 },
      { id: "workouts-100", icon: "🥇", title: "100 økter", description: "Tresifret — imponerende!", earned: totalSessions >= 100 },
      { id: "sets-500", icon: "⚙️", title: "500 sett", description: "Du har fullført 500 sett!", earned: totalSets >= 500 },
      { id: "sets-2000", icon: "⚙️", title: "2000 sett", description: "Maskineri i arbeid!", earned: totalSets >= 2000 },
      { id: "reps-1000", icon: "💪", title: "1000 reps", description: "Fire siffer med reps!", earned: totalReps >= 1000 },
      { id: "reps-5000", icon: "💪", title: "5000 reps", description: "Fem siffer med reps!", earned: totalReps >= 5000 },
      { id: "volume-1m", icon: "🏆", title: "1 000 000 kg totalvolum", description: "En million kilo løftet!", earned: Math.round(totalVolume) >= 1000000 },
      { id: "1rm-first", icon: "🧱", title: "Første 1RM", description: "Du har logget en 1RM-økt (1 rep).", earned: oneRmExercises.size >= 1 },
      { id: "1rm-5-exercises", icon: "🏋️", title: "1RM på 5 øvelser", description: "Bred styrketesting!", earned: oneRmExercises.size >= 5 },
      { id: "variety-10", icon: "🧩", title: "Variasjon 10+", description: "Du har trent 10 forskjellige øvelser.", earned: uniqueExerciseIds.size >= 10 },
      { id: "variety-20", icon: "🧩", title: "Variasjon 20+", description: "Bredt øvelsesutvalg!", earned: uniqueExerciseIds.size >= 20 },
      { id: "balanced-training", icon: "⚖️", title: "Balansert trening", description: "God fordeling mellom muskelgrupper.", earned: trained.length >= 3 && topShare <= 40 && groupsAbove15 >= 3 },
      { id: "power-lifter", icon: "💥", title: "Powerlifter", description: "Logget 1RM på alle 4 hovedøvelser.", earned: oneRmExercises.size >= 4 },
      { id: "volume-king", icon: "👑", title: "Volumkonge", description: "Løftet over 500 000 kg totalt!", earned: Math.round(totalVolume) >= 500000 },
      { id: "endurance-master", icon: "🏃", title: "Utholdenhetsmester", description: "Over 50 % av reps i utholdenhetsområdet.", earned: ranges.endurance >= 50 },
      { id: "strength-focused", icon: "💪", title: "Styrke-fokusert", description: "Over 50 % av reps i styrkeområdet.", earned: ranges.strength >= 50 },
      { id: "hypertrophy-expert", icon: "🎯", title: "Hypertrofi-ekspert", description: "Over 50 % av reps i hypertrofiområdet.", earned: ranges.hypertrophy >= 50 },
      { id: "marathon-session", icon: "⏰", title: "Maratonøkt", description: "En økt som varte over 2 timer.", earned: sessions.some((s) => s.duration >= 120) },
      { id: "quick-session", icon: "⚡", title: "Hurtigøkt", description: "En økt under 30 minutter.", earned: sessions.some((s) => s.duration <= 30) },
      { id: "consistency-champion", icon: "🎖️", title: "Konsistensmester", description: "Trent i 3 forskjellige måneder.", earned: trainedMonths.size >= 3 },
      { id: "morning-trainer", icon: "🌅", title: "Morgenhelt", description: "5 økter før kl 09.", earned: morningCount >= 5 },
      { id: "night-owl", icon: "🌙", title: "Nattugle", description: "5 økter etter kl 20.", earned: nightCount >= 5 },
      { id: "months-6", icon: "🗓️", title: "6 aktive måneder", description: "Halvt år med aktivitet!", earned: trainedMonths.size >= 6 },
      { id: "months-12", icon: "🗓️", title: "12 aktive måneder", description: "Et helt år med trening!", earned: trainedMonths.size >= 12 },
    ];

    // Cardio badges only appear once there's cardio to earn them with — otherwise
    // a pure strength user would stare at a wall of permanently grey running icons.
    const c = cardioStats.value;
    if (c.hasData) {
      const minutes = c.seconds / 60;
      const km = c.metres / 1000;
      all.push(
        { id: "cardio-first", icon: "🏃", title: "Første kondisjonsøkt", description: "Du logget ditt første kondisjonsdrag!", earned: c.sets >= 1 },
        { id: "cardio-10-sessions", icon: "👟", title: "10 kondisjonsøkter", description: "Kondisjon er blitt en vane.", earned: c.sessions >= 10 },
        { id: "cardio-minutes-60", icon: "⏱️", title: "1 time kondisjon", description: "Totalt 60 minutter logget.", earned: minutes >= 60 },
        { id: "cardio-minutes-600", icon: "⏱️", title: "10 timer kondisjon", description: "Totalt 600 minutter logget.", earned: minutes >= 600 },
        { id: "cardio-minutes-3000", icon: "⌛", title: "50 timer kondisjon", description: "Det begynner å bli en del tid på beina.", earned: minutes >= 3000 },
        { id: "cardio-km-10", icon: "📍", title: "10 km totalt", description: "De første ti kilometerne er unnagjort.", earned: km >= 10 },
        { id: "cardio-km-100", icon: "🗺️", title: "100 km totalt", description: "Tresifret distanse!", earned: km >= 100 },
        { id: "cardio-km-500", icon: "🧭", title: "500 km totalt", description: "Oslo–Trondheim på egne bein.", earned: km >= 500 },
        { id: "cardio-long-5k", icon: "🏅", title: "5 km i strekk", description: "Ett enkelt drag på 5 km eller mer.", earned: c.longestDistance >= 5000 },
        { id: "cardio-long-10k", icon: "🥇", title: "10 km i strekk", description: "Ett enkelt drag på 10 km eller mer.", earned: c.longestDistance >= 10000 },
        { id: "cardio-half", icon: "🏔️", title: "Halvmaraton", description: "21,1 km i ett strekk!", earned: c.longestDistance >= 21097 },
        { id: "cardio-marathon", icon: "🎽", title: "Maraton", description: "42,2 km i ett strekk. Respekt.", earned: c.longestDistance >= 42195 },
        { id: "cardio-long-hour", icon: "🕐", title: "Timesøkta", description: "Ett drag på over en time.", earned: c.longestDuration >= 3600 },
        { id: "cardio-pace-6", icon: "💨", title: "Under 6:00 per km", description: "Holdt tempoet på et drag over 1 km.", earned: c.bestPaceSecPerKm <= 360 },
        { id: "cardio-pace-5", icon: "⚡", title: "Under 5:00 per km", description: "Det begynner å gå fort.", earned: c.bestPaceSecPerKm <= 300 },
        { id: "cardio-pace-4", icon: "🚀", title: "Under 4:00 per km", description: "Rått tempo!", earned: c.bestPaceSecPerKm <= 240 },
      );
    }

    return all;
  });

  /** Earned first, in their original order; the rest after. */
  const sortedAchievements = computed(() => [...achievements.value.filter((a) => a.earned), ...achievements.value.filter((a) => !a.earned)]);
  const earnedCount = computed(() => achievements.value.filter((a) => a.earned).length);

  /** How many badges show before "Vis alle". */
  const ACHIEVEMENTS_PREVIEW = 8;
  const showAllAchievements = ref(false);
  const visibleAchievements = computed(() => (showAllAchievements.value ? sortedAchievements.value : sortedAchievements.value.slice(0, ACHIEVEMENTS_PREVIEW)));
</script>

<template>
  <div class="space-y-5 pb-24 md:pb-8">
    <!-- Header -->
    <header class="flex items-center justify-between gap-3">
      <div class="min-w-0">
        <h1 class="st-title">Statistikk</h1>
        <p v-if="!isLoading" class="st-meta">{{ periodLabel }} · {{ filteredSessions.length }} {{ filteredSessions.length === 1 ? "økt" : "økter" }}</p>
      </div>

      <label class="st-select">
        <span class="sr-only">Periode</span>
        <select v-model="selectedYear">
          <option value="all">Hele perioden</option>
          <option v-for="year in availableYears" :key="year" :value="year">{{ year }}</option>
        </select>
        <svg class="st-select__chevron" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </label>
    </header>

    <!-- Loading -->
    <div v-if="isLoading" class="space-y-4 animate-pulse">
      <div class="st-panel h-56"></div>
      <div class="st-panel h-72"></div>
    </div>

    <template v-else>
      <!-- ── Overview: every session ─────────────────────────────────────── -->
      <section class="st-panel">
        <h2 class="st-section-title">Oversikt</h2>
        <dl class="st-stats">
          <div v-for="stat in overviewStats" :key="stat.label" class="st-stat">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>

        <p v-if="filteredSessions.length === 0" class="st-empty">Ingen fullførte økter i perioden.</p>

        <div v-if="workoutTypeShares.length > 0" class="st-divider">
          <h3 class="st-sub-title">Økttyper</h3>
          <div class="st-rows">
            <div v-for="type in workoutTypeShares" :key="type.id" class="st-share">
              <div class="st-share__top">
                <span class="st-dot" :style="{ backgroundColor: type.color }"></span>
                <span class="st-share__name">{{ type.name }}</span>
                <span class="st-share__value">{{ type.count }} <span class="st-share__soft">· {{ type.pct }} %</span></span>
              </div>
              <div class="st-track"><div class="st-fill" :style="{ width: type.pct + '%', backgroundColor: type.color }"></div></div>
            </div>
          </div>
        </div>

        <!-- Calendar -->
        <div class="st-divider">
          <div class="st-cal-head">
            <button type="button" class="st-cal-nav" :disabled="!canGoPrev" aria-label="Forrige måned" @click="changeMonth(-1)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div class="st-cal-title">
              <span class="st-cal-month">{{ monthLabel }}</span>
              <span class="st-cal-sum">{{ monthSummary.training }} treningsdager · {{ monthSummary.rest }} hviledager</span>
            </div>
            <button type="button" class="st-cal-nav" :disabled="!canGoNext" aria-label="Neste måned" @click="changeMonth(1)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          <div class="st-cal-grid st-cal-grid--labels">
            <span v-for="label in WEEKDAY_LABELS" :key="label">{{ label }}</span>
          </div>
          <div class="st-cal-grid">
            <template v-for="(week, wi) in calendarWeeks" :key="wi">
              <span
                v-for="day in week"
                :key="day.key"
                class="st-day"
                :class="{
                  'st-day--out': !day.inMonth,
                  'st-day--strength': day.inMonth && day.kind === 'strength',
                  'st-day--cardio': day.inMonth && day.kind === 'cardio',
                  'st-day--today': day.isToday,
                }">
                {{ day.date.getDate() }}
              </span>
            </template>
          </div>

          <div class="st-legend">
            <span><span class="st-legend__swatch st-day--strength"></span>Styrke</span>
            <span><span class="st-legend__swatch st-day--cardio"></span>Kondisjon</span>
          </div>
        </div>
      </section>

      <!-- ── Strength ───────────────────────────────────────────────────── -->
      <section v-if="hasStrength" class="st-panel">
        <h2 class="st-section-title"><span class="st-dot st-dot--strength"></span>Styrke</h2>
        <dl class="st-stats">
          <div v-for="stat in strengthStats" :key="stat.label" class="st-stat">
            <dt>{{ stat.label }}</dt>
            <dd>
              {{ stat.value }}<span v-if="stat.unit" class="st-stat__unit">{{ stat.unit }}</span>
            </dd>
          </div>
        </dl>

        <div class="st-divider">
          <h3 class="st-sub-title">Muskelgrupper</h3>
          <p class="st-sub-hint">Andel av volumet</p>
          <div class="st-rows">
            <div v-for="group in muscleGroups" :key="group.name" class="st-share" :class="{ 'st-share--muted': group.volume === 0 }">
              <div class="st-share__top">
                <span class="st-dot" :style="{ backgroundColor: group.color }"></span>
                <span class="st-share__name">{{ group.name }}</span>
                <span class="st-share__value">{{ group.pct }} %</span>
              </div>
              <div class="st-track"><div class="st-fill" :style="{ width: group.pct + '%', backgroundColor: group.color }"></div></div>
            </div>
          </div>
        </div>

        <div class="st-divider">
          <h3 class="st-sub-title">Rep-områder</h3>
          <div class="st-ranges">
            <div class="st-range">
              <span class="st-range__value">{{ repRanges.strength }} %</span>
              <span class="st-range__label">Styrke 1–5</span>
            </div>
            <div class="st-range">
              <span class="st-range__value">{{ repRanges.hypertrophy }} %</span>
              <span class="st-range__label">Hypertrofi 6–12</span>
            </div>
            <div class="st-range">
              <span class="st-range__value">{{ repRanges.endurance }} %</span>
              <span class="st-range__label">Utholdenhet 13+</span>
            </div>
          </div>
        </div>

        <div class="st-divider">
          <div class="st-milestone__head">
            <h3 class="st-sub-title">Volummilepæl</h3>
            <span class="st-milestone__value">
              {{ formatNumber(volumeMilestone.current) }}
              <span class="st-share__soft">/ {{ formatNumber(volumeMilestone.next) }} kg</span>
            </span>
          </div>
          <div class="st-track st-track--thick"><div class="st-fill st-fill--strength" :style="{ width: volumeMilestone.pct + '%' }"></div></div>
          <p class="st-sub-hint">{{ volumeMilestone.isMax ? "Du har nådd høyeste milepæl. Rått!" : `${volumeMilestone.pct} % av veien til neste milepæl` }}</p>
        </div>
      </section>

      <!-- ── Cardio ─────────────────────────────────────────────────────── -->
      <section v-if="cardioStats.hasData" class="st-panel">
        <h2 class="st-section-title"><span class="st-dot st-dot--cardio"></span>Kondisjon</h2>
        <dl class="st-stats">
          <div v-for="stat in cardioOverview" :key="stat.label" class="st-stat">
            <dt>{{ stat.label }}</dt>
            <dd>{{ stat.value }}</dd>
          </div>
        </dl>

        <div class="st-divider">
          <CardioWeeklyChart :weeks="cardioWeeklyStats" />
        </div>

        <div class="st-divider">
          <h3 class="st-sub-title">Per aktivitet</h3>
          <div class="st-rows">
            <div v-for="row in cardioByActivity" :key="row.exerciseId" class="st-share">
              <div class="st-share__top">
                <span class="st-share__name">{{ row.name }}</span>
                <span class="st-share__value">
                  {{ formatTotalTime(row.seconds) }}<span v-if="row.metres > 0" class="st-share__soft"> · {{ formatDistance(row.metres) }}</span>
                </span>
              </div>
              <div class="st-track"><div class="st-fill st-fill--cardio" :style="{ width: row.share + '%' }"></div></div>
              <p class="st-share__meta">
                {{ row.count }} {{ row.count === 1 ? "gang" : "ganger" }}<template v-if="row.effort"> · snitt anstrengelse {{ row.effort }}/10</template>
              </p>
            </div>
          </div>
        </div>

        <div v-if="cardioRecordTiles.length > 0" class="st-divider">
          <h3 class="st-sub-title">Rekorder</h3>
          <dl class="st-stats st-stats--records">
            <div v-for="record in cardioRecordTiles" :key="record.label" class="st-stat">
              <dt>{{ record.label }}</dt>
              <dd>{{ record.value }}</dd>
              <p class="st-stat__detail">{{ record.detail }}</p>
            </div>
          </dl>
        </div>
      </section>

      <!-- ── Achievements ───────────────────────────────────────────────── -->
      <section class="st-panel">
        <div class="st-section-head">
          <h2 class="st-section-title">Prestasjoner</h2>
          <span class="st-section-meta">{{ earnedCount }} av {{ achievements.length }}</span>
        </div>

        <ul class="st-badges">
          <li v-for="badge in visibleAchievements" :key="badge.id" class="st-badge" :class="{ 'st-badge--locked': !badge.earned }">
            <span class="st-badge__icon" aria-hidden="true">{{ badge.icon }}</span>
            <span class="st-badge__text">
              <span class="st-badge__title">{{ badge.title }}</span>
              <span class="st-badge__desc">{{ badge.description }}</span>
            </span>
          </li>
        </ul>

        <button v-if="sortedAchievements.length > ACHIEVEMENTS_PREVIEW" type="button" class="st-more" @click="showAllAchievements = !showAllAchievements">
          {{ showAllAchievements ? "Vis færre" : `Vis alle (${sortedAchievements.length})` }}
        </button>
      </section>
    </template>
  </div>
</template>

<style scoped>
  /* ── Header ──────────────────────────────────────────────────────────────── */

  .st-title {
    font-size: 1.5rem;
    font-weight: 700;
    line-height: 1.2;
    color: #fff;
  }

  .st-meta {
    margin-top: 0.25rem;
    font-size: 0.8125rem;
    color: #94a3b8;
  }

  /* A native select dressed as the app's filter button — keeps the OS picker on phones. */
  .st-select {
    position: relative;
    flex-shrink: 0;
  }

  .st-select select {
    min-height: 2.5rem;
    padding: 0 2.25rem 0 0.875rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: #e2e8f0;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.75rem;
    -webkit-appearance: none;
    appearance: none;
    cursor: pointer;
  }

  .st-select select:focus {
    outline: none;
    border-color: #f97316;
    box-shadow: 0 0 0 3px #f9731620;
  }

  .st-select__chevron {
    position: absolute;
    right: 0.75rem;
    top: 50%;
    width: 1rem;
    height: 1rem;
    color: #94a3b8;
    transform: translateY(-50%);
    pointer-events: none;
  }

  /* ── Panels and titles ───────────────────────────────────────────────────── */

  .st-panel {
    padding: 1.125rem;
    background: #111827;
    border: 1px solid #1f2937;
    border-radius: 1rem;
  }

  .st-section-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.5rem;
  }

  .st-section-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #94a3b8;
  }

  .st-section-meta {
    font-size: 0.75rem;
    font-weight: 600;
    color: #94a3b8;
  }

  .st-sub-title {
    font-size: 0.6875rem;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: #64748b;
  }

  .st-sub-hint {
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .st-divider {
    margin-top: 1rem;
    padding-top: 1rem;
    border-top: 1px solid #1f2937;
  }

  .st-empty {
    margin-top: 0.75rem;
    font-size: 0.875rem;
    color: #64748b;
  }

  .st-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    flex-shrink: 0;
  }

  .st-dot--strength {
    background: #f97316;
  }

  .st-dot--cardio {
    background: #06b6d4;
  }

  /* ── Key figures ─────────────────────────────────────────────────────────── */

  .st-stats {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.875rem 1rem;
    margin-top: 0.875rem;
  }

  @media (min-width: 640px) {
    .st-stats {
      grid-template-columns: repeat(4, minmax(0, 1fr));
    }

    .st-stats--records {
      grid-template-columns: repeat(3, minmax(0, 1fr));
    }
  }

  .st-stat dt {
    font-size: 0.6875rem;
    color: #64748b;
  }

  .st-stat dd {
    margin-top: 0.125rem;
    font-size: 1.25rem;
    font-weight: 700;
    line-height: 1.15;
    color: #fff;
    white-space: nowrap;
  }

  .st-stat__unit {
    margin-left: 0.1875rem;
    font-size: 0.8125rem;
    font-weight: 500;
    color: #94a3b8;
  }

  .st-stat__detail {
    margin-top: 0.125rem;
    font-size: 0.6875rem;
    color: #64748b;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  /* ── Share rows with bars ────────────────────────────────────────────────── */

  .st-rows {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-top: 0.625rem;
  }

  .st-share__top {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }

  .st-share__name {
    flex: 1;
    min-width: 0;
    font-size: 0.875rem;
    color: #e2e8f0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .st-share__value {
    font-size: 0.8125rem;
    font-weight: 600;
    color: #e2e8f0;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  .st-share__soft {
    font-weight: 500;
    color: #64748b;
  }

  .st-share__meta {
    margin-top: 0.25rem;
    font-size: 0.6875rem;
    color: #64748b;
  }

  /* Untrained groups stay in the list, dimmed — a gap is worth seeing. */
  .st-share--muted .st-share__name,
  .st-share--muted .st-share__value {
    color: #64748b;
  }

  .st-share--muted .st-dot {
    opacity: 0.45;
  }

  .st-track {
    height: 0.3125rem;
    margin-top: 0.3125rem;
    background: #0d1117;
    border-radius: 2px 4px 4px 2px;
    overflow: hidden;
  }

  .st-track--thick {
    height: 0.5rem;
    margin-top: 0.5rem;
  }

  /* Square at the start, 4px-rounded at the data end. */
  .st-fill {
    height: 100%;
    border-radius: 0 4px 4px 0;
  }

  .st-fill--strength {
    background: #f97316;
  }

  .st-fill--cardio {
    background: #06b6d4;
  }

  /* ── Rep ranges and milestone ────────────────────────────────────────────── */

  .st-ranges {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
    margin-top: 0.625rem;
  }

  .st-range {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .st-range__value {
    font-size: 1.125rem;
    font-weight: 700;
    color: #fff;
    white-space: nowrap;
  }

  .st-range__label {
    font-size: 0.6875rem;
    line-height: 1.3;
    color: #64748b;
  }

  .st-milestone__head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .st-milestone__value {
    font-size: 0.875rem;
    font-weight: 700;
    color: #fff;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }

  /* ── Calendar ────────────────────────────────────────────────────────────── */

  .st-cal-head {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .st-cal-title {
    flex: 1;
    min-width: 0;
    text-align: center;
  }

  .st-cal-month {
    display: block;
    font-size: 0.9375rem;
    font-weight: 600;
    color: #f1f5f9;
    text-transform: capitalize;
  }

  .st-cal-sum {
    display: block;
    margin-top: 0.125rem;
    font-size: 0.75rem;
    color: #64748b;
  }

  .st-cal-nav {
    flex-shrink: 0;
    width: 2.5rem;
    height: 2.5rem;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #94a3b8;
    background: #1e293b;
    border: 1px solid #334155;
    border-radius: 0.75rem;
    cursor: pointer;
  }

  .st-cal-nav:disabled {
    color: #475569;
    cursor: not-allowed;
  }

  .st-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    gap: 0.25rem;
    margin-top: 0.375rem;
  }

  .st-cal-grid--labels {
    margin-top: 0.875rem;
    font-size: 0.625rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #64748b;
    text-align: center;
  }

  .st-day {
    aspect-ratio: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.75rem;
    font-weight: 500;
    color: #64748b;
    background: #0d1117;
    border-radius: 0.5rem;
    font-variant-numeric: tabular-nums;
  }

  .st-day--out {
    background: transparent;
    color: #334155;
  }

  .st-day--strength {
    color: #fff;
    font-weight: 700;
    background: #f97316;
  }

  .st-day--cardio {
    color: #fff;
    font-weight: 700;
    background: #06b6d4;
  }

  .st-day--today {
    box-shadow: inset 0 0 0 2px #f1f5f9;
  }

  .st-legend {
    display: flex;
    gap: 1rem;
    margin-top: 0.75rem;
    font-size: 0.75rem;
    color: #94a3b8;
  }

  .st-legend > span {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
  }

  .st-legend__swatch {
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 0.25rem;
  }

  /* ── Achievements ────────────────────────────────────────────────────────── */

  .st-badges {
    display: grid;
    gap: 0.25rem 1rem;
    margin-top: 0.75rem;
  }

  @media (min-width: 640px) {
    .st-badges {
      grid-template-columns: repeat(2, minmax(0, 1fr));
    }
  }

  .st-badge {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.5rem 0;
  }

  .st-badge__icon {
    flex-shrink: 0;
    width: 2rem;
    font-size: 1.375rem;
    line-height: 1;
    text-align: center;
  }

  .st-badge__text {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .st-badge__title {
    font-size: 0.875rem;
    font-weight: 600;
    color: #f1f5f9;
  }

  .st-badge__desc {
    font-size: 0.75rem;
    color: #64748b;
  }

  /* Not yet earned: still readable as a goal, clearly not a trophy. */
  .st-badge--locked .st-badge__icon {
    filter: grayscale(1);
    opacity: 0.4;
  }

  .st-badge--locked .st-badge__title {
    color: #64748b;
  }

  .st-more {
    min-height: auto;
    margin-top: 0.5rem;
    padding: 0.25rem 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: #f97316;
    cursor: pointer;
  }
</style>
