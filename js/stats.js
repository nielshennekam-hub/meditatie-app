/* Stilte — voortgang & opslag (localStorage) */

const Stats = (() => {
  const KEY = "stilte.sessions.v1";

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch (e) { return []; }
  }

  function save(list) {
    localStorage.setItem(KEY, JSON.stringify(list));
  }

  function dayKey(date) {
    const d = date instanceof Date ? date : new Date(date);
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${d.getFullYear()}-${m}-${day}`;
  }

  function addSession(minutes, type) {
    const list = load();
    list.push({ d: dayKey(new Date()), min: Math.max(1, Math.round(minutes)), type, ts: Date.now() });
    save(list);
    return list;
  }

  function minutesByDay(list) {
    const map = new Map();
    for (const s of list) map.set(s.d, (map.get(s.d) || 0) + s.min);
    return map;
  }

  function shiftDay(date, days) {
    const d = new Date(date);
    d.setDate(d.getDate() + days);
    return d;
  }

  function streaks(list) {
    const days = new Set(list.map(s => s.d));
    // huidige reeks: terugtellen vanaf vandaag (of gisteren als vandaag nog leeg is)
    let cur = 0;
    let cursor = new Date();
    if (!days.has(dayKey(cursor))) cursor = shiftDay(cursor, -1);
    while (days.has(dayKey(cursor))) { cur++; cursor = shiftDay(cursor, -1); }
    // langste reeks ooit
    let best = 0;
    for (const d of days) {
      const prev = dayKey(shiftDay(new Date(d + "T12:00:00"), -1));
      if (days.has(prev)) continue; // geen begin van een reeks
      let len = 0;
      let c = new Date(d + "T12:00:00");
      while (days.has(dayKey(c))) { len++; c = shiftDay(c, 1); }
      best = Math.max(best, len);
    }
    return { current: cur, best };
  }

  const MILESTONES = [
    { id: "s1", emblem: "🌱", test: t => t.sessions >= 1 },
    { id: "s10", emblem: "🧘", test: t => t.sessions >= 10 },
    { id: "s50", emblem: "🌸", test: t => t.sessions >= 50 },
    { id: "d3", emblem: "🔥", test: t => t.best >= 3 },
    { id: "d7", emblem: "⭐", test: t => t.best >= 7 },
    { id: "d30", emblem: "🌙", test: t => t.best >= 30 },
    { id: "m60", emblem: "⏳", test: t => t.minutes >= 60 },
    { id: "m300", emblem: "🌊", test: t => t.minutes >= 300 },
    { id: "m1440", emblem: "🏔️", test: t => t.minutes >= 1440 }
  ];

  function totals(list) {
    const st = streaks(list);
    return {
      sessions: list.length,
      minutes: list.reduce((a, s) => a + s.min, 0),
      current: st.current,
      best: st.best
    };
  }

  /* ---------- Weergave ---------- */

  function renderHeader() {
    const t = totals(load());
    const el = document.getElementById("header-streak-num");
    if (el) el.textContent = t.current;
  }

  function renderWeekChart(byDay) {
    const wrap = document.getElementById("week-chart");
    wrap.innerHTML = "";
    const today = new Date();
    let max = 0;
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = shiftDay(today, -i);
      const min = byDay.get(dayKey(d)) || 0;
      max = Math.max(max, min);
      days.push({ d, min });
    }
    for (const { d, min } of days) {
      const col = document.createElement("div");
      col.className = "week-col";
      const bar = document.createElement("div");
      bar.className = "week-bar" + (min === 0 ? " empty" : "");
      bar.style.height = min === 0 ? "3px" : `${Math.max(8, (min / max) * 100)}%`;
      bar.title = `${min} min`;
      const label = document.createElement("span");
      label.className = "week-day" + (dayKey(d) === dayKey(today) ? " today" : "");
      label.textContent = I18n.t("dow")[(d.getDay() + 6) % 7];
      col.append(bar, label);
      wrap.append(col);
    }
  }

  function renderHeatmap(byDay) {
    const wrap = document.getElementById("heatmap");
    const title = document.getElementById("heatmap-title");
    wrap.innerHTML = "";
    const today = new Date();
    title.textContent = I18n.t("months")[today.getMonth()] + " " + today.getFullYear();

    for (const d of I18n.t("dow")) {
      const h = document.createElement("div");
      h.className = "heat-cell heat-dow";
      h.textContent = d;
      wrap.append(h);
    }
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const lead = (first.getDay() + 6) % 7; // maandag eerst
    for (let i = 0; i < lead; i++) {
      const b = document.createElement("div");
      b.className = "heat-cell blank";
      wrap.append(b);
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const d = new Date(today.getFullYear(), today.getMonth(), day);
      const min = byDay.get(dayKey(d)) || 0;
      const cell = document.createElement("div");
      let lvl = "";
      if (min > 0) lvl = min <= 10 ? " l1" : min <= 25 ? " l2" : " l3";
      cell.className = "heat-cell" + lvl + (dayKey(d) === dayKey(today) ? " today" : "");
      cell.textContent = day;
      if (min > 0) cell.title = `${min} min`;
      wrap.append(cell);
    }
  }

  function renderMilestones(t) {
    const wrap = document.getElementById("milestone-grid");
    wrap.innerHTML = "";
    for (const m of MILESTONES) {
      const el = document.createElement("div");
      el.className = "milestone" + (m.test(t) ? " earned" : "");
      el.innerHTML = `<span class="milestone-emblem">${m.emblem}</span>` +
        `<span class="milestone-name">${I18n.t("ms." + m.id)}</span>`;
      wrap.append(el);
    }
  }

  function renderRecent(list) {
    const wrap = document.getElementById("session-list");
    wrap.innerHTML = "";
    if (!list.length) {
      const li = document.createElement("li");
      li.className = "session-empty";
      li.textContent = I18n.t("sessions.empty");
      wrap.append(li);
      return;
    }
    const recent = list.slice(-5).reverse();
    for (const s of recent) {
      const li = document.createElement("li");
      const when = new Date(s.ts || s.d + "T12:00:00");
      const time = String(when.getHours()).padStart(2, "0") + ":" +
        String(when.getMinutes()).padStart(2, "0");
      const label = I18n.t("type." + (s.type === "adem" ? "adem" : "meditatie"));
      li.innerHTML =
        `<span><span class="s-type">${label}</span> ` +
        `<span class="s-meta">· ${when.getDate()} ${I18n.t("months")[when.getMonth()].slice(0, 3)} · ${time}</span></span>` +
        `<span class="s-min">${s.min} min</span>`;
      wrap.append(li);
    }
  }

  function renderProgress() {
    const list = load();
    const t = totals(list);
    document.getElementById("stat-streak").textContent = t.current;
    document.getElementById("stat-minutes").textContent = t.minutes;
    document.getElementById("stat-sessions").textContent = t.sessions;
    document.getElementById("stat-best").textContent = t.best;
    const sub = document.getElementById("progress-sub");
    if (t.sessions === 0) sub.textContent = I18n.t("progress.empty.sub");
    else if (t.current >= 2) sub.textContent = I18n.t("progress.streak.sub", t.current);
    else sub.textContent = I18n.t("progress.minutes.sub", t.minutes);
    const byDay = minutesByDay(list);
    renderWeekChart(byDay);
    renderHeatmap(byDay);
    renderMilestones(t);
    renderRecent(list);
    renderHeader();
  }

  return { load, addSession, totals, renderProgress, renderHeader };
})();
