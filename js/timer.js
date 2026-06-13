/* Stilte — sessie-engine voor meditatie- en ademsessies.
   Tijd loopt op absolute klokken (Date.now + AudioContext-klok), zodat
   gongs ook precies klinken als het scherm op de achtergrond staat. */

const Session = (() => {
  const overlay = document.getElementById("session-overlay");
  const doneOverlay = document.getElementById("done-overlay");
  const halo = document.getElementById("halo");
  const phaseLabel = document.getElementById("phase-label");
  const timeEl = document.getElementById("session-time");
  const subEl = document.getElementById("session-sub");
  const pausePath = document.getElementById("pause-icon-path");
  const pauseActions = document.getElementById("pause-actions");
  const dimHint = document.getElementById("dim-hint");

  const ICON_PAUSE = "M8 5h3v14H8zM13 5h3v14h-3z";
  const ICON_PLAY = "M8 5v14l11-7z";

  const BREATH_PATTERNS = {
    box: [["phase.in", 4], ["phase.hold", 4], ["phase.out", 4], ["phase.rest", 4]],
    "478": [["phase.in", 4], ["phase.hold", 7], ["phase.out", 8]],
    coherent: [["phase.in", 5], ["phase.out", 5]],
    calm: [["phase.in", 4], ["phase.out", 6]]
  };

  let st = null;          // actieve sessiestatus
  let wakeLock = null;
  let hintTimer = null;

  function fmt(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    const mm = String(m).padStart(2, "0");
    const ss = String(s).padStart(2, "0");
    return h > 0 ? `${h}:${mm}:${ss}` : `${m}:${ss}`;
  }

  async function grabWakeLock() {
    try { wakeLock = await navigator.wakeLock?.request("screen"); }
    catch (e) { wakeLock = null; }
  }

  function releaseWakeLock() {
    wakeLock?.release().catch(() => {});
    wakeLock = null;
  }

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && st && !st.paused) grabWakeLock();
  });

  /* ---------- gongs plannen op de audioklok ---------- */


  // Plant alle resterende bellen (reeksen) op de audioklok; voegt toe aan
  // st.scheduled zodat pauze/stop ze kan annuleren. Aanroeper hoort eerst
  // cancelBells() te doen bij herplannen.
  function scheduleBells() {
    const t0 = SoundEngine.now();
    const elapsed = st.totalSec - remaining();
    const seq = (atSec, count, vol) => {
      for (let k = 0; k < count; k++) {
        const dt = atSec + k * st.gap - elapsed;
        if (dt > 0.05) st.scheduled.push(SoundEngine.strike(st.gong, t0 + dt, vol));
      }
    };
    if (st.mode === "meditatie" && st.intervalMin > 0) {
      const ival = st.intervalMin * 60;
      for (let p = ival; p < st.totalSec; p += ival) seq(p, st.strikes.interval, 0.55);
    }
    seq(st.totalSec, st.strikes.end, 1);
  }

  function cancelBells() {
    for (const h of st.scheduled || []) h.cancel();
    st.scheduled = [];
  }

  function remaining() {
    if (st.paused) return st.pausedRemaining;
    return Math.max(0, (st.endsAt - Date.now()) / 1000);
  }

  /* ---------- weergave ---------- */

  function tick() {
    if (!st || st.paused) return;
    const rem = remaining();
    timeEl.textContent = fmt(rem);
    if (st.mode === "adem") breathFrame(st.totalSec - rem);
    if (rem <= 0.05) { complete(); return; }
    st.tickId = requestAnimationFrame(tick);
  }

  function breathFrame(elapsed) {
    const cycle = st.pattern.reduce((a, p) => a + p[1], 0);
    let pos = elapsed % cycle;
    let phase = st.pattern[0];
    for (const p of st.pattern) {
      if (pos < p[1]) { phase = p; break; }
      pos -= p[1];
    }
    const frac = pos / phase[1];
    phaseLabel.textContent = I18n.t(phase[0]);
    subEl.textContent = Math.ceil(phase[1] - pos);
    const ease = t => t * t * (3 - 2 * t);
    const lo = 0.62, hi = 1.0;
    let scale;
    if (phase[0] === "phase.in") scale = lo + (hi - lo) * ease(frac);
    else if (phase[0] === "phase.out") scale = hi - (hi - lo) * ease(frac);
    else if (phase[0] === "phase.hold") scale = hi;
    else scale = lo;
    halo.style.setProperty("--breath", scale.toFixed(3));
  }

  /* ---------- levensloop ---------- */

  function openOverlay(mode) {
    overlay.classList.remove("hidden", "dimmed");
    pauseActions.classList.add("hidden");
    phaseLabel.textContent = "";
    subEl.textContent = "";
    // Verduisteren (tik = scherm zwart) alleen bij meditatie, niet bij adem
    clearTimeout(hintTimer);
    dimHint.classList.toggle("hidden", mode !== "meditatie");
    if (mode === "meditatie") {
      dimHint.style.opacity = "0.7";
      hintTimer = setTimeout(() => { dimHint.style.opacity = "0"; }, 5000);
    }
    if (mode === "meditatie") {
      halo.classList.add("ambient");
      halo.style.transition = "";
    } else {
      halo.classList.remove("ambient");
      halo.style.transition = "none";
    }
  }

  function startMeditation(cfg) {
    SoundEngine.ensure();
    st = {
      mode: "meditatie",
      totalSec: cfg.minutes * 60,
      gong: cfg.gong,
      intervalMin: cfg.intervalMin,
      ambient: cfg.ambient,
      strikes: cfg.strikes || { start: 1, interval: 1, end: 1 },
      gap: cfg.gapSec || 2,
      paused: false,
      scheduled: []
    };
    openOverlay("meditatie");
    timeEl.textContent = fmt(st.totalSec);
    grabWakeLock();

    const begin = () => {
      if (!st) return;
      phaseLabel.textContent = "";
      subEl.textContent = "";
      st.endsAt = Date.now() + st.totalSec * 1000;
      const t0 = SoundEngine.now();
      for (let k = 0; k < st.strikes.start; k++) {
        st.scheduled.push(SoundEngine.strike(st.gong, t0 + k * st.gap, 1));
      }
      if (st.ambient) SoundEngine.startAmbient(st.ambient, 3);
      scheduleBells();
      st.tickId = requestAnimationFrame(tick);
    };

    if (cfg.prepSec > 0) {
      phaseLabel.textContent = I18n.t("session.prepare");
      let left = cfg.prepSec;
      subEl.textContent = I18n.t("session.startsIn", left);
      st.prepId = setInterval(() => {
        left--;
        if (!st) { clearInterval(st?.prepId); return; }
        if (left <= 0) { clearInterval(st.prepId); st.prepId = null; begin(); }
        else subEl.textContent = I18n.t("session.startsIn", left);
      }, 1000);
    } else {
      begin();
    }
  }

  function startBreath(cfg) {
    SoundEngine.ensure();
    st = {
      mode: "adem",
      totalSec: cfg.minutes * 60,
      pattern: BREATH_PATTERNS[cfg.tech] || BREATH_PATTERNS.box,
      gong: "bowl",
      intervalMin: 0,
      strikes: { start: 1, interval: 1, end: 1 },
      gap: 2,
      paused: false,
      scheduled: []
    };
    openOverlay("adem");
    grabWakeLock();
    st.endsAt = Date.now() + st.totalSec * 1000;
    SoundEngine.strike("bowl", SoundEngine.now(), 0.6);
    scheduleBells();
    st.tickId = requestAnimationFrame(tick);
  }

  function pause() {
    if (!st || st.paused || st.prepId) return;
    st.pausedRemaining = remaining();
    st.paused = true;
    cancelAnimationFrame(st.tickId);
    cancelBells();
    SoundEngine.stopAmbient(0.8);
    pausePath.setAttribute("d", ICON_PLAY);
    phaseLabel.textContent = I18n.t("session.paused");
    pauseActions.classList.remove("hidden"); // beëindigen / verwijderen
    releaseWakeLock();
  }

  function resume() {
    if (!st || !st.paused) return;
    SoundEngine.ensure();
    st.endsAt = Date.now() + st.pausedRemaining * 1000;
    st.paused = false;
    pausePath.setAttribute("d", ICON_PAUSE);
    phaseLabel.textContent = "";
    pauseActions.classList.add("hidden");
    if (st.mode === "meditatie" && st.ambient) SoundEngine.startAmbient(st.ambient, 2);
    scheduleBells();
    grabWakeLock();
    st.tickId = requestAnimationFrame(tick);
  }

  function teardown() {
    if (!st) return;
    cancelAnimationFrame(st.tickId);
    if (st.prepId) clearInterval(st.prepId);
    clearTimeout(hintTimer);
    cancelBells();
    SoundEngine.stopAmbient(1.5);
    releaseWakeLock();
    pausePath.setAttribute("d", ICON_PAUSE);
    pauseActions.classList.add("hidden");
    overlay.classList.add("hidden");
    overlay.classList.remove("dimmed");
    halo.style.removeProperty("--breath");
    st = null;
  }

  function finish(elapsedSec, save) {
    const mode = st.mode;
    teardown();
    let minutes = 0;
    if (save) {
      minutes = Math.max(1, Math.round(elapsedSec / 60));
      Stats.addSession(minutes, mode);
      Stats.renderHeader();
    }
    showDone(minutes, mode);
  }

  function complete() {
    // De eindgong is al op de audioklok gepland en klinkt nu; maak de lijst
    // leeg zodat teardown() hem niet afbreekt maar laat uitklinken.
    st.scheduled = [];
    finish(st.totalSec, true);
  }

  // Eerder beëindigen: de verstreken tijd telt mee en wordt bewaard.
  function finishEarly() {
    if (!st) return;
    if (st.prepId) { discard(); return; } // nog niet begonnen
    const elapsed = st.totalSec - remaining();
    if (elapsed < 1) { discard(); return; }
    finish(elapsed, true);
  }

  // Verwijderen: sessie weggooien, niets bewaren, geen afrondingsscherm.
  function discard() {
    if (!st) return;
    teardown();
  }

  function showDone(minutes, mode) {
    const tot = Stats.totals(Stats.load());
    const parts = [];
    if (minutes >= 1) parts.push(I18n.t("done.minutes", minutes, mode));
    parts.push(I18n.t("done.session", tot.sessions));
    if (tot.current >= 2) parts.push(I18n.t("done.streak", tot.current));
    document.getElementById("done-stats").textContent = parts.join(" · ");
    const q = Quotes.random(I18n.current());
    document.getElementById("done-quote").textContent = q.t;
    document.getElementById("done-quote-author").textContent = "— " + q.a;
    doneOverlay.classList.remove("hidden");
  }

  /* ---------- knoppen ---------- */

  document.getElementById("btn-pause").addEventListener("click", () => {
    if (!st) return;
    st.paused ? resume() : pause();
  });
  document.getElementById("btn-finish").addEventListener("click", finishEarly);
  document.getElementById("btn-discard").addEventListener("click", discard);
  document.getElementById("btn-done-close").addEventListener("click", () => {
    doneOverlay.classList.add("hidden");
    Stats.renderProgress();
  });

  // Tik op het scherm tijdens een meditatie verduistert het (en terug).
  // Tikken op de knoppen doet dit niet.
  overlay.addEventListener("click", e => {
    if (!st) return;
    if (overlay.classList.contains("dimmed")) { overlay.classList.remove("dimmed"); return; }
    if (st.mode !== "meditatie" || st.paused || st.prepId) return;
    if (e.target.closest(".session-controls, .pause-actions")) return;
    overlay.classList.add("dimmed");
  });

  return { startMeditation, startBreath, active: () => !!st };
})();
