/* Stilte — app-schil: navigatie, instellingen, achtergrond, PWA */

(() => {
  const SKEY = "stilte.settings.v1";

  const defaults = {
    minutes: 15, gong: "bowl", intervalMin: 0, ambient: "", prepSec: 5,
    breathTech: "box", breathMin: 3, ambVolume: 60, sleepMin: 0
  };

  let settings = { ...defaults };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SKEY)) || {}); }
  catch (e) { /* verse start */ }

  function save() { localStorage.setItem(SKEY, JSON.stringify(settings)); }

  /* ---------- navigatie ---------- */

  const tabs = document.querySelectorAll(".tab");
  tabs.forEach(tab => tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.toggle("active", t === tab));
    document.querySelectorAll(".view").forEach(v =>
      v.classList.toggle("active", v.id === "view-" + tab.dataset.view));
    if (tab.dataset.view === "voortgang") Stats.renderProgress();
  }));

  /* ---------- chips-hulpje (één actief per groep) ---------- */

  function bindChips(id, attr, onPick) {
    const wrap = document.getElementById(id);
    wrap.addEventListener("click", e => {
      const chip = e.target.closest("[data-" + attr + "]");
      if (!chip) return;
      wrap.querySelectorAll(".chip, .technique").forEach(c =>
        c.classList.toggle("active", c === chip));
      onPick(chip.dataset[attr]);
    });
    return {
      set(value) {
        wrap.querySelectorAll("[data-" + attr + "]").forEach(c =>
          c.classList.toggle("active", c.dataset[attr] === String(value)));
      }
    };
  }

  /* ---------- timerinstellingen ---------- */

  const dialTime = document.getElementById("dial-time");
  const dialFill = document.getElementById("dial-fill");
  const slider = document.getElementById("duration-slider");
  const C = 2 * Math.PI * 88;

  function fmtMinutes(min) {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return h > 0 ? `${h}:${String(m).padStart(2, "0")}:00` : `${m}:00`;
  }

  const durationChips = bindChips("duration-chips", "min", v => {
    settings.minutes = parseInt(v, 10);
    slider.value = settings.minutes;
    updateDial();
    save();
  });

  function updateDial() {
    dialTime.textContent = fmtMinutes(settings.minutes);
    const frac = Math.min(1, settings.minutes / 120);
    dialFill.style.strokeDasharray = C;
    dialFill.style.strokeDashoffset = C * (1 - frac);
    durationChips.set(settings.minutes);
  }

  slider.addEventListener("input", () => {
    settings.minutes = parseInt(slider.value, 10);
    updateDial();
  });
  slider.addEventListener("change", save);

  const gongChips = bindChips("gong-chips", "gong", v => { settings.gong = v; save(); });
  const intervalChips = bindChips("interval-chips", "ival", v => { settings.intervalMin = parseInt(v, 10); save(); });
  const ambientChips = bindChips("ambient-chips", "amb", v => { settings.ambient = v; save(); });
  const prepChips = bindChips("prep-chips", "prep", v => { settings.prepSec = parseInt(v, 10); save(); });

  document.getElementById("preview-gong").addEventListener("click", () => {
    SoundEngine.ensure();
    SoundEngine.strike(settings.gong, undefined, 0.7);
  });

  document.getElementById("start-meditation").addEventListener("click", () => {
    Session.startMeditation({
      minutes: settings.minutes,
      gong: settings.gong,
      intervalMin: settings.intervalMin,
      ambient: settings.ambient,
      prepSec: settings.prepSec
    });
  });

  /* ---------- adem ---------- */

  const techChips = bindChips("technique-list", "tech", v => { settings.breathTech = v; save(); });
  const breathChips = bindChips("breath-duration-chips", "bmin", v => { settings.breathMin = parseInt(v, 10); save(); });

  document.getElementById("start-breath").addEventListener("click", () => {
    Session.startBreath({ tech: settings.breathTech, minutes: settings.breathMin });
  });

  /* ---------- geluiden ---------- */

  const soundCards = document.querySelectorAll(".sound-card");
  let sleepTimerId = null;

  function refreshSoundCards() {
    const playing = SoundEngine.currentAmbient();
    soundCards.forEach(card => {
      const on = card.dataset.sound === playing;
      card.classList.toggle("playing", on);
      card.querySelector(".sound-state").textContent = on ? "speelt" : "stil";
    });
  }

  function armSleepTimer() {
    clearTimeout(sleepTimerId);
    if (settings.sleepMin > 0 && SoundEngine.currentAmbient()) {
      sleepTimerId = setTimeout(() => {
        SoundEngine.stopAmbient(6);
        setTimeout(refreshSoundCards, 100);
      }, settings.sleepMin * 60 * 1000);
    }
  }

  soundCards.forEach(card => card.addEventListener("click", () => {
    const name = card.dataset.sound;
    if (SoundEngine.currentAmbient() === name) {
      SoundEngine.stopAmbient();
    } else {
      SoundEngine.startAmbient(name);
    }
    refreshSoundCards();
    armSleepTimer();
  }));

  const volSlider = document.getElementById("ambient-volume");
  volSlider.addEventListener("input", () => {
    settings.ambVolume = parseInt(volSlider.value, 10);
    SoundEngine.setAmbientVolume(settings.ambVolume / 100);
  });
  volSlider.addEventListener("change", save);

  const sleepChips = bindChips("sleep-chips", "sleep", v => {
    settings.sleepMin = parseInt(v, 10);
    save();
    armSleepTimer();
  });

  /* ---------- begroeting & dagquote ---------- */

  function greeting() {
    const h = new Date().getHours();
    if (h < 6) return "Goedenacht";
    if (h < 12) return "Goedemorgen";
    if (h < 18) return "Goedemiddag";
    return "Goedenavond";
  }

  const days = ["zondag", "maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag"];
  const months = ["januari", "februari", "maart", "april", "mei", "juni",
    "juli", "augustus", "september", "oktober", "november", "december"];
  const now = new Date();
  document.getElementById("greeting").textContent =
    `${greeting()} · ${days[now.getDay()]} ${now.getDate()} ${months[now.getMonth()]}`;

  const q = Quotes.ofDay();
  document.getElementById("quote-text").textContent = q.t;
  document.getElementById("quote-author").textContent = "— " + q.a;

  /* ---------- sterrenhemel ---------- */

  const canvas = document.getElementById("stars");
  const cx2d = canvas.getContext("2d");
  let stars = [];

  function layoutStars() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    cx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((innerWidth * innerHeight) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * innerWidth,
      y: Math.random() * innerHeight,
      r: 0.4 + Math.random() * 1.2,
      phase: Math.random() * Math.PI * 2,
      speed: 0.15 + Math.random() * 0.5
    }));
  }

  function drawStars(t) {
    cx2d.clearRect(0, 0, innerWidth, innerHeight);
    for (const s of stars) {
      const a = 0.25 + 0.55 * (0.5 + 0.5 * Math.sin(s.phase + t * 0.001 * s.speed));
      cx2d.globalAlpha = a;
      cx2d.fillStyle = "#ffffff";
      cx2d.beginPath();
      cx2d.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      cx2d.fill();
    }
    cx2d.globalAlpha = 1;
  }

  let starRaf = null;
  function starLoop(t) {
    drawStars(t);
    starRaf = requestAnimationFrame(starLoop);
  }

  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  layoutStars();
  if (reducedMotion) drawStars(0);
  else starRaf = requestAnimationFrame(starLoop);

  addEventListener("resize", () => { layoutStars(); if (reducedMotion) drawStars(0); });
  document.addEventListener("visibilitychange", () => {
    if (reducedMotion) return;
    if (document.hidden) cancelAnimationFrame(starRaf);
    else starRaf = requestAnimationFrame(starLoop);
  });

  /* ---------- instellingen terugzetten in de UI ---------- */

  slider.value = settings.minutes;
  updateDial();
  gongChips.set(settings.gong);
  intervalChips.set(settings.intervalMin);
  ambientChips.set(settings.ambient);
  prepChips.set(settings.prepSec);
  techChips.set(settings.breathTech);
  breathChips.set(settings.breathMin);
  sleepChips.set(settings.sleepMin);
  volSlider.value = settings.ambVolume;
  SoundEngine.setAmbientVolume(settings.ambVolume / 100);

  Stats.renderHeader();

  /* ---------- PWA ---------- */

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* offline-cache optioneel */ });
    });
  }
})();
