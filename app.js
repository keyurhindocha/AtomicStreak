const LOOKBACK_DAYS = 28;

const habitForm = document.getElementById("habitForm");
const habitNameInput = document.getElementById("habitName");
const habitIdentityInput = document.getElementById("habitIdentity");
const addHabitBtn = document.getElementById("addHabitBtn");
const habitList = document.getElementById("habitList");
const summaryPanel = document.getElementById("summaryPanel");
const statusPanel = document.getElementById("statusPanel");
const template = document.getElementById("habitTemplate");
const todayLabel = document.getElementById("todayLabel");

const state = {
  habits: [],
  supabase: null,
  userId: null,
  loading: false,
};

function todayKey(date = new Date()) {
  return localDayKey(date);
}

function localDayKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(value) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function setStatus(message, type = "info") {
  statusPanel.className = `panel status-panel status-${type}`;
  statusPanel.textContent = message;
}

function setLoading(loading) {
  state.loading = loading;
  addHabitBtn.disabled = loading || !state.userId;
  habitNameInput.disabled = loading || !state.userId;
  habitIdentityInput.disabled = loading || !state.userId;
}

function createSupabaseClient() {
  const config = window.SUPABASE_CONFIG;
  if (!config || !config.url || !config.anonKey || config.url.includes("YOUR_PROJECT_REF")) {
    throw new Error("Missing Supabase config. Copy supabase-config.example.js to supabase-config.local.js and fill your project URL + anon key.");
  }

  return window.supabase.createClient(config.url, config.anonKey);
}

async function ensureAuth() {
  const { data: sessionData, error: sessionError } = await state.supabase.auth.getSession();
  if (sessionError) throw sessionError;

  if (sessionData.session?.user?.id) {
    state.userId = sessionData.session.user.id;
    return;
  }

  const { data: authData, error: authError } = await state.supabase.auth.signInAnonymously();
  if (authError) throw authError;

  state.userId = authData.user.id;
}

function completedDays(habit) {
  return Object.keys(habit.days).filter((day) => habit.days[day]);
}

function streaks(habit) {
  const days = completedDays(habit).sort();
  let longest = 0;
  let current = 0;
  let chain = 0;
  let previousDate = null;

  for (const day of days) {
    const date = new Date(`${day}T00:00:00`);
    if (!previousDate) {
      chain = 1;
    } else {
      const diff = Math.round((date - previousDate) / (1000 * 60 * 60 * 24));
      chain = diff === 1 ? chain + 1 : 1;
    }
    if (chain > longest) longest = chain;
    previousDate = date;
  }

  const today = new Date(`${todayKey()}T00:00:00`);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (!days.length) {
    current = 0;
  } else {
    const last = new Date(`${days[days.length - 1]}T00:00:00`);
    const isLive = last.getTime() === today.getTime() || last.getTime() === yesterday.getTime();

    if (isLive) {
      current = 1;
      let pointer = new Date(last);
      for (let i = days.length - 2; i >= 0; i -= 1) {
        const candidate = new Date(`${days[i]}T00:00:00`);
        const diff = Math.round((pointer - candidate) / (1000 * 60 * 60 * 24));
        if (diff === 1) {
          current += 1;
          pointer = candidate;
        } else {
          break;
        }
      }
    }
  }

  return { current, longest };
}

function completionRate(habit) {
  const days = completedDays(habit);
  const created = new Date(habit.createdAt);
  const totalDays = Math.max(1, Math.ceil((Date.now() - created) / (1000 * 60 * 60 * 24)) + 1);
  return Math.round((days.length / totalDays) * 100);
}

async function loadHabitsFromSupabase() {
  const { data: habitsData, error: habitsError } = await state.supabase
    .from("habits")
    .select("id, name, identity, created_at")
    .eq("user_id", state.userId)
    .order("created_at", { ascending: false });

  if (habitsError) throw habitsError;

  const habitIds = habitsData.map((habit) => habit.id);
  let checkins = [];

  if (habitIds.length) {
    const { data: checkinData, error: checkinsError } = await state.supabase
      .from("habit_checkins")
      .select("habit_id, done_on")
      .eq("user_id", state.userId)
      .in("habit_id", habitIds);

    if (checkinsError) throw checkinsError;
    checkins = checkinData;
  }

  const daysByHabit = new Map();
  for (const row of checkins) {
    if (!daysByHabit.has(row.habit_id)) {
      daysByHabit.set(row.habit_id, {});
    }
    daysByHabit.get(row.habit_id)[row.done_on] = true;
  }

  state.habits = habitsData.map((habit) => ({
    id: habit.id,
    name: habit.name,
    identity: habit.identity || "",
    createdAt: new Date(habit.created_at).getTime(),
    days: daysByHabit.get(habit.id) || {},
  }));
}

async function createHabit(name, identity) {
  const payload = {
    user_id: state.userId,
    name: name.trim(),
    identity: identity.trim() || null,
  };

  const { data, error } = await state.supabase
    .from("habits")
    .insert(payload)
    .select("id, name, identity, created_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    name: data.name,
    identity: data.identity || "",
    createdAt: new Date(data.created_at).getTime(),
    days: {},
  };
}

async function toggleToday(habitId) {
  const key = todayKey();
  const habit = state.habits.find((h) => h.id === habitId);
  if (!habit || state.loading) return;

  setLoading(true);
  try {
    const isDone = Boolean(habit.days[key]);

    if (isDone) {
      const { error } = await state.supabase
        .from("habit_checkins")
        .delete()
        .eq("user_id", state.userId)
        .eq("habit_id", habitId)
        .eq("done_on", key);
      if (error) throw error;
      delete habit.days[key];
    } else {
      const { error } = await state.supabase
        .from("habit_checkins")
        .upsert({ user_id: state.userId, habit_id: habitId, done_on: key }, { onConflict: "user_id,habit_id,done_on" });
      if (error) throw error;
      habit.days[key] = true;
    }

    setStatus("Synced with Supabase.", "ok");
    render();
  } catch (error) {
    setStatus(error.message || "Failed to update check-in.", "error");
  } finally {
    setLoading(false);
  }
}

async function deleteHabit(habitId) {
  if (state.loading) return;

  setLoading(true);
  try {
    const { error } = await state.supabase
      .from("habits")
      .delete()
      .eq("id", habitId)
      .eq("user_id", state.userId);

    if (error) throw error;

    state.habits = state.habits.filter((h) => h.id !== habitId);
    setStatus("Habit deleted.", "ok");
    render();
  } catch (error) {
    setStatus(error.message || "Failed to delete habit.", "error");
  } finally {
    setLoading(false);
  }
}

function buildSummary() {
  if (!state.habits.length) {
    summaryPanel.innerHTML = '<div class="empty-state">No habits yet. Start with one tiny daily action.</div>';
    return;
  }

  const total = state.habits.length;
  const doneToday = state.habits.filter((habit) => habit.days[todayKey()]).length;
  const avgRate = Math.round(
    state.habits.reduce((sum, habit) => sum + completionRate(habit), 0) / total,
  );
  const bestStreak = Math.max(...state.habits.map((habit) => streaks(habit).current));

  summaryPanel.innerHTML = `
    <h2>Dashboard</h2>
    <div class="metrics">
      <div class="metric"><label>Habits</label><strong>${total}</strong></div>
      <div class="metric"><label>Done today</label><strong>${doneToday}/${total}</strong></div>
      <div class="metric"><label>Avg consistency</label><strong>${avgRate}%</strong></div>
      <div class="metric"><label>Best active chain</label><strong>${bestStreak} days</strong></div>
    </div>
  `;
}

function renderHabit(habit) {
  const node = template.content.firstElementChild.cloneNode(true);
  const title = node.querySelector(".habit-title");
  const identity = node.querySelector(".habit-identity");
  const checkBtn = node.querySelector(".check-btn");
  const deleteBtn = node.querySelector(".delete-btn");
  const metrics = node.querySelector(".metrics");
  const chainStrip = node.querySelector(".chain-strip");

  const streak = streaks(habit);
  const rate = completionRate(habit);
  const todayDone = Boolean(habit.days[todayKey()]);

  title.textContent = habit.name;
  identity.textContent = habit.identity || "Identity cue: Show up daily, even if tiny.";

  checkBtn.textContent = todayDone ? "Done today" : "Mark done today";
  checkBtn.classList.toggle("done", todayDone);
  checkBtn.disabled = state.loading;
  deleteBtn.disabled = state.loading;

  checkBtn.addEventListener("click", () => toggleToday(habit.id));
  deleteBtn.addEventListener("click", () => deleteHabit(habit.id));

  metrics.innerHTML = `
    <div class="metric"><label>Current streak</label><strong>${streak.current} days</strong></div>
    <div class="metric"><label>Longest streak</label><strong>${streak.longest} days</strong></div>
    <div class="metric"><label>Consistency</label><strong>${rate}%</strong></div>
    <div class="metric"><label>Total reps</label><strong>${completedDays(habit).length}</strong></div>
  `;

  const days = [];
  const today = new Date(`${todayKey()}T00:00:00`);
  for (let i = LOOKBACK_DAYS - 1; i >= 0; i -= 1) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const key = localDayKey(date);
    days.push(key);
  }

  for (const dayKey of days) {
    const box = document.createElement("div");
    box.className = "day-box";
    if (habit.days[dayKey]) box.classList.add("done");
    if (dayKey === todayKey()) box.classList.add("today");
    box.dataset.label = formatDisplayDate(dayKey);
    chainStrip.appendChild(box);
  }

  return node;
}

function render() {
  todayLabel.textContent = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  buildSummary();
  habitList.innerHTML = "";

  if (!state.habits.length) {
    habitList.innerHTML = '<div class="empty-state">Create your first chain and put an X on today.</div>';
    return;
  }

  const sorted = [...state.habits].sort((a, b) => b.createdAt - a.createdAt);
  for (const habit of sorted) {
    habitList.appendChild(renderHabit(habit));
  }
}

habitForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const name = habitNameInput.value.trim();
  if (!name || !state.userId || state.loading) return;

  setLoading(true);
  try {
    const habit = await createHabit(name, habitIdentityInput.value);
    state.habits.unshift(habit);
    habitForm.reset();
    habitNameInput.focus();
    setStatus("Habit added and synced.", "ok");
    render();
  } catch (error) {
    setStatus(error.message || "Failed to add habit.", "error");
  } finally {
    setLoading(false);
  }
});

async function init() {
  setLoading(true);
  setStatus("Connecting to Supabase...", "info");
  render();

  try {
    state.supabase = createSupabaseClient();
    await ensureAuth();
    await loadHabitsFromSupabase();
    setStatus("Connected. Data is now stored in Supabase.", "ok");
  } catch (error) {
    setStatus(error.message || "Could not connect to Supabase.", "error");
  } finally {
    setLoading(false);
    render();
  }
}

init();
