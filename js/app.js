/* Stilte — app-schil: navigatie, instellingen, achtergrond, PWA */

(() => {
  const SKEY = "stilte.settings.v1";

  const defaults = {
    minutes: 15, gong: "bowl", intervalMin: 0, ambient: "", prepSec: 5,
    strikesStart: 1, strikesInterval: 1, strikesEnd: 1, gapSec: 2, customId: "",
    breathTech: "box", breathMin: 3, ambVolume: 60, sleepMin: 0, lang: "nl"
  };

  let settings = { ...defaults };
  try { Object.assign(settings, JSON.parse(localStorage.getItem(SKEY)) || {}); }
  catch (e) { /* verse start */ }

  I18n.setLang(settings.lang);

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

  const gongChips = bindChips("gong-chips", "gong", v => {
    settings.gong = v;
    save();
    if (v === "real") SoundEngine.preload(v); // eerste slag dan direct raak
    renderCustomPanel();
  });
  const gapChips = bindChips("gap-chips", "gap", v => { settings.gapSec = parseInt(v, 10); save(); });
  const strikesStartChips = bindChips("strikes-start-chips", "ss", v => { settings.strikesStart = parseInt(v, 10); save(); });
  const strikesIntervalChips = bindChips("strikes-interval-chips", "si", v => { settings.strikesInterval = parseInt(v, 10); save(); });
  const strikesEndChips = bindChips("strikes-end-chips", "se", v => { settings.strikesEnd = parseInt(v, 10); save(); });
  const intervalChips = bindChips("interval-chips", "ival", v => { settings.intervalMin = parseInt(v, 10); save(); });
  const ambientChips = bindChips("ambient-chips", "amb", v => { settings.ambient = v; save(); });
  const prepChips = bindChips("prep-chips", "prep", v => { settings.prepSec = parseInt(v, 10); save(); });
  const langChips = bindChips("lang-chips", "lang", v => {
    settings.lang = v;
    save();
    I18n.setLang(v);
    renderGreeting();
    renderQuote();
    updateSummary();
    refreshSoundCards();
    renderHintText();
    renderCustomPanel();
    Stats.renderProgress();
  });

  /* ---------- inklapbare instellingen met samenvatting ---------- */

  const settingsCard = document.getElementById("settings-card");
  const settingsToggle = document.getElementById("settings-toggle");
  const summaryEl = document.getElementById("settings-summary");
  function updateSummary() {
    const parts = [
      I18n.t("gong." + settings.gong),
      `${settings.strikesStart}·${settings.strikesInterval}·${settings.strikesEnd} ${I18n.t("summary.bells")}`
    ];
    if (settings.intervalMin > 0) parts.push(I18n.t("summary.every", settings.intervalMin));
    if (settings.ambient) parts.push(I18n.t("amb." + settings.ambient).toLowerCase());
    summaryEl.textContent = parts.join(" · ");
  }

  settingsToggle.addEventListener("click", () => {
    const open = settingsCard.classList.toggle("open");
    settingsToggle.setAttribute("aria-expanded", open);
  });
  // Samenvatting bijwerken na elke keuze binnen de instellingen
  document.getElementById("settings-body").addEventListener("click", () => {
    setTimeout(updateSummary, 0);
  });

  // De preview speelt de ingestelde startreeks, zodat je precies hoort
  // hoe de sessie zal beginnen.
  document.getElementById("preview-gong").addEventListener("click", () => {
    SoundEngine.ensure();
    const t0 = SoundEngine.now();
    for (let k = 0; k < settings.strikesStart; k++) {
      SoundEngine.strike(settings.gong, t0 + k * settings.gapSec, 0.7);
    }
  });

  /* ---------- eigen klank: opnemen of bestand kiezen ---------- */

  const customPanel = document.getElementById("custom-panel");
  const customStatus = document.getElementById("custom-status");
  const recordBtn = document.getElementById("custom-record");
  const fileBtn = document.getElementById("custom-file-btn");
  const fileInput = document.getElementById("custom-file");
  const deleteBtn = document.getElementById("custom-delete");
  let recorder = null;
  let recChunks = [];
  let recTickId = null;
  let recState = "idle"; // idle → starting → recording → stopping

  const trimWrap = document.getElementById("trim-wrap");
  const trimCanvas = document.getElementById("trim-canvas");
  const trimPlayBtn = document.getElementById("trim-play");
  const trimResetBtn = document.getElementById("trim-reset");
  const trimStartLabel = document.getElementById("trim-start-label");
  const trimEndLabel = document.getElementById("trim-end-label");
  const trimHint = document.getElementById("trim-hint");
  let wavePeaks = null;
  let waveDur = 0;

  const customListWrap = document.getElementById("custom-list");

  function renderCustomList() {
    const items = SoundEngine.customList();
    customListWrap.classList.toggle("hidden", items.length < 2);
    customListWrap.innerHTML = "";
    for (const it of items) {
      const chip = document.createElement("button");
      chip.className = "chip" +
        (it.id === SoundEngine.activeCustomId() ? " active" : "");
      chip.textContent = it.name;
      chip.dataset.cid = it.id;
      customListWrap.append(chip);
    }
  }

  customListWrap.addEventListener("click", async e => {
    const chip = e.target.closest("[data-cid]");
    if (!chip || chip.dataset.cid === SoundEngine.activeCustomId()) return;
    await SoundEngine.selectCustom(chip.dataset.cid);
    settings.customId = chip.dataset.cid;
    save();
    renderCustomPanel();
  });

  function renderCustomPanel(message) {
    customPanel.classList.toggle("hidden", settings.gong !== "custom");
    const info = SoundEngine.customInfo();
    const tr = SoundEngine.trimInfo();
    const len = tr ? Math.round((tr.end - tr.start) * 10) / 10 : 0;
    customStatus.textContent = message ||
      (info ? I18n.t("custom.saved", info.name, len) : I18n.t("custom.none"));
    renderCustomList();
    deleteBtn.classList.toggle("hidden", !info);
    deleteBtn.textContent = I18n.t("custom.delete");
    fileBtn.textContent = I18n.t("custom.choose");
    if (recState === "idle") recordBtn.textContent = I18n.t("custom.record");
    trimWrap.classList.toggle("hidden", !info);
    trimPlayBtn.textContent = I18n.t("custom.play");
    trimResetBtn.textContent = I18n.t("custom.trimreset");
    trimHint.textContent = I18n.t("custom.trimhint");
    if (info && settings.gong === "custom") drawTrim();
  }

  /* ---------- golfvorm bijknippen ---------- */

  async function drawTrim() {
    const wf = await SoundEngine.getWaveform(160);
    if (!wf) return;
    wavePeaks = wf.peaks;
    waveDur = wf.duration;
    paintTrim();
  }

  function paintTrim() {
    if (!wavePeaks || !waveDur) return;
    const tr = SoundEngine.trimInfo();
    if (!tr) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = trimCanvas.clientWidth;
    const h = trimCanvas.clientHeight;
    if (!w) return; // paneel (nog) niet zichtbaar
    if (trimCanvas.width !== Math.round(w * dpr)) {
      trimCanvas.width = Math.round(w * dpr);
      trimCanvas.height = Math.round(h * dpr);
    }
    const c = trimCanvas.getContext("2d");
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    const n = wavePeaks.length;
    const x0 = (tr.start / waveDur) * w;
    const x1 = (tr.end / waveDur) * w;
    const bw = w / n;
    for (let i = 0; i < n; i++) {
      const x = (i + 0.5) * bw;
      const bh = Math.max(2, wavePeaks[i] * (h - 16));
      const kept = x >= x0 && x <= x1;
      c.fillStyle = kept ? "rgba(232, 192, 122, 0.85)" : "rgba(255, 255, 255, 0.14)";
      c.fillRect(x - bw * 0.32, (h - bh) / 2, bw * 0.64, bh);
    }
    c.fillStyle = "#b388ff";
    for (const x of [x0, x1]) {
      c.fillRect(x - 1.25, 4, 2.5, h - 8);
      c.beginPath();
      c.arc(x, h / 2, 5.5, 0, Math.PI * 2);
      c.fill();
    }
    trimStartLabel.textContent = tr.start.toFixed(1) + " s";
    trimEndLabel.textContent = tr.end.toFixed(1) + " s";
  }

  let dragHandle = null;

  function moveTrim(e) {
    const rect = trimCanvas.getBoundingClientRect();
    const t = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)) * waveDur;
    const tr = SoundEngine.trimInfo();
    if (!tr) return;
    if (dragHandle === "start") SoundEngine.setTrim(t, tr.end);
    else SoundEngine.setTrim(tr.start, t);
    paintTrim();
  }

  trimCanvas.addEventListener("pointerdown", e => {
    const tr = SoundEngine.trimInfo();
    if (!tr || !waveDur) return;
    const rect = trimCanvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const x0 = (tr.start / waveDur) * rect.width;
    const x1 = (tr.end / waveDur) * rect.width;
    dragHandle = Math.abs(x - x0) <= Math.abs(x - x1) ? "start" : "end";
    trimCanvas.setPointerCapture(e.pointerId);
    moveTrim(e);
  });
  trimCanvas.addEventListener("pointermove", e => { if (dragHandle) moveTrim(e); });
  function endTrimDrag() {
    if (!dragHandle) return;
    dragHandle = null;
    renderCustomPanel(); // status met nieuwe lengte
  }
  trimCanvas.addEventListener("pointerup", endTrimDrag);
  trimCanvas.addEventListener("pointercancel", endTrimDrag);
  addEventListener("resize", () => paintTrim());

  trimPlayBtn.addEventListener("click", () => {
    SoundEngine.ensure();
    SoundEngine.strike("custom", undefined, 0.8);
  });
  trimResetBtn.addEventListener("click", () => {
    const tr = SoundEngine.trimInfo();
    if (tr) SoundEngine.setTrim(0, tr.duration);
    renderCustomPanel();
  });

  function stopRecording() {
    if (recState !== "recording") return;
    recState = "stopping";
    clearInterval(recTickId);
    recordBtn.textContent = I18n.t("custom.saving");
    try { if (recorder) recorder.stop(); } catch (e) { /* al gestopt */ }
  }

  async function toggleRecord() {
    if (recState === "recording") { stopRecording(); return; }
    if (recState !== "idle") return; // tikken tijdens starten/opslaan negeren

    // direct feedback geven, nog vóór de (async) toestemmingsprompt
    recState = "starting";
    recordBtn.classList.add("recording");
    recordBtn.textContent = I18n.t("custom.starting");
    try {
      SoundEngine.beginRecording(); // microfoon vrijmaken (audiosessie + keep-alive)
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      recChunks = [];
      recorder = new MediaRecorder(stream);
      recorder.ondataavailable = e => { if (e.data.size) recChunks.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        clearInterval(recTickId);
        const blob = new Blob(recChunks, { type: recorder.mimeType || "audio/mp4" });
        recorder = null;
        recordBtn.classList.remove("recording");
        // iOS laat de uitvoer na microfoongebruik stil of op het
        // oorspeakertje achter; een verse audiocontext herstelt dat.
        await SoundEngine.reset();
        SoundEngine.endRecording(); // afspeelmodus + keep-alive terug
        refreshSoundCards();
        // recState blijft "stopping" tot de opname is opgeslagen, zodat
        // een tik tijdens het verwerken geen nieuwe opname start.
        try {
          const n = SoundEngine.customList().length + 1;
          const meta = await SoundEngine.addCustomSound(blob, I18n.t("custom.recname", n));
          settings.customId = meta.id;
          save();
          recState = "idle";
          renderCustomPanel();
          updateSummary();
        } catch (e) {
          recState = "idle";
          renderCustomPanel(I18n.t("custom.error.decode"));
        }
      };
      recorder.start();
      recState = "recording";
      const t0 = Date.now();
      recTickId = setInterval(() => {
        const sec = (Date.now() - t0) / 1000;
        recordBtn.textContent = `■ ${sec.toFixed(0)} s`;
        if (sec >= 30) stopRecording(); // veiligheidslimiet
      }, 250);
    } catch (e) {
      recState = "idle";
      SoundEngine.endRecording(); // sessie herstellen, anders blijven gongs stil
      recordBtn.classList.remove("recording");
      recordBtn.textContent = I18n.t("custom.record");
      renderCustomPanel(I18n.t("custom.error.mic"));
    }
  }

  recordBtn.addEventListener("click", toggleRecord);
  fileBtn.addEventListener("click", () => fileInput.click());
  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    try {
      const name = file.name.replace(/\.[^.]+$/, "") ||
        I18n.t("custom.recname", SoundEngine.customList().length + 1);
      const meta = await SoundEngine.addCustomSound(file, name);
      settings.customId = meta.id;
      save();
      renderCustomPanel();
      updateSummary();
    } catch (e) {
      renderCustomPanel(I18n.t("custom.error.decode"));
    }
  });
  deleteBtn.addEventListener("click", async () => {
    const nextId = await SoundEngine.deleteCustomSound();
    settings.customId = nextId || "";
    save();
    renderCustomPanel();
  });

  SoundEngine.initCustomSound(settings.customId).then(() => {
    const active = SoundEngine.activeCustomId() || "";
    if (active !== settings.customId) { settings.customId = active; save(); }
    renderCustomPanel();
  });

  document.getElementById("start-meditation").addEventListener("click", () => {
    Session.startMeditation({
      minutes: settings.minutes,
      gong: settings.gong,
      intervalMin: settings.intervalMin,
      ambient: settings.ambient,
      prepSec: settings.prepSec,
      strikes: {
        start: settings.strikesStart,
        interval: settings.strikesInterval,
        end: settings.strikesEnd
      },
      gapSec: settings.gapSec
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
      card.querySelector(".sound-state").textContent =
        on ? I18n.t("sound.playing") : I18n.t("sound.silent");
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

  function renderGreeting() {
    const now = new Date();
    const h = now.getHours();
    const key = h < 6 ? "greet.night" : h < 12 ? "greet.morning"
      : h < 18 ? "greet.afternoon" : "greet.evening";
    document.getElementById("greeting").textContent =
      `${I18n.t(key)} · ${I18n.t("days")[now.getDay()]} ${now.getDate()} ${I18n.t("months")[now.getMonth()]}`;
  }

  function renderQuote() {
    const q = Quotes.ofDay(I18n.current());
    document.getElementById("quote-text").textContent = q.t;
    document.getElementById("quote-author").textContent = "— " + q.a;
  }

  renderGreeting();
  renderQuote();

  /* ---------- installatiehint (PWA) ---------- */

  const HINT_KEY = "stilte.installhint.v1";
  const hintCard = document.getElementById("install-hint");
  const hintText = document.getElementById("install-text");
  const installBtn = document.getElementById("install-btn");
  const isStandalone = matchMedia("(display-mode: standalone)").matches ||
    navigator.standalone === true;
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  let installPrompt = null;

  const SHARE_SVG = '<svg class="share-icon" viewBox="0 0 24 24" aria-hidden="true">' +
    '<path d="M12 3v12M8 6.5L12 3l4 3.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>' +
    '<path d="M7 10H5.5A1.5 1.5 0 0 0 4 11.5v8A1.5 1.5 0 0 0 5.5 21h13a1.5 1.5 0 0 0 1.5-1.5v-8A1.5 1.5 0 0 0 18.5 10H17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" fill="none"/></svg>';

  function renderHintText() {
    if (hintCard.classList.contains("hidden")) return;
    if (isIOS) hintText.innerHTML = I18n.t("hint.ios", SHARE_SVG);
    else hintText.textContent = I18n.t("hint.install");
  }

  if (!isStandalone && !localStorage.getItem(HINT_KEY)) {
    if (isIOS) {
      hintCard.classList.remove("hidden");
      renderHintText();
    } else {
      addEventListener("beforeinstallprompt", e => {
        e.preventDefault();
        installPrompt = e;
        installBtn.classList.remove("hidden");
        hintCard.classList.remove("hidden");
        renderHintText();
      });
    }
  }

  installBtn.addEventListener("click", async () => {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    installPrompt = null;
    hintCard.classList.add("hidden");
  });

  document.getElementById("install-dismiss").addEventListener("click", () => {
    localStorage.setItem(HINT_KEY, "1");
    hintCard.classList.add("hidden");
  });

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
  strikesStartChips.set(settings.strikesStart);
  strikesIntervalChips.set(settings.strikesInterval);
  strikesEndChips.set(settings.strikesEnd);
  intervalChips.set(settings.intervalMin);
  ambientChips.set(settings.ambient);
  prepChips.set(settings.prepSec);
  techChips.set(settings.breathTech);
  breathChips.set(settings.breathMin);
  sleepChips.set(settings.sleepMin);
  volSlider.value = settings.ambVolume;
  SoundEngine.setAmbientVolume(settings.ambVolume / 100);
  langChips.set(settings.lang);
  gapChips.set(settings.gapSec);
  updateSummary();

  Stats.renderHeader();

  /* ---------- PWA ---------- */

  if ("serviceWorker" in navigator) {
    addEventListener("load", () => {
      navigator.serviceWorker.register("sw.js").catch(() => { /* offline-cache optioneel */ });
    });
  }
})();
